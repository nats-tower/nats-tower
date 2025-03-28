package utils

import (
	"fmt"
	"iter"

	"github.com/pocketbase/pocketbase/core"

	"github.com/nats-tower/nats-tower/application"
	"github.com/nats-tower/nats-tower/natsauth"
)

func MustGetNATSAuth(e *core.RequestEvent) *natsauth.NATSAuthModule {
	natsauthModule, ok := e.Get("natsauth").(*natsauth.NATSAuthModule)
	if !ok {
		panic("natsauth module not found")
	}
	return natsauthModule
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
