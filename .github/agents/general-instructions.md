# NATS Tower - Copilot Agent General Instructions

## Project Overview

NATS Tower is a multi-tenant manager for NATS messaging system that allows users to:
- Create and manage tenants/accounts
- Manage users and their permissions
- Control resource allocations
- Provide a web-based UI for NATS management

The project uses decentralized JWT authentication and requires NATS servers to run in [Operator mode](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/jwt).

## Technology Stack

### Backend
- **Language**: Go 1.24+
- **Framework**: [Pocketbase](https://pocketbase.io/) v0.28.1
- **Key Dependencies**:
  - `github.com/nats-io/nats.go` - NATS client
  - `github.com/nats-io/jwt/v2` - JWT authentication
  - `github.com/nats-io/nkeys` - NATS key management
  - `github.com/prometheus/client_golang` - Prometheus metrics

### Frontend
- **Framework**: React 18.3+ with TypeScript
- **Build Tool**: Vite 6.4+
- **Package Manager**: pnpm
- **Routing**: TanStack Router v1.114+
- **State Management**: TanStack Query v5.71+
- **UI Components**: Radix UI primitives
- **Styling**: Tailwind CSS v3.4+ with tailwindcss-animate
- **Forms**: React Hook Form v7.65+ with Zod validation
- **API Client**: Pocketbase SDK v0.25+

### Infrastructure
- **Containerization**: Docker multi-stage builds
- **Deployment**: Container registry (ghcr.io)
- **Documentation**: MkDocs

## Repository Structure

```
.
├── .github/              # GitHub configuration and workflows
├── application/          # Application types and shared code
├── cmd/                  # Main application entry point
│   ├── main.go          # CLI and server initialization
│   └── wwwroot/         # Embedded frontend assets (build output)
├── docker/              # Docker configuration
│   └── Dockerfile       # Multi-stage build
├── docs/                # Documentation source (MkDocs)
├── frontend/            # React TypeScript frontend
│   ├── src/             # Source code
│   ├── public/          # Static assets
│   └── package.json     # Frontend dependencies
├── interfaces/          # API interfaces
│   ├── restapi/         # REST API handlers
│   └── teams/           # Team management
├── natsauth/            # NATS authentication logic
├── supercluster/        # Supercluster configuration
├── utils/               # Shared utilities
├── vendor/              # Go vendored dependencies
├── go.mod               # Go module definition
└── mkdocs.yaml          # Documentation configuration
```

## Development Workflow

### Building the Project

**Backend:**
```bash
# Build the Go application
CGO_ENABLED=0 go build -mod=vendor -o ./nats-tower ./cmd/

# Run tests
go test -v ./...
```

**Frontend:**
```bash
cd frontend
pnpm install
pnpm run build    # Production build
pnpm run dev      # Development server
pnpm run lint     # Lint TypeScript/React code
```

**Docker:**
```bash
# Build the complete application (frontend + backend)
docker build -f docker/Dockerfile -t nats-tower .

# Run the container
docker run -p 8099:8099 nats-tower serve --http 0.0.0.0:8099
```

### Testing Approach

**Backend:**
- Limited test coverage exists in `natsauth/nats_test.go`
- Tests should use standard Go testing patterns
- Run tests with: `go test -v ./...`

**Frontend:**
- Currently no test infrastructure
- Follow React Testing Library patterns if adding tests

## Code Conventions

### Go Code
- Use Go 1.24+ features
- Follow standard Go formatting (gofmt)
- Use vendored dependencies (`-mod=vendor`)
- Disable CGO for static builds (`CGO_ENABLED=0`)
- Organize code by domain (natsauth, interfaces, application)

### TypeScript/React Code
- Use TypeScript strict mode
- Follow ESLint configuration (`.eslintrc.cjs`)
- Use functional components with hooks
- Prefer composition over prop drilling
- Use TanStack Query for server state
- Use TanStack Router for navigation
- Use React Hook Form + Zod for form validation

### Code Style
- **Go**: Follow standard Go conventions and idioms
- **TypeScript**: Follow configured ESLint rules
- **CSS**: Use Tailwind utility classes, avoid custom CSS where possible
- **Naming**: Use descriptive, intention-revealing names

## Key Concepts

### NATS Authentication Flow
1. **Operator**: Root level authority that signs accounts
2. **Accounts**: Isolated namespaces for tenants
3. **Users**: Individual identities within accounts
4. **JWT Tokens**: Signed credentials for authentication
5. **NKeys**: Public/private key pairs for signing

### Pocketbase Integration
- Pocketbase provides the database, auth, and real-time features
- Custom API routes are defined in `interfaces/restapi/`
- Database models are defined via Pocketbase collections
- Default admin: `admin@test.org` / `testtest`
- Default user: `user@test.org` / `testtest`

### Multi-stage Docker Build
1. **Stage 1 (frontendbuilder)**: Build React frontend with Node/pnpm
2. **Stage 2 (build)**: Build Go backend with vendored deps
3. **Stage 3 (busybox)**: Extract minimal shell utilities
4. **Stage 4 (final)**: Distroless image with app + minimal tools

## Important Files

- `cmd/main.go` - Application entry point and CLI
- `natsauth/nats.go` - Core NATS authentication logic
- `natsauth/accounts.go` - Account management
- `natsauth/users.go` - User management
- `frontend/src/` - Frontend application code
- `docker/Dockerfile` - Production build configuration
- `go.mod` - Go dependencies (do not modify without reason)
- `frontend/package.json` - Frontend dependencies

## When Making Changes

### Backend Changes
1. Ensure Go 1.24+ compatibility
2. Use vendored dependencies
3. Run tests: `go test -v ./...`
4. Check that builds work: `CGO_ENABLED=0 go build -mod=vendor -o ./nats-tower ./cmd/`
5. Verify Docker build if touching Dockerfile or dependencies

### Frontend Changes
1. Run ESLint: `pnpm run lint`
2. Build to verify: `pnpm run build`
3. Test locally: `pnpm run dev`
4. Ensure TypeScript types are correct
5. Follow existing component patterns

### Documentation Changes
1. Update relevant `.md` files in `docs/`
2. Preview with MkDocs if possible
3. Keep README.md in sync with major changes

## Common Tasks

### Adding a New Dependency

**Go:**
```bash
go get github.com/example/package
go mod vendor
```

**Frontend:**
```bash
cd frontend
pnpm add package-name
```

### Creating New API Endpoints
- Add handlers in `interfaces/restapi/`
- Follow Pocketbase routing patterns
- Integrate with NATS logic in `natsauth/` as needed

### Modifying NATS Logic
- Core logic is in `natsauth/` package
- Account operations in `accounts.go`
- User operations in `users.go`
- JWT signing and verification patterns are established

## Security Considerations

1. **JWT Tokens**: Use proper signing and validation
2. **NKeys**: Handle private keys securely
3. **API Authentication**: Leverage Pocketbase auth middleware
4. **Input Validation**: Always validate and sanitize user inputs
5. **Resource Limits**: Respect NATS account limits
6. **Secrets**: Never commit secrets or credentials

## Deployment

- Production builds via GitHub Actions (`.github/workflows/build.yaml`)
- Container images pushed to `ghcr.io/nats-tower/nats-tower`
- Documentation built via `.github/workflows/docs.yaml`
- Releases managed via `.github/workflows/release.yaml`

## Support Resources

- **Project Website**: https://nats-tower.com
- **Demo Instance**: https://demo.nats-tower.com
- **NATS Documentation**: https://docs.nats.io/
- **Pocketbase Documentation**: https://pocketbase.io/docs/
- **GitHub Repository**: https://github.com/nats-tower/nats-tower

## Notes for Copilot Agents

- This is a production project with real users
- Maintain backward compatibility when possible
- Follow established patterns in the codebase
- Minimal, focused changes are preferred
- Test thoroughly before proposing changes
- Security is paramount given the authentication focus
