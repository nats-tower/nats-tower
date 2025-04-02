package natsauth

import (
	"context"
	"log/slog"
	"time"

	jwt "github.com/nats-io/jwt/v2"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nkeys"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type AccountPublishAction string

const (
	AccountPublishActionUpsert AccountPublishAction = "upsert"
	AccountPublishActionDelete AccountPublishAction = "delete"
)

func (m *NATSAuthModule) requestAccountPublish(ctx context.Context, dao core.App, record *core.Record, action AccountPublishAction) (*core.Record, error) {
	logger := m.logger.With(slog.String("name", record.GetString("name")), slog.String("operator", record.GetString("operator")), slog.String("account", record.Id), slog.String("action", string(action)))

	m.pendingLock.Lock()
	defer m.pendingLock.Unlock()

	records, err := dao.FindAllRecords(m.NATSAccountPendingCollection, dbx.HashExp{"account": record.Id})
	if err != nil {
		logger.Error("failed to find pending record", slog.String("error", err.Error()))

		return nil, err
	}

	if len(records) == 0 {
		pendingRecord := core.NewRecord(m.NATSAccountPendingCollection)
		pendingRecord.Set("account", record.Id)
		pendingRecord.Set("action", string(action))

		if err := dao.Save(pendingRecord); err != nil {
			logger.Error("failed to save pending record", "error", err)
			return nil, err
		}
		logger.Info("created pending record", slog.String("id", pendingRecord.Id))

		return pendingRecord, nil
	}

	currentAction := records[0].GetString("action")
	if currentAction != string(action) {
		records[0].Set("action", string(action))
		if err := dao.Save(records[0]); err != nil {
			logger.Error("failed to update pending record", slog.String("error", err.Error()))
			return nil, err
		}
		logger.Info("updated pending record to new action", slog.String("id", records[0].Id))
	}

	return records[0], nil
}

func (m *NATSAuthModule) handlePendingAccountActions(onlySpecificAccountID string) {
	m.pendingLock.Lock()
	defer m.pendingLock.Unlock()

	var hashExpr []dbx.Expression
	if onlySpecificAccountID != "" {
		hashExpr = append(hashExpr, dbx.HashExp{"account": onlySpecificAccountID})
	}

	records, err := m.cfg.App.FindAllRecords(m.NATSAccountPendingCollection, hashExpr...)
	if err != nil {
		m.logger.Error("failed to find pending records", slog.String("error", err.Error()))
		return
	}

	for _, record := range records {

		accountRecord, err := m.cfg.App.FindRecordById("nats_auth_accounts", record.GetString("account"))
		if err != nil {
			m.logger.Error("failed to find account record", slog.String("error", err.Error()))
			record.Set("message", err.Error())
			if err := m.cfg.App.Save(record); err != nil {
				m.logger.Error("failed to save pending record", slog.String("error", err.Error()))
				return
			}
			continue
		}

		action := AccountPublishAction(record.GetString("action"))
		switch action {
		case AccountPublishActionUpsert:
			err := m.publishAccountRecord(m.ctx, m.cfg.App, accountRecord)
			if err != nil {
				m.logger.DebugContext(m.ctx, "failed to publish account record", slog.String("error", err.Error()))
				record.Set("message", err.Error())
				if err := m.cfg.App.Save(record); err != nil {
					m.logger.Error("failed to save pending record", slog.String("error", err.Error()))
					return
				}

				continue
			}
			m.logger.InfoContext(m.ctx, "published account record", slog.String("id", record.Id))
			if err := m.cfg.App.Delete(record); err != nil {
				m.logger.Error("failed to delete pending record", slog.String("error", err.Error()))
				return
			}
		case AccountPublishActionDelete:
			err := m.publishAccountRecordRemoval(m.ctx, m.cfg.App, accountRecord)
			if err != nil {
				m.logger.DebugContext(m.ctx, "failed to publish account record removal", slog.String("error", err.Error()))
				record.Set("message", err.Error())
				if err := m.cfg.App.Save(record); err != nil {
					m.logger.Error("failed to save pending record", slog.String("error", err.Error()))
					return
				}
				continue
			}
			m.logger.InfoContext(m.ctx, "published account record removal", slog.String("id", record.Id))
			if err := m.cfg.App.Delete(record); err != nil {
				m.logger.Error("failed to delete pending record", slog.String("error", err.Error()))
				return
			}
		default:
			m.logger.Warn("unknown action type", slog.String("action", string(action)))
		}
	}
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

	// need to sign the claim with the operator's seed NOT the signing seed
	// issuer and subject have to be the same => during encoding, the issuer is set to the public key which is "public_key"
	operatorKP, err := nkeys.FromSeed([]byte(operatorRecord.GetString("seed")))
	if err != nil {
		return err
	}
	pruneJwt, err := claim.Encode(operatorKP)
	if err != nil {
		logger.ErrorContext(ctx, "Could not encode JWT", slog.String("error", err.Error()))
		return err
	}
	responseMessage, err := nc.Request("$SYS.REQ.CLAIMS.DELETE", []byte(pruneJwt), 5*time.Second)
	if err != nil {
		logger.ErrorContext(ctx, "Could not delete account from operator", slog.String("error", err.Error()))
		return err
	}
	logger.InfoContext(ctx, "Account removal response",
		slog.String("response", string(responseMessage.Data)),
		slog.String("jwt", pruneJwt),
		slog.String("operator_public_key", operatorRecord.GetString("public_key")),
		slog.String("account_public_key", record.GetString("public_key")))
	return nil
}
