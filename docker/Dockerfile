

# build the frontend
FROM node:25.2.1-alpine3.21 AS frontendbuilder

WORKDIR /app

# Install Python and build dependencies needed for node-gyp
RUN apk add --no-cache python3 make g++ gcc py3-setuptools

# Install dependencies based on the preferred package manager
COPY frontend/package.json frontend/bun.lock* ./

RUN ls

RUN npm install -g bun && bun install --frozen-lockfile; 

# The actual app code
COPY frontend/ ./
RUN bun run build --outDir /pb/pb_public;


# build backend
FROM golang:1.27-alpine AS build

RUN apk add --no-cache git

RUN go install github.com/nats-io/natscli/nats@v0.2.0

WORKDIR /src

COPY ./ ./

# Run tests​
# RUN CGO_ENABLED=0 go test -timeout 30s -v ./...

# copy the frontend build​ into wwwroot
COPY --from=frontendbuilder /pb/pb_public /src/cmd/wwwroot

# Build the executable​
RUN CGO_ENABLED=0 go build \
    -mod=vendor \
    -o /app ./cmd/
    
# STAGE 2: get a simple sh
FROM busybox:1.38.0-uclibc AS busybox

# STAGE 4: build the container to run​
FROM gcr.io/distroless/static AS final
#FROM debian AS final

# copy compiled app​
COPY --from=build /app /app
# copy compiled nats
# nats cli expects the context in $HOME/.config/nats/context or $XDG_CONFIG_HOME/nats/context
# so in our case: /pb_data/.config/nats/context/{account-name}-{userName}.json
ENV XDG_CONFIG_HOME=/pb_data/.config

COPY --from=build /go/bin/nats /bin/nats
# copy sh
COPY --from=busybox /bin/sh /bin/sh
# copy ls from busybox
COPY --from=busybox /bin/ls /bin/ls
# copy cat from busybox
COPY --from=busybox /bin/cat /bin/cat

WORKDIR /

ENTRYPOINT ["/app"]
