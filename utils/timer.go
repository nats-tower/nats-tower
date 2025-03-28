package utils

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/nats-tower/nats-tower/utils/env"
)

var enableTimers bool

func init() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	enableTimers = env.GetStringEnv(context.Background(), logger, "ENABLE_TIMERS", "TRUE") == "TRUE"
}

type Timer struct {
	ctx      context.Context
	logger   *slog.Logger
	funcName string
	start    time.Time
}

func NewTimer(ctx context.Context, logger *slog.Logger, funcName string) *Timer {
	if !enableTimers {
		return nil
	}
	return &Timer{
		ctx:      ctx,
		logger:   logger,
		funcName: funcName,
		start:    time.Now(),
	}
}

func (t *Timer) LogElapsed() time.Duration {
	if t == nil || !enableTimers {
		return 0
	}
	elapsed := time.Since(t.start)
	t.logger.DebugContext(t.ctx, "Elapsed", slog.String("funcName", t.funcName), slog.Duration("elapsed", elapsed))
	return elapsed
}
