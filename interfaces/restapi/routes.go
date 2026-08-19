package restapi

import (
	"context"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"

	"github.com/pocketbase/pocketbase/core"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/nats-tower/nats-tower/natsauth"
)

type buildInfoAPI struct {
	GoVersion string `json:"go_version"`
	Settings  []struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	} `json:"settings"`
}

func RegisterAPIRoutes(ctx context.Context,
	logger *slog.Logger,
	e *core.ServeEvent,
	metricsRegistry *prometheus.Registry,
	buildInfo *debug.BuildInfo,
	natsauthModule *natsauth.NATSAuthModule) error {

	metricsMiddleware := NewMetricMiddleware(metricsRegistry, nil)
	recordsMiddleware := metricsMiddleware.WrapHandler("/api/collections/:collection_id/records")
	recordMiddleware := metricsMiddleware.WrapHandler("/api/collections/:collection_id/records/:record_id")

	// Capture prometheus metrics
	e.Router.BindFunc(func(e *core.RequestEvent) error {
		// only capture /api/* routes, that are NOT /api/build_info && /api/nats-tower/*
		// So, basically Pocketbase API routes only
		if !strings.HasPrefix(e.Request.URL.Path, "/api/") &&
			e.Request.URL.Path != "/api/build_info" &&
			!strings.HasPrefix(e.Request.URL.Path, "/api/nats-tower/") {
			return e.Next()
		}

		if !strings.HasPrefix(e.Request.URL.Path, "/api/collections/") {
			return e.Next()
		}

		// detect if the request is for a specific record or record list
		if strings.HasSuffix(e.Request.URL.Path, "/records") {
			return recordsMiddleware(e)
		}

		return recordMiddleware(e)
	})

	e.Router.GET("/metrics",
		func(e *core.RequestEvent) error {
			promhttp.HandlerFor(
				metricsRegistry,
				promhttp.HandlerOpts{}).ServeHTTP(e.Response, e.Request)
			return nil
		})

	// BuildInfo route
	e.Router.GET("/api/build_info",
		func(e *core.RequestEvent) error {
			info := buildInfoAPI{
				GoVersion: buildInfo.GoVersion,
			}
			for _, setting := range buildInfo.Settings {
				info.Settings = append(info.Settings, struct {
					Key   string `json:"key"`
					Value string `json:"value"`
				}{
					Key:   setting.Key,
					Value: setting.Value,
				})
			}
			return e.JSON(http.StatusOK, info)
		}).BindFunc(metricsMiddleware.WrapHandler("/api/build_info"))

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
		}).BindFunc(metricsMiddleware.WrapHandler("/api/nats-tower/installations/:installation_id/cluster_info"))

	installationGroup.GET("/cluster_state",
		func(e *core.RequestEvent) error {
			installationID := e.Request.PathValue("installation_id")
			return GetClusterState(e, installationID)
		}).BindFunc(metricsMiddleware.WrapHandler("/api/nats-tower/installations/:installation_id/cluster_state"))

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
		}).BindFunc(metricsMiddleware.WrapHandler("/api/nats-tower/installations/:installation_id/accounts/:account_id/streams"))

	{ // EXPORTS
		installationGroup.GET("/exports",
			func(e *core.RequestEvent) error {
				installationID := e.Request.PathValue("installation_id")
				return ListInstallationExports(e, installationID)
			}).BindFunc(metricsMiddleware.WrapHandler("/api/nats-tower/installations/:installation_id/exports"))

		accountGroup.GET("/exports",
			func(e *core.RequestEvent) error {
				installationID := e.Request.PathValue("installation_id")
				accountID := e.Request.PathValue("account_id")
				return ListAccountExports(e, installationID, accountID)
			}).BindFunc(metricsMiddleware.WrapHandler("/api/nats-tower/installations/:installation_id/accounts/:account_id/exports"))

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
			}).BindFunc(metricsMiddleware.WrapHandler("/api/nats-tower/installations/:installation_id/accounts/:account_id/exports/:export_name"))
	}

	{ // IMPORTS
		accountGroup.GET("/imports",
			func(e *core.RequestEvent) error {
				installationID := e.Request.PathValue("installation_id")
				accountID := e.Request.PathValue("account_id")
				return ListAccountImports(e, installationID, accountID)
			}).BindFunc(metricsMiddleware.WrapHandler("/api/nats-tower/installations/:installation_id/accounts/:account_id/imports"))

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
			}).BindFunc(metricsMiddleware.WrapHandler("/api/nats-tower/installations/:installation_id/accounts/:account_id/imports/:import_name"))
	}

	return nil
}
