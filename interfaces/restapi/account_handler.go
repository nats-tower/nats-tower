package restapi

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/pocketbase/pocketbase/core"

	"github.com/nats-tower/nats-tower/interfaces/restapi/utils"
	"github.com/nats-tower/nats-tower/natsauth"
)

// const (
// 	// format: stream_list.<installation_id>.<account_id>
// 	SubscriptionTypeStreamListPrefix = "stream_list."
// )

// func InitAccountsAPI(e *core.ServeEvent) {

// 	connectionLock := sync.Mutex{}
// 	activeConnections := map[string]*AccountConnection{}

// 	e.App.OnRealtimeSubscribeRequest().BindFunc(func(e *core.RealtimeSubscribeRequestEvent) error {
// 		for _, subscription := range e.Subscriptions {
// 			if !strings.HasPrefix(subscription, SubscriptionTypeStreamListPrefix) {
// 				continue
// 			}

// 			// parse installation_id and account_id
// 			parts := strings.Split(subscription, ".")
// 			if len(parts) != 3 {
// 				continue
// 			}

// 			installationID := parts[1]
// 			accountID := parts[2]

// 		}
// 		return nil
// 	})
// }

// func checkAuthorization(client subscriptions.Client) bool {
// 	// TODO: check authorization
// 	return true
// }

// func notify(app core.App, subscription string, data any) error {
// 	rawData, err := json.Marshal(data)
// 	if err != nil {
// 		return err
// 	}

// 	message := subscriptions.Message{
// 		Name: subscription,
// 		Data: rawData,
// 	}

// 	group := new(errgroup.Group)

// 	chunks := app.SubscriptionsBroker().ChunkedClients(300)

// 	for _, chunk := range chunks {
// 		group.Go(func() error {
// 			for _, client := range chunk {
// 				if !client.HasSubscription(subscription) {
// 					continue
// 				}

// 				if !checkAuthorization(client) {
// 					continue
// 				}

// 				client.Send(message)
// 			}

// 			return nil
// 		})
// 	}

// 	return group.Wait()
// }

// type AccountConnection struct {
// 	ctx    context.Context
// 	cancel context.CancelFunc
// 	nc     *nats.Conn
// }

type accountDetailResponse struct {
	Data  *server.AccountDetail `json:"data"`
	Error *server.ApiError      `json:"error"`
}

func getAccountDetails(e *core.RequestEvent, installationID, accountID string) (*server.AccountDetail, error) {
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

	respMsg, err := nc.Request(fmt.Sprintf("$SYS.REQ.ACCOUNT.%s.JSZ", accountID),
		[]byte(`{"streams":true}`), 5*time.Second)
	if err != nil {
		return nil, err
	}

	resp := &accountDetailResponse{}
	err = json.Unmarshal(respMsg.Data, resp)
	if err != nil {
		return nil, err
	}

	if resp.Error != nil && (strings.Contains(resp.Error.Description, "not jetstream enabled") || strings.Contains(resp.Error.Description, "not found")) {
		return nil, nil
	}

	if resp.Data == nil {
		return nil, fmt.Errorf("Account not found")
	}

	return resp.Data, nil
}

type streamList struct {
	Streams []server.StreamDetail `json:"streams"`
}

func GetStreamList(e *core.RequestEvent, installationID, accountID string) error {

	if installationID == "" || accountID == "" {
		return e.Error(http.StatusBadRequest, "installation_id and account_id are required", nil)
	}
	natsauthModule := utils.MustGetNATSAuth(e)

	sysUserAuth, err := natsauthModule.GetSysUserByID(e.Request.Context(), installationID)
	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to get sys user", err)
	}

	record, err := e.App.FindRecordById("nats_auth_operators", installationID)
	if err != nil {
		e.App.Logger().Error("Failed to find installation",
			slog.String("id", installationID),
			slog.String("error", err.Error()))
		return e.Error(http.StatusInternalServerError, "Failed to find installation", err)
	}

	installation, err := natsauth.GetOperatorFromRecord(record)
	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to get operator", err)
	}

	accountRecord, err := e.App.FindRecordById("nats_auth_accounts", accountID)
	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to find account", err)
	}

	account, err := natsauth.GetAccountFromRecord(accountRecord, installation.URL)
	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to get account", err)
	}

	nc, err := nats.Connect(sysUserAuth.URL, nats.UserJWTAndSeed(sysUserAuth.JWT, sysUserAuth.Seed))
	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to connect to NATS", err)
	}
	defer nc.Close()

	clusterInfo, err := getClusterInfoWithConnection(e.Request.Context(), natsauthModule, nc)
	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to get cluster info", err)
	}

	currentState := &streamList{
		Streams: []server.StreamDetail{},
	}

	_, err = natsauth.RequestMultiple(e.Request.Context(),
		nc,
		fmt.Sprintf("$SYS.REQ.ACCOUNT.%s.JSZ", account.PublicKey),
		[]byte(`{"streams":true}`),
		natsauth.RequestMultipleOptions{
			EachFunc: func(m *nats.Msg) bool {
				resp := &accountDetailResponse{}
				err = json.Unmarshal(m.Data, resp)
				if err != nil {
					return false
				}
				if resp.Error != nil && (strings.Contains(resp.Error.Description, "not jetstream enabled") || strings.Contains(resp.Error.Description, "not found")) {
					return true
				}
				if resp.Data == nil {
					return true
				}
				// merge with existing streams
				for _, stream := range resp.Data.Streams {
					found := false
					for _, existingStream := range currentState.Streams {
						if existingStream.Name == stream.Name {
							found = true
							break
						}
					}
					if !found {
						currentState.Streams = append(currentState.Streams, stream)
					}
				}

				return true
			},
			MaxResponses: clusterInfo[0].Stats.ActiveServers,
			Timeout:      5 * time.Second,
		},
	)

	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to get streams", err)
	}

	return e.JSON(http.StatusOK, currentState)
}

// func StreamStreamCount(e *core.RequestEvent, eventChannel chan *SSEEvent) {
// 	installationID := e.Request.URL.Query().Get("installation_id")
// 	accountID := e.Request.URL.Query().Get("account_id")

// 	if installationID == "" || accountID == "" {
// 		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
// 			Error: fmt.Errorf("installation_id and account_id are required"),
// 		})
// 		return
// 	}
// 	natsauthModule := utils.MustGetNATSAuth(e)

// 	sysUserAuth, err := natsauthModule.GetSysUserByID(e.Request.Context(), installationID)
// 	if err != nil {
// 		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
// 			Error: err,
// 		})
// 		return
// 	}

// 	record, err := e.App.FindRecordById("nats_auth_operators", installationID)
// 	if err != nil {
// 		e.App.Logger().Error("Failed to find installation",
// 			slog.String("id", installationID),
// 			slog.String("error", err.Error()))
// 		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
// 			Error: err,
// 		})
// 		return
// 	}

// 	installation, err := natsauth.GetOperatorFromRecord(record)
// 	if err != nil {
// 		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
// 			Error: err,
// 		})
// 		return
// 	}

// 	accountRecord, err := e.App.FindRecordById("nats_auth_accounts", accountID)
// 	if err != nil {
// 		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
// 			Error: err,
// 		})
// 		return
// 	}

// 	account, err := natsauth.GetAccountFromRecord(accountRecord, installation.URL)
// 	if err != nil {
// 		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
// 			Error: err,
// 		})
// 		return
// 	}

// 	nc, err := nats.Connect(sysUserAuth.URL, nats.UserJWTAndSeed(sysUserAuth.JWT, sysUserAuth.Seed))
// 	if err != nil {
// 		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
// 			Error: err,
// 		})
// 		return
// 	}
// 	defer nc.Close()

// 	msgChannel, err := natsauth.RequestMultipleChannel(e.Request.Context(),
// 		nc,
// 		fmt.Sprintf("$SYS.REQ.ACCOUNT.%s.JSZ", account.PublicKey),
// 		[]byte(`{"streams":true}`),
// 		natsauth.RequestMultipleChannelOptions{})
// 	if err != nil {
// 		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
// 			Error: err,
// 		})
// 		return
// 	}
// 	currentState := &streamList{}
// 	for {
// 		select {
// 		case <-e.Request.Context().Done():
// 			return
// 		case msg := <-msgChannel:
// 			resp := &accountDetailResponse{}
// 			err = json.Unmarshal(msg.Data, resp)
// 			if err != nil {
// 				WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
// 					Error: err,
// 				})
// 				return
// 			}
// 			if resp.Error != nil && (strings.Contains(resp.Error.Description, "not jetstream enabled") || strings.Contains(resp.Error.Description, "not found")) {
// 				continue // ignore
// 			}
// 			if resp.Data == nil {
// 				continue // ignore
// 			}

// 			// merge with existing streams
// 			for _, stream := range resp.Data.Streams {
// 				found := false
// 				for _, existingStream := range currentState.Streams {
// 					if existingStream.Name == stream.Name {
// 						found = true
// 						break
// 					}
// 				}
// 				if !found {
// 					currentState.Streams = append(currentState.Streams, stream)
// 				}
// 			}

// 			WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
// 				Event: "stream_count",
// 				Data:  fmt.Sprintf("<span>%d</span>", len(currentState.Streams)),
// 			})
// 		}
// 	}

// }
