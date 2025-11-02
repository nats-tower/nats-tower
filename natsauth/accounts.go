package natsauth

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log/slog"

	jwt "github.com/nats-io/jwt/v2"
	"github.com/nats-io/nkeys"
	"github.com/nats-tower/nats-tower/application"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

func GetAccountFromRecord(record *core.Record, url string) (*application.AccountAuth, error) {
	return &application.AccountAuth{
		ID:                 record.Id,
		URL:                url,
		Description:        record.GetString("description"),
		PublicKey:          record.GetString("public_key"),
		PrivateKey:         record.GetString("private_key"),
		Seed:               record.GetString("seed"),
		SigningPublicKey:   record.GetString("sign_public_key"),
		SigningPrivateKey:  record.GetString("sign_private_key"),
		SigningSeed:        record.GetString("sign_seed"),
		JWT:                record.GetString("jwt"),
		Name:               record.GetString("name"),
		DefaultPermissions: record.GetString("default_permissions"),
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

func (m *NATSAuthModule) UpsertAccountExport(ctx context.Context,
	accountID string,
	exp *jwt.Export) error {
	err := m.cfg.App.RunInTransaction(func(txDao core.App) error {
		if exp.Name == "" {
			return errors.New("export name is required")
		}

		accRecord, err := txDao.FindRecordById("nats_auth_accounts", accountID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				m.logger.ErrorContext(ctx, "Could not find account",
					slog.String("account_id", accountID),
					slog.String("export_name", exp.Name),
					slog.String("error", err.Error()))
				return ErrNotFound
			} else {
				return err
			}
		}

		accountClaims, err := jwt.DecodeAccountClaims(accRecord.GetString("jwt"))
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not decode account claims",
				slog.String("account_id", accountID),
				slog.String("export_name", exp.Name),
				slog.String("error", err.Error()))
			return err
		}
		existingExport := false

		for i, accExp := range accountClaims.Exports {
			if accExp.Name == exp.Name {
				accountClaims.Exports[i] = exp
				existingExport = true
				m.logger.InfoContext(ctx, "Updating existing export",
					slog.String("account_id", accountID),
					slog.String("export_name", exp.Name),
					slog.String("export_subject", string(exp.Subject)))
				break
			}
		}

		if !existingExport {
			m.logger.InfoContext(ctx, "Adding new export",
				slog.String("account_id", accountID),
				slog.String("export_name", exp.Name),
				slog.String("export_subject", string(exp.Subject)))
			accountClaims.Exports.Add(exp)
		}
		results := jwt.CreateValidationResults()
		accountClaims.Exports.Validate(results)
		if len(results.Issues) > 0 {
			for _, issue := range results.Issues {
				if issue.Blocking {
					m.logger.ErrorContext(ctx, "Export is not valid",
						slog.String("account_id", accountID),
						slog.String("export_name", exp.Name),
						slog.String("error", issue.Description))
					return errors.New(issue.Description)
				}
			}
		}
		// find operator to sign these updates
		operatorRecord, err := txDao.FindRecordById("nats_auth_operators", accRecord.GetString("operator"))
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not find operator for account",
				slog.String("account_id", accountID),
				slog.String("export_name", exp.Name),
				slog.String("error", err.Error()))
			return err
		}

		operatorKP, err := nkeys.FromSeed([]byte(operatorRecord.GetString("sign_seed")))
		if err != nil {
			return err
		}
		jwtValue, err := accountClaims.Encode(operatorKP)
		if err != nil {
			return err
		}

		accRecord.Set("jwt", jwtValue)

		err = txDao.Save(accRecord)
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not save account",
				slog.String("account_id", accountID),
				slog.String("export_name", exp.Name),
				slog.String("error", err.Error()))
			return err
		}

		m.logger.InfoContext(ctx, "Export updated successfully",
			slog.String("account_id", accountID),
			slog.String("export_name", exp.Name),
			slog.String("export_subject", string(exp.Subject)))

		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (m *NATSAuthModule) DeleteAccountExport(ctx context.Context,
	accountID string,
	exportName string) error {
	err := m.cfg.App.RunInTransaction(func(txDao core.App) error {
		if exportName == "" {
			return errors.New("export name is required")
		}

		accRecord, err := txDao.FindRecordById("nats_auth_accounts", accountID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				m.logger.ErrorContext(ctx, "Could not find account",
					slog.String("account_id", accountID),
					slog.String("export_name", exportName),
					slog.String("error", err.Error()))
				return ErrNotFound
			} else {
				return err
			}
		}

		accountClaims, err := jwt.DecodeAccountClaims(accRecord.GetString("jwt"))
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not decode account claims",
				slog.String("account_id", accountID),
				slog.String("export_name", exportName),
				slog.String("error", err.Error()))
			return err
		}
		existingExport := false

		var newExports []*jwt.Export

		for _, accExp := range accountClaims.Exports {
			if accExp.Name == exportName {
				existingExport = true
				m.logger.InfoContext(ctx, "Removing existing export",
					slog.String("account_id", accountID),
					slog.String("export_name", exportName),
					slog.String("export_subject", string(accExp.Subject)))
				continue
			}
			newExports = append(newExports, accExp)
		}

		if !existingExport {
			m.logger.InfoContext(ctx, "Could not delete Export: not found",
				slog.String("account_id", accountID),
				slog.String("export_name", exportName))
			return nil
		}

		accountClaims.Exports = newExports

		// find operator to sign these updates
		operatorRecord, err := txDao.FindRecordById("nats_auth_operators", accRecord.GetString("operator"))
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not find operator for account",
				slog.String("account_id", accountID),
				slog.String("export_name", exportName),
				slog.String("error", err.Error()))
			return err
		}

		operatorKP, err := nkeys.FromSeed([]byte(operatorRecord.GetString("sign_seed")))
		if err != nil {
			return err
		}
		jwtValue, err := accountClaims.Encode(operatorKP)
		if err != nil {
			return err
		}

		accRecord.Set("jwt", jwtValue)

		err = txDao.Save(accRecord)
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not save account",
				slog.String("account_id", accountID),
				slog.String("export_name", exportName),
				slog.String("error", err.Error()))
			return err
		}

		m.logger.InfoContext(ctx, "Export removed successfully",
			slog.String("account_id", accountID),
			slog.String("export_name", exportName))

		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (m *NATSAuthModule) ListAccountExports(ctx context.Context,
	accountID string) ([]*jwt.Export, error) {

	exports := make([]*jwt.Export, 0)

	accRecord, err := m.cfg.App.FindRecordById("nats_auth_accounts", accountID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			m.logger.ErrorContext(ctx, "Could not find account",
				slog.String("account_id", accountID),
				slog.String("error", err.Error()))
			return nil, ErrNotFound
		} else {
			return nil, err
		}
	}

	accountClaims, err := jwt.DecodeAccountClaims(accRecord.GetString("jwt"))
	if err != nil {
		m.logger.ErrorContext(ctx, "Could not decode account claims",
			slog.String("account_id", accountID),
			slog.String("error", err.Error()))
		return nil, err
	}

	for _, accExp := range accountClaims.Exports {
		exports = append(exports, accExp)
	}

	return exports, nil
}

func (m *NATSAuthModule) ListPublicExports(ctx context.Context,
	operatorID string) (map[string][]*jwt.Export, error) {

	exports := make(map[string][]*jwt.Export) // account name -> exports

	accRecords, err := m.cfg.App.FindAllRecords("nats_auth_accounts", dbx.HashExp{
		"operator": operatorID,
	})
	if err != nil {
		return nil, err
	}

	for _, accRecord := range accRecords {
		accountClaims, err := jwt.DecodeAccountClaims(accRecord.GetString("jwt"))
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not decode account claims",
				slog.String("account_id", accRecord.Id),
				slog.String("error", err.Error()))
			return nil, err
		}

		for _, accExp := range accountClaims.Exports {
			if accExp.TokenReq {
				continue // skip token requests, as they are not public
			}

			if _, ok := exports[accRecord.GetString("name")]; !ok {
				exports[accRecord.GetString("name")] = make([]*jwt.Export, 0)
			}

			accExports := exports[accRecord.GetString("name")]
			accExports = append(accExports, accExp)
			exports[accRecord.GetString("name")] = accExports
		}
	}

	return exports, nil
}

func (m *NATSAuthModule) UpsertAccountImport(ctx context.Context,
	accountID string,
	imp *jwt.Import) error {
	err := m.cfg.App.RunInTransaction(func(txDao core.App) error {
		if imp.Name == "" {
			return errors.New("import name is required")
		}

		accRecord, err := txDao.FindRecordById("nats_auth_accounts", accountID)
		if err != nil {
			return err
		}

		srcAccounts, err := txDao.FindAllRecords("nats_auth_accounts", dbx.HashExp{
			"name":     imp.Account,
			"operator": accRecord.GetString("operator"),
		})
		if err != nil {
			return err
		}

		if len(srcAccounts) == 0 {
			// let's see if the account name is a public key
			srcAccounts, err = txDao.FindAllRecords("nats_auth_accounts", dbx.HashExp{
				"public_key": imp.Account,
				"operator":   accRecord.GetString("operator"),
			})
			if err != nil {
				return err
			}
			if len(srcAccounts) == 0 {

				m.logger.ErrorContext(ctx, "Could not find source account",
					slog.String("account_id", accountID),
					slog.String("import_name", imp.Name),
					slog.String("error", err.Error()))
				return ErrSourceAccountNotFound
			}
		}

		imp.Account = srcAccounts[0].GetString("public_key")

		accountClaims, err := jwt.DecodeAccountClaims(accRecord.GetString("jwt"))
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not decode account claims",
				slog.String("account_id", accountID),
				slog.String("import_name", imp.Name),
				slog.String("error", err.Error()))
			return err
		}
		existingImport := false

		for i, accImp := range accountClaims.Imports {
			if accImp.Name == imp.Name {
				accountClaims.Imports[i] = imp
				existingImport = true
				m.logger.InfoContext(ctx, "Updating existing import",
					slog.String("account_id", accountID),
					slog.String("import_name", imp.Name),
					slog.String("import_subject", string(imp.Subject)))
				break
			}
		}

		if !existingImport {
			m.logger.InfoContext(ctx, "Adding new import",
				slog.String("account_id", accountID),
				slog.String("import_name", imp.Name),
				slog.String("import_subject", string(imp.Subject)))
			accountClaims.Imports.Add(imp)
		}
		results := jwt.CreateValidationResults()
		accountClaims.Imports.Validate(accRecord.GetString("public_key"), results)
		if len(results.Issues) > 0 {
			for _, issue := range results.Issues {
				if issue.Blocking {
					m.logger.ErrorContext(ctx, "Import is not valid",
						slog.String("account_id", accountID),
						slog.String("import_name", imp.Name),
						slog.String("error", issue.Description))
					return errors.New(issue.Description)
				}
			}
		}
		// find operator to sign these updates
		operatorRecord, err := txDao.FindRecordById("nats_auth_operators", accRecord.GetString("operator"))
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not find operator for account",
				slog.String("account_id", accountID),
				slog.String("import_name", imp.Name),
				slog.String("error", err.Error()))
			return err
		}

		operatorKP, err := nkeys.FromSeed([]byte(operatorRecord.GetString("sign_seed")))
		if err != nil {
			return err
		}
		jwtValue, err := accountClaims.Encode(operatorKP)
		if err != nil {
			return err
		}

		accRecord.Set("jwt", jwtValue)

		err = txDao.Save(accRecord)
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not save account",
				slog.String("account_id", accountID),
				slog.String("import_name", imp.Name),
				slog.String("error", err.Error()))
			return err
		}

		m.logger.InfoContext(ctx, "Import updated successfully",
			slog.String("account_id", accountID),
			slog.String("import_name", imp.Name),
			slog.String("import_subject", string(imp.Subject)))

		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (m *NATSAuthModule) DeleteAccountImport(ctx context.Context,
	accountID string,
	importName string) error {
	err := m.cfg.App.RunInTransaction(func(txDao core.App) error {
		if importName == "" {
			return errors.New("import name is required")
		}

		accRecord, err := txDao.FindRecordById("nats_auth_accounts", accountID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				m.logger.ErrorContext(ctx, "Could not find account",
					slog.String("account_id", accountID),
					slog.String("import_name", importName),
					slog.String("error", err.Error()))
				return ErrNotFound
			} else {
				return err
			}
		}

		accountClaims, err := jwt.DecodeAccountClaims(accRecord.GetString("jwt"))
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not decode account claims",
				slog.String("account_id", accountID),
				slog.String("import_name", importName),
				slog.String("error", err.Error()))
			return err
		}
		existingImport := false

		var newImports []*jwt.Import

		for _, accImp := range accountClaims.Imports {
			if accImp.Name == importName {
				existingImport = true
				m.logger.InfoContext(ctx, "Removing existing import",
					slog.String("account_id", accountID),
					slog.String("import_name", importName),
					slog.String("import_subject", string(accImp.Subject)))
				continue
			}
			newImports = append(newImports, accImp)
		}

		if !existingImport {
			m.logger.InfoContext(ctx, "Could not delete Import: not found",
				slog.String("account_id", accountID),
				slog.String("import_name", importName))
			return nil
		}

		accountClaims.Imports = newImports

		// find operator to sign these updates
		operatorRecord, err := txDao.FindRecordById("nats_auth_operators", accRecord.GetString("operator"))
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not find operator for account",
				slog.String("account_id", accountID),
				slog.String("import_name", importName),
				slog.String("error", err.Error()))
			return err
		}

		operatorKP, err := nkeys.FromSeed([]byte(operatorRecord.GetString("sign_seed")))
		if err != nil {
			return err
		}
		jwtValue, err := accountClaims.Encode(operatorKP)
		if err != nil {
			return err
		}

		accRecord.Set("jwt", jwtValue)

		err = txDao.Save(accRecord)
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not save account",
				slog.String("account_id", accountID),
				slog.String("import_name", importName),
				slog.String("error", err.Error()))
			return err
		}

		m.logger.InfoContext(ctx, "Import removed successfully",
			slog.String("account_id", accountID),
			slog.String("import_name", importName))

		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (m *NATSAuthModule) ListAccountImports(ctx context.Context,
	accountID string) ([]*jwt.Import, error) {

	imports := make([]*jwt.Import, 0)

	accRecord, err := m.cfg.App.FindRecordById("nats_auth_accounts", accountID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			m.logger.ErrorContext(ctx, "Could not find account",
				slog.String("account_id", accountID),
				slog.String("error", err.Error()))
			return nil, ErrNotFound
		} else {
			return nil, err
		}
	}

	accountClaims, err := jwt.DecodeAccountClaims(accRecord.GetString("jwt"))
	if err != nil {
		m.logger.ErrorContext(ctx, "Could not decode account claims",
			slog.String("account_id", accountID),
			slog.String("error", err.Error()))
		return nil, err
	}

	for _, accImp := range accountClaims.Imports {
		srcAccounts, err := m.cfg.App.FindAllRecords("nats_auth_accounts", dbx.HashExp{
			"public_key": accImp.Account,
			"operator":   accRecord.GetString("operator"),
		})
		if err != nil {
			return nil, err
		}
		if len(srcAccounts) == 0 {
			m.logger.ErrorContext(ctx, "Could not find source account",
				slog.String("account_id", accountID),
				slog.String("import_name", accImp.Name),
				slog.String("error", err.Error()))
		} else {
			// use the name of the source account
			accImp.Account = srcAccounts[0].GetString("name")
		}

		imports = append(imports, accImp)
	}

	return imports, nil
}

func (m *NATSAuthModule) UpdateAccountDefaultPermissions(ctx context.Context,
	accountID string,
	defaultPermissions *jwt.Permissions) error {
	err := m.cfg.App.RunInTransaction(func(txDao core.App) error {
		accRecord, err := txDao.FindRecordById("nats_auth_accounts", accountID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				m.logger.ErrorContext(ctx, "Could not find account",
					slog.String("account_id", accountID),
					slog.String("error", err.Error()))
				return ErrNotFound
			}
			return err
		}

		accountClaims, err := jwt.DecodeAccountClaims(accRecord.GetString("jwt"))
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not decode account claims",
				slog.String("account_id", accountID),
				slog.String("error", err.Error()))
			return err
		}

		// Update default permissions
		if defaultPermissions != nil {
			accountClaims.DefaultPermissions = *defaultPermissions
		} else {
			accountClaims.DefaultPermissions = jwt.Permissions{}
		}

		// Validate the permissions
		results := jwt.CreateValidationResults()
		accountClaims.DefaultPermissions.Validate(results)
		if len(results.Issues) > 0 {
			for _, issue := range results.Issues {
				if issue.Blocking {
					m.logger.ErrorContext(ctx, "Default permissions are not valid",
						slog.String("account_id", accountID),
						slog.String("error", issue.Description))
					return errors.New(issue.Description)
				}
			}
		}

		// Find operator to sign these updates
		operatorRecord, err := txDao.FindRecordById("nats_auth_operators", accRecord.GetString("operator"))
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not find operator for account",
				slog.String("account_id", accountID),
				slog.String("error", err.Error()))
			return err
		}

		operatorKP, err := nkeys.FromSeed([]byte(operatorRecord.GetString("sign_seed")))
		if err != nil {
			return err
		}

		jwtValue, err := accountClaims.Encode(operatorKP)
		if err != nil {
			return err
		}

		// Store the permissions as JSON in the database
		var permissionsJSON string
		if defaultPermissions != nil {
			permBytes, err := json.Marshal(defaultPermissions)
			if err != nil {
				m.logger.ErrorContext(ctx, "Could not marshal permissions to JSON",
					slog.String("account_id", accountID),
					slog.String("error", err.Error()))
				return err
			}
			permissionsJSON = string(permBytes)
		}

		accRecord.Set("jwt", jwtValue)
		accRecord.Set("default_permissions", permissionsJSON)

		err = txDao.Save(accRecord)
		if err != nil {
			m.logger.ErrorContext(ctx, "Could not save account",
				slog.String("account_id", accountID),
				slog.String("error", err.Error()))
			return err
		}

		m.logger.InfoContext(ctx, "Default permissions updated successfully",
			slog.String("account_id", accountID))

		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (m *NATSAuthModule) GetAccountDefaultPermissions(ctx context.Context,
	accountID string) (*jwt.Permissions, error) {

	accRecord, err := m.cfg.App.FindRecordById("nats_auth_accounts", accountID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			m.logger.ErrorContext(ctx, "Could not find account",
				slog.String("account_id", accountID),
				slog.String("error", err.Error()))
			return nil, ErrNotFound
		}
		return nil, err
	}

	permissionsJSON := accRecord.GetString("default_permissions")
	if permissionsJSON == "" {
		return &jwt.Permissions{}, nil
	}

	var permissions jwt.Permissions
	err = json.Unmarshal([]byte(permissionsJSON), &permissions)
	if err != nil {
		m.logger.ErrorContext(ctx, "Could not unmarshal permissions from JSON",
			slog.String("account_id", accountID),
			slog.String("error", err.Error()))
		return nil, err
	}

	return &permissions, nil
}

