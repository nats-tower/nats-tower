package restapi

import (
	"fmt"
	"net/http"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/router"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

type MetricMiddleware interface {
	// WrapHandler wraps the given HTTP handler for instrumentation.
	WrapHandler(handlerName string) func(e *core.RequestEvent) error
}

type metricMiddleware struct {
	buckets  []float64
	registry prometheus.Registerer
}

// WrapHandler wraps the given HTTP handler for instrumentation:
// It registers four metric collectors (if not already done) and reports HTTP
// metrics to the (newly or already) registered collectors.
// Each has a constant label named "handler" with the provided handlerName as
// value.
func (m *metricMiddleware) WrapHandler(handlerName string) func(e *core.RequestEvent) error {
	reg := prometheus.WrapRegistererWith(prometheus.Labels{"handler": handlerName}, m.registry)

	requestsTotal := promauto.With(reg).NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Tracks the number of HTTP requests.",
		}, []string{"method", "code"},
	)
	requestDuration := promauto.With(reg).NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Tracks the latencies for HTTP requests.",
			Buckets: m.buckets,
		},
		[]string{"method", "code"},
	)
	requestSize := promauto.With(reg).NewSummaryVec(
		prometheus.SummaryOpts{
			Name: "http_request_size_bytes",
			Help: "Tracks the size of HTTP requests.",
		},
		[]string{"method", "code"},
	)
	responseSize := promauto.With(reg).NewSummaryVec(
		prometheus.SummaryOpts{
			Name: "http_response_size_bytes",
			Help: "Tracks the size of HTTP responses.",
		},
		[]string{"method", "code"},
	)

	return func(e *core.RequestEvent) error {
		now := time.Now()

		responseWriter := &responseSizeWriter{
			ResponseWriter: e.Response,
			size:           0,
		}
		e.Response = responseWriter
		err := e.Next()

		httpStatus := http.StatusOK
		if err != nil {
			if apiErr, ok := err.(*router.ApiError); ok {
				httpStatus = apiErr.Status
			} else {
				httpStatus = http.StatusInternalServerError
			}
		}

		requestsTotal.WithLabelValues(
			e.Request.Method, fmt.Sprintf("%d", httpStatus),
		).Inc()
		requestDuration.WithLabelValues(
			e.Request.Method, fmt.Sprintf("%d", httpStatus),
		).Observe(time.Since(now).Seconds())
		requestSize.WithLabelValues(
			e.Request.Method, fmt.Sprintf("%d", httpStatus),
		).Observe(float64(e.Request.ContentLength))
		responseSize.WithLabelValues(
			e.Request.Method, fmt.Sprintf("%d", httpStatus),
		).Observe(float64(responseWriter.size))

		return err
	}
}

type responseSizeWriter struct {
	http.ResponseWriter
	size int64
}

func (w *responseSizeWriter) Write(b []byte) (int, error) {
	n, err := w.ResponseWriter.Write(b)
	w.size += int64(n)
	return n, err
}

// New returns a Middleware interface.
func NewMetricMiddleware(registry prometheus.Registerer, buckets []float64) MetricMiddleware {
	if buckets == nil {
		buckets = prometheus.ExponentialBuckets(0.1, 1.5, 5)
	}

	return &metricMiddleware{
		buckets:  buckets,
		registry: registry,
	}
}
