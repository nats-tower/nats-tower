package natsauth

import (
	"context"
	"fmt"
	"log/slog"

	jwt "github.com/nats-io/jwt/v2"
	"github.com/nats-io/nkeys"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

func stringSliceFromRecordField(value any) []string {
	if value == nil {
		return nil
	}

	switch v := value.(type) {
	case []string:
		return v
	case []any:
		result := make([]string, 0, len(v))
		for _, item := range v {
			if s, ok := item.(string); ok && s != "" {
				result = append(result, s)
			}
		}
		return result
	default:
		return nil
	}
}

func buildUserScopeFromSigningKeyRecord(record *core.Record) jwt.UserScope {
	scope := jwt.NewUserScope()
	scope.Key = record.GetString("public_key")
	scope.Role = record.GetString("role")

	pubPerms := stringSliceFromRecordField(record.Get("publish"))
	subPerms := stringSliceFromRecordField(record.Get("subscribe"))

	if len(pubPerms) > 0 {
		scope.Template.Permissions.Pub.Allow = pubPerms
	}
	if len(subPerms) > 0 {
		scope.Template.Permissions.Sub.Allow = subPerms
	}

	return *scope
}

func (m *NATSAuthModule) syncSigningKeyScopeToAccount(ctx context.Context,
	dao core.App,
	signingKeyRecord *core.Record) error {
	logger := m.logger.With(
		slog.String("hook", "syncSigningKeyScopeToAccount"),
		slog.String("signing_key_id", signingKeyRecord.Id),
	)

	accountRecord, err := dao.FindRecordById("nats_auth_accounts", signingKeyRecord.GetString("account"))
	if err != nil {
		return err
	}

	operatorRecord, err := dao.FindRecordById("nats_auth_operators", accountRecord.GetString("operator"))
	if err != nil {
		return err
	}

	operatorKP, err := nkeys.FromSeed([]byte(operatorRecord.GetString("sign_seed")))
	if err != nil {
		return err
	}

	accountClaims, err := jwt.DecodeAccountClaims(accountRecord.GetString("jwt"))
	if err != nil {
		logger.ErrorContext(ctx, "Could not decode account claims", slog.String("error", err.Error()))
		return err
	}

	scope := buildUserScopeFromSigningKeyRecord(signingKeyRecord)
	accountClaims.SigningKeys.AddScopedSigner(scope)

	jwtValue, err := accountClaims.Encode(operatorKP)
	if err != nil {
		return err
	}

	accountRecord.Set("jwt", jwtValue)
	if err := dao.UnsafeWithoutHooks().Save(accountRecord); err != nil {
		logger.ErrorContext(ctx, "Could not save account with signing key scope",
			slog.String("error", err.Error()))
		return err
	}

	return nil
}

func (m *NATSAuthModule) removeSigningKeyFromAccount(ctx context.Context,
	dao core.App,
	signingKeyRecord *core.Record) error {
	logger := m.logger.With(
		slog.String("hook", "removeSigningKeyFromAccount"),
		slog.String("signing_key_id", signingKeyRecord.Id),
	)

	publicKey := signingKeyRecord.GetString("public_key")
	if publicKey == "" {
		return nil
	}

	accountRecord, err := dao.FindRecordById("nats_auth_accounts", signingKeyRecord.GetString("account"))
	if err != nil {
		return err
	}

	operatorRecord, err := dao.FindRecordById("nats_auth_operators", accountRecord.GetString("operator"))
	if err != nil {
		return err
	}

	operatorKP, err := nkeys.FromSeed([]byte(operatorRecord.GetString("sign_seed")))
	if err != nil {
		return err
	}

	accountClaims, err := jwt.DecodeAccountClaims(accountRecord.GetString("jwt"))
	if err != nil {
		logger.ErrorContext(ctx, "Could not decode account claims", slog.String("error", err.Error()))
		return err
	}

	accountClaims.SigningKeys.Remove(publicKey)

	jwtValue, err := accountClaims.Encode(operatorKP)
	if err != nil {
		return err
	}

	accountRecord.Set("jwt", jwtValue)
	if err := dao.UnsafeWithoutHooks().Save(accountRecord); err != nil {
		logger.ErrorContext(ctx, "Could not save account after removing signing key",
			slog.String("error", err.Error()))
		return err
	}

	return nil
}

func (m *NATSAuthModule) publishAccountUpdate(ctx context.Context,
	dao core.App,
	accountRecord *core.Record) error {
	if accountRecord.GetString("name") == "SYS" {
		return nil
	}

	_, err := m.requestAccountPublish(ctx, dao, accountRecord, AccountPublishActionUpsert)
	if err != nil {
		return err
	}

	m.handlePendingAccountActions(accountRecord.Id)
	return nil
}

func signingKeyUsersCount(app core.App, signingKeyID string) (int, error) {
	users, err := app.FindAllRecords("nats_auth_users", dbx.HashExp{
		"signing_key": signingKeyID,
	})
	if err != nil {
		return 0, err
	}
	return len(users), nil
}

func validateSigningKeyAccount(signingKeyRecord, accountRecord *core.Record) error {
	if signingKeyRecord.GetString("account") != accountRecord.Id {
		return fmt.Errorf("signing key does not belong to this account")
	}
	return nil
}
