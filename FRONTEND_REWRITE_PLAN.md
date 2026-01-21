# Frontend Rewrite Plan

## Overview

This document outlines the plan to rewrite the NATS Tower frontend using modern React best practices and the latest tech stack.

## Current State Analysis

### Technology Stack (Current)
- **Framework**: React 18.3.1
- **Routing**: TanStack Router v1.114.34
- **State Management**: Mix of SWR (v2.3.3) and TanStack Query (v5.71.5)
- **Build Tool**: Vite v6.4.1
- **Package Manager**: pnpm
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS v3.4.13
- **Forms**: React Hook Form + Zod
- **Backend**: Pocketbase

### Current Features (80 source files)

#### Pages/Routes
1. **Authentication**
   - Sign in page

2. **Installations Management**
   - List all installations
   - View installation details
   - Installation team info

3. **Accounts Management**
   - List accounts per installation
   - View account details
   - Account team management
   - Pending account actions

4. **Users Management**
   - List users per account
   - Create/edit users
   - Manage user credentials

5. **Limits Management**
   - View/edit account limits
   - Resource management

6. **K8s Access**
   - Kubernetes integration settings
   - Access credentials management

7. **Imports/Exports**
   - Manage NATS imports
   - Manage NATS exports
   - Subject permissions

#### Services/API Layer
- `installations.tsx` - Installation CRUD operations
- `accounts.tsx` - Account management
- `users.tsx` - User management
- `teams.tsx` - Team management
- `limits.tsx` - Limit management
- `k8s-access.tsx` - K8s integration
- `imports.tsx` - Import management
- `exports.tsx` - Export management
- `buildinfo.tsx` - Build information

#### Components
- **UI Components** (shadcn/ui based):
  - Data tables with sorting/filtering
  - Forms with validation
  - Dialogs and modals
  - Multi-select components
  - Command palette
  - Sidebar navigation
  - Breadcrumbs
  - Cards, buttons, inputs, etc.

- **Layout Components**:
  - Main layout wrapper
  - App sidebar
  - Installation switcher
  - Navigation components
  - User profile menu

#### Key Libraries
- PocketBase client for backend communication
- React Hook Form for form handling
- Zod for validation
- Tailwind CSS for styling
- Lucide React for icons
- Next Themes for dark mode

## New Requirements

### Technology Stack (Target)
- **Package Manager**: **Bun** (required)
- **Build Tool**: Vite (can continue with Bun)
- **State Management**: **TanStack Query only** (migrate away from SWR)
- **Routing**: TanStack Router (keep)
- **UI Components**: shadcn/ui (keep)
- **Styling**: Tailwind CSS (keep)
- **Forms**: React Hook Form + Zod (keep)
- **Folder**: `new_frontend` (required)

### Project Structure (Best Practices)

```
new_frontend/
├── public/               # Static assets
├── src/
│   ├── app/             # App initialization
│   │   ├── main.tsx
│   │   └── router.tsx
│   ├── features/        # Feature-based organization
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── routes/
│   │   ├── installations/
│   │   ├── accounts/
│   │   ├── users/
│   │   ├── limits/
│   │   ├── k8s-access/
│   │   └── imports-exports/
│   ├── components/      # Shared components
│   │   ├── ui/          # shadcn/ui components
│   │   └── layout/      # Layout components
│   ├── lib/             # Utilities and configs
│   │   ├── api/         # API client setup
│   │   ├── utils/
│   │   └── types/
│   ├── hooks/           # Shared hooks
│   ├── styles/          # Global styles
│   └── assets/          # Images, fonts, etc.
├── bun.lockb
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── components.json      # shadcn config
```

## Implementation Issues

The rewrite will be broken down into the following implementation issues:

### Issue 1: Project Setup and Infrastructure
**Title**: Setup new_frontend project with Bun and core dependencies

**Description**:
Set up the foundational structure for the new frontend application.

**Tasks**:
- Initialize new Bun project in `new_frontend/` directory
- Configure Vite with Bun runtime
- Set up TypeScript configuration
- Configure TanStack Router
- Set up TanStack Query with QueryClient
- Configure shadcn/ui
- Set up Tailwind CSS
- Configure path aliases (@/ for src/)
- Create folder structure following best practices
- Set up ESLint and Prettier
- Create basic app shell with router

**Acceptance Criteria**:
- `bun dev` starts development server
- `bun build` creates production build
- TypeScript compilation works
- Hot module replacement works
- Path aliases resolve correctly

---

### Issue 2: Design System and Shared Components
**Title**: Implement shared UI components and design system

**Description**:
Port all shadcn/ui components and create shared layout components.

**Tasks**:
- Install and configure all required shadcn/ui components
- Port layout components (Layout, Sidebar, Navigation)
- Create theme provider with dark mode support
- Port utility components (data-table, multi-select, etc.)
- Create shared hooks (useToast, useTheme, etc.)
- Set up global styles and CSS variables
- Create component documentation/Storybook (optional)

**Acceptance Criteria**:
- All UI components render correctly
- Dark mode toggle works
- Sidebar navigation works
- Components are properly typed
- No style regressions from current version

---

### Issue 3: API Client and TanStack Query Setup
**Title**: Create API client layer with TanStack Query integration

**Description**:
Set up PocketBase client and migrate all API calls to TanStack Query.

**Tasks**:
- Configure PocketBase client
- Create TanStack Query wrapper utilities
- Create query factories for type safety
- Implement authentication queries/mutations
- Create error handling utilities
- Set up query devtools
- Define TypeScript types from PocketBase schema

**Acceptance Criteria**:
- PocketBase client configured and authenticated
- Query/mutation patterns established
- Type-safe API calls
- Error handling works consistently
- Query caching works as expected

---

### Issue 4: Authentication Feature
**Title**: Implement authentication feature module

**Description**:
Build complete authentication system including sign-in, session management, and protected routes.

**Tasks**:
- Create auth API queries (login, logout, session)
- Build sign-in page/form
- Implement session persistence
- Create auth context/hooks
- Set up route protection
- Implement redirect logic after login
- Add user session management

**Acceptance Criteria**:
- Users can sign in successfully
- Sessions persist across page reloads
- Protected routes redirect to login
- Logout clears session
- Auth state is accessible via hooks

---

### Issue 5: Installations Feature
**Title**: Implement installations management feature

**Description**:
Build installation listing, detail views, and management capabilities.

**Tasks**:
- Create installations API queries/mutations
- Migrate installation service to TanStack Query
- Build installations list page
- Build installation detail page
- Create installation switcher component
- Implement team management for installations
- Add create/edit/delete installation flows

**Acceptance Criteria**:
- Installations list displays correctly
- Installation details show all info
- Installation switcher works
- CRUD operations work
- Team assignments work

---

### Issue 6: Accounts Feature
**Title**: Implement accounts management feature

**Description**:
Build account management with team assignment and pending actions.

**Tasks**:
- Create accounts API queries/mutations
- Migrate accounts service to TanStack Query
- Build accounts list page
- Build account detail page
- Implement pending account actions view
- Add create/edit/delete account flows
- Implement account-team relationships

**Acceptance Criteria**:
- Accounts list shows all accounts per installation
- Account details display correctly
- Pending actions are visible
- CRUD operations work
- Team management works

---

### Issue 7: Users Feature
**Title**: Implement users management feature

**Description**:
Build user management within accounts including credentials.

**Tasks**:
- Create users API queries/mutations
- Migrate users service to TanStack Query
- Build users list page
- Build user creation/edit forms
- Implement credentials management
- Add user permissions handling
- Implement user deletion with confirmation

**Acceptance Criteria**:
- Users list shows all users per account
- User creation works
- Credentials can be generated/downloaded
- User editing works
- User deletion works with confirmation

---

### Issue 8: Limits Feature
**Title**: Implement resource limits management feature

**Description**:
Build interface for viewing and editing account resource limits.

**Tasks**:
- Create limits API queries/mutations
- Migrate limits service to TanStack Query
- Build limits view/edit page
- Create limits form with validation
- Implement save/reset functionality
- Add visual indicators for limit usage

**Acceptance Criteria**:
- Limits display for selected account
- Limits can be edited and saved
- Validation works correctly
- Changes persist
- UI shows feedback on save

---

### Issue 9: K8s Access Feature
**Title**: Implement Kubernetes access management feature

**Description**:
Build Kubernetes integration settings and credentials management.

**Tasks**:
- Create k8s-access API queries/mutations
- Migrate k8s-access service to TanStack Query
- Build k8s access configuration page
- Implement credentials display/download
- Add instructions/documentation view
- Create integration testing helpers

**Acceptance Criteria**:
- K8s access config displays correctly
- Credentials can be viewed/downloaded
- Integration instructions are clear
- Configuration can be updated
- Changes save correctly

---

### Issue 10: Imports/Exports Feature
**Title**: Implement NATS imports and exports management

**Description**:
Build interface for managing NATS stream imports and exports.

**Tasks**:
- Create imports/exports API queries/mutations
- Migrate imports and exports services to TanStack Query
- Build imports list/management page
- Build exports list/management page
- Create import/export forms
- Implement subject validation
- Add delete confirmations

**Acceptance Criteria**:
- Imports list displays correctly
- Exports list displays correctly
- New imports/exports can be created
- Subject validation works
- Delete operations work with confirmation
- Changes persist correctly

---

### Issue 11: Navigation and Routing
**Title**: Implement complete routing and navigation system

**Description**:
Set up all routes, breadcrumbs, and navigation flows.

**Tasks**:
- Define all route paths
- Set up nested routing structure
- Implement breadcrumb navigation
- Create route guards/protection
- Add loading states for routes
- Implement 404/error pages
- Add route transitions

**Acceptance Criteria**:
- All routes accessible via URL
- Breadcrumbs show current location
- Protected routes work
- Navigation between pages works
- Back/forward browser buttons work
- 404 page shows for invalid routes

---

### Issue 12: Testing and Quality Assurance
**Title**: Add tests and ensure feature parity

**Description**:
Ensure new frontend has complete feature parity and quality checks.

**Tasks**:
- Add unit tests for utilities
- Add component tests (React Testing Library)
- Add integration tests for key flows
- Perform accessibility audit
- Test all CRUD operations
- Test all user workflows end-to-end
- Cross-browser testing
- Mobile responsiveness testing
- Performance audit
- Bundle size optimization

**Acceptance Criteria**:
- All tests pass
- Test coverage > 70%
- No accessibility violations
- All features work as in current version
- Performance metrics acceptable
- Bundle size reasonable

---

### Issue 13: Migration and Deployment
**Title**: Migration strategy and deployment setup

**Description**:
Plan and execute migration from old to new frontend.

**Tasks**:
- Create migration documentation
- Set up build/deployment pipeline for new_frontend
- Add environment variable configuration
- Create rollback plan
- Parallel deployment strategy (old + new)
- User acceptance testing
- Production deployment
- Monitor and fix issues
- Deprecate old frontend

**Acceptance Criteria**:
- Deployment pipeline works
- Environment configs work
- Can run old and new in parallel
- Production deployment successful
- No critical bugs in production
- Old frontend can be safely removed

---

## Migration Strategy

### Phase 1: Foundation (Issues 1-3)
Set up project infrastructure, design system, and API layer.

### Phase 2: Core Features (Issues 4-10)
Implement all feature modules in parallel once foundation is ready.

### Phase 3: Integration (Issue 11)
Complete routing and ensure all features work together.

### Phase 4: Quality & Launch (Issues 12-13)
Testing, optimization, and production deployment.

## Timeline Estimate

- **Phase 1**: 1-2 weeks
- **Phase 2**: 3-4 weeks (can be parallelized)
- **Phase 3**: 1 week
- **Phase 4**: 1-2 weeks

**Total**: 6-9 weeks for complete migration

## Success Criteria

1. ✅ All current features working in new frontend
2. ✅ Uses Bun as package manager
3. ✅ Uses TanStack Query (not SWR)
4. ✅ Uses TanStack Router
5. ✅ Uses shadcn/ui components
6. ✅ Follows modern best practices for project structure
7. ✅ Located in `new_frontend` folder
8. ✅ Maintains or improves performance
9. ✅ Maintains or improves accessibility
10. ✅ All tests passing

## Notes

- Current frontend can remain operational during development
- Feature flags can be used to toggle between old and new
- PocketBase backend remains unchanged
- API contracts remain the same
- Focus on feature parity first, enhancements later
