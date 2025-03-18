package natsauth

import (
	"context"
	"fmt"
	"log/slog"

	jwt "github.com/nats-io/jwt/v2"
	"github.com/nats-io/nkeys"
	"github.com/nats-tower/nats-tower/application"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

func (m *NATSAuthModule) GetSysUserByURL(ctx context.Context,
	url string) (*application.UserAuth, error) {

	operator, err := m.GetOperator(ctx, url)
	if err != nil {
		return nil, err
	}

	accountRecord, err := m.cfg.App.FindAllRecords("nats_auth_accounts",
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

	userRecord, err := m.cfg.App.FindAllRecords("nats_auth_users",
		dbx.HashExp{
			"account": accountRecord[0].Id,
			"name":    "sys",
		})
	if err != nil {
		return nil, err
	}
	if len(userRecord) == 0 {
		return nil, ErrNotFound
	}

	return GetUserFromRecord(userRecord[0], url)
}

func (m *NATSAuthModule) GetSysUserByID(ctx context.Context,
	operatorID string) (*application.UserAuth, error) {

	accountRecord, err := m.cfg.App.FindAllRecords("nats_auth_accounts",
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

	userRecord, err := m.cfg.App.FindAllRecords("nats_auth_users",
		dbx.HashExp{
			"account": accountRecord[0].Id,
			"name":    "sys",
		})
	if err != nil {
		return nil, err
	}
	if len(userRecord) == 0 {
		return nil, ErrNotFound
	}

	operatorRecord, err := m.cfg.App.FindRecordById("nats_auth_operators", operatorID)
	if err != nil {
		return nil, err
	}

	return GetUserFromRecord(userRecord[0], operatorRecord.GetString("url"))
}

func (m *NATSAuthModule) GetSysAccountAndUserByID(ctx context.Context,
	operatorID string) (*application.AccountAuth, *application.UserAuth, error) {

	accountRecord, err := m.cfg.App.FindAllRecords("nats_auth_accounts",
		dbx.HashExp{
			"operator": operatorID,
			"name":     "SYS",
		})
	if err != nil {
		return nil, nil, err
	}
	if len(accountRecord) == 0 {
		return nil, nil, ErrNotFound
	}

	userRecord, err := m.cfg.App.FindAllRecords("nats_auth_users",
		dbx.HashExp{
			"account": accountRecord[0].Id,
			"name":    "sys",
		})
	if err != nil {
		return nil, nil, err
	}
	if len(userRecord) == 0 {
		return nil, nil, ErrNotFound
	}

	operatorRecord, err := m.cfg.App.FindRecordById("nats_auth_operators", operatorID)
	if err != nil {
		return nil, nil, err
	}

	account, err := GetAccountFromRecord(accountRecord[0], operatorRecord.GetString("url"))
	if err != nil {
		return nil, nil, err
	}
	user, err := GetUserFromRecord(userRecord[0], operatorRecord.GetString("url"))
	if err != nil {
		return nil, nil, err
	}

	return account, user, nil
}

func (m *NATSAuthModule) UpsertUserAuth(ctx context.Context,
	url, account, name, description string, opts application.UserOptions) (*application.UserAuth, error) {
	var res application.UserAuth

	err := m.cfg.App.RunInTransaction(func(txDao core.App) error {
		operator, err := m.getOperator(ctx, txDao, url)
		if err != nil {
			return err
		}

		// Check for account
		accRecords, err := txDao.FindAllRecords("nats_auth_accounts",
			dbx.HashExp{
				"operator": operator.ID,
				"name":     account,
			})
		if err != nil {
			return err
		}

		if len(accRecords) == 0 {
			return fmt.Errorf("account %s not found", account)
		}

		// Check for user
		userRecords, err := txDao.FindAllRecords("nats_auth_users", dbx.HashExp{
			"name":    name,
			"account": accRecords[0].Id,
		})
		if err != nil {
			return err
		}

		if len(userRecords) == 0 {
			// does not exist yet => create
			m.logger.InfoContext(ctx, "User in account does not exist yet", slog.String("account", account), slog.String("name", name))

			userKP, err := nkeys.CreateUser()
			if err != nil {
				return err
			}

			pubKey, err := userKP.PublicKey()
			if err != nil {
				return err
			}

			privateKey, err := userKP.PrivateKey()
			if err != nil {
				return err
			}

			seed, err := userKP.Seed()
			if err != nil {
				return err
			}

			userClaims := jwt.NewUserClaims(pubKey)
			userClaims.IssuerAccount = accRecords[0].GetString("public_key")
			userClaims.Name = name
			userClaims.BearerToken = opts.BearerToken

			accountKP, err := nkeys.FromSeed([]byte(accRecords[0].GetString("sign_seed")))
			if err != nil {
				return err
			}

			jwtValue, err := userClaims.Encode(accountKP)
			if err != nil {
				return err
			}

			creds, err := jwt.FormatUserConfig(jwtValue, seed)
			if err != nil {
				return err
			}

			record := core.NewRecord(m.NATSUserCollection)
			record.Set("name", name)
			record.Set("description", description)
			record.Set("account", accRecords[0].Id)
			record.Set("public_key", pubKey)
			record.Set("private_key", string(privateKey))
			record.Set("seed", string(seed))
			record.Set("jwt", jwtValue)
			record.Set("creds", creds)

			m.logger.InfoContext(ctx, "Creating user in account", slog.String("account", account), slog.String("name", name))
			if err := txDao.Save(record); err != nil {
				m.logger.ErrorContext(ctx, "Could not save user", slog.String("error", err.Error()))
				return err
			}
			res.ID = record.Id
			res.URL = url
			res.PublicKey = pubKey
			res.PrivateKey = string(privateKey)
			res.Seed = string(seed)
			res.JWT = jwtValue
			res.Creds = string(creds)
		} else {
			// exists
			m.logger.InfoContext(ctx, "User in account already exists", slog.String("account", account), slog.String("name", name))
			res.ID = userRecords[0].Id
			res.URL = url
			res.PublicKey = userRecords[0].GetString("public_key")
			res.PrivateKey = userRecords[0].GetString("private_key")
			res.Seed = userRecords[0].GetString("seed")
			res.JWT = userRecords[0].GetString("jwt")
			res.Creds = userRecords[0].GetString("creds")
			res.Name = userRecords[0].GetString("name")
			res.Description = userRecords[0].GetString("description")
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &res, nil
}

func (m *NATSAuthModule) DeleteUserAuth(ctx context.Context,
	url, account, name string) error {

	err := m.cfg.App.RunInTransaction(func(txDao core.App) error {
		operator, err := m.getOperator(ctx, txDao, url)
		if err != nil {
			return err
		}

		// Check for account
		accRecords, err := txDao.FindAllRecords("nats_auth_accounts",
			dbx.HashExp{
				"operator": operator.ID,
				"name":     account,
			})
		if err != nil {
			return err
		}

		if len(accRecords) == 0 {
			return fmt.Errorf("account %s not found", account)
		}

		// Check for user
		userRecords, err := txDao.FindAllRecords("nats_auth_users", dbx.HashExp{
			"account": accRecords[0].Id,
			"name":    name,
		})
		if err != nil {
			return err
		}

		if len(userRecords) == 0 {
			return nil
		} else {
			// exists
			m.logger.InfoContext(ctx, "User in account will be deleted", slog.String("account", account), slog.String("name", name))
			return txDao.Delete(userRecords[0])
		}
	})
	if err != nil {
		return err
	}

	return nil
}

func (m *NATSAuthModule) GetUsersByAccountID(ctx context.Context,
	accountID string) ([]*application.UserAuth, error) {

	userRecords, err := m.cfg.App.FindAllRecords("nats_auth_users",
		dbx.HashExp{
			"account": accountID,
		})
	if err != nil {
		return nil, err
	}
	if len(userRecords) == 0 {
		return nil, nil
	}

	operator, err := m.GetOperatorByID(ctx, userRecords[0].GetString("operator"))
	if err != nil {
		return nil, err
	}

	var res []*application.UserAuth
	for _, userRecord := range userRecords {
		user, err := GetUserFromRecord(userRecord, operator.URL)
		if err != nil {
			return nil, err
		}
		res = append(res, user)
	}

	return res, nil
}

func GetUserFromRecord(record *core.Record, url string) (*application.UserAuth, error) {
	return &application.UserAuth{
		ID:          record.Id,
		URL:         url,
		PublicKey:   record.GetString("public_key"),
		PrivateKey:  record.GetString("private_key"),
		Seed:        record.GetString("seed"),
		Creds:       record.GetString("creds"),
		JWT:         record.GetString("jwt"),
		Name:        record.GetString("name"),
		Description: record.GetString("description"),
	}, nil
}
