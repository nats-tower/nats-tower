package handler

import (
	"log/slog"

	"github.com/nats-tower/nats-tower/interfaces/web/utils"
	"github.com/nats-tower/nats-tower/interfaces/web/views/layouts"
	"github.com/nats-tower/nats-tower/interfaces/web/views/pages"
	"github.com/pocketbase/pocketbase/core"
)

func GetLogin(e *core.RequestEvent) error {
	return layouts.WithBase(pages.Login(), layouts.BaseModel{
		Title:        "NATS - Tower - Login",
		Description:  "Login to NATS Tower",
		NoNavigation: true,
		NavigationModel: layouts.NavigationModel{
			CurrentLocation: "/login",
		},
		RequestEvent: e,
	}).Render(e.Request.Context(), e.Response)
}

type LoginRequest struct {
	Email    string `json:"email" form:"email"`
	Password string `json:"password" form:"password"`
}

func (r *LoginRequest) valid() error {
	return nil
}

func PostLogin(e *core.RequestEvent) error {
	var req LoginRequest
	if err := e.BindBody(&req); err != nil {
		return e.BadRequestError("Bad request", err)
	}
	if err := req.valid(); err != nil {
		return e.BadRequestError("Invalid request", err)
	}

	// Login logic here
	record, err := e.App.FindAuthRecordByEmail("users", req.Email)
	if err != nil {
		e.App.Logger().Error("Failed to find user by email", slog.String("email", req.Email), slog.String("error", err.Error()))
		return e.UnauthorizedError("Invalid email or password", err)
	}

	if !record.ValidatePassword(req.Password) {
		e.App.Logger().Error("Invalid password", slog.String("email", req.Email))
		return e.UnauthorizedError("Invalid email or password", nil)
	}

	err = utils.SetAuthToken(e, record)
	if err != nil {
		e.App.Logger().Error("Failed to set auth token", slog.String("error", err.Error()))
		return e.InternalServerError("Failed to set auth token", err)
	}

	prefs := utils.MustGetUserPreferences(record)

	// if user has a last_installation_id, redirect to the respective installation page
	// if not, redirect to installations page
	if prefs.LastInstallationID == "" {
		e.Response.Header().Set("HX-Redirect", "/ui/installations")
		return GetInstallations(e)
	}
	e.Response.Header().Set("HX-Redirect", "/ui/installations/"+prefs.LastInstallationID)
	return GetInstallation(e, prefs.LastInstallationID)
}

func PostLogout(e *core.RequestEvent) error {
	if e.Auth == nil {
		e.Response.Header().Set("HX-Redirect", "/login")
		return GetLogin(e)
	}

	e.Auth.RefreshTokenKey()
	utils.InvalidateAuthToken(e)

	e.Response.Header().Set("HX-Redirect", "/login")
	return GetLogin(e)
}
