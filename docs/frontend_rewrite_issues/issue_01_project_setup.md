# Issue 1: Setup new_frontend project with Bun and core dependencies

## Description

Set up the foundational structure for the new frontend application using Bun as the package manager, Vite as the build tool, and all core dependencies.

## Background

We are rewriting the NATS Tower frontend to use the latest best practices. This issue covers the initial project setup and infrastructure configuration.

## Requirements

- Use **Bun** as package manager (not npm/pnpm/yarn)
- Use **Vite** as build tool
- Use **TanStack Router** for routing
- Use **TanStack Query** for data fetching
- Use **shadcn/ui** for UI components
- Follow modern React best practices
- Location: `new_frontend/` directory

## Tasks

### Project Initialization
- [ ] Create `new_frontend/` directory in repository root
- [ ] Initialize Bun project: `bun init`
- [ ] Configure `package.json` with correct metadata
- [ ] Install React and React DOM: `bun add react react-dom`
- [ ] Install TypeScript: `bun add -d typescript @types/react @types/react-dom`

### Build Tool Setup
- [ ] Install Vite: `bun add -d vite @vitejs/plugin-react-swc`
- [ ] Create `vite.config.ts` with React plugin
- [ ] Configure Vite for optimal development experience
- [ ] Set up HMR (Hot Module Replacement)
- [ ] Configure build output directory

### TypeScript Configuration
- [ ] Create `tsconfig.json` with strict mode enabled
- [ ] Create `tsconfig.app.json` for application code
- [ ] Create `tsconfig.node.json` for build scripts
- [ ] Configure path aliases (`@/` → `src/`)
- [ ] Set up proper module resolution

### Routing Setup
- [ ] Install TanStack Router: `bun add @tanstack/react-router`
- [ ] Install router plugin: `bun add -d @tanstack/router-plugin`
- [ ] Configure router plugin in Vite config
- [ ] Create initial route tree structure
- [ ] Set up file-based routing in `src/routes/`
- [ ] Create root route layout

### State Management Setup
- [ ] Install TanStack Query: `bun add @tanstack/react-query`
- [ ] Install React Query Devtools: `bun add @tanstack/react-query-devtools`
- [ ] Create QueryClient configuration
- [ ] Set up QueryClientProvider in app root
- [ ] Configure default query options
- [ ] Configure error handling

### UI Framework Setup
- [ ] Install shadcn/ui dependencies
- [ ] Initialize shadcn/ui configuration
- [ ] Configure components.json with:
  - Style: "new-york"
  - Base color: "slate"
  - CSS variables: true
  - TypeScript: true
- [ ] Install Tailwind CSS: `bun add -d tailwindcss postcss autoprefixer`
- [ ] Initialize Tailwind: `bunx tailwindcss init -p`
- [ ] Configure tailwind.config.ts
- [ ] Set up global CSS with Tailwind directives

### Project Structure
Create the following folder structure:
```
new_frontend/
├── public/
│   └── index.html
├── src/
│   ├── app/
│   │   ├── main.tsx
│   │   └── router.tsx
│   ├── routes/
│   │   └── __root.tsx
│   ├── features/
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── lib/
│   │   ├── api/
│   │   ├── utils/
│   │   └── types/
│   ├── hooks/
│   ├── styles/
│   │   └── globals.css
│   └── assets/
├── bun.lockb
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
└── components.json
```

### Code Quality Tools
- [ ] Install ESLint: `bun add -d eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser`
- [ ] Install ESLint React plugins: `bun add -d eslint-plugin-react-hooks eslint-plugin-react-refresh`
- [ ] Create `.eslintrc.cjs` configuration
- [ ] Install Prettier: `bun add -d prettier`
- [ ] Create `.prettierrc` configuration
- [ ] Add lint and format scripts to package.json

### Initial App Shell
- [ ] Create `src/main.tsx` entry point
- [ ] Create `src/app/router.tsx` with RouterProvider
- [ ] Create `src/routes/__root.tsx` with basic layout
- [ ] Create a simple home route for testing
- [ ] Add basic error boundary
- [ ] Add loading states

### Environment Configuration
- [ ] Create `.env.example` file
- [ ] Set up environment variable handling
- [ ] Configure API base URL
- [ ] Add development vs production configs

### Scripts Configuration
Add these scripts to `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "type-check": "tsc --noEmit"
  }
}
```

## Acceptance Criteria

- [ ] `bun install` successfully installs all dependencies
- [ ] `bun dev` starts development server on http://localhost:5173
- [ ] `bun build` creates optimized production build
- [ ] `bun lint` runs without errors
- [ ] TypeScript compilation works without errors
- [ ] Hot module replacement works during development
- [ ] Path aliases (`@/`) resolve correctly
- [ ] A simple "Hello World" page renders
- [ ] React Router works and shows the test route
- [ ] TanStack Query devtools are accessible in dev mode
- [ ] Dark mode toggle works (basic implementation)
- [ ] Project follows the defined folder structure

## Dependencies

None - this is the foundation issue.

## Testing

- [ ] Verify dev server starts successfully
- [ ] Verify production build completes
- [ ] Test HMR by editing a component
- [ ] Verify TypeScript errors show in IDE
- [ ] Verify ESLint catches common issues
- [ ] Test path alias resolution

## Documentation

- [ ] Add README.md in `new_frontend/` with:
  - Project description
  - Setup instructions
  - Development commands
  - Folder structure explanation
  - Contributing guidelines

## Notes

- Use latest stable versions of all packages
- Ensure Bun compatibility for all dependencies
- Follow official documentation for each tool
- Keep the setup minimal and focused
- Avoid adding features not needed immediately

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Vite Documentation](https://vitejs.dev/)
- [TanStack Router Docs](https://tanstack.com/router)
- [TanStack Query Docs](https://tanstack.com/query)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
