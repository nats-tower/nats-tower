# NATS Tower - Agent Instructions

This document serves as an entry point for AI agents working on the NATS Tower project. Detailed instructions and context are organized by domain in the `.github/agents/` directory.

## 📂 Instruction Directory

The following specialized instruction files are available to help you understand the project structure, conventions, and best practices:

- **[General Instructions](.github/agents/general-instructions.md)** (`.github/agents/general-instructions.md`)
  - **Purpose:** Comprehensive overview of the entire project.
  - **Use for:** Understanding architecture, tech stack, workflows, and key concepts.

- **[Backend Agent Instructions](.github/agents/backend-agent.md)** (`.github/agents/backend-agent.md`)
  - **Purpose:** Detailed guide for Go backend development with Pocketbase.
  - **Use for:** Go coding, NATS auth integration, database operations, and API endpoints.

- **[Frontend Agent Instructions](.github/agents/frontend-agent.md)** (`.github/agents/frontend-agent.md`)
  - **Purpose:** Comprehensive guide for React TypeScript frontend development.
  - **Use for:** React/TS coding, TanStack Router/Query, Radix UI, and Tailwind CSS.

- **[Docker Agent Instructions](.github/agents/docker-agent.md)** (`.github/agents/docker-agent.md`)
  - **Purpose:** Instructions for Docker containerization and deployment.
  - **Use for:** Building images, running containers, and deployment strategies.

## 🚀 Quick Start for Agents

When starting a task, please:

1.  **Identify the domain** of the task (Backend, Frontend, or Docker/Infra).
2.  **Read the relevant instruction file** listed above to establish context.
3.  **Refer to `general-instructions.md`** for cross-cutting concerns and project-wide conventions.

## 🛠️ Technology Stack Summary

-   **Backend:** Go 1.24+ with Pocketbase v0.28.1
-   **Frontend:** React 18.3+ with TypeScript, Vite, TanStack Router/Query
-   **Styling:** Tailwind CSS v3.4+ with Radix UI components
-   **Container:** Docker multi-stage builds with distroless final image
-   **Database:** SQLite via Pocketbase
-   **Authentication:** NATS JWT with operator mode

## 📝 Common Commands

### Backend
```bash
# Build
CGO_ENABLED=0 go build -mod=vendor -o ./nats-tower ./cmd/

# Test
go test -v ./...

# Run
./nats-tower serve --http 0.0.0.0:8099
```

### Frontend
```bash
cd frontend

# Install
pnpm install

# Dev
pnpm run dev

# Build
pnpm run build

# Lint
pnpm run lint
```

### Docker
```bash
# Build
docker build -f docker/Dockerfile -t nats-tower .

# Run
docker run -p 8099:8099 nats-tower serve --http 0.0.0.0:8099
```
