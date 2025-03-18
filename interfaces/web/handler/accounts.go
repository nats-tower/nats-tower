package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-tower/nats-tower/interfaces/web/utils"
	"github.com/nats-tower/nats-tower/interfaces/web/views/layouts"
	"github.com/nats-tower/nats-tower/interfaces/web/views/pages"
	"github.com/nats-tower/nats-tower/natsauth"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

func GetAccounts(e *core.RequestEvent, installationID, selectedAccountID string) error {
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

	accounts, err := e.App.FindRecordsByFilter("nats_auth_accounts",
		"operator = {:installationid}",
		"name",
		100,
		0,
		dbx.Params{"installationid": installation.ID})
	if err != nil {
		return e.InternalServerError("Failed to find accounts", err)
	}

	model := pages.AccountsModel{
		RequestEvent: e,
		Installation: installation,
	}

	for _, account := range accounts {
		acc, err := natsauth.GetAccountFromRecord(account, installation.URL)
		if err != nil {
			return e.InternalServerError("Failed to get account from record", err)
		}
		if acc.ID == selectedAccountID {
			cpy := acc

			accountDetails, err := getAccountDetails(e, installation.ID, acc.PublicKey)
			if err != nil {
				return e.InternalServerError("Failed to get account details", err)
			}

			model.SelectedAccount = &pages.AccountModel{
				RequestEvent:  e,
				Installation:  installation,
				Account:       cpy,
				AccountDetail: accountDetails,
			}

			users, err := e.App.FindAllRecords("nats_auth_users", dbx.HashExp{
				"account": acc.ID,
			})
			if err != nil {
				return e.InternalServerError("Failed to find users", err)
			}

			for _, userRecord := range users {
				user, err := natsauth.GetUserFromRecord(userRecord, installation.URL)
				if err != nil {
					return e.InternalServerError("Failed to get user from record", err)
				}
				model.SelectedAccount.Users = append(model.SelectedAccount.Users, user)
			}
		}
		model.Accounts = append(model.Accounts, acc)
	}

	if selectedAccountID != "" && model.SelectedAccount == nil {
		return e.NotFoundError("Account not found", nil)
	}

	return layouts.WithBase(pages.Accounts(model), layouts.BaseModel{
		Title:       "NATS Tower - " + installation.Description,
		Description: "blabla",
		NavigationModel: layouts.NavigationModel{
			CurrentLocation: "/ui/installations/" + installation.ID + "/accounts",
			InstallationID:  installation.ID,
			Swap:            true,
		},
		RequestEvent: e,
	}).Render(e.Request.Context(), e.Response)
}

type PostAccountRequest struct {
	Name        string `json:"name" form:"name"`
	Description string `json:"description" form:"description"`
}

func (req *PostAccountRequest) Valid() error {
	if req.Name == "" {
		return fmt.Errorf("Name is required")
	}
	return nil
}

func PostAccount(e *core.RequestEvent, installationID string) error {
	var req PostAccountRequest
	err := e.BindBody(&req)
	if err != nil {
		return e.BadRequestError("Bad request", err)
	}

	if err := req.Valid(); err != nil {
		return e.BadRequestError("Invalid request", err)
	}

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
	accountAuth, err := natsauthModule.UpsertAccountAuth(e.Request.Context(),
		installation.URL,
		req.Name,
		req.Description,
		natsauth.UpsertAccountAuthOptions{
			DoNotPublish: false,
		})
	if err != nil {
		return e.InternalServerError("Failed to upsert account auth", err)
	}

	e.Response.Header().Set("HX-Redirect", "/ui/installations/"+installation.ID+"/accounts/"+accountAuth.ID)
	return GetAccounts(e, installationID, accountAuth.ID)
}

func GetDeleteAccountModal(e *core.RequestEvent, installationID, accountID string) error {

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
		e.App.Logger().Error("Failed to find account",
			slog.String("id", installationID),
			slog.String("error", err.Error()))
		return e.InternalServerError("Failed to find account record", err)
	}

	account, err := natsauth.GetAccountFromRecord(accountRecord, installation.URL)
	if err != nil {
		return e.InternalServerError("Failed to get account from record", err)
	}

	model := pages.DeleteAccountModalModel{
		RequestEvent: e,
		Installation: installation,
		Account:      account,
	}

	return pages.DeleteAccountModal(model).Render(e.Request.Context(), e.Response)
}

func DeleteAccount(e *core.RequestEvent, installationID, accountID string) error {
	e.Response.Header().Set("HX-Redirect", "/ui/installations/"+e.Request.PathValue("installation_id")+"/accounts")

	record, err := e.App.FindRecordById("nats_auth_accounts", accountID)
	if err != nil {
		e.App.Logger().Error("Failed to find account",
			slog.String("id", installationID),
			slog.String("error", err.Error()))
		return e.InternalServerError("Failed to find account record", err)
	}

	err = e.App.Delete(record)
	if err != nil {
		return e.InternalServerError("Failed to delete account", err)
	}

	return GetAccounts(e, installationID, "")
}

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
