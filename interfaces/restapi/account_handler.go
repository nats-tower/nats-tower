package restapi

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	jwt "github.com/nats-io/jwt/v2"
	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/pocketbase/pocketbase/core"

	"github.com/nats-tower/nats-tower/interfaces/restapi/utils"
	"github.com/nats-tower/nats-tower/natsauth"
)

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

type accountExportList struct {
	AccountExports map[string][]*jwt.Export `json:"account_exports"`
}

func ListInstallationExports(e *core.RequestEvent, installationID string) error {

	if installationID == "" {
		return e.Error(http.StatusBadRequest, "installation_id is required", nil)
	}
	natsauthModule := utils.MustGetNATSAuth(e)

	exports, err := natsauthModule.ListPublicExports(e.Request.Context(), installationID)

	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to list public installation exports", err)
	}

	return e.JSON(http.StatusOK, &accountExportList{
		AccountExports: exports,
	})
}

type exportList struct {
	Exports []*jwt.Export `json:"exports"`
}

func ListAccountExports(e *core.RequestEvent, installationID, accountID string) error {

	if installationID == "" || accountID == "" {
		return e.Error(http.StatusBadRequest, "installation_id and account_id are required", nil)
	}
	natsauthModule := utils.MustGetNATSAuth(e)

	exports, err := natsauthModule.ListAccountExports(e.Request.Context(), accountID)

	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to list exports", err)
	}

	return e.JSON(http.StatusOK, &exportList{
		Exports: exports,
	})
}

func UpsertAccountExport(e *core.RequestEvent, installationID, accountID string) error {

	if installationID == "" || accountID == "" {
		return e.Error(http.StatusBadRequest, "installation_id and account_id are required", nil)
	}
	natsauthModule := utils.MustGetNATSAuth(e)

	req := jwt.Export{}
	err := e.BindBody(&req)
	if err != nil {
		return e.Error(http.StatusBadRequest, "Invalid request body", err)
	}

	err = natsauthModule.UpsertAccountExport(e.Request.Context(), accountID, &req)

	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to upsert account export", err)
	}

	return e.JSON(http.StatusOK, map[string]any{})
}

func DeleteAccountExport(e *core.RequestEvent, installationID, accountID, exportName string) error {

	if installationID == "" || accountID == "" || exportName == "" {
		return e.Error(http.StatusBadRequest, "installation_id, account_id and export_name are required", nil)
	}
	natsauthModule := utils.MustGetNATSAuth(e)

	err := natsauthModule.DeleteAccountExport(e.Request.Context(), accountID, exportName)

	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to delete account export", err)
	}

	return e.JSON(http.StatusOK, map[string]any{})
}

type importList struct {
	Imports []*jwt.Import `json:"imports"`
}

func ListAccountImports(e *core.RequestEvent, installationID, accountID string) error {

	if installationID == "" || accountID == "" {
		return e.Error(http.StatusBadRequest, "installation_id and account_id are required", nil)
	}
	natsauthModule := utils.MustGetNATSAuth(e)

	imports, err := natsauthModule.ListAccountImports(e.Request.Context(), accountID)

	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to list imports", err)
	}

	return e.JSON(http.StatusOK, &importList{
		Imports: imports,
	})
}

func UpsertAccountImport(e *core.RequestEvent, installationID, accountID string) error {

	if installationID == "" || accountID == "" {
		return e.Error(http.StatusBadRequest, "installation_id and account_id are required", nil)
	}
	natsauthModule := utils.MustGetNATSAuth(e)

	req := jwt.Import{}
	err := e.BindBody(&req)
	if err != nil {
		return e.Error(http.StatusBadRequest, "Invalid request body", err)
	}

	err = natsauthModule.UpsertAccountImport(e.Request.Context(), accountID, &req)

	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to upsert account import", err)
	}

	return e.JSON(http.StatusOK, map[string]any{})
}

func DeleteAccountImport(e *core.RequestEvent, installationID, accountID, importName string) error {

	if installationID == "" || accountID == "" || importName == "" {
		return e.Error(http.StatusBadRequest, "installation_id, account_id and import_name are required", nil)
	}
	natsauthModule := utils.MustGetNATSAuth(e)

	err := natsauthModule.DeleteAccountImport(e.Request.Context(), accountID, importName)

	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to delete account import", err)
	}

	return e.JSON(http.StatusOK, map[string]any{})
}

type defaultPermissionsResponse struct {
	Permissions *jwt.Permissions `json:"permissions"`
}

func GetAccountDefaultPermissions(e *core.RequestEvent, installationID, accountID string) error {
	if installationID == "" || accountID == "" {
		return e.Error(http.StatusBadRequest, "installation_id and account_id are required", nil)
	}
	natsauthModule := utils.MustGetNATSAuth(e)

	permissions, err := natsauthModule.GetAccountDefaultPermissions(e.Request.Context(), accountID)

	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to get account default permissions", err)
	}

	return e.JSON(http.StatusOK, &defaultPermissionsResponse{
		Permissions: permissions,
	})
}

func UpdateAccountDefaultPermissions(e *core.RequestEvent, installationID, accountID string) error {
	if installationID == "" || accountID == "" {
		return e.Error(http.StatusBadRequest, "installation_id and account_id are required", nil)
	}
	natsauthModule := utils.MustGetNATSAuth(e)

	req := jwt.Permissions{}
	err := e.BindBody(&req)
	if err != nil {
		return e.Error(http.StatusBadRequest, "Invalid request body", err)
	}

	err = natsauthModule.UpdateAccountDefaultPermissions(e.Request.Context(), accountID, &req)

	if err != nil {
		return e.Error(http.StatusInternalServerError, "Failed to update account default permissions", err)
	}

	return e.JSON(http.StatusOK, map[string]any{})
}

