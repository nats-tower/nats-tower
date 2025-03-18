# build backend
FROM golang:1.23-alpine AS build

RUN apk add --no-cache git

RUN go install github.com/nats-io/natscli/nats@v0.1.4

WORKDIR /src

COPY ./ ./

# Run tests​
# RUN CGO_ENABLED=0 go test -timeout 30s -v ./...

# Build the executable​
RUN CGO_ENABLED=0 go build \
    -mod=vendor \
    -o /app ./cmd/
    
# STAGE 2: get a simple sh
FROM busybox:1.35.0-uclibc AS busybox

# STAGE 4: build the container to run​
FROM gcr.io/distroless/static AS final

# copy compiled app​
COPY --from=build /app /app
# copy compiled nats
# nats cli expects the context in $HOME/.config/nats/context or $XDG_CONFIG_HOME/nats/context
# so in our case: /pb_data/.config/nats/context/{account-name}-{userName}.json
ENV XDG_CONFIG_HOME=/pb_data/.config

COPY --from=build /go/bin/nats /bin/nats
# copy sh
COPY --from=busybox /bin/sh /bin/sh

WORKDIR /

ENTRYPOINT ["/app"]
