package handler

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/pocketbase/pocketbase/core"
)

type SSEEvent struct {
	Data  string // event data, required
	ID    string // event ID, optional
	Event string // event name, optional
	Retry int    // milliseconds, optional
	Error error  // closes the connection if not nil, if io.EOF, it will not log an error
}

func WriteSSEEvent(ctx context.Context,
	resultChannel chan *SSEEvent,
	ev *SSEEvent) {
	if ev.Error != nil {
		fmt.Println("Error: ", ev.Error)
	}
	select {
	case <-ctx.Done():
	case resultChannel <- ev:
	}
}

func SSEHandler(e *core.RequestEvent) error {
	// Set http headers required for SSE
	e.Response.Header().Set("Content-Type", "text/event-stream")
	e.Response.Header().Set("Cache-Control", "no-cache")
	e.Response.Header().Set("Connection", "keep-alive")

	// You may need this locally for CORS requests
	e.Response.Header().Set("Access-Control-Allow-Origin", "*")

	// Create a channel for client disconnection
	clientGone := e.Request.Context().Done()

	rc := http.NewResponseController(e.Response)

	// Determine the source of messages
	eventSourcesString := e.Request.URL.Query().Get("sources")
	if eventSourcesString == "" {
		// no source specified, return an error
		return e.BadRequestError("No sources specified", nil)
	}

	splits := strings.Split(eventSourcesString, ",")
	resultChannel := make(chan *SSEEvent)
	for _, source := range splits {
		switch source {
		case "stream_list":
			go StreamStreamList(e, resultChannel)
		case "stream_count":
			go StreamStreamCount(e, resultChannel)
		default:
			return e.BadRequestError("Unknown source specified", nil)
		}
	}

	for {
		select {
		case <-clientGone:
			return e.Next()
		case ev := <-resultChannel:
			// Send an event to the client
			if ev.Error != nil {
				if errors.Is(ev.Error, io.EOF) {
					return e.Next()
				}
				return ev.Error
			}
			if ev.ID != "" {
				_, err := fmt.Fprintf(e.Response, "id: %s\n", ev.ID)
				if err != nil {
					return e.Next()
				}
			}
			if ev.Event != "" {
				_, err := fmt.Fprintf(e.Response, "event: %s\n", ev.Event)
				if err != nil {
					return e.Next()
				}
			}
			if ev.Retry > 0 {
				_, err := fmt.Fprintf(e.Response, "retry: %d\n", ev.Retry)
				if err != nil {
					return e.Next()
				}
			}
			_, err := fmt.Fprintf(e.Response, "data: %s\n\n", ev.Data)
			if err != nil {
				return e.Next()
			}
			err = rc.Flush()
			if err != nil {
				return e.Next()
			}
		}
	}
}
