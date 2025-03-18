package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"runtime/debug"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"

	"github.com/nats-tower/nats-tower/interfaces/store"
	"github.com/nats-tower/nats-tower/interfaces/web/routes"
	"github.com/nats-tower/nats-tower/natsauth"
	"github.com/nats-tower/nats-tower/utils/env"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	level := slog.LevelInfo
	if os.Getenv("TRACE") == "TRUE" {
		level = slog.LevelDebug
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		AddSource: os.Getenv("TRACE") == "TRUE",
		Level:     level,
	}))

	buildInfo, _ := debug.ReadBuildInfo()

	slog.SetDefault(logger)
	app := pocketbase.NewWithConfig(pocketbase.Config{})

	info := []any{slog.String("go_version", buildInfo.GoVersion)}

	for _, buildSetting := range buildInfo.Settings {
		info = append(info, slog.String(buildSetting.Key, buildSetting.Value))
	}

	logger.InfoContext(ctx, "Start",
		info...)

	traceInfo := []any{}

	for _, dep := range buildInfo.Deps {
		info = append(info, slog.String(dep.Path, fmt.Sprintf("%s %s", dep.Version, dep.Sum)))
	}
	logger.DebugContext(ctx, "Deps",
		traceInfo...)

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {

		err := store.InitUserCollection(e)
		if err != nil {
			return err
		}

		adminCount, err := e.App.CountRecords(core.CollectionNameSuperusers)
		if err != nil {
			return err
		}

		if adminCount == 0 {

			defaultAdminUserEmail := env.GetStringEnv(ctx, logger, "DEFAULT_ADMIN_EMAIL", "admin@test.org")
			defaultAdminUserPassword := env.GetStringEnv(ctx, logger, "DEFAULT_ADMIN_PASSWORD", "testtest")

			if defaultAdminUserEmail == "" || defaultAdminUserPassword == "" {
				return fmt.Errorf("need a DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD to initialize the application")
			}
			collection, err := e.App.FindCollectionByNameOrId(core.CollectionNameSuperusers)
			if err != nil {
				return err
			}

			logger.InfoContext(ctx, "Creating initial admin user...")
			admin := core.NewRecord(collection)
			admin.SetEmail(defaultAdminUserEmail)
			admin.SetPassword(defaultAdminUserPassword)

			err = e.App.Save(admin)
			if err != nil {
				return err
			}
		}

		userCount, err := e.App.CountRecords("users")
		if err != nil {
			return err
		}

		if userCount == 0 {
			defaultUserEmail := env.GetStringEnv(ctx, logger, "DEFAULT_USER_EMAIL", "user@test.org")
			defaultUserPassword := env.GetStringEnv(ctx, logger, "DEFAULT_USER_PASSWORD", "testtest")

			if defaultUserEmail == "" || defaultUserPassword == "" {
				return fmt.Errorf("need a DEFAULT_USER_EMAIL and DEFAULT_USER_PASSWORD to initialize the application")
			}
			collection, err := e.App.FindCollectionByNameOrId("users")
			if err != nil {
				return err
			}

			logger.InfoContext(ctx, "Creating initial user...")
			user := core.NewRecord(collection)
			user.SetEmail(defaultUserEmail)
			user.SetPassword(defaultUserPassword)

			err = e.App.Save(user)
			if err != nil {
				return err
			}
		}

		bootstrapURL := env.GetStringEnv(ctx, logger, "BOOTSTRAP_URL", "")
		var bootstrapURLs []string
		if bootstrapURL != "" {
			bootstrapURLs = []string{bootstrapURL}
		}

		natsauthModule, err := natsauth.CreateNATSAuthModule(ctx,
			logger.With(slog.String("module", "NATSAuthModule")),
			natsauth.NATSAuthModuleConfig{
				App:           e.App,
				BootstrapURLs: bootstrapURLs,
				APIToken:      os.Getenv("API_TOKEN"),
			})
		if err != nil {
			logger.ErrorContext(ctx, "Could not CreateNATSAuthModule", slog.String("error", err.Error()))
			return err
		}

		// Register the HTML routes
		err = routes.RegisterHTMLRoutes(ctx,
			logger.With(slog.String("module", "NATSAuthModule")),
			e,
			natsauthModule)
		if err != nil {
			logger.ErrorContext(ctx, "Could not RegisterHTMLRoutes", slog.String("error", err.Error()))
			return err
		}

		return e.Next()
	})

	if err := app.Start(); err != nil {
		logger.ErrorContext(ctx, "Could not start app", slog.String("error", err.Error()))
	}
}
