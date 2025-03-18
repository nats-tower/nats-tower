package natsauth

import (
	"context"
	"encoding/json"
)

type Logger interface {
	LogInfo(ctx context.Context, s string, p ...interface{})
	LogTrace(ctx context.Context, s string, p ...interface{})
	LogError(ctx context.Context, s string, p ...interface{})
	IsTraceEnabled(ctx context.Context) bool
}

func ToJSONString(v interface{}) string {
	b, _ := json.MarshalIndent(v, "", "    ")
	return string(b)
}
