# NATS Tower - Backend Development Instructions

## Scope
This guide is for working with the Go backend of NATS Tower, which is built on Pocketbase and integrates with NATS messaging system.

## Go Environment

### Version Requirements
- **Go**: 1.24.0+ (specified in go.mod)
- **Toolchain**: go1.24.1

### Build Configuration
```bash
# Always use vendored dependencies
go build -mod=vendor

# Disable CGO for static builds (required for distroless container)
CGO_ENABLED=0 go build -mod=vendor -o ./nats-tower ./cmd/
```

## Project Structure

### Key Packages

**`cmd/`** - Application entry point
- `main.go`: CLI initialization, Pocketbase app setup, HTTP server
- `wwwroot/`: Embedded frontend assets (populated during build)

**`natsauth/`** - Core NATS authentication and management
- `nats.go`: Main NATS client, JWT resolver, account publisher
- `nats_init.go`: Initialization, system account setup
- `accounts.go`: Account creation, signing, management (21KB - complex)
- `users.go`: User credential generation, JWT creation
- `operators.go`: Operator key management
- `generators.go`: JWT and credential generation utilities
- `limits.go`: NATS account limits enforcement
- `pending.go`: Pending account/user synchronization
- `utils.go`: Helper functions
- `logger.go`: Logging utilities
- `nats_test.go`: Test suite

**`interfaces/`** - API layer
- `restapi/`: REST API endpoints and handlers
- `teams/`: Team management functionality

**`application/`** - Shared types
- `types.go`: Common type definitions

**`utils/`** - General utilities

**`supercluster/`** - NATS supercluster configuration files
- Operator and server configurations for multi-cluster setups

## Core Dependencies

### NATS Ecosystem
```go
github.com/nats-io/nats.go v1.48.0        // NATS client
github.com/nats-io/jwt/v2 v2.8.0          // JWT token handling
github.com/nats-io/nkeys v0.4.12          // Public key cryptography
github.com/nats-io/nats-server/v2 v2.12.3 // Server types/constants
github.com/nats-io/jsm.go v0.3.0          // JetStream management
```

### Pocketbase
```go
github.com/pocketbase/pocketbase v0.28.1  // Base framework
github.com/pocketbase/dbx v1.11.0         // Database queries
```

### Other Key Dependencies
```go
github.com/google/uuid v1.6.0                      // UUID generation
github.com/prometheus/client_golang v1.23.2        // Metrics
github.com/spf13/cobra v1.9.1                      // CLI framework
```

## NATS Tower Architecture

### JWT Authentication Flow

1. **Operator Level** (Root Authority)
   - Created on first run if not exists
   - Operator NKey (public/private key pair)
   - Signs account JWTs
   - Stored in Pocketbase

2. **Account Level** (Tenant Isolation)
   - Each tenant gets an account
   - Account JWT signed by operator
   - Contains limits (streams, consumers, memory, etc.)
   - Published to NATS under `$SYS.REQ.CLAIMS.UPDATE`

3. **User Level** (Individual Authentication)
   - User credentials (NKey + JWT)
   - User JWT signed by account key
   - Contains permissions and limits
   - Credentials downloaded as `.creds` file

### Key Files to Understand

**`natsauth/nats.go`** - Core Integration
```go
type NatsManager struct {
    nc          *nats.Conn      // NATS connection
    app         *pocketbase.PocketBase
    logger      *slog.Logger
    jwtResolver jwt.Resolver    // Resolves JWTs from account server
}
```

Important functions:
- `NewNatsManager()`: Initialize NATS connection
- `setupAccountServerResolver()`: Configure JWT resolution
- `publishAccountJWT()`: Publish account claims to NATS
- `ensureSystemAccount()`: Setup system account for management

**`natsauth/accounts.go`** - Account Management
- `CreateAccount()`: Create new NATS account with operator signature
- `UpdateAccountLimits()`: Modify resource limits
- `GetAccountJWT()`: Retrieve signed account JWT
- Account limits: streams, consumers, memory, storage, connections, etc.

**`natsauth/users.go`** - User Credentials
- `CreateUser()`: Generate user credentials (NKey + JWT)
- `GetUserCredentials()`: Format credentials as `.creds` file
- User permissions: pub/sub permissions, connection limits

## Development Guidelines

### 1. Working with NKeys and JWTs

**Creating an NKey:**
```go
import "github.com/nats-io/nkeys"

// Create operator key
operatorKey, err := nkeys.CreateOperator()
if err != nil {
    return err
}

// Get public key
publicKey, err := operatorKey.PublicKey()

// Get seed (private key) - MUST BE KEPT SECRET
seed, err := operatorKey.Seed()
```

**Signing JWTs:**
```go
import "github.com/nats-io/jwt/v2"

// Create account claims
claims := jwt.NewAccountClaims(publicKey)
claims.Name = "My Account"
claims.Limits.Conn = 100

// Sign with operator key
token, err := claims.Encode(operatorKey)
```

### 2. Pocketbase Patterns

**Database Queries:**
```go
// Get record by ID
record, err := app.Dao().FindRecordById("collection_name", id)

// Query with filter
records, err := app.Dao().FindRecordsByFilter(
    "collection_name",
    "status = 'active'",
    "-created",  // sort descending
    10,          // limit
    0,           // offset
)
```

**API Endpoints:**
```go
// Register custom route
app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
    e.Router.GET("/api/custom", func(c echo.Context) error {
        return c.JSON(http.StatusOK, map[string]string{
            "message": "Hello",
        })
    })
    return nil
})
```

### 3. NATS Connection Patterns

**Publishing Messages:**
```go
// Publish to subject
err := nc.Publish("subject.name", []byte("message"))

// Request-reply
msg, err := nc.Request("subject.name", []byte("request"), 2*time.Second)
```

**Subscribing:**
```go
// Simple subscription
sub, err := nc.Subscribe("subject.*", func(msg *nats.Msg) {
    // Handle message
})

// Queue subscription (load balanced)
sub, err := nc.QueueSubscribe("subject.*", "queue-group", handler)
```

### 4. Error Handling

**Pattern:**
```go
func DoSomething() error {
    if err := step1(); err != nil {
        return fmt.Errorf("step1 failed: %w", err)
    }
    
    if err := step2(); err != nil {
        return fmt.Errorf("step2 failed: %w", err)
    }
    
    return nil
}
```

**In API handlers:**
```go
func handler(c echo.Context) error {
    if err := doWork(); err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{
            "error": err.Error(),
        })
    }
    return c.JSON(http.StatusOK, result)
}
```

## Testing

### Running Tests
```bash
# Run all tests
go test -v ./...

# Run specific package
go test -v ./natsauth

# Run with timeout
go test -timeout 30s -v ./...

# Run specific test
go test -v -run TestSpecificFunction ./natsauth
```

### Test Structure (natsauth/nats_test.go)
- Uses standard Go testing
- Currently limited coverage
- Follow existing patterns when adding tests

### Writing Tests
```go
func TestSomething(t *testing.T) {
    // Setup
    
    // Execute
    result, err := FunctionUnderTest()
    
    // Assert
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    
    if result != expected {
        t.Errorf("got %v, want %v", result, expected)
    }
}
```

## Common Tasks

### Adding a New NATS Feature

1. **Define the functionality** in `natsauth/` package
2. **Add types** to `application/types.go` if needed
3. **Create API endpoint** in `interfaces/restapi/`
4. **Update Pocketbase collections** if database changes needed
5. **Add tests** in appropriate `_test.go` file
6. **Document** in relevant docs files

### Modifying Account Limits

Edit `natsauth/limits.go` or `accounts.go`:
```go
// Example: Add new limit type
claims.Limits.NewLimitType = value

// Ensure it's validated and persisted
```

### Adding Prometheus Metrics

```go
import "github.com/prometheus/client_golang/prometheus"

// Define metric
var myMetric = prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Name: "nats_tower_operations_total",
        Help: "Total number of operations",
    },
    []string{"operation", "status"},
)

// Register in init()
func init() {
    prometheus.MustRegister(myMetric)
}

// Use
myMetric.WithLabelValues("create_account", "success").Inc()
```

## Build and Deployment

### Local Development Build
```bash
# Build binary
CGO_ENABLED=0 go build -mod=vendor -o ./nats-tower ./cmd/

# Run
./nats-tower serve --http 0.0.0.0:8099
```

### Docker Build (Multi-stage)
The Dockerfile handles:
1. Frontend build (Node/pnpm)
2. Copy frontend to `cmd/wwwroot`
3. Go build with vendored deps
4. Create minimal distroless image

### Adding Dependencies
```bash
# Add dependency
go get github.com/example/package@version

# Update vendor
go mod vendor

# Verify build still works
CGO_ENABLED=0 go build -mod=vendor -o ./nats-tower ./cmd/
```

## Security Best Practices

1. **Never log private keys or seeds**
2. **Validate all JWT signatures**
3. **Sanitize user inputs before database queries**
4. **Use Pocketbase's built-in auth middleware**
5. **Respect account limits to prevent resource exhaustion**
6. **Encrypt sensitive data at rest**
7. **Use secure random generation for keys (nkeys handles this)**

## Debugging Tips

### NATS Connection Issues
```bash
# Check NATS server is running in operator mode
# Verify operator JWT is configured correctly
# Check system account credentials
```

### JWT Problems
```go
// Decode and inspect JWT
claims, err := jwt.DecodeAccountClaims(tokenString)
if err != nil {
    log.Printf("decode error: %v", err)
}
log.Printf("claims: %+v", claims)
```

### Pocketbase Database
```bash
# Access database directly (SQLite)
sqlite3 pb_data/data.db

# View collections schema
.schema
```

## Performance Considerations

1. **NATS Connections**: Reuse connections, don't create per request
2. **JWT Caching**: JWTs can be cached as they don't change often
3. **Database Queries**: Use indexes, limit result sets
4. **Goroutines**: Be mindful of goroutine leaks in subscriptions
5. **Memory**: Account JWTs published to NATS should be reasonably sized

## Troubleshooting

### Build Failures
- Ensure Go 1.24+ is installed
- Check `go mod vendor` is up to date
- Verify `CGO_ENABLED=0` is set

### NATS Connection Failed
- Verify NATS server is running
- Check operator mode is enabled
- Confirm system account setup
- Review JWT resolver configuration

### JWT Signature Verification Failed
- Ensure correct operator key is used
- Check account key matches
- Verify claims structure

## Additional Resources

- **NATS JWT Auth**: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/jwt
- **NKeys**: https://github.com/nats-io/nkeys
- **Pocketbase Go API**: https://pocketbase.io/docs/go-overview/
- **NATS Go Client**: https://github.com/nats-io/nats.go
