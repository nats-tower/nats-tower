# NATS Tower - Docker & Deployment Instructions

## Scope
This guide covers Docker containerization, build processes, and deployment strategies for NATS Tower.

## Docker Architecture

### Multi-Stage Build Overview

The `docker/Dockerfile` uses a 4-stage build process for optimal image size and security:

1. **Stage 1: frontendbuilder** - Build React frontend
2. **Stage 2: build** - Build Go backend  
3. **Stage 3: busybox** - Extract minimal shell utilities
4. **Stage 4: final** - Create minimal distroless runtime image

### Stage 1: Frontend Builder

```dockerfile
FROM node:20.19.0-alpine3.21 AS frontendbuilder

WORKDIR /app

# Install build dependencies for node-gyp
RUN apk add --no-cache python3 make g++ gcc py3-setuptools

# Copy package files
COPY frontend/package.json frontend/pnpm-lock.yaml* ./

# Install dependencies
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Copy source and build
COPY frontend/ ./
RUN corepack enable pnpm && pnpm run build --outDir /pb/pb_public
```

**Key Points:**
- Uses Node 20.19.0 on Alpine Linux
- Installs Python and build tools for native modules (node-gyp)
- Uses pnpm with frozen lockfile for reproducible builds
- Builds frontend to `/pb/pb_public` (embedded in Go binary)

### Stage 2: Go Backend Builder

```dockerfile
FROM golang:1.25-alpine AS build

RUN apk add --no-cache git

# Install NATS CLI
RUN go install github.com/nats-io/natscli/nats@v0.2.0

WORKDIR /src
COPY ./ ./

# Copy frontend build to wwwroot
COPY --from=frontendbuilder /pb/pb_public /src/cmd/wwwroot

# Build Go binary
RUN CGO_ENABLED=0 go build \
    -mod=vendor \
    -o /app ./cmd/
```

**Key Points:**
- Uses Go 1.25 Alpine image
- Installs NATS CLI for runtime operations
- Frontend build copied to `cmd/wwwroot` (embedded via Go embed)
- Static binary with `CGO_ENABLED=0` for portability
- Uses vendored dependencies (`-mod=vendor`)

### Stage 3: Busybox Utilities

```dockerfile
FROM busybox:1.37.0-uclibc AS busybox
```

**Purpose:**
- Provides minimal shell utilities (sh, ls, cat)
- Needed for distroless image which has no shell

### Stage 4: Final Runtime Image

```dockerfile
FROM gcr.io/distroless/static AS final

# Copy application
COPY --from=build /app /app

# Copy NATS CLI
ENV XDG_CONFIG_HOME=/pb_data/.config
COPY --from=build /go/bin/nats /bin/nats

# Copy minimal utilities
COPY --from=busybox /bin/sh /bin/sh
COPY --from=busybox /bin/ls /bin/ls
COPY --from=busybox /bin/cat /bin/cat

WORKDIR /

ENTRYPOINT ["/app"]
```

**Key Points:**
- Distroless base (minimal attack surface, ~20MB)
- Only contains application and essential tools
- No package manager, shell (except minimal busybox sh)
- NATS CLI available for runtime operations
- Environment: `XDG_CONFIG_HOME=/pb_data/.config` for NATS contexts

## Building the Docker Image

### Local Build
```bash
# From repository root
docker build -f docker/Dockerfile -t nats-tower:local .

# Build with specific tag
docker build -f docker/Dockerfile -t nats-tower:v1.0.0 .

# Build for multiple platforms (requires buildx)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f docker/Dockerfile \
  -t nats-tower:latest .
```

### CI/CD Build (GitHub Actions)

See `.github/workflows/build.yaml`:

```yaml
- name: Build and push
  uses: docker/build-push-action@v6
  with:
    context: .
    file: ./docker/Dockerfile
    push: true
    tags: ${{ steps.meta.outputs.tags }}
    labels: ${{ steps.meta.outputs.labels }}
    platforms: linux/amd64
```

**Triggers:**
- Push to `main` branch
- Publishes to `ghcr.io/nats-tower/nats-tower:main`

### Build Performance

**Optimization Tips:**
1. **Layer Caching**: Order COPY commands from least to most frequently changed
2. **Multi-platform**: Use Docker Buildx for ARM/AMD builds
3. **BuildKit**: Enable with `DOCKER_BUILDKIT=1`
4. **.dockerignore**: Exclude unnecessary files

**Typical Build Time:**
- Frontend build: ~2-5 minutes (pnpm install + vite build)
- Backend build: ~1-2 minutes (vendored deps cached)
- Total: ~5-10 minutes

## Running the Container

### Basic Run
```bash
docker run -p 8099:8099 nats-tower:latest serve --http 0.0.0.0:8099
```

### With Volume (Persistent Data)
```bash
docker run \
  -p 8099:8099 \
  -v $(pwd)/pb_data:/pb_data \
  nats-tower:latest serve --http 0.0.0.0:8099
```

### With Environment Variables
```bash
docker run \
  -p 8099:8099 \
  -e NATS_URL=nats://nats-server:4222 \
  -e OPERATOR_NAME=MyOperator \
  -v $(pwd)/pb_data:/pb_data \
  nats-tower:latest serve --http 0.0.0.0:8099
```

### Docker Compose Example
```yaml
version: '3.8'

services:
  nats-server:
    image: nats:latest
    command: "-c /nats-server.conf"
    volumes:
      - ./nats-server.conf:/nats-server.conf
    ports:
      - "4222:4222"
      - "8222:8222"

  nats-tower:
    image: ghcr.io/nats-tower/nats-tower:main
    command: serve --http 0.0.0.0:8099
    ports:
      - "8099:8099"
    volumes:
      - ./pb_data:/pb_data
    depends_on:
      - nats-server
    environment:
      NATS_URL: nats://nats-server:4222
```

## Container Configuration

### Volumes

**`/pb_data`** - Pocketbase data directory
- SQLite database: `pb_data/data.db`
- Uploaded files: `pb_data/storage/`
- Logs: `pb_data/logs/`
- NATS contexts: `pb_data/.config/nats/context/`

**Important:** Always mount `/pb_data` for production to persist data

### Ports

**8099** - Default HTTP server port
- Web UI: `http://localhost:8099`
- Admin UI: `http://localhost:8099/_/`
- API: `http://localhost:8099/api/*`

### Environment Variables

Common environment variables (application-specific):
```bash
NATS_URL=nats://localhost:4222          # NATS server URL
OPERATOR_NAME=MyOperator                # Operator name
XDG_CONFIG_HOME=/pb_data/.config       # NATS context location (set by Dockerfile)
```

### Command Line Arguments
```bash
# Serve command
/app serve --http 0.0.0.0:8099

# Available flags (from Pocketbase/Cobra):
--http string     HTTP server address (default "127.0.0.1:8090")
--dir string      Data directory (default "pb_data")
--help           Show help
```

## Deployment Strategies

### Kubernetes

**Deployment Example:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats-tower
spec:
  replicas: 1  # Single instance (Pocketbase limitation)
  selector:
    matchLabels:
      app: nats-tower
  template:
    metadata:
      labels:
        app: nats-tower
    spec:
      containers:
      - name: nats-tower
        image: ghcr.io/nats-tower/nats-tower:main
        args: ["serve", "--http", "0.0.0.0:8099"]
        ports:
        - containerPort: 8099
        volumeMounts:
        - name: data
          mountPath: /pb_data
        env:
        - name: NATS_URL
          value: "nats://nats-service:4222"
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: nats-tower-data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nats-tower-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: nats-tower
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8099
  selector:
    app: nats-tower
```

**Important Notes:**
- **Single Replica Only**: Pocketbase SQLite limitation
- **Persistent Volume Required**: Mount `/pb_data`
- **ReadWriteOnce**: Volume access mode

### Cloud Platforms

**AWS ECS/Fargate:**
```json
{
  "family": "nats-tower",
  "containerDefinitions": [
    {
      "name": "nats-tower",
      "image": "ghcr.io/nats-tower/nats-tower:main",
      "command": ["serve", "--http", "0.0.0.0:8099"],
      "portMappings": [
        {
          "containerPort": 8099,
          "protocol": "tcp"
        }
      ],
      "mountPoints": [
        {
          "sourceVolume": "pb_data",
          "containerPath": "/pb_data"
        }
      ]
    }
  ],
  "volumes": [
    {
      "name": "pb_data",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-xxxxx"
      }
    }
  ]
}
```

**Google Cloud Run:**
- Use Cloud SQL or Cloud Filestore for `/pb_data`
- Note: Cloud Run may have limitations with SQLite

**Azure Container Instances:**
- Mount Azure Files for persistent storage

## Security Considerations

### Container Security

1. **Distroless Base**: Minimal attack surface
2. **Non-root User**: Distroless runs as non-root by default
3. **No Shell**: Limited utility for attackers
4. **Static Binary**: No dynamic linking vulnerabilities

### Scanning
```bash
# Scan for vulnerabilities
docker scan nats-tower:latest

# Use Trivy
trivy image nats-tower:latest
```

### Secret Management

**Don't:**
- Include secrets in Dockerfile or image
- Pass secrets via environment variables in logs

**Do:**
- Use Docker secrets (Swarm) or Kubernetes secrets
- Mount secret files at runtime
- Use cloud provider secret managers

**Example with Kubernetes Secrets:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: nats-tower-secrets
type: Opaque
stringData:
  nats-operator-seed: "SOABC..."
---
# In deployment:
env:
- name: OPERATOR_SEED
  valueFrom:
    secretKeyRef:
      name: nats-tower-secrets
      key: nats-operator-seed
```

## Debugging Container Issues

### View Logs
```bash
# Stream logs
docker logs -f <container-id>

# Last 100 lines
docker logs --tail 100 <container-id>
```

### Execute Commands
```bash
# Access shell (minimal busybox sh)
docker exec -it <container-id> /bin/sh

# List files
docker exec <container-id> /bin/ls /pb_data

# View file
docker exec <container-id> /bin/cat /pb_data/data.db
```

### Inspect Container
```bash
# Get container details
docker inspect <container-id>

# Check environment variables
docker inspect <container-id> | grep -A 20 Env

# Check volumes
docker inspect <container-id> | grep -A 10 Mounts
```

### Check NATS Connection
```bash
# Use NATS CLI inside container
docker exec <container-id> /bin/nats server list

# Check NATS context
docker exec <container-id> /bin/ls /pb_data/.config/nats/context/
```

## Troubleshooting

### Issue: Frontend Not Loading

**Symptoms:** Blank page or 404 errors

**Solutions:**
1. Verify frontend was built in Stage 1
2. Check `cmd/wwwroot` contains built files
3. Ensure Go embed directives are correct

**Debug:**
```bash
docker exec <container-id> /bin/ls /app
# Should show embedded assets
```

### Issue: Database Locked

**Symptoms:** `database is locked` errors

**Cause:** Multiple instances accessing same SQLite database

**Solution:** 
- Only run one replica
- Use proper persistent volumes (not shared filesystems)

### Issue: NATS Connection Failed

**Symptoms:** Cannot connect to NATS server

**Solutions:**
1. Check NATS_URL environment variable
2. Verify NATS server is accessible from container
3. Check network configuration
4. Verify operator mode is enabled on NATS server

**Debug:**
```bash
docker exec <container-id> /bin/nats server ping
```

### Issue: Permission Denied

**Symptoms:** Cannot write to `/pb_data`

**Solutions:**
1. Check volume mount permissions
2. Verify directory exists and is writable
3. Check SELinux/AppArmor policies

### Issue: Large Image Size

**Symptoms:** Image > 100MB

**Investigation:**
```bash
# Analyze layers
docker history nats-tower:latest

# Find large files
docker run --rm nats-tower:latest /bin/sh -c "du -sh /* 2>/dev/null"
```

**Optimization:**
- Ensure multi-stage build is working
- Check `.dockerignore` is excluding unnecessary files
- Verify vendored deps aren't duplicated

## Maintenance

### Updating Dependencies

**Frontend:**
1. Update `frontend/package.json`
2. Rebuild: `cd frontend && pnpm update && pnpm run build`
3. Rebuild Docker image

**Backend:**
1. Update `go.mod`
2. Run `go mod vendor`
3. Test build: `CGO_ENABLED=0 go build -mod=vendor ./cmd/`
4. Rebuild Docker image

### Image Tagging Strategy

**Recommended Tags:**
- `latest` - Latest stable release
- `main` - Latest from main branch
- `v1.2.3` - Specific version
- `sha-abc1234` - Specific commit

**GitHub Actions Pattern:**
```yaml
tags: |
  ghcr.io/nats-tower/nats-tower:latest
  ghcr.io/nats-tower/nats-tower:${{ github.sha }}
  ghcr.io/nats-tower/nats-tower:v${{ github.ref_name }}
```

### Backup and Restore

**Backup:**
```bash
# Stop container
docker stop nats-tower

# Backup data directory
tar -czf pb_data_backup.tar.gz ./pb_data

# Restart container
docker start nats-tower
```

**Restore:**
```bash
# Stop container
docker stop nats-tower

# Restore data
tar -xzf pb_data_backup.tar.gz

# Restart container
docker start nats-tower
```

## Performance Tuning

### Resource Limits

**Docker Run:**
```bash
docker run \
  --memory="512m" \
  --cpus="1.0" \
  -p 8099:8099 \
  nats-tower:latest serve --http 0.0.0.0:8099
```

**Kubernetes:**
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Health Checks

**Docker:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD ["/bin/sh", "-c", "nc -z localhost 8099 || exit 1"]
```

**Kubernetes:**
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 8099
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health
    port: 8099
  initialDelaySeconds: 5
  periodSeconds: 5
```

## CI/CD Integration

### GitHub Actions Workflow

Current workflow (`.github/workflows/build.yaml`):
1. Checkout code
2. Login to GitHub Container Registry
3. Setup QEMU (for multi-arch)
4. Setup Docker Buildx
5. Extract metadata (tags, labels)
6. Build and push image

### Adding Tests to Build

```yaml
- name: Run tests
  run: |
    CGO_ENABLED=0 go test -timeout 30s -v ./...
```

### Release Workflow

See `.github/workflows/release.yaml` for automated releases.

## Additional Resources

- **Docker Best Practices**: https://docs.docker.com/develop/dev-best-practices/
- **Multi-stage Builds**: https://docs.docker.com/build/building/multi-stage/
- **Distroless Images**: https://github.com/GoogleContainerTools/distroless
- **Kubernetes Patterns**: https://kubernetes.io/docs/concepts/workloads/
