# Issue 11: Navigation and Routing System

## Description

Set up complete routing structure, breadcrumbs, and navigation flows using TanStack Router.

## Background

The new frontend needs a comprehensive routing system that supports nested routes, protected routes, and user-friendly navigation.

## Dependencies

- Issue #1 (Project Setup)
- Issue #2 (Design System)
- Issue #4 (Authentication)

## Tasks

### Route Structure
Create file-based routes in `src/routes/`:
- [ ] `__root.tsx` - Root layout with error boundary
- [ ] `index.tsx` - Landing/redirect page
- [ ] `signin.tsx` - Sign in page (public route)
- [ ] `_app.tsx` - Protected layout wrapper
- [ ] `_app/index.tsx` - Dashboard/home page
- [ ] `_app/installations.tsx` - Installations list
- [ ] `_app/installations_.$installationId.tsx` - Installation detail layout
- [ ] `_app/installations_.$installationId.accounts.tsx` - Accounts list
- [ ] `_app/installations_.$installationId.accounts_.$accountId.users.tsx` - Users page
- [ ] `_app/installations_.$installationId.accounts_.$accountId.imports.tsx` - Imports page
- [ ] `_app/installations_.$installationId.accounts_.$accountId.exports.tsx` - Exports page
- [ ] `_app/installations_.$installationId.accounts_.$accountId.k8s-access.tsx` - K8s access page
- [ ] `_app/installations_.$installationId.limits.tsx` - Limits page

### Route Guards
- [ ] Implement `beforeLoad` for authentication check
- [ ] Redirect unauthenticated users to signin
- [ ] Preserve redirect URL after login
- [ ] Implement role-based access (if needed)
- [ ] Handle unauthorized access gracefully

### Breadcrumb Navigation
- [ ] Create breadcrumb component
- [ ] Generate breadcrumbs from route hierarchy
- [ ] Make breadcrumbs clickable for navigation
- [ ] Show current page in breadcrumbs
- [ ] Handle dynamic route parameters in breadcrumbs
- [ ] Style breadcrumbs to match design

### Loading States
- [ ] Create route-level loading component
- [ ] Implement suspense boundaries
- [ ] Add skeleton loaders for data-heavy pages
- [ ] Handle slow network gracefully
- [ ] Show progress indicators for navigation

### Error Handling
- [ ] Create 404 Not Found page
- [ ] Create error boundary component
- [ ] Handle route errors gracefully
- [ ] Add "Go back" functionality
- [ ] Log errors appropriately

### Route Transitions
- [ ] Add smooth page transitions (optional)
- [ ] Implement loading bar at top of page
- [ ] Handle navigation cancellation
- [ ] Prevent navigation during unsaved changes (if needed)

### Navigation Utilities
Create in `src/lib/navigation/`:
- [ ] Navigation helper functions
- [ ] Route path constants
- [ ] Link component wrapper (if needed)
- [ ] Navigation guards utilities

## File Structure

```
src/
├── routes/
│   ├── __root.tsx
│   ├── index.tsx
│   ├── signin.tsx
│   ├── _app.tsx
│   └── _app/
│       ├── index.tsx
│       ├── installations.tsx
│       └── installations_/
│           └── $installationId/
│               ├── accounts.tsx
│               ├── limits.tsx
│               └── accounts_/
│                   └── $accountId/
│                       ├── users.tsx
│                       ├── imports.tsx
│                       ├── exports.tsx
│                       └── k8s-access.tsx
├── components/
│   ├── navigation/
│   │   ├── Breadcrumbs.tsx
│   │   └── RouteErrorBoundary.tsx
│   └── loading/
│       └── RouteLoader.tsx
└── lib/
    └── navigation/
        ├── route-paths.ts
        └── navigation-utils.ts
```

## Route Configuration Examples

```typescript
// src/routes/__root.tsx
export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RouteErrorBoundary,
});

// src/routes/_app.tsx
export const Route = createFileRoute('/_app')({
  component: AppLayout,
  beforeLoad: async ({ location }) => {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      throw redirect({
        to: '/signin',
        search: {
          redirect: location.href,
        },
      });
    }
  },
});

// src/routes/_app/installations_.$installationId.accounts_.$accountId.users.tsx
export const Route = createFileRoute('/_app/installations_/$installationId/accounts_/$accountId/users')({
  component: UsersPage,
  loader: async ({ params }) => {
    // Prefetch data
    await queryClient.ensureQueryData(
      usersQueries.list(params.installationId, params.accountId)
    );
  },
});
```

## Acceptance Criteria

- [ ] All routes are accessible via URL
- [ ] File-based routing generates correct route tree
- [ ] Breadcrumbs display current navigation path
- [ ] Breadcrumb links navigate correctly
- [ ] Protected routes require authentication
- [ ] Unauthenticated users redirect to signin
- [ ] Post-login redirect works to intended page
- [ ] Browser back/forward buttons work
- [ ] Deep linking works (can bookmark and return to any page)
- [ ] 404 page shows for invalid routes
- [ ] Error boundaries catch and display route errors
- [ ] Loading states show during navigation
- [ ] Route parameters are type-safe
- [ ] Navigation between pages is smooth

## Testing

- [ ] Test all route paths manually
- [ ] Test protected route redirects
- [ ] Test post-login redirect
- [ ] Test breadcrumb generation
- [ ] Test 404 handling
- [ ] Test error boundaries
- [ ] Test deep linking
- [ ] Test browser navigation (back/forward)
- [ ] Test loading states
- [ ] Test route parameter parsing

## Migration Reference

Current routing in:
- `frontend/src/pages/`
- `frontend/src/routeTree.gen.ts`

Maintain same URL structure where possible for compatibility.

## Notes

- Use TanStack Router's file-based routing
- Keep route components lazy-loaded where possible
- Use loader functions for data prefetching
- Implement proper error boundaries at route level
- Make routes as type-safe as possible
- Document route structure clearly

## Resources

- [TanStack Router File-Based Routing](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
- [TanStack Router Route Protection](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes)
- [TanStack Router Data Loading](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading)
