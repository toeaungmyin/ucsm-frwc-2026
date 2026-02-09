# Frontend React Architecture Documentation

> Technical architecture and design patterns for the React frontend application.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Folder Structure](#folder-structure)
3. [Application Bootstrap](#application-bootstrap)
4. [Routing Architecture](#routing-architecture)
5. [State Management](#state-management)
6. [Data Fetching Layer](#data-fetching-layer)
7. [API Layer Pattern](#api-layer-pattern)
8. [Component Architecture](#component-architecture)
9. [Form Handling](#form-handling)
10. [Type System](#type-system)
11. [Styling Architecture](#styling-architecture)
12. [Utility Modules](#utility-modules)
13. [Build & Configuration](#build--configuration)

---

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | React | 19.x |
| **Language** | TypeScript | 5.9.x |
| **Build Tool** | Vite | 7.x |
| **Routing** | TanStack Router | 1.x |
| **Server State** | TanStack Query | 5.x |
| **Client State** | Zustand | 5.x |
| **Forms** | React Hook Form | 7.x |
| **Validation** | Zod | 4.x |
| **HTTP Client** | Axios | 1.x |
| **Styling** | Tailwind CSS | 4.x |
| **UI Components** | Flowbite React | 0.12.x |
| **Icons** | React Icons | 5.x |

---

## Folder Structure

```
frontend/
├── public/                          # Static assets (served as-is)
│   ├── ucsm.png
│   └── vite.svg
│
├── src/
│   ├── api/                         # API layer - HTTP request handlers
│   │   ├── auth.api.ts              # Admin authentication endpoints
│   │   ├── categories.api.ts        # Categories CRUD endpoints
│   │   ├── candidates.api.ts        # Candidates CRUD endpoints
│   │   ├── tickets.api.ts           # Tickets management endpoints
│   │   ├── dashboard.api.ts         # Dashboard data endpoints
│   │   ├── settings.api.ts          # Settings endpoints
│   │   └── client/                  # Public-facing client API modules
│   │       ├── index.ts             # Barrel export
│   │       ├── categories.api.ts
│   │       ├── candidates.api.ts
│   │       ├── config.api.ts
│   │       ├── tickets.api.ts
│   │       └── votes.api.ts
│   │
│   ├── assets/                      # Bundled static assets
│   │   ├── react.svg
│   │   └── ucsm.png
│   │
│   ├── components/                  # Reusable UI components
│   │   ├── ui/                      # Base UI primitives
│   │   │   ├── index.ts             # Barrel export
│   │   │   ├── modal.tsx            # Modal dialog component
│   │   │   ├── toast.tsx            # Toast notification system
│   │   │   ├── confirm-dialog.tsx   # Confirmation dialog
│   │   │   └── icon-upload.tsx      # File upload component
│   │   │
│   │   ├── layouts/                 # Layout components
│   │   │   └── DashboardLayout.tsx  # Admin dashboard shell
│   │   │
│   │   ├── categories/              # Category feature components
│   │   │   ├── index.ts             # Barrel export
│   │   │   ├── category-form.tsx    # Form component
│   │   │   ├── categories-data-table.tsx
│   │   │   ├── categories-empty-state.tsx
│   │   │   ├── add-category-dialog.tsx
│   │   │   ├── edit-category-dialog.tsx
│   │   │   └── delete-category-dialog.tsx
│   │   │
│   │   ├── candidates/              # Candidate feature components
│   │   │   ├── index.ts
│   │   │   ├── candidate-form.tsx
│   │   │   ├── candidates-data-table.tsx
│   │   │   ├── candidates-grid-view.tsx
│   │   │   ├── candidates-empty-state.tsx
│   │   │   ├── add-candidate-dialog.tsx
│   │   │   ├── edit-candidate-dialog.tsx
│   │   │   ├── delete-candidate-dialog.tsx
│   │   │   └── import-candidates-dialog.tsx
│   │   │
│   │   ├── tickets/                 # Ticket feature components
│   │   │   ├── index.ts
│   │   │   ├── ticket-card.tsx
│   │   │   ├── tickets-data-table.tsx
│   │   │   ├── tickets-empty-state.tsx
│   │   │   ├── generate-tickets-dialog.tsx
│   │   │   ├── import-tickets-dialog.tsx
│   │   │   ├── delete-ticket-dialog.tsx
│   │   │   └── bulk-delete-dialog.tsx
│   │   │
│   │   └── client/                  # Public client components
│   │       ├── index.ts
│   │       ├── animations.ts        # Animation utilities
│   │       ├── bubble-background.tsx
│   │       ├── candidate-card.tsx
│   │       ├── category-header.tsx
│   │       ├── countdown-dialog.tsx
│   │       ├── error-state.tsx
│   │       ├── promo-video-modal.tsx
│   │       ├── skeleton-loading.tsx
│   │       └── ticket-scan-dialog.tsx
│   │
│   ├── lib/                         # Core library configurations
│   │   ├── axios.ts                 # Axios instance with interceptors
│   │   ├── query-client.ts          # TanStack Query client config
│   │   └── schemas.ts               # Shared Zod schemas
│   │
│   ├── routes/                      # File-based route definitions
│   │   ├── __root.tsx               # Root route (outlet wrapper)
│   │   ├── login.tsx                # Login page route
│   │   ├── dashboard.tsx            # Dashboard layout route (protected)
│   │   ├── dashboard/               # Dashboard child routes
│   │   │   ├── index.tsx            # Dashboard home
│   │   │   ├── categories.tsx
│   │   │   ├── candidates.tsx
│   │   │   ├── tickets.tsx
│   │   │   ├── tickets-print.tsx
│   │   │   ├── voting-stats.tsx
│   │   │   └── settings.tsx
│   │   └── client/                  # Public client routes
│   │       ├── index.tsx            # Client home
│   │       └── category.tsx         # Category voting page
│   │
│   ├── stores/                      # Zustand state stores
│   │   ├── auth.store.ts            # Admin authentication state
│   │   └── voter.store.ts           # Voter/ticket authentication state
│   │
│   ├── types/                       # TypeScript type definitions
│   │   └── index.ts                 # Centralized type exports
│   │
│   ├── utils/                       # Utility functions
│   │   ├── chunked-upload.ts        # Large file upload handling
│   │   └── image-compression.ts     # Client-side image compression
│   │
│   ├── App.tsx                      # Root application component
│   ├── main.tsx                     # Application entry point
│   ├── router.ts                    # Router configuration
│   └── index.css                    # Global styles & Tailwind imports
│
├── index.html                       # HTML template
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript config (references)
├── tsconfig.app.json                # App TypeScript config
├── tsconfig.node.json               # Node TypeScript config
├── vite.config.ts                   # Vite build configuration
├── eslint.config.js                 # ESLint configuration
├── vercel.json                      # Vercel deployment config
├── nginx.conf                       # Nginx configuration
└── Dockerfile                       # Container build config
```

---

## Application Bootstrap

### Entry Point (`main.tsx`)

The application initializes with a provider hierarchy:

```
┌─────────────────────────────────────┐
│           StrictMode                │
│  ┌───────────────────────────────┐  │
│  │    QueryClientProvider        │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │     ToastProvider       │  │  │
│  │  │  ┌───────────────────┐  │  │  │
│  │  │  │       App         │  │  │  │
│  │  │  │  (RouterProvider) │  │  │  │
│  │  │  └───────────────────┘  │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Provider responsibilities:**
- `StrictMode` - Development double-rendering for bug detection
- `QueryClientProvider` - TanStack Query context for server state
- `ToastProvider` - Global toast notification context
- `RouterProvider` - TanStack Router context for navigation

---

## Routing Architecture

### TanStack Router (Type-Safe Routing)

The application uses **TanStack Router** for fully type-safe routing with the following patterns:

#### Route Tree Structure

```
rootRoute (/)
├── clientHomeRoute (/)
├── clientCategoryRoute (/category)
├── loginRoute (/login)
└── dashboardRoute (/dashboard) [Protected]
    ├── dashboardIndexRoute (/dashboard)
    ├── dashboardCategoriesRoute (/dashboard/categories)
    ├── dashboardCandidatesRoute (/dashboard/candidates)
    ├── dashboardTicketsRoute (/dashboard/tickets)
    ├── dashboardTicketsPrintRoute (/dashboard/tickets-print)
    ├── dashboardVotingStatsRoute (/dashboard/voting-stats)
    └── dashboardSettingsRoute (/dashboard/settings)
```

#### Route Definition Pattern

```typescript
// Standard route definition
export const Route = createRoute({
  getParentRoute: () => parentRoute,
  path: '/path',
  component: PageComponent,
});

// Protected route with beforeLoad guard
export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: DashboardLayout,
});
```

#### Type Registration

```typescript
// router.ts - Type registration for full type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
```

---

## State Management

### Zustand Stores

The application uses **Zustand** for client-side state management with persistence.

#### Store Pattern

```typescript
interface StoreState {
  // State
  data: DataType | null;
  isActive: boolean;
  
  // Actions
  setData: (data: DataType) => void;
  reset: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Initial state
      data: null,
      isActive: false,
      
      // Actions
      setData: (data) => set({ data, isActive: true }),
      reset: () => set({ data: null, isActive: false }),
    }),
    {
      name: 'storage-key', // localStorage key
    }
  )
);
```

#### Store Architecture

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `auth.store.ts` | Admin authentication (token, user) | ✅ `auth-storage` |
| `voter.store.ts` | Voter ticket authentication | ✅ `voter-storage` |

#### Usage Pattern

```typescript
// Reactive subscription (in components)
const { token, admin, isAuthenticated, setAuth, logout } = useAuthStore();

// Non-reactive access (outside React)
const isAuthenticated = useAuthStore.getState().isAuthenticated;
useAuthStore.getState().logout();
```

---

## Data Fetching Layer

### TanStack Query Configuration

```typescript
// lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,        // 30 seconds
      gcTime: 1000 * 60 * 5,       // 5 minutes cache
      retry: 3,                     // Retry failed requests
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});
```

### Query Pattern

```typescript
// Fetching data
const { data, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['resource-name'],
  queryFn: apiModule.getAll,
});

// Mutations with cache invalidation
const mutation = useMutation({
  mutationFn: (data: InputType) => apiModule.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource-name'] });
    // Additional success handling
  },
});
```

---

## API Layer Pattern

### Axios Instance Configuration

```typescript
// lib/axios.ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});
```

### Interceptor Architecture

```
Request Flow:
┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌────────┐
│ Request │───▶│ Auth Token   │───▶│ Retry Count │───▶│ Server │
└─────────┘    │ Injection    │    │ Init        │    └────────┘
               └──────────────┘    └─────────────┘

Response Flow:
┌────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────┐
│ Server │───▶│ Error Check  │───▶│ Retry Logic │───▶│ Response │
└────────┘    │ (401 handle) │    │ (5xx retry) │    └──────────┘
              └──────────────┘    └─────────────┘
```

**Key Features:**
- Automatic token injection based on route type (admin vs client)
- Automatic retry with exponential backoff for 5xx errors
- 401 handling with automatic logout for admin routes
- Development error logging

### API Module Pattern

```typescript
// api/resource.api.ts
import api from '../lib/axios';
import type { ApiResponse, Resource } from '../types';

export interface CreateResourceInput {
  name: string;
  // ...fields
}

export interface UpdateResourceInput {
  name?: string;
  // ...optional fields
}

export const resourceApi = {
  getAll: async (): Promise<ApiResponse<Resource[]>> => {
    const response = await api.get<ApiResponse<Resource[]>>('/resources');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Resource>> => {
    const response = await api.get<ApiResponse<Resource>>(`/resources/${id}`);
    return response.data;
  },

  create: async (data: CreateResourceInput): Promise<ApiResponse<Resource>> => {
    const response = await api.post<ApiResponse<Resource>>('/resources', data);
    return response.data;
  },

  update: async (id: string, data: UpdateResourceInput): Promise<ApiResponse<Resource>> => {
    const response = await api.patch<ApiResponse<Resource>>(`/resources/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/resources/${id}`);
    return response.data;
  },
};
```

### File Upload Pattern

```typescript
// For multipart/form-data requests
const createFormData = (data: CreateInput): FormData => {
  const formData = new FormData();
  if (data.name) formData.append('name', data.name);
  if (data.file) formData.append('file', data.file);
  return formData;
};

create: async (data: CreateInput): Promise<ApiResponse<Resource>> => {
  const formData = createFormData(data);
  const response = await api.post<ApiResponse<Resource>>('/resources', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
},
```

---

## Component Architecture

### Component Organization

```
components/
├── ui/              # Primitive/base components (atoms)
├── layouts/         # Page layout shells
├── [feature]/       # Feature-specific components (molecules/organisms)
└── client/          # Public-facing components
```

### Barrel Export Pattern

Each component folder uses an `index.ts` for clean imports:

```typescript
// components/categories/index.ts
export { CategoryForm, type CategoryFormData } from "./category-form";
export { CategoriesDataTable } from "./categories-data-table";
export { AddCategoryDialog } from "./add-category-dialog";
export { EditCategoryDialog } from "./edit-category-dialog";
export { DeleteCategoryDialog } from "./delete-category-dialog";
export { CategoriesEmptyState } from "./categories-empty-state";
```

```typescript
// Usage in routes
import {
  CategoriesDataTable,
  AddCategoryDialog,
  type CategoryFormData,
} from "../../components/categories";
```

### Component Patterns

#### Feature Component Structure

```
[feature]/
├── index.ts                    # Barrel exports
├── [feature]-form.tsx          # Reusable form component
├── [feature]-data-table.tsx    # Data display table
├── [feature]-empty-state.tsx   # Empty state UI
├── add-[feature]-dialog.tsx    # Create dialog
├── edit-[feature]-dialog.tsx   # Edit dialog
└── delete-[feature]-dialog.tsx # Delete confirmation
```

#### Dialog Component Pattern

```typescript
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
  error: Error | null;
}

export function AddFeatureDialog({ isOpen, onClose, onSubmit, isLoading, error }: DialogProps) {
  return (
    <Modal show={isOpen} onClose={onClose}>
      {/* Dialog content */}
    </Modal>
  );
}
```

#### Form Component Pattern

```typescript
interface FormProps {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading: boolean;
  submitLabel: string;
}

export function FeatureForm({ defaultValues, onSubmit, onCancel, isLoading, submitLabel }: FormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Layout Component Pattern

```typescript
// components/layouts/DashboardLayout.tsx
export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="fixed top-0 ...">...</nav>
      
      {/* Sidebar */}
      <aside className="fixed left-0 ...">...</aside>
      
      {/* Main Content */}
      <main className="pt-16 ml-64">
        <Outlet /> {/* Child routes render here */}
      </main>
    </div>
  );
}
```

---

## Form Handling

### React Hook Form + Zod Integration

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// 1. Define schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  isActive: z.boolean(),
});

// 2. Infer TypeScript type
type FormData = z.infer<typeof formSchema>;

// 3. Use in component
function FormComponent() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      isActive: true,
    },
  });

  const onSubmit = (data: FormData) => {
    // Handle submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} />
      {errors.name && <span>{errors.name.message}</span>}
    </form>
  );
}
```

---

## Type System

### Centralized Type Definitions

```typescript
// types/index.ts

// Entity types
export interface Admin {
  id: string;
  username: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  iconUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Request/Response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    admin: Admin;
  };
}

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: boolean;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}
```

### Type Flow

```
API Response ───▶ ApiResponse<T> ───▶ Component Props ───▶ UI Rendering
                       │
                       ▼
                 Entity Types (Category, Candidate, etc.)
```

---

## Styling Architecture

### Tailwind CSS v4 Configuration

```css
/* index.css */
@import "tailwindcss";
@plugin "flowbite/plugin";
@source "../node_modules/flowbite-react";
```

### Styling Patterns

#### Utility-First Approach
```tsx
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
  Click me
</button>
```

#### Conditional Classes
```tsx
<input
  className={`w-full px-3 py-2 border rounded-lg ${
    errors.name ? "border-red-500" : "border-gray-300"
  }`}
/>
```

#### Component State Variants
```tsx
const isActive = (path: string) => location.pathname.startsWith(path);

<Link
  className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
    active
      ? "bg-blue-50 text-blue-700"
      : "text-gray-600 hover:bg-gray-50"
  }`}
>
```

### Flowbite React Components

Used for pre-built accessible components:
- Modal dialogs
- Form inputs
- Buttons
- Tables
- Navigation

---

## Utility Modules

### Image Compression (`utils/image-compression.ts`)

Client-side image compression before upload:

```typescript
export const compressImage = async (
  file: File,
  maxSizeBytes: number = 1024 * 1024,  // 1MB
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.9
): Promise<File> => {
  // Canvas-based compression with quality reduction
};

export const formatBytes = (bytes: number): string => {
  // Human-readable file size formatting
};
```

### Chunked Upload (`utils/chunked-upload.ts`)

Large file upload handling with chunks for reliability.

---

## Build & Configuration

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

### TypeScript Configuration

```json
// tsconfig.app.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

### NPM Scripts

```json
{
  "scripts": {
    "dev": "vite",                    // Development server
    "build": "tsc -b && vite build",  // Production build
    "lint": "eslint .",               // Lint codebase
    "preview": "vite preview"         // Preview production build
  }
}
```

### Environment Variables

```bash
VITE_API_URL=http://localhost:8000/api
```

Access in code:
```typescript
import.meta.env.VITE_API_URL
```

---

## Architecture Diagrams

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          React Components                            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────┐ │
│  │   Routes    │  │  Components  │  │         Layouts             │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────────┬──────────────┘ │
│         │                │                          │                │
└─────────┼────────────────┼──────────────────────────┼────────────────┘
          │                │                          │
          ▼                ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         State Layer                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────────────┐ │
│  │   TanStack Query         │  │        Zustand Stores            │ │
│  │   (Server State)         │  │        (Client State)            │ │
│  │   - Caching              │  │        - Auth state              │ │
│  │   - Refetching           │  │        - UI state                │ │
│  │   - Mutations            │  │        - Persistence             │ │
│  └───────────┬──────────────┘  └──────────────────────────────────┘ │
└──────────────┼──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API Layer                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Axios Instance                             │   │
│  │  - Request interceptors (auth token injection)                │   │
│  │  - Response interceptors (error handling, retry logic)        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  auth.api.ts    │  │ categories.api  │  │  client/*.api.ts    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
         ┌───────────┐
         │  Backend  │
         │    API    │
         └───────────┘
```

### Component Hierarchy

```
App
└── RouterProvider
    └── Route Tree
        ├── Public Routes
        │   ├── / (Client Home)
        │   ├── /category (Voting Page)
        │   └── /login (Admin Login)
        │
        └── Protected Routes (/dashboard)
            └── DashboardLayout
                ├── Navbar
                ├── Sidebar
                └── <Outlet> (Child Routes)
                    ├── /dashboard (Index)
                    ├── /dashboard/categories
                    ├── /dashboard/candidates
                    ├── /dashboard/tickets
                    ├── /dashboard/tickets-print
                    ├── /dashboard/voting-stats
                    └── /dashboard/settings
```

---

## Best Practices Summary

1. **Co-locate related code** - Keep feature-specific components, types, and utilities together
2. **Use barrel exports** - Clean imports through `index.ts` files
3. **Type everything** - Full TypeScript coverage with Zod validation
4. **Separate concerns** - API layer, state management, and UI are decoupled
5. **Persist when needed** - Use Zustand's persist middleware for auth state
6. **Handle loading/error states** - Every data fetch has corresponding UI states
7. **Use interceptors** - Centralize auth and error handling in Axios
8. **Optimize queries** - Configure appropriate stale times and caching
9. **Form validation** - Schema-based validation with Zod + React Hook Form
10. **Protected routes** - Use `beforeLoad` guards for authentication

---

*Last updated: January 2026*

