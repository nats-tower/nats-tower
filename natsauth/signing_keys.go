package natsauth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	jwt "github.com/nats-io/jwt/v2"
	"github.com/nats-io/nkeys"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// decodeAccountClaimsResilient decodes account claims, repairing a known
// corruption where scoped signing keys were serialized with a numeric "kind"
// (e.g. "kind":1) instead of the expected "kind":"user_scope". Such JWTs were
// produced by an earlier bug and can no longer be decoded by the jwt library.
func decodeAccountClaimsResilient(token string) (*jwt.AccountClaims, error) {
	claims, err := jwt.DecodeAccountClaims(token)
	if err == nil {
		return claims, nil
	}

	repaired, rerr := repairAccountClaimsToken(token)
	if rerr != nil {
		// Could not repair, surface the original decode error.
		return nil, err
	}
	return repaired, nil
}

func repairAccountClaimsToken(token string) (*jwt.AccountClaims, error) {
	chunks := strings.Split(token, ".")
	if len(chunks) != 3 {
		return nil, fmt.Errorf("invalid jwt: expected 3 chunks")
	}

	payload, err := base64.RawURLEncoding.DecodeString(chunks[1])
	if err != nil {
		return nil, err
	}

	var raw map[string]any
	if err := json.Unmarshal(payload, &raw); err != nil {
		return nil, err
	}

	nats, ok := raw["nats"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("jwt has no nats claims")
	}

	signingKeys, ok := nats["signing_keys"].([]any)
	if !ok {
		return nil, fmt.Errorf("jwt has no scoped signing keys to repair")
	}

	repaired := false
	for _, entry := range signingKeys {
		obj, ok := entry.(map[string]any)
		if !ok {
			continue
		}
		// A string "kind" is already valid; a numeric kind is the corruption.
		if _, isString := obj["kind"].(string); isString {
			continue
		}
		if _, hasKind := obj["kind"]; hasKind {
			obj["kind"] = jwt.UserScopeType.String()
			repaired = true
		}
	}

	if !repaired {
		return nil, fmt.Errorf("nothing to repair")
	}

	fixed, err := json.Marshal(raw)
	if err != nil {
		return nil, err
	}

	var claims jwt.AccountClaims
	if err := json.Unmarshal(fixed, &claims); err != nil {
		return nil, err
	}
	return &claims, nil
}

func stringSliceFromRecordField(value any) []string {
	if value == nil {
		return nil
	}

	switch v := value.(type) {
	case []string:
		return v
	case []any:
		return stringSliceFromAnySlice(v)
	case string:
		return stringSliceFromJSONBytes([]byte(v))
	case []byte:
		return stringSliceFromJSONBytes(v)
	case json.RawMessage:
		return stringSliceFromJSONBytes(v)
	case types.JSONRaw:
		return stringSliceFromJSONBytes(v)
	default:
		return nil
	}
}

func stringSliceFromAnySlice(items []any) []string {
	result := make([]string, 0, len(items))
	for _, item := range items {
		if s, ok := item.(string); ok && s != "" {
			result = append(result, s)
		}
	}
	return result
}

func stringSliceFromJSONBytes(data []byte) []string {
	trimmed := strings.TrimSpace(string(data))
	if trimmed == "" || trimmed == "null" {
		return nil
	}

	var items []any
	if err := json.Unmarshal([]byte(trimmed), &items); err != nil {
		return nil
	}
	return stringSliceFromAnySlice(items)
}

func buildUserScopeFromSigningKeyRecord(record *core.Record) *jwt.UserScope {
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

	return scope
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

	accountClaims, err := decodeAccountClaimsResilient(accountRecord.GetString("jwt"))
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

	accountClaims, err := decodeAccountClaimsResilient(accountRecord.GetString("jwt"))
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
