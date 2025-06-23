package natsauth

import (
	"encoding/json"

	"github.com/nats-io/jwt/v2"
	"github.com/pocketbase/pocketbase/core"
)

func enrichWriteRequestWithUserPermissions(
	e *core.RecordRequestEvent) error {
	if e.Record.TableName() != "nats_auth_users" {
		return nil
	}
	info, _ := e.RequestInfo()
	if info.Body == nil {
		return e.Next()
	}

	if perm, ok := info.Body["permissions"]; ok {
		e.Record.Set("permissions", perm)
	}

	return nil
}

func getUserPermissionsFromRecord(
	record *core.Record) (*jwt.Permissions, error) {
	if record == nil {
		return nil, nil
	}

	perm := jwt.Permissions{}
	s := record.GetString("permissions")
	if s == "" {
		return nil, nil
	}

	err := json.Unmarshal([]byte(s), &perm)
	if err != nil {
		return nil, err
	}

	return &perm, nil
}

func enrichUserRecordWithPermissions(
	record *core.Record) error {

	claims, err := jwt.DecodeUserClaims(record.GetString("jwt"))
	if err != nil {
		return err
	}

	b, err := json.Marshal(claims.Permissions)
	if err != nil {
		return err
	}
	record.Set("permissions", json.RawMessage(b))
	return nil
}
