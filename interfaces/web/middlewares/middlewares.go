package middlewares

import (
	"net/http"
	"slices"

	"github.com/nats-tower/nats-tower/application"
	"github.com/nats-tower/nats-tower/interfaces/web/utils"
	"github.com/pocketbase/pocketbase/core"
)

// middlewares.RequireAuth("_superusers", "users") // only the listed auth collections
func LoadAuthContextFromCookie() func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		tokenCookie, err := e.Request.Cookie(application.AuthCookieName)
		if err != nil {
			return e.Next()
		}

		token := tokenCookie.Value
		record, err := e.App.FindAuthRecordByToken(
			token,
			"auth",
		)

		if err != nil {
			return e.Next()
		}

		e.Auth = record

		return e.Next()
	}
}

// middlewares.RequireAuth("_superusers", "users") // only the listed auth collections
func RequireAuth(optCollectionNames ...string) func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		if e.Auth == nil {
			return e.Redirect(http.StatusFound, "/login")
		}

		// check record collection name
		if len(optCollectionNames) > 0 && !slices.Contains(optCollectionNames, e.Auth.Collection().Name) {
			return e.Redirect(http.StatusFound, "/login")
		}

		return e.Next()
	}
}

func RequireLastInstallationID() func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		userPreferences, err := utils.GetUserPreferences(e)
		if err != nil {
			return e.Redirect(http.StatusFound, "/installations")
		}
		if userPreferences.LastInstallationID == "" {
			return e.Redirect(http.StatusFound, "/installations")
		}

		return e.Next()
	}
}
