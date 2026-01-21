# Frontend Rewrite Implementation Issues

This directory contains detailed issue templates for implementing the NATS Tower frontend rewrite.

## Overview

The NATS Tower frontend will be rewritten using modern React best practices with the following tech stack:

- **Package Manager**: Bun
- **Build Tool**: Vite  
- **Routing**: TanStack Router
- **State Management**: TanStack Query
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Location**: `new_frontend/` directory

## Issue List

### Phase 1: Foundation (Weeks 1-2)

1. **[Issue 1: Project Setup and Infrastructure](./issue_01_project_setup.md)**
   - Initialize Bun project
   - Configure Vite, TypeScript, TanStack Router
   - Set up shadcn/ui and Tailwind
   - Create project structure
   - **Estimated time**: 3-5 days

2. **[Issue 2: Design System and Shared Components](./issue_02_design_system.md)**
   - Install all shadcn/ui components
   - Port layout components
   - Set up theming and dark mode
   - Create shared utilities
   - **Estimated time**: 3-5 days

3. **[Issue 3: API Client and TanStack Query Setup](./issue_03_api_layer.md)**
   - Configure PocketBase client
   - Set up TanStack Query
   - Create query factories
   - Migrate from SWR to TanStack Query
   - **Estimated time**: 3-4 days

### Phase 2: Core Features (Weeks 3-6)

All of these can be developed in parallel once Phase 1 is complete:

4. **[Issue 4: Authentication Feature](./issues_04_to_10_features.md#issue-4-authentication-feature)**
   - Sign-in page
   - Session management
   - Route protection
   - **Estimated time**: 2-3 days

5. **[Issue 5: Installations Feature](./issues_04_to_10_features.md#issue-5-installations-feature)**
   - Installations list and detail
   - Installation switcher
   - CRUD operations
   - **Estimated time**: 3-4 days

6. **[Issue 6: Accounts Feature](./issues_04_to_10_features.md#issue-6-accounts-feature)**
   - Accounts list and detail
   - Pending actions
   - CRUD operations
   - **Estimated time**: 3-4 days

7. **[Issue 7: Users Feature](./issues_04_to_10_features.md#issue-7-users-feature)**
   - Users list
   - User creation/editing
   - Credentials management
   - **Estimated time**: 3-4 days

8. **[Issue 8: Limits Feature](./issues_04_to_10_features.md#issue-8-limits-feature)**
   - Limits view/edit
   - Resource management
   - **Estimated time**: 2-3 days

9. **[Issue 9: K8s Access Feature](./issues_04_to_10_features.md#issue-9-k8s-access-feature)**
   - K8s configuration
   - Credentials display
   - **Estimated time**: 2-3 days

10. **[Issue 10: Imports/Exports Feature](./issues_04_to_10_features.md#issue-10-importsexports-feature)**
    - Imports/exports management
    - Subject validation
    - **Estimated time**: 3-4 days

### Phase 3: Integration (Week 7)

11. **[Issue 11: Navigation and Routing](./issue_11_routing.md)**
    - Complete route structure
    - Breadcrumbs
    - Route guards
    - Error pages
    - **Estimated time**: 3-5 days

### Phase 4: Quality & Launch (Weeks 8-9)

12. **[Issue 12: Testing and Quality Assurance](./issue_12_testing_qa.md)**
    - Unit and integration tests
    - Accessibility audit
    - Performance optimization
    - Cross-browser testing
    - **Estimated time**: 5-7 days

13. **[Issue 13: Migration and Deployment](./issue_13_migration_deployment.md)**
    - Deployment setup
    - Migration strategy
    - Monitoring setup
    - Production launch
    - **Estimated time**: 3-5 days

## Total Timeline

- **Phase 1 (Foundation)**: 1-2 weeks
- **Phase 2 (Features)**: 3-4 weeks (parallelizable)
- **Phase 3 (Integration)**: 1 week  
- **Phase 4 (Quality & Launch)**: 1-2 weeks

**Total Estimated Time**: 6-9 weeks

## Dependencies Graph

```
Issue 1 (Setup)
    ↓
Issue 2 (Design) → Issue 3 (API)
    ↓                   ↓
    └──── Issue 4 (Auth) ────┘
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
Issue 5   Issue 6   Issue 7
(Install) (Accounts)(Users)
    └─────────┼─────────┘
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
Issue 8   Issue 9   Issue 10
(Limits)  (K8s)    (Import/Export)
    └─────────┼─────────┘
              ↓
        Issue 11 (Routing)
              ↓
        Issue 12 (Testing)
              ↓
        Issue 13 (Deployment)
```

## How to Use These Issues

1. **Create GitHub Issues**: Create a GitHub issue for each template using the content from these markdown files.

2. **Assign to Team Members**: Assign issues to team members based on their expertise and availability.

3. **Track Progress**: Use GitHub Projects or similar tool to track progress across all issues.

4. **Parallelization**: Issues 5-10 can be worked on in parallel by different team members once issues 1-4 are complete.

5. **Review Process**: Each issue should have:
   - Code review before merging
   - Testing verification
   - Design review (for UI changes)
   - Documentation review

## Development Workflow

### For Each Issue

1. **Create Feature Branch**: `git checkout -b feature/issue-XX-description`
2. **Follow Issue Checklist**: Complete all tasks in the issue
3. **Write Tests**: Add tests as you develop features
4. **Create Pull Request**: Submit PR with description linking to issue
5. **Code Review**: Get at least one approval
6. **Merge**: Merge to main branch
7. **Close Issue**: Mark issue as complete

### Code Review Checklist

- [ ] Code follows TypeScript best practices
- [ ] All new code has tests
- [ ] No console.log statements in production code
- [ ] Types are properly defined
- [ ] Error handling is implemented
- [ ] Loading states are handled
- [ ] Responsive design works
- [ ] Dark mode works
- [ ] Accessibility is maintained
- [ ] Documentation is updated

## Success Criteria

The rewrite will be considered successful when:

1. ✅ All 13 issues are complete
2. ✅ All features from current frontend work in new frontend
3. ✅ Test coverage > 70%
4. ✅ No accessibility violations
5. ✅ Performance metrics meet or exceed current frontend
6. ✅ Successfully deployed to production
7. ✅ User feedback is positive
8. ✅ No critical bugs

## Getting Help

- **Questions about React/TypeScript**: Check official docs or ask in team chat
- **Questions about TanStack**: Reference [TanStack documentation](https://tanstack.com/)
- **Questions about shadcn/ui**: Check [shadcn/ui docs](https://ui.shadcn.com/)
- **Questions about architecture**: Discuss in team meetings
- **Blocked on another issue**: Communicate in daily standup

## Notes

- Keep issues focused and manageable (3-5 days of work)
- Update issue templates as you learn more
- Document decisions and learnings
- Communicate blockers early
- Help team members when they're stuck
- Celebrate milestones! 🎉

## References

- [Main Planning Document](../../FRONTEND_REWRITE_PLAN.md)
- [Current Frontend](../../frontend/)
- [TanStack Router Docs](https://tanstack.com/router)
- [TanStack Query Docs](https://tanstack.com/query)
- [shadcn/ui Docs](https://ui.shadcn.com/)
- [Bun Docs](https://bun.sh/)
