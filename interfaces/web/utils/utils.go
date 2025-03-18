package utils

import (
	"fmt"
	"iter"
	"net/http"

	"github.com/pocketbase/pocketbase/core"

	"github.com/nats-tower/nats-tower/application"
	"github.com/nats-tower/nats-tower/natsauth"
)

const (
	// HXRequestHeader is the header that indicates that the request is an htmx request.
	HXRequestHeader = "HX-Request"
	// HXHistoryRestoreRequestHeader is the header that indicates that the request is a history restore request.
	HXHistoryRestoreRequestHeader = "HX-History-Restore-Request"
)

func MustGetNATSAuth(e *core.RequestEvent) *natsauth.NATSAuthModule {
	natsauthModule, ok := e.Get("natsauth").(*natsauth.NATSAuthModule)
	if !ok {
		panic("natsauth module not found")
	}
	return natsauthModule
}

func SetAuthToken(e *core.RequestEvent, user *core.Record) error {
	s, tokenErr := user.NewAuthToken()
	if tokenErr != nil {
		return fmt.Errorf("Login failed")
	}

	e.SetCookie(&http.Cookie{
		Name:     application.AuthCookieName,
		Value:    s,
		Path:     "/",
		Secure:   true,
		HttpOnly: true,
	})

	return nil
}

func InvalidateAuthToken(e *core.RequestEvent) {
	e.SetCookie(&http.Cookie{
		Name:     application.AuthCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Secure:   true,
		HttpOnly: true,
	})
}

func RequestsFullPage(e *core.RequestEvent) bool {
	htmxRequest := e.Request.Header.Get(HXRequestHeader) == "true"
	if !htmxRequest {
		return true
	}
	restoreRequest := e.Request.Header.Get(HXHistoryRestoreRequestHeader) == "true"
	return restoreRequest
}

func GetUserPreferences(e *core.RequestEvent) (application.UserPreferences, error) {
	var userPreferences *application.UserPreferences
	err := e.Auth.UnmarshalJSONField("preferences", &userPreferences)
	if err != nil {
		return application.UserPreferences{}, err
	}
	if userPreferences == nil {
		return application.UserPreferences{}, application.ErrUserPreferencesNotFound
	}
	return *userPreferences, nil
}

func MustGetUserPreferences(record *core.Record) application.UserPreferences {
	var userPreferences *application.UserPreferences
	err := record.UnmarshalJSONField("preferences", &userPreferences)
	if err != nil {
		fmt.Println(err)
		return application.UserPreferences{}
	}
	if userPreferences == nil {
		return application.UserPreferences{}
	}
	return *userPreferences
}

func SetUserPreferences(app core.App,
	record *core.Record,
	prefs application.UserPreferences) error {
	record.Set("preferences", &prefs)
	return app.Save(record)
}

func Map[T, U any](seq iter.Seq[T], f func(T) U) iter.Seq[U] {
	return func(yield func(U) bool) {
		for a := range seq {
			if !yield(f(a)) {
				return
			}
		}
	}
}
