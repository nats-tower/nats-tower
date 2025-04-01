package natsauth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/nats-io/jsm.go/natscontext"
	"github.com/nats-io/jwt/v2"
	"github.com/nats-io/nkeys"
	"github.com/nats-tower/nats-tower/application"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

var (
	ErrNotFound = errors.New("not found")
)

type NATSAuthModule struct {
	ctx                          context.Context
	logger                       *slog.Logger
	cfg                          NATSAuthModuleConfig
	NATSOperatorCollection       *core.Collection
	NATSAccountCollection        *core.Collection
	NATSAccountPendingCollection *core.Collection
	NATSUserCollection           *core.Collection
	NATSLimitsCollection         *core.Collection

	pendingLock sync.Mutex
}

type NATSAuthModuleConfig struct {
	App           core.App
	BootstrapURLs []string
	APIToken      string

	// used for semi controlled environments
	// in case we only got a NATS URL and an account to sign new users
	InitialOperatorURLs       string
	InitialAccountName        string
	InitialAccountPublicKey   string
	InitialAccountSigningSeed string

	DisableNATSCLIContexts bool
	TeamsCollection        *core.Collection
}

func CreateNATSAuthModule(ctx context.Context,
	logger *slog.Logger,
	cfg NATSAuthModuleConfig) (*NATSAuthModule, error) {
	t := &NATSAuthModule{
		ctx:    ctx,
		logger: logger,
		cfg:    cfg,
	}

	t.cfg.App.OnRecordCreate().BindFunc(func(e *core.RecordEvent) error {
		logger := logger.With(slog.String("hook", "OnModelBeforeCreate"),
			slog.String("collection", e.Record.TableName()),
			slog.String("record_id", e.Record.Id))

		if e.Record.TableName() == "nats_auth_operators" {
			record := e.Record
			if record.GetString("sign_seed") == "" {
				logger.InfoContext(ctx, "Creating nats operator...",
					slog.String("url", record.GetString("url")))
				// new operator
				_, err := generateOperatorRecord(ctx, record, record.GetString("url"))
				if err != nil {
					return err
				}
			}
		}
		if e.Record.TableName() == "nats_auth_accounts" {
			record := e.Record
			if record.GetString("public_key") == "" {
				logger.InfoContext(ctx, "Creating nats account...",
					slog.String("name", record.GetString("name")))
				operatorRecord, err := e.App.FindRecordById("nats_auth_operators", record.GetString("operator"))
				if err != nil {
					return err
				}

				if operatorRecord.GetString("sign_seed") == "" {
					logger.ErrorContext(ctx, "Operator has no signing seed. Seems like the operator is not under our control and you may only be allowed to create new user records",
						slog.String("url", operatorRecord.GetString("url")))

					return fmt.Errorf("operator has no signing seed. Seems like the operator is not under our control and you may only be allowed to create new user records")
				}

				limits, err := t.getAccountLimits(ctx, e.App, operatorRecord.Id, record)
				if err != nil {
					logger.ErrorContext(ctx, "Could not get account limits",
						slog.String("error", err.Error()))
					return err
				}

				// new account
				_, err = generateAccountRecord(ctx,
					record,
					operatorRecord.Id,
					operatorRecord.GetString("sign_seed"),
					record.GetString("name"),
					record.GetString("description"),
					*limits)
				if err != nil {
					return err
				}
			}
		}
		if e.Record.TableName() == "nats_auth_users" {
			record := e.Record
			if record.GetString("public_key") == "" {

				logger.InfoContext(ctx, "Creating nats user...",
					slog.String("name", record.GetString("name")))

				accountRecord, err := e.App.FindRecordById("nats_auth_accounts", record.GetString("account"))
				if err != nil {
					return err
				}
				// new operator
				_, err = generateUserRecord(ctx,
					record,
					accountRecord.Id,
					accountRecord.GetString("public_key"),
					accountRecord.GetString("sign_seed"),
					record.GetString("name"))
				if err != nil {
					return err
				}
			}
		}
		return e.Next()
	})

	err := t.initNATSAuthCollections(t.cfg.App)
	if err != nil {
		logger.ErrorContext(ctx, "Could not init NATSAuthCollections",
			slog.String("error", err.Error()))
		return nil, err
	}

	handleLimitAndAccountUpdate := func(logger *slog.Logger, dao core.App, record *core.Record, revokeUsers ...*core.Record) error {

		// find operator to sign these updates
		operatorRecord, err := dao.FindRecordById("nats_auth_operators", record.GetString("operator"))
		if err != nil {
			logger.ErrorContext(ctx, "Could not find operator for account",
				slog.String("error", err.Error()))
			return err
		}

		operatorKP, err := nkeys.FromSeed([]byte(operatorRecord.GetString("sign_seed")))
		if err != nil {
			return err
		}

		accountClaims := jwt.NewAccountClaims(record.GetString("public_key"))
		accountClaims.Name = record.GetString("name")
		for _, v := range revokeUsers {
			logger.InfoContext(ctx, "Revoking user...",
				slog.String("name", v.GetString("name")))
			accountClaims.Revoke(v.GetString("public_key"))
		}
		accountClaims.SigningKeys.Add(record.GetString("sign_public_key"))

		limits, err := t.getAccountLimits(ctx, dao, operatorRecord.Id, record)
		if err != nil {
			logger.ErrorContext(ctx, "Could not get account limits",
				slog.String("error", err.Error()))
			return err
		}

		accountClaims.Limits = *limits

		jwtValue, err := accountClaims.Encode(operatorKP)
		if err != nil {
			return err
		}

		record.Set("jwt", jwtValue)
		// since this updates the record it will trigger the OnModelAfterUpdate() again
		// we need to disable the hook to prevent an infinite loop
		if err := dao.UnsafeWithoutHooks().Save(record); err != nil {
			logger.ErrorContext(ctx, "Could not save account",
				slog.String("error", err.Error()))
			return err
		}

		// send account to nats
		logger.InfoContext(ctx, "Queuing account update...",
			slog.String("name", record.GetString("name")))

		_, err = t.requestAccountPublish(ctx, dao, record, AccountPublishActionUpsert)
		if err != nil {
			logger.ErrorContext(ctx, "Could not queue account update",
				slog.String("error", err.Error()))
			return err
		}

		t.handlePendingAccountActions(record.Id)

		return nil
	}

	handleNatsContextUpsert := func(logger *slog.Logger, dao core.App, record *core.Record) error {
		logger = logger.With(slog.String("account_id", record.GetString("account")))

		acc, err := dao.FindRecordById("nats_auth_accounts", record.GetString("account"))
		if err != nil {
			logger.ErrorContext(ctx, "Could not find account for user",
				slog.String("error", err.Error()))
			return err
		}
		logger = logger.With(slog.String("operator_id", acc.GetString("operator")))

		op, err := dao.FindRecordById("nats_auth_operators", acc.GetString("operator"))
		if err != nil {
			logger.ErrorContext(ctx, "Could not find operator for account",
				slog.String("error", err.Error()))
			return err
		}

		nCtx, err := natscontext.New(record.Id,
			false,
			natscontext.WithDescription(fmt.Sprintf("%s - %s - User %s(%s) for account %s",
				op.GetString("url"), op.GetString("description"), record.GetString("name"), record.Id, acc.GetString("name"))),
			natscontext.WithServerURL(op.GetString("url")))

		if err != nil {
			logger.ErrorContext(ctx, "Could not create nats context for user",
				slog.String("error", err.Error()))
			return err
		}

		err = nCtx.Save("")
		if err != nil {
			logger.ErrorContext(ctx, "Could not save nats context for user",
				slog.String("error", err.Error()))
			return err
		}

		p := nCtx.Path()

		parent := filepath.Dir(p)
		credPath := filepath.Join(parent, record.Id)

		err = os.WriteFile(credPath, []byte(record.GetString("creds")), 0600)
		if err != nil {
			logger.ErrorContext(ctx, "Could not save user creds for user",
				slog.String("error", err.Error()))
			return err
		}

		nCtx, err = natscontext.NewFromFile(p, natscontext.WithCreds(credPath))
		if err != nil {
			logger.ErrorContext(ctx, "Could not reload nats context for user",
				slog.String("error", err.Error()))
			return err
		}

		err = nCtx.Save("")
		if err != nil {
			logger.ErrorContext(ctx, "Could not save updated nats context for user",
				slog.String("error", err.Error()))
			return err
		}

		return nil
	}

	t.cfg.App.OnRecordAfterUpdateSuccess().BindFunc(func(e *core.RecordEvent) error {
		logger := logger.With(slog.String("hook", "OnModelAfterUpdate"),
			slog.String("collection", e.Record.TableName()),
			slog.String("record_id", e.Record.Id))

		if e.Record.TableName() == "nats_auth_limits" {
			record := e.Record
			logger = logger.With(slog.String("limit_id", record.Id))

			logger.InfoContext(ctx, "Limits changed...")

			// find any account that uses these limits
			accountRecords, err := e.App.FindAllRecords("nats_auth_accounts",
				dbx.HashExp{
					"limits": record.Id,
				})
			if err != nil {
				logger.ErrorContext(ctx, "Could not find accounts with limits",
					slog.String("error", err.Error()))
				return err
			}
			// update the JWT of the accounts
			for _, account := range accountRecords {

				logger.InfoContext(ctx, "Updating account with new limits...",
					slog.String("operator_id", account.GetString("operator")), slog.String("account_id", account.Id))

				err := handleLimitAndAccountUpdate(logger, e.App, account)
				if err != nil {
					logger.ErrorContext(ctx, "Could not update account with new limits",
						slog.String("account_id", account.Id),
						slog.String("error", err.Error()))
					return err
				}
			}

			return nil
		}
		if e.Record.TableName() == "nats_auth_accounts" {
			record := e.Record
			logger = logger.With(slog.String("operator_id", record.GetString("operator")),
				slog.String("account_id", record.Id))

			// ignore system accounts
			if record.GetString("name") == "SYS" {
				return nil
			}

			logger.InfoContext(ctx, "Updating account...")

			err := handleLimitAndAccountUpdate(logger, e.App, record)
			if err != nil {
				logger.ErrorContext(ctx, "Could not update account",
					slog.String("error", err.Error()))
				return err
			}

			return nil
		}
		if e.Record.TableName() == "nats_auth_users" {
			record := e.Record
			logger = logger.With(slog.String("account_id", record.GetString("account")))

			err := handleNatsContextUpsert(logger, e.App, record)
			if err != nil {
				logger.ErrorContext(ctx, "Could not update user context",
					slog.String("error", err.Error()))
				return err
			}
		}
		return e.Next()
	})

	t.cfg.App.OnRecordDeleteRequest().BindFunc(func(e *core.RecordRequestEvent) error {
		logger := logger.With(slog.String("hook", "OnModelDelete"),
			slog.String("collection", e.Record.TableName()),
			slog.String("record_id", e.Record.Id))

		if e.Record.TableName() == "nats_auth_accounts" {
			logger.Info("Account about to be deleted. Suspend account deletion until after removal from cluster...")
			record := e.Record
			logger = logger.With(slog.String("operator_id", record.GetString("operator")))

			if record.GetString("name") == "SYS" {
				// do not delete system accounts
				return fmt.Errorf("cannot delete system account")
			}

			_, err := t.requestAccountPublish(ctx, e.App, record, AccountPublishActionDelete)
			if err != nil {
				logger.ErrorContext(ctx, "Could not publish removed account",
					slog.String("error", err.Error()))
				return err
			}

			t.handlePendingAccountActions(record.Id)

			return nil // return nil to suspend deletion
		}

		return e.Next()
	})

	t.cfg.App.OnRecordAfterDeleteSuccess().BindFunc(func(e *core.RecordEvent) error {
		logger := logger.With(slog.String("hook", "OnModelAfterDelete"),
			slog.String("collection", e.Record.TableName()),
			slog.String("record_id", e.Record.Id))

		if e.Record.TableName() == "nats_auth_accounts_pending" {

			if AccountPublishAction(e.Record.GetString("action")) != AccountPublishActionDelete {
				return e.Next()
			}

			logger.Info("Account deleted on installation. Working on account removal...")
			record := e.Record
			logger = logger.With(slog.String("account_id", record.GetString("account")))

			accountRecord, err := t.cfg.App.FindRecordById("nats_auth_accounts", record.GetString("account"))
			if err != nil {
				if err == sql.ErrNoRows {
					logger.InfoContext(ctx, "Account for pending account not found. Skipping account removal...")
					return e.Next()
				}
				logger.ErrorContext(ctx, "Could not find account for pending account",
					slog.String("error", err.Error()))
				return err
			}
			logger = logger.With(slog.String("operator_id", accountRecord.GetString("operator")))

			err = t.cfg.App.Delete(accountRecord)
			if err != nil {
				logger.ErrorContext(ctx, "Could not delete account after pending account was removed",
					slog.String("error", err.Error()))
				return err
			}

			return e.Next()
		}

		if e.Record.TableName() == "nats_auth_users" {
			logger.Info("User deleted. Working on account update...")
			record := e.Record
			logger = logger.With(slog.String("account_id", record.GetString("account")))

			accRecord, err := e.App.FindRecordById("nats_auth_accounts", record.GetString("account"))
			if err != nil {
				if err == sql.ErrNoRows {
					logger.InfoContext(ctx, "Account for user not found. Skipping account update...")
					return nil
				}
				logger.ErrorContext(ctx, "Could not find account for user",
					slog.String("error", err.Error()))
				return err
			}
			logger = logger.With(slog.String("operator_id", record.GetString("operator")))

			err = handleLimitAndAccountUpdate(logger, e.App, accRecord, record)
			if err != nil {
				logger.ErrorContext(ctx, "Could not update account after user was removed",
					slog.String("error", err.Error()))
				return err
			}

			if !cfg.DisableNATSCLIContexts {
				if natscontext.SelectedContext() == record.Id {
					newContext := ""

					for _, nCtx := range natscontext.KnownContexts() {
						if nCtx == record.Id {
							continue
						}
						newContext = nCtx
						break
					}

					err := natscontext.SelectContext(newContext)
					if err != nil {
						logger.ErrorContext(ctx, "Could not select new user context",
							slog.String("error", err.Error()))
						return err
					}
				}

				err = natscontext.DeleteContext(record.Id)
				if err != nil {
					logger.ErrorContext(ctx, "Could not delete user context",
						slog.String("error", err.Error()))
					return err
				}
			}
		}
		return e.Next()
	})

	// Initiate hook to publish accounts after initial accounts were created
	// this way any preconfigured accounts will not be published
	t.cfg.App.OnRecordAfterCreateSuccess().BindFunc(func(e *core.RecordEvent) error {
		logger := logger.With(slog.String("hook", "OnModelAfterCreate"),
			slog.String("collection", e.Record.TableName()),
			slog.String("record_id", e.Record.Id))

		if e.Record.TableName() == "nats_auth_operators" {
			// new operator create => let's create a system account
			operatorRecord := e.Record

			logger = logger.With(slog.String("operator_id", operatorRecord.Id))

			logger.InfoContext(ctx, "Creating default limit for operator...")
			limits := core.NewRecord(t.NATSLimitsCollection)
			limits.Set("operator", operatorRecord.Id)
			limits.Set("name", "default")
			limits.Set("type", "account")
			limits.Set("max_connections", -1)
			limits.Set("jetstream_max_disk", -1)
			limits.Set("jetstream_max_memory", -1)
			limits.Set("default", true)

			if err := e.App.Save(limits); err != nil {
				logger.ErrorContext(ctx, "Could not save default limit",
					slog.String("error", err.Error()))
				return err
			}

			logger.InfoContext(ctx, "Default limit created for operator", slog.String("operator_id", operatorRecord.Id))

			logger.InfoContext(ctx, "Creating system account for operator...")

			sysAccountRecord := core.NewRecord(t.NATSAccountCollection)
			sysAccountRecord.Set("operator", operatorRecord.Id)
			sysAccountRecord.Set("name", "SYS")
			sysAccountRecord.Set("description", "Automatically created system account")

			if err := e.App.Save(sysAccountRecord); err != nil {
				logger.ErrorContext(ctx, "Could not save system account",
					slog.String("error", err.Error()))
				return err
			}

			logger.InfoContext(ctx, "System account created for operator", slog.String("account_id", sysAccountRecord.Id))
		}

		if e.Record.TableName() == "nats_auth_accounts" {
			record := e.Record
			logger = logger.With(slog.String("operator_id", record.GetString("operator")))

			// handle system accounts
			if record.GetString("name") == "SYS" {
				logger.InfoContext(ctx, "System account created. Skipping account update...but creating system user")
				sysAccount := core.NewRecord(t.NATSUserCollection)
				sysAccount.Set("account", record.Id)
				sysAccount.Set("name", "sys")
				sysAccount.Set("description", "Automatically created system user")

				if err := e.App.Save(sysAccount); err != nil {
					logger.ErrorContext(ctx, "Could not save system user",
						slog.String("error", err.Error()))
					return err
				}
				return e.Next()
			}

			// send account to nats
			_, err := t.requestAccountPublish(ctx, e.App, record, AccountPublishActionUpsert)
			if err != nil {
				logger.ErrorContext(ctx, "Could not publish created account",
					slog.String("error", err.Error()))
				return err
			}

			t.handlePendingAccountActions(record.Id)
			return e.Next()
		}
		if e.Record.TableName() == "nats_auth_users" && !cfg.DisableNATSCLIContexts { // only create user contexts if not disabled
			record := e.Record
			logger = logger.With(slog.String("account_id", record.GetString("account")))

			err := handleNatsContextUpsert(logger, e.App, record)
			if err != nil {
				logger.ErrorContext(ctx, "Could not create user context",
					slog.String("error", err.Error()))
				return err
			}
		}
		return e.Next()
	})

	for _, bootstrapURL := range cfg.BootstrapURLs {
		oLogger := logger.With(slog.String("bootstrap_url", bootstrapURL))
		operator, err := t.getOperator(ctx, t.cfg.App, bootstrapURL)
		if err != nil && err != ErrNotFound {
			return nil, err
		}
		if err == ErrNotFound {
			record, err := generateOperatorRecord(ctx,
				core.NewRecord(t.NATSOperatorCollection),
				bootstrapURL)
			if err != nil {
				return nil, err
			}

			oLogger.InfoContext(ctx, "Creating operator...")
			if err := cfg.App.Save(record); err != nil {
				oLogger.ErrorContext(ctx, "Could not save operator",
					slog.String("error", err.Error()))
				return nil, err
			}
			operator = &application.OperatorAuth{
				ID:          record.Id,
				SigningSeed: record.GetString("sign_seed"),
			}
		}
		oLogger = oLogger.With(slog.String("operator_id", operator.ID))

		sysAccount, err := t.getSysAccountByID(ctx, t.cfg.App, operator.ID)
		if err != nil && err != ErrNotFound {
			return nil, err
		}
		if err == ErrNotFound {
			record, err := generateAccountRecord(ctx,
				core.NewRecord(t.NATSAccountCollection),
				operator.ID,
				operator.SigningSeed,
				"SYS",
				"Automatically created system account",
				jwt.OperatorLimits{
					// No limits for SYS account
					JetStreamLimits: jwt.JetStreamLimits{
						DiskStorage:   jwt.NoLimit,
						MemoryStorage: jwt.NoLimit,
					},
				})
			if err != nil {
				return nil, err
			}

			oLogger.InfoContext(ctx, "Creating SYS account...")
			if err := cfg.App.Save(record); err != nil {
				oLogger.ErrorContext(ctx, "Could not save SYS account",
					slog.String("error", err.Error()))
				return nil, err
			}
			sysAccount = &application.AccountAuth{
				ID:          record.Id,
				PublicKey:   record.GetString("public_key"),
				SigningSeed: record.GetString("sign_seed"),
			}
		}
		oLogger = oLogger.With(slog.String("account_id", sysAccount.ID))

		_, err = t.GetSysUserByID(ctx, operator.ID)
		if err != nil && err != ErrNotFound {
			return nil, err
		}
		if err == ErrNotFound {
			record, err := generateUserRecord(ctx,
				core.NewRecord(t.NATSUserCollection),
				sysAccount.ID,
				sysAccount.PublicKey,
				sysAccount.SigningSeed,
				"sys")
			if err != nil {
				return nil, err
			}

			oLogger.InfoContext(ctx, "Creating sys user...")
			if err := cfg.App.Save(record); err != nil {
				oLogger.ErrorContext(ctx, "Could not save sys user",
					slog.String("error", err.Error()))
				return nil, err
			}
		}
	}

	if !cfg.DisableNATSCLIContexts {
		if len(natscontext.KnownContexts()) == 0 {

			userRecords, err := t.cfg.App.FindAllRecords("nats_auth_users")
			if err != nil {
				logger.ErrorContext(ctx, "Could not find users",
					slog.String("error", err.Error()))
				return nil, err
			}
			logger.InfoContext(ctx, "Creating initial user contexts...", slog.Int("user_count", len(userRecords)))

			for _, userRecord := range userRecords {
				ulogger := logger.With(slog.String("account_id", userRecord.GetString("account")))
				err := handleNatsContextUpsert(ulogger, t.cfg.App, userRecord)
				if err != nil {
					ulogger.ErrorContext(ctx, "Could not create intial user context",
						slog.String("error", err.Error()))
					return nil, err
				}
			}
		} else {
			logger.InfoContext(ctx, "Found user contexts...", slog.Int("user_count", len(natscontext.KnownContexts())))
		}
	} else {
		logger.InfoContext(ctx, "NATS CLI contexts are disabled...")
	}

	err = cfg.App.Cron().Add("work-pending-account-actions", "*/5 * * * *", func() {
		start := time.Now()
		logger.DebugContext(ctx, "Checking pending account actions...")
		defer func() {
			logger.DebugContext(ctx, "Checking pending account actions...Done", slog.Duration("duration", time.Since(start)))
		}()
		t.handlePendingAccountActions("") // check all pending actions
	})
	if err != nil {
		return nil, err
	}

	return t, nil
}
