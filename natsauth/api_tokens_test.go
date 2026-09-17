package natsauth

import (
	"encoding/base64"
	"strings"
	"testing"
	"time"

	"github.com/nats-io/jwt/v2"
	"github.com/nats-io/nkeys"
)

func Test_GenerateAPITokenValue(t *testing.T) {
	token, err := generateAPITokenValue()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if !strings.HasPrefix(token, APITokenPrefix) {
		t.Errorf("expected token to have prefix %q, got %q", APITokenPrefix, token)
	}

	// 32 random bytes encoded as hex => 64 characters
	if len(token) != len(APITokenPrefix)+64 {
		t.Errorf("expected token length %d, got %d", len(APITokenPrefix)+64, len(token))
	}

	other, err := generateAPITokenValue()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if token == other {
		t.Errorf("expected two generated tokens to differ, both are %q", token)
	}
}

// setupAccountKeys creates a fresh account key pair and returns the public
// key and signing seed that generateShortLivedUserCredentials expects.
func setupAccountKeys(t *testing.T) (string, string) {
	t.Helper()

	accountKP, err := nkeys.CreateAccount()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	pubKey, err := accountKP.PublicKey()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	signingKP, err := nkeys.CreateAccount()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	signSeed, err := signingKP.Seed()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	return pubKey, string(signSeed)
}

func Test_GenerateShortLivedUserCredentials(t *testing.T) {
	accountPubKey, accountSignSeed := setupAccountKeys(t)

	credentials, err := generateShortLivedUserCredentials(
		accountPubKey,
		accountSignSeed,
		"automation",
		[]string{"allowed.>"},
		[]string{"allowed.>", "metrics.>"},
		10*time.Minute,
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if credentials.PublicKey == "" {
		t.Error("expected public key to be set")
	}
	if credentials.Seed == "" {
		t.Error("expected seed to be set")
	}
	if credentials.JWT == "" {
		t.Error("expected jwt to be set")
	}
	if credentials.Creds == "" {
		t.Error("expected creds to be set")
	}
	if !strings.Contains(credentials.Creds, "BEGIN NATS USER JWT") {
		t.Errorf("expected creds to contain a user jwt, got %q", credentials.Creds)
	}
	if credentials.ExpiresAt.IsZero() {
		t.Error("expected expires_at to be set")
	}

	// the expiration should be roughly now + ttl
	if delta := time.Until(credentials.ExpiresAt); delta < 9*time.Minute || delta > 11*time.Minute {
		t.Errorf("expected expiration to be ~10m in the future, got %v", delta)
	}

	// decode the JWT and verify the claims
	claims, err := jwt.DecodeUserClaims(credentials.JWT)
	if err != nil {
		t.Fatalf("expected no error decoding user claims, got %v", err)
	}

	if claims.Name != "automation" {
		t.Errorf("expected name %q, got %q", "automation", claims.Name)
	}
	if claims.IssuerAccount != accountPubKey {
		t.Errorf("expected issuer account %q, got %q", accountPubKey, claims.IssuerAccount)
	}
	if len(claims.Permissions.Pub.Allow) != 1 || claims.Permissions.Pub.Allow[0] != "allowed.>" {
		t.Errorf("unexpected publish permissions: %v", claims.Permissions.Pub.Allow)
	}
	if len(claims.Permissions.Sub.Allow) != 2 ||
		claims.Permissions.Sub.Allow[0] != "allowed.>" ||
		claims.Permissions.Sub.Allow[1] != "metrics.>" {
		t.Errorf("unexpected subscribe permissions: %v", claims.Permissions.Sub.Allow)
	}
	if claims.Expires == 0 {
		t.Error("expected exp claim to be set")
	}
	expectedExp := time.Now().Add(10 * time.Minute).Unix()
	if claims.Expires < expectedExp-120 || claims.Expires > expectedExp+120 {
		t.Errorf("expected exp ~%d, got %d", expectedExp, claims.Expires)
	}

	// the jwt must be signed with the account signing key
	signerKP, err := nkeys.FromSeed([]byte(accountSignSeed))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	chunks := strings.Split(credentials.JWT, ".")
	if len(chunks) != 3 {
		t.Fatalf("expected jwt with 3 chunks, got %d", len(chunks))
	}
	signature, err := base64.RawURLEncoding.DecodeString(chunks[2])
	if err != nil {
		t.Fatalf("expected no error decoding signature, got %v", err)
	}
	if err := signerKP.Verify([]byte(chunks[0]+"."+chunks[1]), signature); err != nil {
		t.Errorf("expected jwt to be signed by the account signing key, got %v", err)
	}
}

func Test_GenerateShortLivedUserCredentials_NoPermissions(t *testing.T) {
	accountPubKey, accountSignSeed := setupAccountKeys(t)

	credentials, err := generateShortLivedUserCredentials(
		accountPubKey,
		accountSignSeed,
		"automation",
		nil,
		nil,
		time.Minute,
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	claims, err := jwt.DecodeUserClaims(credentials.JWT)
	if err != nil {
		t.Fatalf("expected no error decoding user claims, got %v", err)
	}

	// empty allow lists mean full permissions for a non-scoped user
	if len(claims.Permissions.Pub.Allow) != 0 || len(claims.Permissions.Sub.Allow) != 0 {
		t.Errorf("expected empty permissions, got pub=%v sub=%v",
			claims.Permissions.Pub.Allow, claims.Permissions.Sub.Allow)
	}
}

func Test_GenerateShortLivedUserCredentials_Validation(t *testing.T) {
	accountPubKey, accountSignSeed := setupAccountKeys(t)

	tests := []struct {
		name        string
		accountPub  string
		signSeed    string
		userName    string
		publish     []string
		subscribe   []string
		ttl         time.Duration
		expectError bool
	}{
		{
			name:        "invalid ttl zero",
			accountPub:  accountPubKey,
			signSeed:    accountSignSeed,
			userName:    "automation",
			ttl:         0,
			expectError: true,
		},
		{
			name:        "invalid ttl negative",
			accountPub:  accountPubKey,
			signSeed:    accountSignSeed,
			userName:    "automation",
			ttl:         -time.Minute,
			expectError: true,
		},
		{
			name:        "ttl exceeds maximum",
			accountPub:  accountPubKey,
			signSeed:    accountSignSeed,
			userName:    "automation",
			ttl:         MaxShortLivedUserTTL + time.Minute,
			expectError: true,
		},
		{
			name:        "empty user name",
			accountPub:  accountPubKey,
			signSeed:    accountSignSeed,
			userName:    "",
			ttl:         time.Minute,
			expectError: true,
		},
		{
			name:        "invalid publish subject (space)",
			accountPub:  accountPubKey,
			signSeed:    accountSignSeed,
			userName:    "automation",
			publish:     []string{"invalid subject"},
			ttl:         time.Minute,
			expectError: true,
		},
		{
			name:        "invalid subscribe subject (leading dot)",
			accountPub:  accountPubKey,
			signSeed:    accountSignSeed,
			userName:    "automation",
			subscribe:   []string{".leading"},
			ttl:         time.Minute,
			expectError: true,
		},
		{
			name:       "valid wildcard subjects",
			accountPub: accountPubKey,
			signSeed:   accountSignSeed,
			userName:   "automation",
			publish:    []string{"a.>", "b.*"},
			subscribe:  []string{"a.>"},
			ttl:        time.Minute,
		},
		{
			name:        "empty subject",
			accountPub:  accountPubKey,
			signSeed:    accountSignSeed,
			userName:    "automation",
			publish:     []string{""},
			ttl:         time.Minute,
			expectError: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := generateShortLivedUserCredentials(
				tc.accountPub,
				tc.signSeed,
				tc.userName,
				tc.publish,
				tc.subscribe,
				tc.ttl,
			)
			if tc.expectError && err == nil {
				t.Errorf("expected error, got nil")
			}
			if !tc.expectError && err != nil {
				t.Errorf("expected no error, got %v", err)
			}
		})
	}
}

func Test_GenerateShortLivedUserCredentials_TTLBounds(t *testing.T) {
	if DefaultShortLivedUserTTL <= 0 {
		t.Errorf("expected default ttl to be positive, got %v", DefaultShortLivedUserTTL)
	}
	if MaxShortLivedUserTTL < DefaultShortLivedUserTTL {
		t.Errorf("expected max ttl >= default ttl")
	}
	if MaxShortLivedUserTTL > 24*time.Hour {
		t.Errorf("expected max ttl <= 24h, got %v", MaxShortLivedUserTTL)
	}
}
