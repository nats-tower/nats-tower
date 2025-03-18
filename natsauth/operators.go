package natsauth

import (
	"context"

	"github.com/nats-tower/nats-tower/application"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

func (m *NATSAuthModule) GetOperator(ctx context.Context, url string) (*application.OperatorAuth, error) {
	return m.getOperator(ctx, m.cfg.App, url)
}

func (m *NATSAuthModule) getOperator(_ context.Context,
	dao core.App, url string) (*application.OperatorAuth, error) {
	operatorRecord, err := dao.FindAllRecords("nats_auth_operators",
		dbx.HashExp{
			"url": url,
		})
	if err != nil {
		return nil, err
	}
	if len(operatorRecord) == 0 {
		return nil, ErrNotFound
	}

	return GetOperatorFromRecord(operatorRecord[0])
}

func GetOperatorFromRecord(record *core.Record) (*application.OperatorAuth, error) {
	return &application.OperatorAuth{
		ID:                record.Id,
		URL:               record.GetString("url"),
		Description:       record.GetString("description"),
		PublicKey:         record.GetString("public_key"),
		PrivateKey:        record.GetString("private_key"),
		Seed:              record.GetString("seed"),
		SigningPublicKey:  record.GetString("sign_public_key"),
		SigningPrivateKey: record.GetString("sign_private_key"),
		SigningSeed:       record.GetString("sign_seed"),
		JWT:               record.GetString("jwt"),
	}, nil
}

func (m *NATSAuthModule) GetOperatorByID(_ context.Context, id string) (*application.OperatorAuth, error) {
	operatorRecord, err := m.cfg.App.FindRecordById("nats_auth_operators", id)
	if err != nil {
		return nil, err
	}

	return GetOperatorFromRecord(operatorRecord)
}
