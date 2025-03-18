package env

import (
	"context"
	"log/slog"
	"os"
	"strconv"
	"time"
)

func GetStringEnv(ctx context.Context, logger *slog.Logger, key, def string) string {
	s, ok := os.LookupEnv(key)
	if !ok {
		logger.InfoContext(ctx, "Using default value",
			slog.String("env", key), slog.String("env_value", def))
		return def
	}
	logger.InfoContext(ctx, "Using value",
		slog.String("env", key), slog.String("env_value", def))
	return s
}

func GetDurationEnv(ctx context.Context, logger *slog.Logger, key string, def time.Duration) time.Duration {
	s, ok := os.LookupEnv(key)
	if !ok {
		logger.InfoContext(ctx, "Using default value",
			slog.String("env", key),
			slog.String("env_value", s),
			slog.Duration("default_value", def))
		return def
	}

	parsed, err := time.ParseDuration(s)
	if err != nil {
		logger.InfoContext(ctx, "Using default value because the given Duration could not be parsed",
			slog.String("env", key),
			slog.String("env_value", s),
			slog.Duration("default_value", def),
			slog.String("error", err.Error()))
		return def
	}
	logger.InfoContext(ctx, "Using value",
		slog.String("env", key), slog.String("env_value", parsed.String()))
	return parsed
}

func GetIntEnv(ctx context.Context, logger *slog.Logger, key string, def int) int {
	s, ok := os.LookupEnv(key)
	if !ok {
		logger.InfoContext(ctx, "Using default value",
			slog.String("env", key),
			slog.String("env_value", s),
			slog.Int("default_value", def))
		return def
	}

	parsed, err := strconv.Atoi(s)
	if err != nil {
		logger.InfoContext(ctx, "Using default value because the given Integer could not be parsed",
			slog.String("env", key),
			slog.String("env_value", s),
			slog.Int("default_value", def),
			slog.String("error", err.Error()))
		return def
	}

	logger.InfoContext(ctx, "Using value",
		slog.String("env", key), slog.Int("env_value", parsed))
	return parsed
}

func GetInt64Env(ctx context.Context, logger *slog.Logger, key string, def int64) int64 {
	s, ok := os.LookupEnv(key)
	if !ok {
		logger.InfoContext(ctx, "Using default value",
			slog.String("env", key),
			slog.String("env_value", s),
			slog.Int64("default_value", def))
		return def
	}

	parsed, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		logger.InfoContext(ctx, "Using default value because the given Integer could not be parsed",
			slog.String("env", key),
			slog.String("env_value", s),
			slog.Int64("default_value", def),
			slog.String("error", err.Error()))
		return def
	}

	logger.InfoContext(ctx, "Using value",
		slog.String("env", key), slog.Int64("env_value", parsed))
	return parsed
}
