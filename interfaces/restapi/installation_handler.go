package restapi

import (
	"context"
	"encoding/json"
	"sort"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/pocketbase/pocketbase/core"

	"github.com/nats-tower/nats-tower/interfaces/restapi/utils"
	"github.com/nats-tower/nats-tower/natsauth"
)

func getClusterInfo(e *core.RequestEvent, installationID string) ([]*server.ServerStatsMsg, error) {
	natsauthModule := utils.MustGetNATSAuth(e)

	sysUserAuth, err := natsauthModule.GetSysUserByID(e.Request.Context(), installationID)
	if err != nil {
		return nil, err
	}

	nc, err := nats.Connect(sysUserAuth.URL, nats.UserJWTAndSeed(sysUserAuth.JWT, sysUserAuth.Seed))
	if err != nil {
		return nil, err
	}

	defer nc.Close()

	return getClusterInfoWithConnection(e.Request.Context(), natsauthModule, nc)
}

func getClusterInfoWithConnection(ctx context.Context,
	natsauthModule *natsauth.NATSAuthModule,
	nc *nats.Conn) ([]*server.ServerStatsMsg, error) {

	var serverInfos []*server.ServerStatsMsg

	_, err := natsauth.RequestMultiple(ctx,
		nc,
		"$SYS.REQ.SERVER.PING",
		[]byte("{}"),
		natsauth.RequestMultipleOptions{
			Timeout:      5 * time.Second,
			MaxResponses: -1,
			EachFunc: func(m *nats.Msg) bool {
				serverInfo := &server.ServerStatsMsg{}
				err := json.Unmarshal(m.Data, serverInfo)
				if err != nil {
					return false
				}

				serverInfos = append(serverInfos, serverInfo)

				// stop receiving messages if we have all the servers
				return len(serverInfos) < serverInfo.Stats.ActiveServers
			},
		})
	if err != nil {
		return nil, err
	}

	// sort servers by name
	sort.Slice(serverInfos, func(i, j int) bool {
		return serverInfos[i].Server.Name < serverInfos[j].Server.Name
	})

	return serverInfos, nil
}
