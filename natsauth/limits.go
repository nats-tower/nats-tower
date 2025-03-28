package natsauth

import (
	"context"
	"fmt"

	jwt "github.com/nats-io/jwt/v2"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

func (m *NATSAuthModule) getAccountLimits(_ context.Context,
	dao core.App,
	operatorID string,
	accRec *core.Record) (*jwt.OperatorLimits, error) {

	limitID := accRec.GetString("limits")

	// check if we have a limit record
	if limitID != "" {
		accountLimitRecords, err := dao.FindAllRecords("nats_auth_limits", dbx.HashExp{
			"id":       limitID,
			"operator": operatorID,
		})
		if err != nil {
			return nil, err
		}

		if len(accountLimitRecords) == 0 {
			return nil, fmt.Errorf("limit record not found")
		}

		accountLimitRecord := accountLimitRecords[0]

		// transform to jwt.OperatorLimits
		limits := &jwt.OperatorLimits{
			JetStreamLimits: jwt.JetStreamLimits{
				DiskStorage:          int64(accountLimitRecord.GetFloat("jetstream_max_disk")),
				MemoryStorage:        int64(accountLimitRecord.GetFloat("jetstream_max_memory")),
				MaxAckPending:        jwt.NoLimit,
				MemoryMaxStreamBytes: 0,
				DiskMaxStreamBytes:   0,
				Consumer:             jwt.NoLimit,
				Streams:              jwt.NoLimit,
			},
			AccountLimits: jwt.AccountLimits{
				Conn:            int64(accountLimitRecord.GetFloat("max_connections")),
				LeafNodeConn:    jwt.NoLimit,
				Imports:         jwt.NoLimit,
				Exports:         jwt.NoLimit,
				WildcardExports: true,
			},
			NatsLimits: jwt.NatsLimits{
				Subs:    jwt.NoLimit,
				Data:    jwt.NoLimit,
				Payload: jwt.NoLimit,
			},
		}

		return limits, nil
	}

	// check if we have a default limit record
	defaultAccountLimitRecord, err := dao.FindAllRecords("nats_auth_limits",
		dbx.HashExp{
			"default":  true,
			"type":     "account",
			"operator": operatorID,
		})
	if err != nil {
		return nil, err
	}
	if len(defaultAccountLimitRecord) == 0 {

		// no default limit record found => return no limits
		return &jwt.OperatorLimits{
			JetStreamLimits: jwt.JetStreamLimits{
				DiskStorage:          jwt.NoLimit,
				MemoryStorage:        jwt.NoLimit,
				MaxAckPending:        jwt.NoLimit,
				MemoryMaxStreamBytes: 0,
				DiskMaxStreamBytes:   0,
				Consumer:             jwt.NoLimit,
				Streams:              jwt.NoLimit,
			},
			AccountLimits: jwt.AccountLimits{
				Conn:            jwt.NoLimit,
				LeafNodeConn:    jwt.NoLimit,
				Imports:         jwt.NoLimit,
				Exports:         jwt.NoLimit,
				WildcardExports: true,
			},
			NatsLimits: jwt.NatsLimits{
				Subs:    jwt.NoLimit,
				Data:    jwt.NoLimit,
				Payload: jwt.NoLimit,
			},
		}, nil
	}

	// transform to jwt.OperatorLimits
	limits := &jwt.OperatorLimits{
		JetStreamLimits: jwt.JetStreamLimits{
			DiskStorage:          int64(defaultAccountLimitRecord[0].GetFloat("jetstream_max_disk")),
			MemoryStorage:        int64(defaultAccountLimitRecord[0].GetFloat("jetstream_max_memory")),
			MaxAckPending:        jwt.NoLimit,
			MemoryMaxStreamBytes: 0,
			DiskMaxStreamBytes:   0,
			Consumer:             jwt.NoLimit,
			Streams:              jwt.NoLimit,
		},
		AccountLimits: jwt.AccountLimits{
			Conn:            int64(defaultAccountLimitRecord[0].GetFloat("max_connections")),
			LeafNodeConn:    jwt.NoLimit,
			Imports:         jwt.NoLimit,
			Exports:         jwt.NoLimit,
			WildcardExports: true,
		},
		NatsLimits: jwt.NatsLimits{
			Subs:    jwt.NoLimit,
			Data:    jwt.NoLimit,
			Payload: jwt.NoLimit,
		},
	}

	return limits, nil
}
