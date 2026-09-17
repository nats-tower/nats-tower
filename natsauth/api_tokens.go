package natsauth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"time"

	jwt "github.com/nats-io/jwt/v2"
	"github.com/nats-io/nkeys"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

const (
	// APITokenPrefix is the prefix of every generated API token value.
	APITokenPrefix = "nt_"

	// APITokensCollectionName is the name of the collection that stores API tokens.
	APITokensCollectionName = "nats_auth_api_tokens"

	// DefaultShortLivedUserTTL is the default time to live for generated
	// shortlived user credentials.
	DefaultShortLivedUserTTL = time.Hour

	// MaxShortLivedUserTTL is the maximum time to live for generated
	// shortlived user credentials.
	MaxShortLivedUserTTL = 24 * time.Hour
)

var (
	// ErrAPITokenNotFound is returned when no valid API token matches the provided value.
	ErrAPITokenNotFound = errors.New("api token not found")

	// ErrAPITokenExpired is returned when the provided API token has expired.
	ErrAPITokenExpired = errors.New("api token is expired")
)

// ShortLivedUserCredentials holds the generated credentials of an ephemeral
// NATS user. The credentials are signed with the account's main signing key
// and carry an explicit expiration, so they are only valid for the requested
// time to live. They are not stored in any collection.
type ShortLivedUserCredentials struct {
	PublicKey string    `json:"public_key"`
	Seed      string    `json:"seed"`
	JWT       string    `json:"jwt"`
	Creds     string    `json:"creds"`
	ExpiresAt time.Time `json:"expires_at"`
}

// generateAPITokenValue creates a cryptographically random API token value.
func generateAPITokenValue() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return APITokenPrefix + hex.EncodeToString(buf), nil
}

// AuthenticateAPIToken validates the provided raw token value against the
// nats_auth_api_tokens collection. It returns the matching token record when
// the token exists and has not expired.
func (m *NATSAuthModule) AuthenticateAPIToken(ctx context.Context, tokenValue string) (*core.Record, error) {
	logger := m.logger.With(slog.String("hook", "AuthenticateAPIToken"))

	if tokenValue == "" {
		return nil, ErrAPITokenNotFound
	}

	tokenRecords, err := m.cfg.App.FindAllRecords(APITokensCollectionName, dbx.HashExp{
		"token": tokenValue,
	})
	if err != nil {
		logger.ErrorContext(ctx, "Could not look up api token",
			slog.String("error", err.Error()))
		return nil, err
	}
	if len(tokenRecords) == 0 {
		return nil, ErrAPITokenNotFound
	}

	tokenRecord := tokenRecords[0]

	expiresAt := tokenRecord.GetDateTime("expires_at")
	if !expiresAt.IsZero() && expiresAt.Before(types.NowDateTime()) {
		logger.InfoContext(ctx, "API token is expired",
			slog.String("token_id", tokenRecord.Id))
		return nil, ErrAPITokenExpired
	}

	return tokenRecord, nil
}

// validateSubjectList validates that all provided subjects are valid NATS subjects.
func validateSubjectList(subjects []string) error {
	for _, subject := range subjects {
		vr := jwt.CreateValidationResults()
		jwt.Subject(subject).Validate(vr)
		if len(vr.Errors()) > 0 {
			return fmt.Errorf("invalid subject %q: %v", subject, vr.Errors())
		}
	}
	return nil
}

// generateShortLivedUserCredentials generates the credentials of an ephemeral
// NATS user with the given publish/subscribe permissions and time to live.
// The user JWT is signed with the account's main signing key and carries an
// explicit expiration.
func generateShortLivedUserCredentials(accountPubKey,
	accountSigningSeed,
	name string,
	publish []string,
	subscribe []string,
	ttl time.Duration) (*ShortLivedUserCredentials, error) {

	if ttl <= 0 {
		return nil, fmt.Errorf("%w: ttl must be positive", ErrInvalidData)
	}
	if ttl > MaxShortLivedUserTTL {
		return nil, fmt.Errorf("%w: ttl must not exceed %s", ErrInvalidData, MaxShortLivedUserTTL)
	}
	if name == "" {
		return nil, fmt.Errorf("%w: name must not be empty", ErrInvalidData)
	}
	if err := validateSubjectList(publish); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidData, err)
	}
	if err := validateSubjectList(subscribe); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidData, err)
	}

	// create user
	userKP, err := nkeys.CreateUser()
	if err != nil {
		return nil, err
	}

	pubKey, err := userKP.PublicKey()
	if err != nil {
		return nil, err
	}

	seed, err := userKP.Seed()
	if err != nil {
		return nil, err
	}

	userClaims := jwt.NewUserClaims(pubKey)
	userClaims.Name = name
	userClaims.IssuerAccount = accountPubKey
	userClaims.Permissions.Pub.Allow = publish
	userClaims.Permissions.Sub.Allow = subscribe

	expiresAt := time.Now().Add(ttl)
	userClaims.Expires = expiresAt.Unix()

	accountKP, err := nkeys.FromSeed([]byte(accountSigningSeed))
	if err != nil {
		return nil, err
	}

	jwtValue, err := userClaims.Encode(accountKP)
	if err != nil {
		return nil, err
	}

	creds, err := jwt.FormatUserConfig(jwtValue, seed)
	if err != nil {
		return nil, err
	}

	return &ShortLivedUserCredentials{
		PublicKey: pubKey,
		Seed:      string(seed),
		JWT:       jwtValue,
		Creds:     string(creds),
		ExpiresAt: expiresAt,
	}, nil
}

// GenerateShortLivedUserCredentials generates shortlived, scoped user
// credentials for the given account. The credentials are signed with the
// account's main signing key and expire after ttl. They are not persisted.
func (m *NATSAuthModule) GenerateShortLivedUserCredentials(ctx context.Context,
	accountID string,
	name string,
	publish []string,
	subscribe []string,
	ttl time.Duration) (*ShortLivedUserCredentials, error) {

	logger := m.logger.With(
		slog.String("hook", "GenerateShortLivedUserCredentials"),
		slog.String("account_id", accountID),
	)

	accountRecord, err := m.cfg.App.FindRecordById("nats_auth_accounts", accountID)
	if err != nil {
		return nil, ErrNotFound
	}

	accountPubKey := accountRecord.GetString("public_key")
	accountSigningSeed := accountRecord.GetString("sign_seed")

	if accountPubKey == "" || accountSigningSeed == "" {
		logger.ErrorContext(ctx, "Account has no signing key, cannot generate shortlived user credentials",
			slog.String("account_id", accountID))
		return nil, fmt.Errorf("%w: account has no signing key under our control", ErrInvalidData)
	}

	credentials, err := generateShortLivedUserCredentials(accountPubKey, accountSigningSeed, name, publish, subscribe, ttl)
	if err != nil {
		return nil, err
	}

	logger.InfoContext(ctx, "Generated shortlived user credentials",
		slog.String("name", name),
		slog.String("public_key", credentials.PublicKey),
		slog.Time("expires_at", credentials.ExpiresAt))

	return credentials, nil
}
