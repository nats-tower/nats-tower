package natsauth

import (
	"context"
	"log/slog"

	jwt "github.com/nats-io/jwt/v2"
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
