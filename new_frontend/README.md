# NATS Tower - New Frontend

This is the new frontend application for NATS Tower, built with modern React best practices.

## Tech Stack

- **Package Manager**: Bun (npm used for compatibility in CI)
- **Build Tool**: Vite
- **Framework**: React 18
- **Router**: TanStack Router
- **Data Fetching**: TanStack Query
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.0+

### Installation

```bash
# Using npm (for compatibility)
npm install

# Or using Bun (recommended)
bun install
```

### Development

```bash
# Start development server
npm run dev

# Or with Bun
bun dev
```

The development server will start at `http://localhost:5173`

### Build

```bash
# Build for production
npm run build

# Or with Bun
bun build
```

### Preview Production Build

```bash
# Preview production build
npm run preview

# Or with Bun
bun preview
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format

# Type check
npm run type-check
```

## Project Structure

```
new_frontend/
├── public/               # Static assets
├── src/
│   ├── app/             # App initialization
│   │   ├── main.tsx     # Entry point
│   │   └── router.tsx   # Router configuration
│   ├── routes/          # Route components (file-based routing)
│   │   └── __root.tsx   # Root layout
│   ├── features/        # Feature-based organization
│   ├── components/      # Shared components
│   │   ├── ui/          # shadcn/ui components
│   │   └── layout/      # Layout components
│   ├── lib/             # Utilities and configs
│   │   ├── api/         # API client setup
│   │   ├── utils/       # Utility functions
│   │   └── types/       # TypeScript types
│   ├── hooks/           # Shared hooks
│   ├── styles/          # Global styles
│   │   └── globals.css  # Tailwind + CSS variables
│   └── assets/          # Images, fonts, etc.
├── bun.lockb            # Bun lock file
├── package.json
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Vite config
├── tailwind.config.ts   # Tailwind config
├── postcss.config.js    # PostCSS config
└── components.json      # shadcn/ui config
```

## Path Aliases

The project uses path aliases for cleaner imports:

```typescript
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
```

- `@/` maps to `./src/`

## Routing

This project uses TanStack Router with file-based routing. Routes are defined in the `src/routes/` directory.

- `__root.tsx` - Root layout component
- `index.tsx` - Home page (`/`)
- Add new routes by creating files in the `routes/` directory

## State Management

- **TanStack Query** - Server state management and data fetching
- **QueryClient** - Configured in `src/lib/api/query-client.ts`

## UI Components

This project uses shadcn/ui components. Install new components:

```bash
# Using npm
npx shadcn@latest add button

# Or using Bun
bunx --bun shadcn@latest add button
```

## Features

- ✅ Hot Module Replacement (HMR)
- ✅ TypeScript strict mode
- ✅ ESLint + Prettier
- ✅ Path aliases (@/)
- ✅ TanStack Router with file-based routing
- ✅ TanStack Query for data fetching
- ✅ shadcn/ui components
- ✅ Dark mode support (via Tailwind)
- ✅ Development tools (React Query Devtools, Router Devtools)

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run linting and type checking
4. Submit a pull request

## License

See the main repository LICENSE file.

