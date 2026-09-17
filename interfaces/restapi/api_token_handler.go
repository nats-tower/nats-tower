package restapi

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/pocketbase/pocketbase/core"

	"github.com/nats-tower/nats-tower/interfaces/restapi/utils"
	"github.com/nats-tower/nats-tower/natsauth"
)

type shortLivedUserRequest struct {
	// Name of the generated user (optional, defaults to "shortlived").
	Name string `json:"name"`

	// Publish lists the subjects the user may publish to (optional).
	Publish []string `json:"publish"`

	// Subscribe lists the subjects the user may subscribe to (optional).
	Subscribe []string `json:"subscribe"`

	// ExpiresIn is the time to live of the generated credentials in seconds
	// (optional, defaults to 3600, max 86400).
	ExpiresIn int64 `json:"expires_in"`
}

// GenerateShortLivedUser generates shortlived NATS user credentials for the
// given account. The credentials are scoped to the provided publish/subscribe
// subjects and expire after the requested time to live.
//
// This endpoint can be authenticated either with a PocketBase user token or
// with an API token that is scoped to the account.
func GenerateShortLivedUser(e *core.RequestEvent, installationID, accountID string) error {

	if installationID == "" || accountID == "" {
		return e.Error(http.StatusBadRequest, "installation_id and account_id are required", nil)
	}

	var req shortLivedUserRequest
	if err := e.BindBody(&req); err != nil {
		return e.Error(http.StatusBadRequest, "Invalid request body", err)
	}

	ttl := natsauth.DefaultShortLivedUserTTL
	if req.ExpiresIn > 0 {
		ttl = time.Duration(req.ExpiresIn) * time.Second
	}
	if req.ExpiresIn < 0 || ttl > natsauth.MaxShortLivedUserTTL {
		return e.Error(http.StatusBadRequest,
			fmt.Sprintf("expires_in must be a positive number of seconds and must not exceed %d", int(natsauth.MaxShortLivedUserTTL.Seconds())),
			nil)
	}

	if req.Name == "" {
		req.Name = "shortlived"
	}

	natsauthModule := utils.MustGetNATSAuth(e)

	credentials, err := natsauthModule.GenerateShortLivedUserCredentials(
		e.Request.Context(),
		accountID,
		req.Name,
		req.Publish,
		req.Subscribe,
		ttl)
	if err != nil {
		if errors.Is(err, natsauth.ErrNotFound) {
			return e.Error(http.StatusNotFound, "Account not found", err)
		}
		if errors.Is(err, natsauth.ErrInvalidData) {
			return e.Error(http.StatusBadRequest,
				"Failed to generate shortlived user credentials: "+err.Error(), nil)
		}
		return e.Error(http.StatusInternalServerError, "Failed to generate shortlived user credentials: ", err)
	}

	return e.JSON(http.StatusOK, credentials)
}
