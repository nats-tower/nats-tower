package natsauth

import (
	"context"

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
