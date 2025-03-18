package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/pocketbase/pocketbase/core"

	"github.com/nats-tower/nats-tower/interfaces/web/utils"
	"github.com/nats-tower/nats-tower/interfaces/web/views/layouts"
	"github.com/nats-tower/nats-tower/interfaces/web/views/pages"
	"github.com/nats-tower/nats-tower/natsauth"
)

func GetInstallation(e *core.RequestEvent, installationID string) error {

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

	model := pages.InstallationModel{
		RequestEvent: e,
		Installation: installation,
	}

	model.ServerInfos, err = getClusterInfo(e, installation.ID)
	if err != nil {
		e.App.Logger().Error("Failed to get cluster info",
			slog.String("installation_id", installation.ID),
			slog.String("error", err.Error()))
		model.Error = &pages.Error{
			Error: err,
		}
	}

	return layouts.WithBase(pages.Installation(model), layouts.BaseModel{
		Title:       "NATS Tower - " + installation.Description,
		Description: "blabla",
		NavigationModel: layouts.NavigationModel{
			CurrentLocation: "/ui/installations/" + installationID,
			InstallationID:  installationID,
			Swap:            true,
		},
		RequestEvent: e,
	}).Render(e.Request.Context(), e.Response)
}

type PostInstallationRequest struct {
	URL         string `json:"url" form:"url"`
	Description string `json:"description" form:"description"`
}

func (req *PostInstallationRequest) Valid() error {
	if req.URL == "" {
		return fmt.Errorf("URL is required")
	}
	if req.Description == "" {
		return fmt.Errorf("Description is required")
	}
	return nil
}

func PostInstallation(e *core.RequestEvent) error {
	var req PostInstallationRequest
	err := e.BindBody(&req)
	if err != nil {
		return e.BadRequestError("Bad request", err)
	}

	if err := req.Valid(); err != nil {
		return e.BadRequestError("Invalid request", err)
	}

	operatorCollection, err := e.App.FindCollectionByNameOrId("nats_auth_operators")
	if err != nil {
		e.App.Logger().Error("Failed to find collection",
			slog.String("name", "nats_auth_operators"),
			slog.String("error", err.Error()))
		return e.InternalServerError("Failed to find collection", err)
	}

	accountCollection, err := e.App.FindCollectionByNameOrId("nats_auth_accounts")
	if err != nil {
		e.App.Logger().Error("Failed to find collection",
			slog.String("name", "nats_auth_accounts"),
			slog.String("error", err.Error()))
		return e.InternalServerError("Failed to find collection", err)
	}

	userCollection, err := e.App.FindCollectionByNameOrId("nats_auth_users")
	if err != nil {
		e.App.Logger().Error("Failed to find collection",
			slog.String("name", "nats_auth_users"),
			slog.String("error", err.Error()))
		return e.InternalServerError("Failed to find collection", err)
	}

	record := core.NewRecord(operatorCollection)
	record.Set("url", req.URL)
	record.Set("description", req.Description)

	err = e.App.Save(record)
	if err != nil {
		e.App.Logger().Error("Failed to save record",
			slog.String("error", err.Error()))
		return e.InternalServerError("Failed to save record", err)
	}

	operatorID := record.Id

	record = core.NewRecord(accountCollection)
	record.Set("operator", operatorID)
	record.Set("name", "SYS")
	record.Set("description", fmt.Sprintf("System account for %s at %s", req.Description, req.URL))

	err = e.App.Save(record)
	if err != nil {
		e.App.Logger().Error("Failed to save account record",
			slog.String("error", err.Error()))
		return e.InternalServerError("Failed to save account record", err)
	}

	accountID := record.Id

	record = core.NewRecord(userCollection)
	record.Set("account", accountID)
	record.Set("name", "sys")
	record.Set("description", fmt.Sprintf("System user for %s at %s", req.Description, req.URL))

	err = e.App.Save(record)
	if err != nil {
		e.App.Logger().Error("Failed to save user record",
			slog.String("error", err.Error()))
		return e.InternalServerError("Failed to save user record", err)
	}
	return GetInstallations(e)
}

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

	var serverInfos []*server.ServerStatsMsg

	_, err = natsauth.RequestMultiple(e.Request.Context(),
		nc,
		"$SYS.REQ.SERVER.PING",
		[]byte("{}"),
		natsauth.RequestMultipleOptions{
			Timeout:      5 * time.Second,
			MaxResponses: -1,
			EachFunc: func(m *nats.Msg) bool {
				serverInfo := &server.ServerStatsMsg{}
				err = json.Unmarshal(m.Data, serverInfo)
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

func GetInstallations(e *core.RequestEvent) error {

	installations, err := e.App.FindAllRecords("nats_auth_operators")
	if err != nil {
		return e.InternalServerError("Failed to find installations", err)
	}

	model := pages.InstallationsModel{
		RequestEvent: e,
	}

	for _, installation := range installations {
		operator, err := natsauth.GetOperatorFromRecord(installation)
		if err != nil {
			return e.InternalServerError("Failed to get operator from record", err)
		}
		model.Installations = append(model.Installations, operator)
	}

	return layouts.WithBase(pages.Installations(model), layouts.BaseModel{
		Title:        "NATS Tower - Installations",
		Description:  "blabla",
		NoNavigation: true,
		NavigationModel: layouts.NavigationModel{
			CurrentLocation: "/ui/installations",
		},
		RequestEvent: e,
	}).Render(e.Request.Context(), e.Response)
}

func GetDeleteInstallationModal(e *core.RequestEvent, installationID string) error {

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

	model := pages.DeleteInstallationModalModel{
		RequestEvent: e,
		Installation: installation,
	}

	return pages.DeleteInstallationModal(model).Render(e.Request.Context(), e.Response)
}

func GetInstallationSettingsModal(e *core.RequestEvent, installationID string) error {

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

	natsauthModule := utils.MustGetNATSAuth(e)
	account, _, err := natsauthModule.GetSysAccountAndUserByID(e.Request.Context(), installationID)

	if err != nil {
		return e.InternalServerError("Failed to get system account and user", err)
	}

	model := pages.InstallationSettingsModalModel{
		RequestEvent: e,
		Installation: installation,
		SimpleConfig: fmt.Sprintf(`port = 4224

jetstream {
    store_dir = "jetstream"
}

resolver: {
    type: full
    # Directory in which account jwt will be stored
    dir: './jwt'
    # In order to support jwt deletion, set to true
    # If the resolver type is full delete will rename the jwt.
    # This is to allow manual restoration in case of inadvertent deletion.
    # To restore a jwt, remove the added suffix .delete and restart or send a reload signal.
    # To free up storage you must manually delete files with the suffix .delete.
    allow_delete: true
    # Interval at which a nats-server with a nats based account resolver will compare
    # it's state with one random nats based account resolver in the cluster and if needed,
    # exchange jwt and converge on the same set of jwt.
    interval: "2m"
    # limit on the number of jwt stored, will reject new jwt once limit is hit.
    limit: 1000
}

operator = %s

system_account = %s

resolver_preload = {
  %s: %s
}
`, installation.JWT, account.PublicKey, account.PublicKey, account.JWT),
	}

	return pages.InstallationSettingsModal(model).Render(e.Request.Context(), e.Response)
}

func DeleteInstallation(e *core.RequestEvent, installationID string) error {
	record, err := e.App.FindRecordById("nats_auth_operators", installationID)
	if err != nil {
		e.App.Logger().Error("Failed to find operator record",
			slog.String("id", installationID),
			slog.String("error", err.Error()))
		return e.InternalServerError("Failed to find operator record", err)
	}

	err = e.App.Delete(record)
	if err != nil {
		return e.InternalServerError("Failed to delete operator record", err)
	}

	return GetInstallations(e)
}

type PostInstallationIDRequest struct {
	InstallationID string `json:"installation_id" form:"installation_id"`
}

func (req *PostInstallationIDRequest) Valid() error {
	if req.InstallationID == "" {
		return fmt.Errorf("Installation ID is required")
	}
	return nil
}

func PostInstallationID(e *core.RequestEvent) error {
	prefs := utils.MustGetUserPreferences(e.Auth)
	req := PostInstallationIDRequest{
		InstallationID: e.Request.PathValue("installation_id"),
	}
	if err := req.Valid(); err != nil {
		return e.BadRequestError("Invalid request", err)
	}

	prefs.LastInstallationID = req.InstallationID

	err := utils.SetUserPreferences(e.App, e.Auth, prefs)
	if err != nil {
		return e.InternalServerError("Failed to set user preferences", err)
	}

	e.Response.Header().Set("HX-Redirect", "/ui/installations/"+prefs.LastInstallationID)
	return GetInstallation(e, req.InstallationID)
}
