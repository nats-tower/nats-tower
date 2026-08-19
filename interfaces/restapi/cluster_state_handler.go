package restapi

import (
	"encoding/json"
	"net/http"
	"sort"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"

	"github.com/nats-tower/nats-tower/interfaces/restapi/utils"
	"github.com/nats-tower/nats-tower/natsauth"
)

// clusterStateStreamAccount groups the streams of a single account, mirroring
// the per-account output of `nats stream report --all`.
type clusterStateStreamAccount struct {
	AccountID   string                `json:"account_id"`
	AccountKey  string                `json:"account_key"`
	AccountName string                `json:"account_name"`
	Streams     []server.StreamDetail `json:"streams"`
}

// clusterStateResponse contains the combined output of
// `nats server report jetstream` (per-server JetStream info) and
// `nats stream report --all` (streams grouped per account).
type clusterStateResponse struct {
	JetStream []*server.ServerAPIJszResponse `json:"jetstream"`
	Accounts  []clusterStateStreamAccount    `json:"accounts"`
}

// GetClusterState returns cluster-wide JetStream diagnostics. It is restricted
// to superusers because it exposes information across every account.
func GetClusterState(e *core.RequestEvent, installationID string) error {
	if installationID == "" {
		return e.Error(http.StatusBadRequest, "installation_id is required", nil)
	}

	if !e.HasSuperuserAuth() {
		return e.Error(http.StatusForbidden, "Only admins can access the cluster state", nil)
	}

	natsauthModule := utils.MustGetNATSAuth(e)
	ctx := e.Request.Context()

	sysUserAuth, err := natsauthModule.GetSysUserByID(ctx, installationID)
	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to get sys user", err)
	}

	nc, err := nats.Connect(sysUserAuth.URL, nats.UserJWTAndSeed(sysUserAuth.JWT, sysUserAuth.Seed))
	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to connect to NATS", err)
	}
	defer nc.Close()

	clusterInfo, err := getClusterInfoWithConnection(ctx, natsauthModule, nc)
	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to get cluster info", err)
	}

	activeServers := -1
	if len(clusterInfo) > 0 {
		activeServers = clusterInfo[0].Stats.ActiveServers
	}

	// Resolve account public keys to the tower account names/ids.
	accountByKey := map[string]*core.Record{}
	accountRecords, err := e.App.FindAllRecords("nats_auth_accounts",
		dbx.HashExp{"operator": installationID})
	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to list accounts", err)
	}
	for _, record := range accountRecords {
		accountByKey[record.GetString("public_key")] = record
	}

	// A single JSZ ping (issued from the SYS account/user) yields both the
	// per-server JetStream report and the per-account stream details.
	jszResponses := []*server.ServerAPIJszResponse{}
	// account key -> stream name -> detail (deduplicated across replicas).
	streamsByAccount := map[string]map[string]server.StreamDetail{}
	accountKeyOrder := []string{}

	_, err = natsauth.RequestMultiple(ctx, nc,
		"$SYS.REQ.SERVER.PING.JSZ",
		[]byte(`{"accounts":true,"streams":true}`),
		natsauth.RequestMultipleOptions{
			MaxResponses: activeServers,
			Timeout:      5 * time.Second,
			EachFunc: func(m *nats.Msg) bool {
				resp := &server.ServerAPIJszResponse{}
				if jsonErr := json.Unmarshal(m.Data, resp); jsonErr != nil {
					return true
				}

				serverName := ""
				if resp.Server != nil {
					serverName = resp.Server.Name
				}

				if resp.Data != nil {
					for _, accountDetail := range resp.Data.AccountDetails {
						mergeAccountStreams(streamsByAccount, &accountKeyOrder, serverName, accountDetail)
					}
					// Account details are returned separately, so drop them from
					// the server report to keep the payload small.
					resp.Data.AccountDetails = nil
				}

				jszResponses = append(jszResponses, resp)
				return true
			},
		})
	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to get JetStream report", err)
	}

	sort.Slice(jszResponses, func(i, j int) bool {
		return jszServerName(jszResponses[i]) < jszServerName(jszResponses[j])
	})

	accounts := make([]clusterStateStreamAccount, 0, len(accountKeyOrder))
	for _, accountKey := range accountKeyOrder {
		streamMap := streamsByAccount[accountKey]

		streams := make([]server.StreamDetail, 0, len(streamMap))
		for _, stream := range streamMap {
			streams = append(streams, stream)
		}
		sort.Slice(streams, func(i, j int) bool {
			return streams[i].Name < streams[j].Name
		})

		entry := clusterStateStreamAccount{
			AccountKey: accountKey,
			Streams:    streams,
		}
		if record, ok := accountByKey[accountKey]; ok {
			entry.AccountID = record.Id
			entry.AccountName = record.GetString("name")
		}
		if entry.AccountName == "" {
			entry.AccountName = accountKey
		}
		accounts = append(accounts, entry)
	}

	sort.Slice(accounts, func(i, j int) bool {
		return accounts[i].AccountName < accounts[j].AccountName
	})

	return e.JSON(http.StatusOK, &clusterStateResponse{
		JetStream: jszResponses,
		Accounts:  accounts,
	})
}

// mergeAccountStreams collects the streams for an account across all servers,
// deduplicating by stream name and preferring the copy reported by the stream's
// leader (which holds the authoritative state).
func mergeAccountStreams(streamsByAccount map[string]map[string]server.StreamDetail,
	accountKeyOrder *[]string,
	serverName string,
	accountDetail *server.AccountDetail) {

	if accountDetail == nil {
		return
	}

	accountKey := accountDetail.Id
	if accountKey == "" {
		accountKey = accountDetail.Name
	}

	streamMap, ok := streamsByAccount[accountKey]
	if !ok {
		streamMap = map[string]server.StreamDetail{}
		streamsByAccount[accountKey] = streamMap
		*accountKeyOrder = append(*accountKeyOrder, accountKey)
	}

	for _, stream := range accountDetail.Streams {
		_, exists := streamMap[stream.Name]
		// Prefer the copy produced by the stream's own leader (authoritative
		// state); otherwise keep the first copy seen.
		if !exists || streamReportedByLeader(stream, serverName) {
			streamMap[stream.Name] = stream
		}
	}
}

func streamReportedByLeader(stream server.StreamDetail, serverName string) bool {
	return stream.Cluster != nil && stream.Cluster.Leader == serverName
}

func jszServerName(resp *server.ServerAPIJszResponse) string {
	if resp.Server == nil {
		return ""
	}
	return resp.Server.Name
}
