package routes

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/pocketbase/pocketbase/core"

	"github.com/nats-tower/nats-tower/interfaces/web/handler"
	"github.com/nats-tower/nats-tower/interfaces/web/middlewares"
	"github.com/nats-tower/nats-tower/interfaces/web/utils"
	"github.com/nats-tower/nats-tower/natsauth"
)

func RegisterHTMLRoutes(ctx context.Context,
	logger *slog.Logger,
	e *core.ServeEvent,
	natsauthModule *natsauth.NATSAuthModule) error {

	e.Router.BindFunc(func(e *core.RequestEvent) error {
		// global middleware to inject stores, connections, etc
		e.Set("natsauth", natsauthModule)
		return e.Next()
	})

	// Register the HTML routes
	e.Router.GET("/", func(e *core.RequestEvent) error {
		return e.Redirect(http.StatusFound, "/ui/")
	})
	e.Router.GET("/favicon.ico", func(e *core.RequestEvent) error {
		return e.NotFoundError("Not found", nil)
	})

	e.Router.GET("/login", handler.GetLogin)

	e.Router.POST("/login", handler.PostLogin)
	e.Router.POST("/logout", handler.PostLogout)

	uiGroup := e.Router.Group("/ui")

	uiGroup.BindFunc(
		middlewares.LoadAuthContextFromCookie(),
		middlewares.RequireAuth("_superusers", "users"),
	)

	uiGroup.GET("/", func(e *core.RequestEvent) error {
		prefs := utils.MustGetUserPreferences(e.Auth)

		// if user has a last_installation_id, redirect to the respective installation page
		// if not, redirect to installations page
		if prefs.LastInstallationID == "" {
			e.Response.Header().Set("HX-Redirect", "/ui/installations")
			return e.Redirect(http.StatusFound, "/ui/installations")
		}
		e.Response.Header().Set("HX-Redirect", "/ui/installations/"+prefs.LastInstallationID)
		return e.Redirect(http.StatusFound, "/ui/installations/"+prefs.LastInstallationID)
	})

	// Installations
	uiGroup.GET("/installations", handler.GetInstallations)
	uiGroup.POST("/installations", func(e *core.RequestEvent) error {
		return handler.PostInstallation(e)
	})
	uiGroup.GET("/installations/{installation_id}", func(e *core.RequestEvent) error {
		return handler.GetInstallation(e, e.Request.PathValue("installation_id"))
	})
	uiGroup.DELETE("/installations/{installation_id}", func(e *core.RequestEvent) error {
		return handler.DeleteInstallation(e, e.Request.PathValue("installation_id"))
	})
	uiGroup.GET("/installations/{installation_id}/delete", func(e *core.RequestEvent) error {
		return handler.GetDeleteInstallationModal(e, e.Request.PathValue("installation_id"))
	})
	uiGroup.GET("/installations/{installation_id}/settings", func(e *core.RequestEvent) error {
		return handler.GetInstallationSettingsModal(e, e.Request.PathValue("installation_id"))
	})
	uiGroup.POST("/installations/{installation_id}", handler.PostInstallationID)

	// Accounts
	uiGroup.GET("/installations/{installation_id}/accounts", func(e *core.RequestEvent) error {
		return handler.GetAccounts(e, e.Request.PathValue("installation_id"), "")
	})
	uiGroup.POST("/installations/{installation_id}/accounts", func(e *core.RequestEvent) error {
		return handler.PostAccount(e, e.Request.PathValue("installation_id"))
	})
	uiGroup.GET("/installations/{installation_id}/accounts/{account_id}", func(e *core.RequestEvent) error {
		return handler.GetAccounts(e, e.Request.PathValue("installation_id"), e.Request.PathValue("account_id"))
	})
	uiGroup.DELETE("/installations/{installation_id}/accounts/{account_id}", func(e *core.RequestEvent) error {
		return handler.DeleteAccount(e, e.Request.PathValue("installation_id"), e.Request.PathValue("account_id"))
	})
	uiGroup.GET("/installations/{installation_id}/accounts/{account_id}/delete", func(e *core.RequestEvent) error {
		return handler.GetDeleteAccountModal(e, e.Request.PathValue("installation_id"), e.Request.PathValue("account_id"))
	})

	// Users
	uiGroup.GET("/installations/{installation_id}/accounts/{account_id}/users", func(e *core.RequestEvent) error {
		return handler.GetUsers(e, e.Request.PathValue("installation_id"), e.Request.PathValue("account_id"))
	})
	uiGroup.POST("/installations/{installation_id}/accounts/{account_id}/users", func(e *core.RequestEvent) error {
		return handler.PostUser(e, e.Request.PathValue("installation_id"), e.Request.PathValue("account_id"))
	})
	uiGroup.DELETE("/installations/{installation_id}/accounts/{account_id}/users/{user_id}", func(e *core.RequestEvent) error {
		return handler.DeleteUser(e, e.Request.PathValue("installation_id"), e.Request.PathValue("account_id"), e.Request.PathValue("user_id"))
	})
	uiGroup.GET("/installations/{installation_id}/accounts/{account_id}/users/{user_id}/delete", func(e *core.RequestEvent) error {
		return handler.GetDeleteUserModal(e, e.Request.PathValue("installation_id"), e.Request.PathValue("account_id"), e.Request.PathValue("user_id"))
	})
	uiGroup.GET("/installations/{installation_id}/accounts/{account_id}/users/{user_id}/credentials", func(e *core.RequestEvent) error {
		return handler.GetUserCredentialsModal(e, e.Request.PathValue("installation_id"), e.Request.PathValue("account_id"), e.Request.PathValue("user_id"))
	})

	// Streams
	uiGroup.GET("/installations/{installation_id}/accounts/{account_id}/streams", func(e *core.RequestEvent) error {
		return handler.GetStreams(e, e.Request.PathValue("installation_id"), e.Request.PathValue("account_id"))
	})

	// SSE
	uiGroup.GET("/events", handler.SSEHandler)

	return nil
}
