package natsauth

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/nats-io/jwt/v2"
)

func TestDefaultPermissionsJSONMarshaling(t *testing.T) {
	// Test that we can marshal and unmarshal Permissions correctly
	perms := jwt.Permissions{
		Pub: jwt.Permission{
			Allow: []string{"foo", "bar"},
			Deny:  []string{"baz"},
		},
		Sub: jwt.Permission{
			Allow: []string{"test.>"},
			Deny:  []string{"test.private.>"},
		},
	}

	// Marshal to JSON
	data, err := json.Marshal(perms)
	if err != nil {
		t.Fatalf("Failed to marshal permissions: %v", err)
	}

	t.Logf("Marshaled permissions: %s", string(data))

	// Unmarshal back
	var perms2 jwt.Permissions
	err = json.Unmarshal(data, &perms2)
	if err != nil {
		t.Fatalf("Failed to unmarshal permissions: %v", err)
	}

	// Verify they match
	if len(perms2.Pub.Allow) != 2 || perms2.Pub.Allow[0] != "foo" || perms2.Pub.Allow[1] != "bar" {
		t.Errorf("Pub.Allow mismatch: got %v, want [foo bar]", perms2.Pub.Allow)
	}
	if len(perms2.Pub.Deny) != 1 || perms2.Pub.Deny[0] != "baz" {
		t.Errorf("Pub.Deny mismatch: got %v, want [baz]", perms2.Pub.Deny)
	}
	if len(perms2.Sub.Allow) != 1 || perms2.Sub.Allow[0] != "test.>" {
		t.Errorf("Sub.Allow mismatch: got %v, want [test.>]", perms2.Sub.Allow)
	}
	if len(perms2.Sub.Deny) != 1 || perms2.Sub.Deny[0] != "test.private.>" {
		t.Errorf("Sub.Deny mismatch: got %v, want [test.private.>]", perms2.Sub.Deny)
	}
}

func TestAccountClaimsWithDefaultPermissions(t *testing.T) {
	ctx := context.Background()
	_ = ctx

	// Create account claims with default permissions
	accountClaims := jwt.NewAccountClaims("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
	accountClaims.Name = "test-account"

	// Set default permissions
	accountClaims.DefaultPermissions = jwt.Permissions{
		Pub: jwt.Permission{
			Allow: []string{"app.>"},
		},
		Sub: jwt.Permission{
			Allow: []string{"app.>", "_INBOX.>"},
		},
	}

	// Verify the permissions are set
	if len(accountClaims.DefaultPermissions.Pub.Allow) != 1 {
		t.Errorf("Expected 1 pub allow, got %d", len(accountClaims.DefaultPermissions.Pub.Allow))
	}
	if accountClaims.DefaultPermissions.Pub.Allow[0] != "app.>" {
		t.Errorf("Expected pub allow 'app.>', got '%s'", accountClaims.DefaultPermissions.Pub.Allow[0])
	}

	// Verify validation works
	vr := jwt.CreateValidationResults()
	accountClaims.DefaultPermissions.Validate(vr)
	if len(vr.Issues) > 0 {
		for _, issue := range vr.Issues {
			if issue.Blocking {
				t.Errorf("Validation error: %s", issue.Description)
			}
		}
	}
}
