package natsauth

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/nats-io/jwt/v2"
	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-tower/nats-tower/application"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/cmd"
	"github.com/pocketbase/pocketbase/core"
)

func Test_Creation(t *testing.T) {
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

	slog.SetDefault(logger)

	app := pocketbase.New()
	logger.InfoContext(ctx, "Start")

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		natsModule, err := CreateNATSAuthModule(ctx, logger, NATSAuthModuleConfig{
			App:           app,
			BootstrapURLs: []string{"nats://0.0.0.0:4222"},
		})
		if err != nil {
			t.Errorf("Failed to create NatsModule: %v", err)
			return err
		}

		resolver, err := server.NewDirAccResolver("./.jwt", 10000, time.Minute*2, server.RenameDeleted, server.FetchTimeout(5*time.Second))

		if err != nil {
			t.Errorf("Failed to create NewDirAccResolver: %v", err)
			return err
		}

		operator, err := natsModule.GetOperator(ctx, "nats://0.0.0.0:4222")
		if err != nil {
			t.Errorf("Failed to GetOperator: %v", err)
			return err
		}

		sysAccount, err := natsModule.GetSysAccountByURL(ctx, "nats://0.0.0.0:4222")
		if err != nil {
			t.Errorf("Failed to GetSysAccount: %v", err)
			return err
		}

		_, err = natsModule.GetSysUserByID(ctx, operator.ID)
		if err != nil {
			t.Errorf("Failed to GetSysUser: %v", err)
			return err
		}

		err = resolver.Store(sysAccount.PublicKey, sysAccount.JWT)
		if err != nil {
			t.Errorf("Failed to Store Sysaccount: %v", err)
			return err
		}

		theJWT, err := jwt.ParseDecoratedJWT([]byte(operator.JWT))
		if err != nil {
			t.Errorf("Failed to ParseDecoratedJWT: %v", err)
			return err
		}
		opc, err := jwt.DecodeOperatorClaims(theJWT)
		if err != nil {
			t.Errorf("Failed to DecodeOperatorClaims: %v", err)
			return err
		}

		opts := &server.Options{
			ServerName:      "iotcore-test",
			AccountResolver: resolver,
			TrustedOperators: []*jwt.OperatorClaims{
				opc,
			},
			SystemAccount:      sysAccount.PublicKey,
			JetStream:          true,
			StoreDir:           "./.jetstream",
			JetStreamMaxMemory: 1024 * 1024 * 1024,
			JetStreamMaxStore:  1024 * 1024 * 1024,
		}

		// Initialize new server with options
		ns, err := server.NewServer(opts)

		if err != nil {
			panic(err)
		}

		// Start the server via goroutine
		go ns.Start()

		// Wait for server to be ready for connections
		if !ns.ReadyForConnections(10 * time.Second) {
			panic("not ready for connection")
		}

		logger.InfoContext(ctx, "Using NATS", slog.String("url", ns.ClientURL()))

		_, err = natsModule.UpsertAccountAuth(ctx, "nats://0.0.0.0:4222", "iot-data", "", UpsertAccountAuthOptions{})

		if err != nil {
			panic(err)
		}

		userAuth, err := natsModule.UpsertUserAuth(ctx, "nats://0.0.0.0:4222", "iot-data", "iot-data", "", application.UserOptions{})

		if err != nil {
			panic(err)
		}

		// try second connection with user auth in the iot-data account
		jwtUserAuthOption := nats.UserJWTAndSeed(userAuth.JWT, string(userAuth.Seed))
		// Connect to server
		appNC, err := nats.Connect(ns.ClientURL(), jwtUserAuthOption)

		if err != nil {
			panic(err)
		}

		_, err = appNC.Subscribe(">", func(msg *nats.Msg) {
			logger.InfoContext(ctx, "Received message", slog.String("message", string(msg.Data)))
			_ = msg.Ack()
		})
		if err != nil {
			panic(err)
		}

		err = appNC.Publish("test", []byte("Hello embedded NATS!"))
		if err != nil {
			panic(err)
		}

		logger.InfoContext(ctx, "Initialization done")

		return nil
	})

	app.RootCmd = cmd.NewServeCommand(app, true)
	app.RootCmd.SetArgs([]string{"--http=127.0.0.1:8091"})

	if err := app.Execute(); err != nil {
		logger.ErrorContext(ctx, "Could not start app", slog.String("error", err.Error()))
	}
}
