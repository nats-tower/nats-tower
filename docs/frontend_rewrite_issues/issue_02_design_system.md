# Issue 2: Implement shared UI components and design system

## Description

Port all shadcn/ui components from the current frontend and create shared layout components following the new project structure.

## Background

The current frontend uses shadcn/ui components. We need to install and configure all required components in the new frontend while ensuring consistency with the design system.

## Requirements

- Install all shadcn/ui components used in current frontend
- Port layout components (Layout, Sidebar, Navigation)
- Maintain visual consistency with current design
- Support dark mode
- Type-safe component props

## Dependencies

- Issue #1 (Project Setup) must be completed

## Tasks

### Install shadcn/ui Components
Using `bunx shadcn-ui@latest add <component>`, install:
- [ ] button
- [ ] card
- [ ] input
- [ ] label
- [ ] select
- [ ] checkbox
- [ ] dialog
- [ ] dropdown-menu
- [ ] popover
- [ ] separator
- [ ] table
- [ ] tooltip
- [ ] avatar
- [ ] badge
- [ ] breadcrumb
- [ ] collapsible
- [ ] command
- [ ] form
- [ ] scroll-area
- [ ] sheet
- [ ] skeleton
- [ ] sonner (toast notifications)
- [ ] sidebar

### Custom Components
Create these custom components in `src/components/ui/`:
- [ ] data-table.tsx - Reusable data table with sorting/filtering
- [ ] multi-select.tsx - Multi-select dropdown
- [ ] multi-select-dialog.tsx - Dialog version of multi-select
- [ ] popover-dialog.tsx - Popover with dialog features
- [ ] account-info-sheet.tsx - Account information sidebar
- [ ] cluster-info.tsx - Cluster information display

### Layout Components
Create in `src/components/layout/`:
- [ ] Layout.tsx - Main application layout wrapper
- [ ] app-sidebar.tsx - Application sidebar with navigation
- [ ] installation-switcher.tsx - Dropdown to switch installations
- [ ] nav-main.tsx - Main navigation component
- [ ] nav-user.tsx - User profile dropdown navigation

### Theme Setup
- [ ] Create theme provider component
- [ ] Set up CSS custom properties for theming
- [ ] Create dark mode toggle component
- [ ] Configure theme persistence (localStorage)
- [ ] Set up theme context and hooks
- [ ] Port theme colors from current frontend

### Utility Functions
Create in `src/lib/utils/`:
- [ ] cn() - Class name utility (clsx + tailwind-merge)
- [ ] Component utility functions
- [ ] Type helpers for components

### Shared Hooks
Create in `src/hooks/`:
- [ ] useToast - Toast notification hook
- [ ] useTheme - Theme management hook
- [ ] useMediaQuery - Responsive design hook
- [ ] useDebounce - Debounce utility hook

### Global Styles
Update `src/styles/globals.css`:
- [ ] Import Tailwind directives
- [ ] Define CSS custom properties
- [ ] Set up typography styles
- [ ] Configure scrollbar styles
- [ ] Add animation keyframes
- [ ] Port theme variables from current frontend

### Component Documentation
For each major component, document:
- [ ] Props interface
- [ ] Usage examples
- [ ] Accessibility features
- [ ] Variant options

## File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── data-table.tsx
│   │   ├── multi-select.tsx
│   │   ├── ... (all shadcn components)
│   │   └── account-info-sheet.tsx
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── app-sidebar.tsx
│   │   ├── installation-switcher.tsx
│   │   ├── nav-main.tsx
│   │   └── nav-user.tsx
│   └── theme/
│       └── theme-provider.tsx
├── lib/
│   └── utils.ts
├── hooks/
│   ├── useToast.ts
│   ├── useTheme.ts
│   ├── useMediaQuery.ts
│   └── useDebounce.ts
└── styles/
    └── globals.css
```

## Acceptance Criteria

- [ ] All shadcn/ui components render correctly
- [ ] Layout components match current frontend design
- [ ] Dark mode toggle works smoothly
- [ ] Theme persists across page reloads
- [ ] Sidebar navigation is functional
- [ ] Installation switcher dropdown works
- [ ] User profile menu works
- [ ] Toast notifications display correctly
- [ ] All components are properly typed with TypeScript
- [ ] Components are responsive on mobile/tablet/desktop
- [ ] No visual regressions from current version
- [ ] Accessibility features work (keyboard navigation, ARIA labels)

## Testing

- [ ] Test all component variants
- [ ] Test dark/light mode switching
- [ ] Test theme persistence
- [ ] Test responsive layouts on different screen sizes
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Visual regression testing (compare with current frontend)

## Migration Reference

Port components from current frontend:
- `frontend/src/components/ui/*` → `new_frontend/src/components/ui/*`
- `frontend/src/components/layout/*` → `new_frontend/src/components/layout/*`

Ensure visual and functional parity with existing components.

## Notes

- Keep components as close to shadcn/ui defaults as possible
- Add custom modifications only when necessary
- Ensure all components support dark mode
- Maintain consistent spacing and sizing
- Use Tailwind CSS classes for styling
- Avoid inline styles
- Keep components composable and reusable

## Resources

- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Tailwind CSS](https://tailwindcss.com/)
- [Current frontend components](../frontend/src/components/)
