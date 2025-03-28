package restapi

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/pocketbase/pocketbase/core"

	"github.com/nats-tower/nats-tower/natsauth"
)

func RegisterAPIRoutes(ctx context.Context,
	logger *slog.Logger,
	e *core.ServeEvent,
	natsauthModule *natsauth.NATSAuthModule) error {

	e.Router.BindFunc(func(e *core.RequestEvent) error {
		// global middleware to inject stores, connections, etc
		e.Set("natsauth", natsauthModule)
		return e.Next()
	})

	// Register the API routes
	e.Router.GET("/api/nats-tower/installations/{installation_id}/cluster_info",
		func(e *core.RequestEvent) error {
			installationID := e.Request.PathValue("installation_id")
			clusterInfo, err := getClusterInfo(e, installationID)
			if err != nil {
				return e.Error(http.StatusInternalServerError, "Failed to get cluster info: ", err)
			}
			return e.JSON(http.StatusOK, clusterInfo)
		})

	e.Router.GET("/api/nats-tower/installations/{installation_id}/accounts/{account_id}/streams",
		func(e *core.RequestEvent) error {
			installationID := e.Request.PathValue("installation_id")
			accountID := e.Request.PathValue("account_id")
			return GetStreamList(e, installationID, accountID)
		})

	return nil
}
