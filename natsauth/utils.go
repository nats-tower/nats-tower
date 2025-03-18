package natsauth

import (
	"context"
	"time"

	"github.com/nats-io/nats.go"
)

type RequestMultipleOptions struct {
	Timeout      time.Duration
	MaxResponses int
	EachFunc     func(*nats.Msg) bool // return false to stop receiving messages
}

func RequestMultiple(ctx context.Context,
	nc *nats.Conn,
	subj string,
	data []byte,
	opts RequestMultipleOptions) ([]*nats.Msg, error) {

	subCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	respSubject := nats.NewInbox()

	msgs := make(chan *nats.Msg)
	sub, err := nc.Subscribe(respSubject, func(m *nats.Msg) {
		select {
		case msgs <- m:
		case <-subCtx.Done():
		}
	})
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = sub.Unsubscribe()
	}()

	err = nc.PublishRequest(subj,
		respSubject,
		data)
	if err != nil {
		return nil, err
	}

	var res []*nats.Msg

	start := time.Now()

	for {
		if time.Since(start) > opts.Timeout {
			// reached timeout
			break
		}
		if len(res) >= opts.MaxResponses && opts.MaxResponses > 0 {
			// reached max responses
			break
		}
		select {
		case m := <-msgs:
			res = append(res, m)
			if opts.EachFunc != nil {
				if !opts.EachFunc(m) {
					return res, nil
				}
			}
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(time.Second):
			break
		}
	}

	return res, nil
}

type RequestMultipleChannelOptions struct {
	EachFunc func(*nats.Msg) bool // return false to stop receiving messages
}

func RequestMultipleChannel(ctx context.Context,
	nc *nats.Conn,
	subj string,
	data []byte,
	opts RequestMultipleChannelOptions) (chan *nats.Msg, error) {

	resCh := make(chan *nats.Msg)
	subCtx, cancel := context.WithCancel(ctx)
	respSubject := nats.NewInbox()

	sub, err := nc.Subscribe(respSubject, func(m *nats.Msg) {
		select {
		case resCh <- m:
			if opts.EachFunc != nil {
				if !opts.EachFunc(m) {
					cancel()
				}
			}
		case <-subCtx.Done():
		}
	})
	if err != nil {
		return nil, err
	}
	go func() {
		<-ctx.Done()
		_ = sub.Unsubscribe()
	}()

	err = nc.PublishRequest(subj,
		respSubject,
		data)
	if err != nil {
		return nil, err
	}
	return resCh, nil
}
