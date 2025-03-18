package application

import (
	"errors"
)

type OperatorAuth struct {
	ID                string
	URL               string
	Description       string
	PublicKey         string
	PrivateKey        string
	Seed              string
	SigningPublicKey  string
	SigningPrivateKey string
	SigningSeed       string
	JWT               string
}

type AccountAuth struct {
	ID                string
	Name              string
	Description       string
	URL               string
	PublicKey         string
	PrivateKey        string
	Seed              string
	SigningPublicKey  string
	SigningPrivateKey string
	SigningSeed       string
	JWT               string
}

type UserAuth struct {
	ID          string
	Name        string
	Description string
	URL         string
	PublicKey   string
	PrivateKey  string
	Seed        string
	JWT         string
	Creds       string
}

type UserOptions struct {
	// If true, the user will not require a seed for connecting (MQTT users need that, any username with the JWT as password)
	BearerToken bool
}

var (
	ErrUserPreferencesNotFound = errors.New("user preferences not found")
)

const AuthCookieName = "PB-Auth"

type UserPreferences struct {
	LastInstallationID string `json:"last_installation_id"`
}
