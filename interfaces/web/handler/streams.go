package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-tower/nats-tower/interfaces/web/utils"
	"github.com/nats-tower/nats-tower/interfaces/web/views/layouts"
	"github.com/nats-tower/nats-tower/interfaces/web/views/pages"
	"github.com/nats-tower/nats-tower/natsauth"
	"github.com/pocketbase/pocketbase/core"
)

func GetStreams(e *core.RequestEvent, installationID, accountID string) error {
	record, err := e.App.FindRecordById("nats_auth_operators", installationID)
	if err != nil {
		e.App.Logger().Error("Failed to find installation",
			slog.String("id", installationID),
			slog.String("error", err.Error()))
		return e.Redirect(http.StatusFound, "/installations")
	}

	installation, err := natsauth.GetOperatorFromRecord(record)
	if err != nil {
		return e.InternalServerError("Failed to get operator from record", err)
	}

	accountRecord, err := e.App.FindRecordById("nats_auth_accounts", accountID)
	if err != nil {
		return e.InternalServerError("Failed to find accounts", err)
	}

	account, err := natsauth.GetAccountFromRecord(accountRecord, installation.URL)
	if err != nil {
		return e.InternalServerError("Failed to get account from record", err)
	}

	accountDetails, err := getAccountDetails(e, installation.ID, account.PublicKey)
	if err != nil {
		return e.InternalServerError("Failed to get account details", err)
	}

	model := pages.StreamsModel{
		RequestEvent:  e,
		Installation:  installation,
		Account:       account,
		AccountDetail: accountDetails,
	}

	return layouts.WithBase(pages.Streams(model), layouts.BaseModel{
		Title:       "NATS Tower - " + installation.Description,
		Description: "blabla",
		NavigationModel: layouts.NavigationModel{
			CurrentLocation: "/ui/installations/" + installation.ID + "/accounts/" + account.ID + "/streams",
			InstallationID:  installation.ID,
			AccountID:       account.ID,
			Swap:            true,
		},
		RequestEvent: e,
	}).Render(e.Request.Context(), e.Response)
}

type streamList struct {
	Streams []server.StreamDetail
}

func StreamStreamList(e *core.RequestEvent, eventChannel chan *SSEEvent) {
	installationID := e.Request.URL.Query().Get("installation_id")
	accountID := e.Request.URL.Query().Get("account_id")

	if installationID == "" || accountID == "" {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: fmt.Errorf("installation_id and account_id are required"),
		})
		return
	}
	natsauthModule := utils.MustGetNATSAuth(e)

	sysUserAuth, err := natsauthModule.GetSysUserByID(e.Request.Context(), installationID)
	if err != nil {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}

	record, err := e.App.FindRecordById("nats_auth_operators", installationID)
	if err != nil {
		e.App.Logger().Error("Failed to find installation",
			slog.String("id", installationID),
			slog.String("error", err.Error()))
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}

	installation, err := natsauth.GetOperatorFromRecord(record)
	if err != nil {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}

	accountRecord, err := e.App.FindRecordById("nats_auth_accounts", accountID)
	if err != nil {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}

	account, err := natsauth.GetAccountFromRecord(accountRecord, installation.URL)
	if err != nil {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}

	nc, err := nats.Connect(sysUserAuth.URL, nats.UserJWTAndSeed(sysUserAuth.JWT, sysUserAuth.Seed))
	if err != nil {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}
	defer nc.Close()

	msgChannel, err := natsauth.RequestMultipleChannel(e.Request.Context(),
		nc,
		fmt.Sprintf("$SYS.REQ.ACCOUNT.%s.JSZ", account.PublicKey),
		[]byte(`{"streams":true}`),
		natsauth.RequestMultipleChannelOptions{})
	if err != nil {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}
	currentState := &streamList{}
	for {
		select {
		case <-e.Request.Context().Done():
			return
		case msg := <-msgChannel:
			resp := &accountDetailResponse{}
			err = json.Unmarshal(msg.Data, resp)
			if err != nil {
				WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
					Error: err,
				})
				return
			}
			if resp.Error != nil && (strings.Contains(resp.Error.Description, "not jetstream enabled") || strings.Contains(resp.Error.Description, "not found")) {
				continue // ignore
			}
			if resp.Data == nil {
				continue // ignore
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
			buf := new(bytes.Buffer)

			err = pages.StreamList(pages.StreamListModel{
				Streams: currentState.Streams,
			}).Render(e.Request.Context(), buf)
			if err != nil {
				WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
					Error: err,
				})
				return
			}

			WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
				Event: "stream_list",
				Data:  buf.String(),
			})
		}
	}

}

func StreamStreamCount(e *core.RequestEvent, eventChannel chan *SSEEvent) {
	installationID := e.Request.URL.Query().Get("installation_id")
	accountID := e.Request.URL.Query().Get("account_id")

	if installationID == "" || accountID == "" {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: fmt.Errorf("installation_id and account_id are required"),
		})
		return
	}
	natsauthModule := utils.MustGetNATSAuth(e)

	sysUserAuth, err := natsauthModule.GetSysUserByID(e.Request.Context(), installationID)
	if err != nil {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}

	record, err := e.App.FindRecordById("nats_auth_operators", installationID)
	if err != nil {
		e.App.Logger().Error("Failed to find installation",
			slog.String("id", installationID),
			slog.String("error", err.Error()))
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}

	installation, err := natsauth.GetOperatorFromRecord(record)
	if err != nil {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}

	accountRecord, err := e.App.FindRecordById("nats_auth_accounts", accountID)
	if err != nil {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}

	account, err := natsauth.GetAccountFromRecord(accountRecord, installation.URL)
	if err != nil {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}

	nc, err := nats.Connect(sysUserAuth.URL, nats.UserJWTAndSeed(sysUserAuth.JWT, sysUserAuth.Seed))
	if err != nil {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}
	defer nc.Close()

	msgChannel, err := natsauth.RequestMultipleChannel(e.Request.Context(),
		nc,
		fmt.Sprintf("$SYS.REQ.ACCOUNT.%s.JSZ", account.PublicKey),
		[]byte(`{"streams":true}`),
		natsauth.RequestMultipleChannelOptions{})
	if err != nil {
		WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
			Error: err,
		})
		return
	}
	currentState := &streamList{}
	for {
		select {
		case <-e.Request.Context().Done():
			return
		case msg := <-msgChannel:
			resp := &accountDetailResponse{}
			err = json.Unmarshal(msg.Data, resp)
			if err != nil {
				WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
					Error: err,
				})
				return
			}
			if resp.Error != nil && (strings.Contains(resp.Error.Description, "not jetstream enabled") || strings.Contains(resp.Error.Description, "not found")) {
				continue // ignore
			}
			if resp.Data == nil {
				continue // ignore
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

			WriteSSEEvent(e.Request.Context(), eventChannel, &SSEEvent{
				Event: "stream_count",
				Data:  fmt.Sprintf("<span>%d</span>", len(currentState.Streams)),
			})
		}
	}

}
