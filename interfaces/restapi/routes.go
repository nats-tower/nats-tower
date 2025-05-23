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

	installationGroup := e.Router.Group("/api/nats-tower/installations/{installation_id}")
	installationGroup.BindFunc(func(e *core.RequestEvent) error {
		requestInfo, err := e.RequestInfo()
		if err != nil {
			return e.Error(http.StatusInternalServerError, "Failed to get request info: ", err)
		}
		record, err := e.App.FindRecordById("nats_auth_operators", e.Request.PathValue("installation_id"))
		if err != nil {
			return e.Error(http.StatusInternalServerError, "Failed to find installation: ", err)
		}

		ok, err := e.App.CanAccessRecord(record, requestInfo, record.Collection().ViewRule)
		if err != nil {
			return e.Error(http.StatusInternalServerError, "Failed to check access: ", err)
		}
		if !ok {
			return e.Error(http.StatusForbidden, "You do not have access to this installation", nil)
		}
		return e.Next()
	})

	// Register the API routes
	installationGroup.GET("/cluster_info",
		func(e *core.RequestEvent) error {
			installationID := e.Request.PathValue("installation_id")
			clusterInfo, err := getClusterInfo(e, installationID)
			if err != nil {
				return e.Error(http.StatusInternalServerError, "Failed to get cluster info: ", err)
			}
			return e.JSON(http.StatusOK, clusterInfo)
		})

	accountGroup := installationGroup.Group("/accounts/{account_id}")
	accountGroup.BindFunc(func(e *core.RequestEvent) error {
		requestInfo, err := e.RequestInfo()
		if err != nil {
			return e.Error(http.StatusInternalServerError, "Failed to get request info: ", err)
		}
		record, err := e.App.FindRecordById("nats_auth_accounts", e.Request.PathValue("account_id"))
		if err != nil {
			return e.Error(http.StatusInternalServerError, "Failed to find account: ", err)
		}

		ok, err := e.App.CanAccessRecord(record, requestInfo, record.Collection().ViewRule)
		if err != nil {
			return e.Error(http.StatusInternalServerError, "Failed to check access: ", err)
		}
		if !ok {
			return e.Error(http.StatusForbidden, "You do not have access to this account", nil)
		}
		return e.Next()
	})

	accountGroup.GET("/streams",
		func(e *core.RequestEvent) error {
			installationID := e.Request.PathValue("installation_id")
			accountID := e.Request.PathValue("account_id")
			return GetStreamList(e, installationID, accountID)
		})

	{ // EXPORTS
		installationGroup.GET("/exports",
			func(e *core.RequestEvent) error {
				installationID := e.Request.PathValue("installation_id")
				return ListInstallationExports(e, installationID)
			})

		accountGroup.GET("/exports",
			func(e *core.RequestEvent) error {
				installationID := e.Request.PathValue("installation_id")
				accountID := e.Request.PathValue("account_id")
				return ListAccountExports(e, installationID, accountID)
			})

		accountGroup.POST("/exports",
			func(e *core.RequestEvent) error {
				installationID := e.Request.PathValue("installation_id")
				accountID := e.Request.PathValue("account_id")
				return UpsertAccountExport(e, installationID, accountID)
			})

		accountGroup.GET("/exports/{export_name}",
			func(e *core.RequestEvent) error {
				installationID := e.Request.PathValue("installation_id")
				accountID := e.Request.PathValue("account_id")
				exportName := e.Request.PathValue("export_name")
				return DeleteAccountExport(e, installationID, accountID, exportName)
			})
	}

	{ // IMPORTS
		accountGroup.GET("/imports",
			func(e *core.RequestEvent) error {
				installationID := e.Request.PathValue("installation_id")
				accountID := e.Request.PathValue("account_id")
				return ListAccountImports(e, installationID, accountID)
			})

		accountGroup.POST("/imports",
			func(e *core.RequestEvent) error {
				installationID := e.Request.PathValue("installation_id")
				accountID := e.Request.PathValue("account_id")
				return UpsertAccountImport(e, installationID, accountID)
			})

		accountGroup.DELETE("/imports/{import_name}",
			func(e *core.RequestEvent) error {
				installationID := e.Request.PathValue("installation_id")
				accountID := e.Request.PathValue("account_id")
				importName := e.Request.PathValue("import_name")
				return DeleteAccountImport(e, installationID, accountID, importName)
			})
	}

	return nil
}
