# Copilot Agent Instructions

This directory contains specialized instructions for GitHub Copilot agents working on the NATS Tower repository.

## Overview

These instruction files help Copilot agents understand the project structure, conventions, and best practices specific to NATS Tower. They provide context-aware guidance for different aspects of the project.

## Instruction Files

### 1. `general-instructions.md`
**Purpose:** Provides a comprehensive overview of the entire NATS Tower project.

**Use this for:**
- Understanding the project architecture
- Learning about the technology stack
- Finding common development workflows
- Understanding key concepts (JWT authentication, multi-tenancy, etc.)
- General code conventions and patterns

**Key Sections:**
- Project overview and motivation
- Technology stack (Backend + Frontend)
- Repository structure
- Build and test workflows
- Security considerations
- Common tasks and troubleshooting

### 2. `backend-agent.md`
**Purpose:** Detailed instructions for working with the Go backend built on Pocketbase.

**Use this for:**
- Go backend development
- NATS authentication integration
- Pocketbase framework patterns
- JWT and NKeys handling
- Database operations
- API endpoint creation
- Backend testing

**Key Sections:**
- Go environment setup
- NATS authentication flow
- Working with NKeys and JWTs
- Pocketbase integration patterns
- Testing strategies
- Adding NATS features
- Security best practices

### 3. `frontend-agent.md`
**Purpose:** Comprehensive guide for React TypeScript frontend development.

**Use this for:**
- React/TypeScript development
- TanStack Router and Query usage
- Radix UI component patterns
- Form handling with React Hook Form + Zod
- Tailwind CSS styling
- Pocketbase SDK integration
- Frontend state management

**Key Sections:**
- Frontend stack overview
- React component patterns
- Routing with TanStack Router
- Data fetching with TanStack Query
- Form validation patterns
- Styling with Tailwind CSS
- Radix UI integration
- Performance optimization

### 4. `docker-agent.md`
**Purpose:** Instructions for Docker containerization and deployment.

**Use this for:**
- Understanding the multi-stage Docker build
- Building and running containers
- Deployment to various platforms (K8s, Cloud)
- Container security
- Troubleshooting container issues
- CI/CD integration

**Key Sections:**
- Multi-stage build architecture
- Building Docker images
- Running containers
- Kubernetes deployment
- Cloud platform deployment
- Security considerations
- Debugging and troubleshooting

## How to Use These Instructions

### For Copilot Agents
When working on a task:
1. Start with `general-instructions.md` to understand the overall project
2. Refer to the specific domain file based on the task:
   - **Backend task?** → `backend-agent.md`
   - **Frontend task?** → `frontend-agent.md`
   - **Docker/deployment task?** → `docker-agent.md`
3. Follow the patterns and conventions outlined in the instructions
4. Reference the examples provided for common tasks

### For Developers
These files serve as comprehensive documentation for:
- Onboarding new team members
- Understanding project conventions
- Finding examples of common patterns
- Troubleshooting issues
- Contributing to the project

## Maintenance

### When to Update
Update these instruction files when:
- Major dependencies are upgraded (Go, React, Pocketbase, etc.)
- New patterns or conventions are established
- Build/deployment processes change
- New features are added that require specific guidance
- Security best practices evolve

### What to Include
Good instruction content includes:
- Clear explanations of concepts
- Code examples with context
- Step-by-step procedures
- Troubleshooting guides
- Links to relevant documentation
- Security considerations
- Performance tips

### What to Avoid
Don't include:
- Highly volatile information (specific version numbers that change frequently)
- Copy-paste from external docs (link instead)
- Overly verbose explanations
- Contradictory guidance
- Outdated patterns

## Quick Reference

### Technology Stack Summary
- **Backend:** Go 1.24+ with Pocketbase v0.28.1
- **Frontend:** React 18.3+ with TypeScript, Vite, TanStack Router/Query
- **Styling:** Tailwind CSS v3.4+ with Radix UI components
- **Container:** Docker multi-stage builds with distroless final image
- **Database:** SQLite via Pocketbase
- **Authentication:** NATS JWT with operator mode

### Common Commands

**Backend:**
```bash
# Build
CGO_ENABLED=0 go build -mod=vendor -o ./nats-tower ./cmd/

# Test
go test -v ./...

# Run
./nats-tower serve --http 0.0.0.0:8099
```

**Frontend:**
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

**Docker:**
```bash
# Build
docker build -f docker/Dockerfile -t nats-tower .

# Run
docker run -p 8099:8099 nats-tower serve --http 0.0.0.0:8099
```

## Contributing to Instructions

If you find gaps, errors, or areas for improvement in these instructions:
1. Make the updates directly to the relevant instruction file
2. Ensure examples are accurate and tested
3. Keep formatting consistent
4. Update this README if you add new instruction files
5. Submit a PR with your changes

## Additional Resources

- **Project Website:** https://nats-tower.com
- **GitHub Repository:** https://github.com/nats-tower/nats-tower
- **NATS Documentation:** https://docs.nats.io/
- **Pocketbase Docs:** https://pocketbase.io/docs/
- **TanStack Router:** https://tanstack.com/router
- **TanStack Query:** https://tanstack.com/query
- **Radix UI:** https://www.radix-ui.com/
