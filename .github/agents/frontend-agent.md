# NATS Tower - Frontend Development Instructions

## Scope
This guide is for working with the React TypeScript frontend of NATS Tower, which provides the web-based UI for NATS management.

## Frontend Stack

### Core Technologies
- **React**: 18.3.1 - UI framework
- **TypeScript**: 5.6.3 - Type safety
- **Vite**: 6.4.1 - Build tool and dev server
- **pnpm**: Package manager (uses workspace features)

### Key Libraries

**Routing & Data Fetching:**
- **TanStack Router**: 1.114.34 - Type-safe routing
- **TanStack Query**: 5.71.5 - Server state management
- **SWR**: 2.3.3 - Additional data fetching

**UI Components:**
- **Radix UI**: Accessible, unstyled primitives
  - Avatar, Checkbox, Dialog, Dropdown Menu, Label, Popover
  - Scroll Area, Select, Separator, Slot, Tooltip, Collapsible
- **Lucide React**: 0.483.0 - Icon library
- **CMDK**: 1.1.1 - Command palette

**Styling:**
- **Tailwind CSS**: 3.4.13 - Utility-first CSS
- **tailwindcss-animate**: 1.0.7 - Animation utilities
- **class-variance-authority**: 0.7.0 - Component variants
- **tailwind-merge**: 2.5.3 - Merge Tailwind classes safely
- **next-themes**: 0.4.6 - Theme management

**Forms & Validation:**
- **React Hook Form**: 7.65.0 - Form management
- **Zod**: 3.24.2 - Schema validation
- **@hookform/resolvers**: 4.1.3 - Zod integration

**Backend Integration:**
- **Pocketbase**: 0.25.2 - API client

**UI Feedback:**
- **Sonner**: 2.0.3 - Toast notifications

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── lib/           # Utilities and helpers
│   │   └── pocketbase-types.ts  # Generated types
│   ├── routes/        # TanStack Router route components
│   ├── hooks/         # Custom React hooks
│   ├── assets/        # Images, fonts, etc.
│   └── main.tsx       # Application entry point
├── public/            # Static assets
├── .eslintrc.cjs     # ESLint configuration
├── tsconfig.json     # TypeScript configuration
├── vite.config.ts    # Vite configuration
├── tailwind.config.js # Tailwind configuration
├── postcss.config.js # PostCSS configuration
├── components.json   # shadcn/ui configuration
└── package.json      # Dependencies and scripts
```

## Development Workflow

### Setup
```bash
cd frontend
pnpm install
```

### Available Scripts
```bash
pnpm run dev          # Start dev server (usually on http://localhost:5173)
pnpm run build        # Production build (outputs to dist/)
pnpm run lint         # Run ESLint
```

### Dev Server
```bash
pnpm run dev
# Opens on http://localhost:5173
# Hot module replacement (HMR) enabled
```

## Code Conventions

### TypeScript

**Strict Mode**: Enabled - ensure type safety
```typescript
// Good: Explicit types
interface User {
  id: string;
  email: string;
  name?: string;
}

function createUser(data: User): Promise<User> {
  // ...
}

// Avoid: any types
function doSomething(data: any) {  // ❌ Avoid
  // ...
}
```

**Type Imports:**
```typescript
import type { FC } from 'react';
import type { User, Account } from '@/lib/pocketbase-types';
```

### React Components

**Prefer Functional Components:**
```typescript
import { FC } from 'react';

interface Props {
  title: string;
  count?: number;
}

export const MyComponent: FC<Props> = ({ title, count = 0 }) => {
  return (
    <div>
      <h1>{title}</h1>
      <span>{count}</span>
    </div>
  );
};
```

**Use Hooks Properly:**
```typescript
import { useState, useEffect } from 'react';

export const DataComponent = () => {
  const [data, setData] = useState<string[]>([]);
  
  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup
    };
  }, [/* dependencies */]);
  
  return <div>{/* render */}</div>;
};
```

### TanStack Router

**File-based Routing** (located in `src/routes/`):
```typescript
// src/routes/accounts/$accountId.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/accounts/$accountId')({
  component: AccountDetail,
});

function AccountDetail() {
  const { accountId } = Route.useParams();
  return <div>Account: {accountId}</div>;
}
```

**Navigation:**
```typescript
import { useNavigate } from '@tanstack/react-router';

function MyComponent() {
  const navigate = useNavigate();
  
  const goToAccount = (id: string) => {
    navigate({ to: '/accounts/$accountId', params: { accountId: id } });
  };
  
  return <button onClick={() => goToAccount('123')}>View Account</button>;
}
```

### TanStack Query (React Query)

**Data Fetching:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';

function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      return await pb.collection('accounts').getFullList();
    },
  });
}

function AccountList() {
  const { data, isLoading, error } = useAccounts();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {data?.map(account => (
        <li key={account.id}>{account.name}</li>
      ))}
    </ul>
  );
}
```

**Mutations:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useCreateAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: NewAccount) => {
      return await pb.collection('accounts').create(data);
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
```

### Forms with React Hook Form + Zod

**Form Schema:**
```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  maxConnections: z.number().min(1).max(1000),
});

type AccountFormData = z.infer<typeof accountSchema>;

function AccountForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
  });
  
  const onSubmit = (data: AccountFormData) => {
    // Handle form submission
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Styling with Tailwind CSS

**Utility Classes:**
```typescript
// Good: Tailwind utilities
<div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
  <h2 className="text-xl font-bold text-gray-900">Title</h2>
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    Click me
  </button>
</div>
```

**Conditional Classes with clsx or cn:**
```typescript
import { cn } from '@/lib/utils';

<button 
  className={cn(
    "px-4 py-2 rounded",
    isActive && "bg-blue-500 text-white",
    !isActive && "bg-gray-200 text-gray-700"
  )}
>
  Button
</button>
```

**Component Variants with CVA:**
```typescript
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  "px-4 py-2 rounded font-medium",
  {
    variants: {
      variant: {
        primary: "bg-blue-500 text-white hover:bg-blue-600",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
        danger: "bg-red-500 text-white hover:bg-red-600",
      },
      size: {
        sm: "text-sm px-2 py-1",
        md: "text-base px-4 py-2",
        lg: "text-lg px-6 py-3",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

<button className={buttonVariants({ variant: "danger", size: "sm" })}>
  Delete
</button>
```

### Radix UI Patterns

**Using Primitives:**
```typescript
import * as Dialog from '@radix-ui/react-dialog';

function MyDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button>Open Dialog</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg">
          <Dialog.Title>Dialog Title</Dialog.Title>
          <Dialog.Description>
            Dialog content here
          </Dialog.Description>
          <Dialog.Close asChild>
            <button>Close</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### Pocketbase Integration

**Initialize Client:**
```typescript
// lib/pocketbase.ts
import PocketBase from 'pocketbase';

export const pb = new PocketBase('http://localhost:8099');

// Enable auto-cancellation on unmount
pb.autoCancellation(false); // or true, depending on needs
```

**Authentication:**
```typescript
import { pb } from '@/lib/pocketbase';

// Login
const authData = await pb.collection('users').authWithPassword(
  'email@example.com',
  'password123'
);

// Check auth status
const isValid = pb.authStore.isValid;
const currentUser = pb.authStore.model;

// Logout
pb.authStore.clear();
```

**CRUD Operations:**
```typescript
// Create
const record = await pb.collection('accounts').create({
  name: 'My Account',
  // ...
});

// Read
const record = await pb.collection('accounts').getOne('RECORD_ID');
const records = await pb.collection('accounts').getFullList();

// Update
const updated = await pb.collection('accounts').update('RECORD_ID', {
  name: 'Updated Name',
});

// Delete
await pb.collection('accounts').delete('RECORD_ID');
```

**Real-time Subscriptions:**
```typescript
import { useEffect } from 'react';

function AccountList() {
  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = pb.collection('accounts').subscribe('*', (e) => {
      console.log('Change detected:', e.action, e.record);
      // Update UI accordingly
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  return <div>...</div>;
}
```

## Component Architecture

### Component Organization
```
components/
├── ui/              # Radix-based primitives (button, dialog, etc.)
│   ├── button.tsx
│   ├── dialog.tsx
│   └── ...
├── layout/          # Layout components (header, sidebar, etc.)
├── features/        # Feature-specific components
│   ├── accounts/
│   ├── users/
│   └── ...
└── shared/          # Shared business components
```

### Example Component Structure
```typescript
// components/features/accounts/AccountCard.tsx
import { FC } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Account } from '@/lib/pocketbase-types';

interface AccountCardProps {
  account: Account;
  onEdit?: (account: Account) => void;
  onDelete?: (id: string) => void;
}

export const AccountCard: FC<AccountCardProps> = ({ 
  account, 
  onEdit, 
  onDelete 
}) => {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold">{account.name}</h3>
      <p className="text-sm text-gray-600">{account.email}</p>
      <div className="mt-4 flex gap-2">
        {onEdit && (
          <Button onClick={() => onEdit(account)} variant="secondary">
            Edit
          </Button>
        )}
        {onDelete && (
          <Button onClick={() => onDelete(account.id)} variant="danger">
            Delete
          </Button>
        )}
      </div>
    </Card>
  );
};
```

## State Management

### Local State (useState)
```typescript
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState<FormData>({ name: '', email: '' });
```

### Server State (TanStack Query)
```typescript
// Fetching
const { data, isLoading } = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts });

// Mutating
const mutation = useMutation({ mutationFn: createAccount });
```

### Form State (React Hook Form)
```typescript
const { register, handleSubmit, watch, reset } = useForm();
```

### Theme (next-themes)
```typescript
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  );
}
```

## Error Handling

### Query Errors
```typescript
const { data, error, isError } = useQuery({
  queryKey: ['accounts'],
  queryFn: fetchAccounts,
  retry: 3,
  retryDelay: 1000,
});

if (isError) {
  return <div>Error: {error.message}</div>;
}
```

### Mutation Errors
```typescript
const mutation = useMutation({
  mutationFn: createAccount,
  onError: (error) => {
    toast.error(`Failed to create account: ${error.message}`);
  },
  onSuccess: () => {
    toast.success('Account created successfully!');
  },
});
```

### Form Validation Errors
```typescript
const { errors } = formState;

{errors.email && <span className="text-red-500">{errors.email.message}</span>}
```

## Performance Optimization

### Memoization
```typescript
import { useMemo, useCallback } from 'react';

// Memoize expensive calculations
const sortedAccounts = useMemo(
  () => accounts.sort((a, b) => a.name.localeCompare(b.name)),
  [accounts]
);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### Code Splitting
```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### React Query Optimization
```typescript
// Prefetch data
queryClient.prefetchQuery({ queryKey: ['accounts'], queryFn: fetchAccounts });

// Stale time
useQuery({
  queryKey: ['accounts'],
  queryFn: fetchAccounts,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

## Accessibility

### Follow Radix UI Patterns
- Use semantic HTML
- Ensure keyboard navigation works
- Provide ARIA labels where needed
- Maintain focus management

```typescript
<Dialog.Root>
  <Dialog.Trigger asChild>
    <button aria-label="Open settings">Settings</button>
  </Dialog.Trigger>
  {/* ... */}
</Dialog.Root>
```

## Testing (Currently Not Implemented)

If adding tests, follow these patterns:

### React Testing Library
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountCard } from './AccountCard';

test('renders account name', () => {
  const account = { id: '1', name: 'Test Account', email: 'test@example.com' };
  render(<AccountCard account={account} />);
  
  expect(screen.getByText('Test Account')).toBeInTheDocument();
});
```

## Build Configuration

### Vite Config (vite.config.ts)
- React plugin with SWC
- TanStack Router plugin
- Path aliases (`@/` → `src/`)

### TypeScript Config
- **tsconfig.json**: Base configuration
- **tsconfig.app.json**: App-specific settings
- **tsconfig.node.json**: Node/build scripts

### Output
```bash
pnpm run build
# Outputs to: frontend/dist/
# Types checked: tsc -b
# Bundle built: vite build
```

Built files are copied to `cmd/wwwroot/` during Docker build.

## Common Tasks

### Adding a New Page/Route
1. Create file in `src/routes/` following TanStack Router conventions
2. Define route with `createFileRoute`
3. Implement component
4. Add navigation links where needed

### Adding a UI Component
1. If using Radix primitive, create wrapper in `components/ui/`
2. Apply Tailwind styling
3. Export from component file
4. Use throughout app

### Fetching New Data
1. Define query function
2. Create custom hook with `useQuery`
3. Handle loading, error, and success states
4. Use in component

### Updating Pocketbase Types
```bash
cd frontend
pnpm run pb:typegen
# Requires backend running with database
# Generates: src/lib/pocketbase-types.ts
```

## Debugging

### React DevTools
Install React DevTools browser extension for:
- Component tree inspection
- Props and state inspection
- Performance profiling

### TanStack Query DevTools
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

### Browser Console
- Check network requests
- View console logs
- Inspect component errors

## Best Practices

1. **Type Everything**: Use TypeScript strictly, avoid `any`
2. **Compose Components**: Small, focused, reusable components
3. **Use Hooks**: Prefer hooks over class components
4. **Handle Loading States**: Always show loading indicators
5. **Handle Errors**: Display user-friendly error messages
6. **Validate Forms**: Use Zod schemas for all forms
7. **Optimize Queries**: Set appropriate stale times and cache strategies
8. **Accessibility First**: Use semantic HTML and ARIA where needed
9. **Consistent Styling**: Use Tailwind utilities, avoid custom CSS
10. **Test User Flows**: Manually test all user interactions

## Resources

- **TanStack Router**: https://tanstack.com/router
- **TanStack Query**: https://tanstack.com/query
- **Radix UI**: https://www.radix-ui.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **React Hook Form**: https://react-hook-form.com/
- **Zod**: https://zod.dev/
- **Pocketbase SDK**: https://github.com/pocketbase/js-sdk
