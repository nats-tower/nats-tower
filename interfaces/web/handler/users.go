package handler

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/nats-tower/nats-tower/application"
	"github.com/nats-tower/nats-tower/interfaces/web/utils"
	"github.com/nats-tower/nats-tower/interfaces/web/views/layouts"
	"github.com/nats-tower/nats-tower/interfaces/web/views/pages"
	"github.com/nats-tower/nats-tower/natsauth"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

func GetUsers(e *core.RequestEvent, installationID, accountID string) error {
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

	model := pages.UsersModel{
		RequestEvent: e,
		Installation: installation,
		Account:      account,
	}

	users, err := e.App.FindAllRecords("nats_auth_users", dbx.HashExp{
		"account": account.ID,
	})
	if err != nil {
		return e.InternalServerError("Failed to find users", err)
	}

	for _, userRecord := range users {
		user, err := natsauth.GetUserFromRecord(userRecord, installation.URL)
		if err != nil {
			return e.InternalServerError("Failed to get user from record", err)
		}
		model.Users = append(model.Users, user)
	}

	return layouts.WithBase(pages.Users(model), layouts.BaseModel{
		Title:       "NATS Tower - " + installation.Description,
		Description: "blabla",
		NavigationModel: layouts.NavigationModel{
			CurrentLocation: "/ui/installations/" + installation.ID + "/accounts/" + account.ID + "/users",
			InstallationID:  installation.ID,
			AccountID:       account.ID,
			Swap:            true,
		},
		RequestEvent: e,
	}).Render(e.Request.Context(), e.Response)
}

type PostUserRequest struct {
	Name        string `json:"name" form:"name"`
	Description string `json:"description" form:"description"`
}

func (req *PostUserRequest) Valid() error {
	if req.Name == "" {
		return fmt.Errorf("Name is required")
	}
	return nil
}

func PostUser(e *core.RequestEvent, installationID, accountID string) error {
	var req PostUserRequest
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

	accountRecord, err := e.App.FindRecordById("nats_auth_accounts", accountID)
	if err != nil {
		e.App.Logger().Error("Failed to find installation",
			slog.String("id", installationID),
			slog.String("error", err.Error()))
		return e.Redirect(http.StatusFound, "/installations")
	}

	account, err := natsauth.GetAccountFromRecord(accountRecord, installation.URL)
	if err != nil {
		return e.InternalServerError("Failed to get operator from record", err)
	}

	natsauthModule := utils.MustGetNATSAuth(e)
	_, err = natsauthModule.UpsertUserAuth(e.Request.Context(),
		installation.URL,
		account.Name,
		req.Name,
		req.Description,
		application.UserOptions{})
	if err != nil {
		return e.InternalServerError("Failed to upsert user auth", err)
	}

	e.Response.Header().Set("HX-Redirect", "/ui/installations/"+installation.ID+"/accounts/"+accountID+"/users")
	return GetUsers(e, installationID, accountID)
}

func GetDeleteUserModal(e *core.RequestEvent, installationID, accountID, userID string) error {

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

	userRecord, err := e.App.FindRecordById("nats_auth_users", userID)
	if err != nil {
		e.App.Logger().Error("Failed to find user",
			slog.String("id", installationID),
			slog.String("error", err.Error()))
		return e.InternalServerError("Failed to find user record", err)
	}

	user, err := natsauth.GetUserFromRecord(userRecord, installation.URL)
	if err != nil {
		return e.InternalServerError("Failed to get user from record", err)
	}

	model := pages.DeleteUserModalModel{
		RequestEvent: e,
		Installation: installation,
		Account:      account,
		User:         user,
	}

	return pages.DeleteUserModal(model).Render(e.Request.Context(), e.Response)
}

func DeleteUser(e *core.RequestEvent, installationID, accountID, userID string) error {
	e.Response.Header().Set("HX-Redirect", "/ui/installations/"+installationID+"/accounts/"+accountID+"/users")

	record, err := e.App.FindRecordById("nats_auth_users", userID)
	if err != nil {
		e.App.Logger().Error("Failed to find user",
			slog.String("id", installationID),
			slog.String("error", err.Error()))
		return e.InternalServerError("Failed to find user record", err)
	}

	err = e.App.Delete(record)
	if err != nil {
		return e.InternalServerError("Failed to delete user", err)
	}

	return GetUsers(e, installationID, accountID)
}

func GetUserCredentialsModal(e *core.RequestEvent, installationID, accountID, userID string) error {

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

	userRecord, err := e.App.FindRecordById("nats_auth_users", userID)
	if err != nil {
		e.App.Logger().Error("Failed to find user",
			slog.String("id", installationID),
			slog.String("error", err.Error()))
		return e.InternalServerError("Failed to find user record", err)
	}

	user, err := natsauth.GetUserFromRecord(userRecord, installation.URL)
	if err != nil {
		return e.InternalServerError("Failed to get user from record", err)
	}

	model := pages.UserCredentialsModalModel{
		RequestEvent: e,
		User:         user,
	}

	return pages.UserCredentialsModal(model).Render(e.Request.Context(), e.Response)
}
