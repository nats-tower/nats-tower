package utils

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/nats-tower/nats-tower/utils/env"
)

var HTTPClient *http.Client

func init() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	HTTPClient = &http.Client{
		Timeout: env.GetDurationEnv(context.Background(), logger, "HTTP_CLIENT_TIMEOUT", time.Second*10),
	}
}
