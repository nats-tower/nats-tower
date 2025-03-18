package natsauth

import (
	"context"
	"log/slog"
	"time"

	jwt "github.com/nats-io/jwt/v2"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nkeys"
	"github.com/nats-tower/nats-tower/application"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

func GetAccountFromRecord(record *core.Record, url string) (*application.AccountAuth, error) {
	return &application.AccountAuth{
		ID:                record.Id,
		URL:               url,
		Description:       record.GetString("description"),
		PublicKey:         record.GetString("public_key"),
		PrivateKey:        record.GetString("private_key"),
		Seed:              record.GetString("seed"),
		SigningPublicKey:  record.GetString("sign_public_key"),
		SigningPrivateKey: record.GetString("sign_private_key"),
		SigningSeed:       record.GetString("sign_seed"),
		JWT:               record.GetString("jwt"),
		Name:              record.GetString("name"),
	}, nil
}

func (m *NATSAuthModule) GetSysAccountByURL(ctx context.Context, url string) (*application.AccountAuth, error) {
	return m.getSysAccountByURL(ctx, m.cfg.App, url)
}

func (m *NATSAuthModule) getSysAccountByURL(ctx context.Context, dao core.App, url string) (*application.AccountAuth, error) {

	operator, err := m.getOperator(ctx, dao, url)
	if err != nil {
		return nil, err
	}

	accountRecord, err := dao.FindAllRecords("nats_auth_accounts",
		dbx.HashExp{
			"operator": operator.ID,
			"name":     "SYS",
		})
	if err != nil {
		return nil, err
	}
	if len(accountRecord) == 0 {
		return nil, ErrNotFound
	}

	return GetAccountFromRecord(accountRecord[0], url)
}

func (m *NATSAuthModule) GetSysAccountByID(ctx context.Context,
	operatorID string) (*application.AccountAuth, error) {
	return m.getSysAccountByID(ctx, m.cfg.App, operatorID)
}

func (m *NATSAuthModule) getSysAccountByID(_ context.Context,
	dao core.App, operatorID string) (*application.AccountAuth, error) {

	accountRecord, err := dao.FindAllRecords("nats_auth_accounts",
		dbx.HashExp{
			"operator": operatorID,
			"name":     "SYS",
		})
	if err != nil {
		return nil, err
	}
	if len(accountRecord) == 0 {
		return nil, ErrNotFound
	}

	operatorRecord, err := dao.FindRecordById("nats_auth_operators", operatorID)
	if err != nil {
		return nil, err
	}

	return GetAccountFromRecord(accountRecord[0], operatorRecord.GetString("url"))
}

type UpsertAccountAuthOptions struct {
	DoNotPublish bool
}

func (m *NATSAuthModule) UpsertAccountAuth(ctx context.Context,
	url string, name, description string,
	opts UpsertAccountAuthOptions) (*application.AccountAuth, error) {
	logger := m.logger.With(slog.String("url", url), slog.String("name", name))
	var res application.AccountAuth
	err := m.cfg.App.RunInTransaction(func(txDao core.App) error {
		operator, err := m.getOperator(ctx, txDao, url)
		if err != nil {
			return err
		}

		accRecords, err := txDao.FindAllRecords("nats_auth_accounts",
			dbx.HashExp{
				"operator": operator.ID,
				"name":     name,
			})
		if err != nil {
			return err
		}

		if len(accRecords) == 0 {
			// does not exist yet => create
			logger.InfoContext(ctx, "Account does not exist yet")

			accountKP, err := nkeys.CreateAccount()
			if err != nil {
				return err
			}

			pubKey, err := accountKP.PublicKey()
			if err != nil {
				return err
			}

			privateKey, err := accountKP.PrivateKey()
			if err != nil {
				return err
			}

			seed, err := accountKP.Seed()
			if err != nil {
				return err
			}

			signingAccountKP, err := nkeys.CreateAccount()
			if err != nil {
				return err
			}

			signPubKey, err := signingAccountKP.PublicKey()
			if err != nil {
				return err
			}

			signPrivateKey, err := signingAccountKP.PrivateKey()
			if err != nil {
				return err
			}

			signSeed, err := signingAccountKP.Seed()
			if err != nil {
				return err
			}
			accountClaims := jwt.NewAccountClaims(pubKey)
			accountClaims.Name = name
			accountClaims.SigningKeys.Add(signPubKey)

			accountClaims.Limits.JetStreamLimits.DiskStorage = -1
			accountClaims.Limits.JetStreamLimits.MemoryStorage = -1

			operatorKP, err := nkeys.FromSeed([]byte(operator.SigningSeed))
			if err != nil {
				return err
			}

			jwtValue, err := accountClaims.Encode(operatorKP)
			if err != nil {
				return err
			}

			record := core.NewRecord(m.NATSAccountCollection)
			record.Set("name", name)
			record.Set("description", description)
			record.Set("operator", operator.ID)
			record.Set("public_key", pubKey)
			record.Set("private_key", string(privateKey))
			record.Set("seed", string(seed))
			record.Set("sign_public_key", signPubKey)
			record.Set("sign_private_key", string(signPrivateKey))
			record.Set("sign_seed", string(signSeed))
			record.Set("jwt", jwtValue)

			logger.InfoContext(ctx, "Creating account...")

			if opts.DoNotPublish {
				if err := txDao.UnsafeWithoutHooks().Save(record); err != nil {
					logger.ErrorContext(ctx, "Could not save account", slog.String("error", err.Error()))
					return err
				}
			} else {
				if err := txDao.Save(record); err != nil {
					logger.ErrorContext(ctx, "Could not save account", slog.String("error", err.Error()))
					return err
				}
			}
			res.ID = record.Id
			res.URL = url
			res.PublicKey = pubKey
			res.PrivateKey = string(privateKey)
			res.Seed = string(seed)
			res.SigningPublicKey = signPubKey
			res.SigningPrivateKey = string(signPrivateKey)
			res.SigningSeed = string(signSeed)
			res.JWT = jwtValue
			res.Name = name
			res.Description = description
		} else {
			// exists
			logger.InfoContext(ctx, "Account already exists...")
			res.ID = accRecords[0].Id
			res.URL = url
			res.PublicKey = accRecords[0].GetString("public_key")
			res.PrivateKey = accRecords[0].GetString("private_key")
			res.Seed = accRecords[0].GetString("seed")
			res.SigningPublicKey = accRecords[0].GetString("sign_public_key")
			res.SigningPrivateKey = accRecords[0].GetString("sign_private_key")
			res.SigningSeed = accRecords[0].GetString("sign_seed")
			res.JWT = accRecords[0].GetString("jwt")
			res.Name = accRecords[0].GetString("name")
			res.Description = accRecords[0].GetString("description")
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return &res, nil
}

func (m *NATSAuthModule) PublishAccount(ctx context.Context, url string, name string) error {
	logger := m.logger.With(slog.String("url", url), slog.String("name", name))
	// find operator first
	operatorRecords, err := m.cfg.App.FindAllRecords("nats_auth_operators", dbx.HashExp{
		"url": url,
	})
	if err != nil {
		logger.ErrorContext(ctx, "Could not find operator for account", slog.String("error", err.Error()))
		return err
	}
	if len(operatorRecords) == 0 {
		logger.ErrorContext(ctx, "Could not find operator for account")
		return ErrNotFound
	}

	accountRecords, err := m.cfg.App.FindAllRecords("nats_auth_accounts",
		dbx.HashExp{
			"name":     name,
			"operator": operatorRecords[0].Id,
		})
	if err != nil {
		logger.ErrorContext(ctx, "Could not find account in operator", slog.String("error", err.Error()))
		return err
	}
	if len(accountRecords) == 0 {
		logger.ErrorContext(ctx, "Could not find account for operator")
		return ErrNotFound
	}

	return m.publishAccountRecord(ctx, m.cfg.App, accountRecords[0])
}

func (m *NATSAuthModule) publishAccountRecord(ctx context.Context, dao core.App, record *core.Record) error {
	logger := m.logger.With(slog.String("name", record.GetString("name")), slog.String("operator", record.GetString("operator")))
	// 1. find system user for same operator
	sysAccountRecord, err := dao.FindAllRecords("nats_auth_accounts",
		dbx.HashExp{
			"operator": record.GetString("operator"),
			"name":     "SYS",
		})
	if err != nil {
		logger.ErrorContext(ctx, "Could not find SYS account(error)", slog.String("error", err.Error()))
		return err
	}
	if len(sysAccountRecord) == 0 {
		logger.ErrorContext(ctx, "Could not find SYS account for operator")
		return ErrNotFound
	}
	sysUserRecord, err := dao.FindAllRecords("nats_auth_users",
		dbx.HashExp{
			"account": sysAccountRecord[0].Id,
			"name":    "sys",
		})
	if err != nil {
		logger.ErrorContext(ctx, "Could not find sys user(error)", slog.String("error", err.Error()))
		return err
	}
	if len(sysUserRecord) == 0 {
		logger.ErrorContext(ctx, "Could not find sys user for operator")
		return ErrNotFound
	}
	// 2. find operator url for same operator
	operatorRecord, err := dao.FindRecordById("nats_auth_operators", record.GetString("operator"))
	if err != nil {
		logger.ErrorContext(ctx, "Could not find operator(error)", slog.String("error", err.Error()))
		return err
	}

	logger = logger.With(slog.String("operator_url", operatorRecord.GetString("url")), slog.String("public_key", record.GetString("public_key")))

	logger.InfoContext(ctx, "Publishing account...")
	// 3. open nats connection and send account
	nc, err := nats.Connect(operatorRecord.GetString("url"),
		nats.UserJWTAndSeed(sysUserRecord[0].GetString("jwt"),
			sysUserRecord[0].GetString("seed")))
	if err != nil {
		logger.ErrorContext(ctx, "Could not connect to operator", slog.String("error", err.Error()))
		return err
	}
	defer nc.Close()
	// 4. send account
	resp, err := nc.Request("$SYS.REQ.CLAIMS.UPDATE", []byte(record.GetString("jwt")), 5*time.Second)
	if err != nil {
		logger.ErrorContext(ctx, "Could not send account to operator", slog.String("error", err.Error()))
		return err
	}
	logger.InfoContext(ctx, "Account published", slog.String("response", string(resp.Data)))
	return nil
}

func (m *NATSAuthModule) publishAccountRecordRemoval(ctx context.Context, dao core.App, record *core.Record) error {
	logger := m.logger.With(slog.String("name", record.GetString("name")), slog.String("operator", record.GetString("operator")))
	// 1. find system user for same operator
	sysAccountRecord, err := dao.FindAllRecords("nats_auth_accounts",
		dbx.HashExp{
			"operator": record.GetString("operator"),
			"name":     "SYS",
		})
	if err != nil {
		logger.ErrorContext(ctx, "Could not find SYS account(error)", slog.String("error", err.Error()))
		return err
	}
	if len(sysAccountRecord) == 0 {
		logger.ErrorContext(ctx, "Could not find SYS account for operator")
		return ErrNotFound
	}
	sysUserRecord, err := dao.FindAllRecords("nats_auth_users",
		dbx.HashExp{
			"account": sysAccountRecord[0].Id,
			"name":    "sys",
		})
	if err != nil {
		logger.ErrorContext(ctx, "Could not find sys user(error)", slog.String("error", err.Error()))
		return err
	}
	if len(sysUserRecord) == 0 {
		logger.ErrorContext(ctx, "Could not find sys user for operator")
		return ErrNotFound
	}
	// 2. find operator url for same operator
	operatorRecord, err := dao.FindRecordById("nats_auth_operators", record.GetString("operator"))
	if err != nil {
		logger.ErrorContext(ctx, "Could not find operator(error)", slog.String("error", err.Error()))
		return err
	}

	logger = logger.With(slog.String("operator_url", operatorRecord.GetString("url")))

	logger.InfoContext(ctx, "Deleting account...")
	// 3. open nats connection and send account
	nc, err := nats.Connect(operatorRecord.GetString("url"),
		nats.UserJWTAndSeed(sysUserRecord[0].GetString("jwt"),
			sysUserRecord[0].GetString("seed")))
	if err != nil {
		logger.ErrorContext(ctx, "Could not connect to operator", slog.String("error", err.Error()))
		return err
	}
	defer nc.Close()
	// 4. send account removal
	claim := jwt.NewGenericClaims(operatorRecord.GetString("public_key"))
	claim.Data["accounts"] = []string{record.GetString("public_key")}

	operatorKP, err := nkeys.FromSeed([]byte(operatorRecord.GetString("sign_seed")))
	if err != nil {
		return err
	}
	pruneJwt, err := claim.Encode(operatorKP)
	if err != nil {
		logger.ErrorContext(ctx, "Could not connect to operator", slog.String("error", err.Error()))
		return err
	}
	_, err = nc.Request("$SYS.REQ.CLAIMS.DELETE", []byte(pruneJwt), 5*time.Second)
	if err != nil {
		logger.ErrorContext(ctx, "Could not delete account from operator", slog.String("error", err.Error()))
		return err
	}
	return nil
}
