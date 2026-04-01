# ADR-0005: Data Fetching & API Strategy

**Status**: Accepted
**Date**: 2026-02-27
**Supersedes**: Previous ADR-0005 (2026-02-26)

---

## ⚠️ Next.js 15 Breaking Change

**`fetch` is no longer cached by default in Next.js 15.**

```tsx
// ✅ You MUST be explicit
fetch(url, { cache: 'force-cache' })           // Cached indefinitely
fetch(url, { next: { revalidate: 3600 } })     // Cached for 1 hour (ISR)
fetch(url, { cache: 'no-store' })              // Never cached

// ❌ BROKEN in Next.js 15
fetch(url)  // NOT cached! Was cached in 14.
```

---

## Context

The template needs a complete data-fetching strategy — not just "which tool" but exactly how to wire services, validate responses, cache data, handle mutations, and structure the code so any agent can replicate it. Next.js App Router collapses the traditional SPA stack — Server Components fetch data directly without HTTP round-trips. But client-side fetching is still needed for interactive UIs (polling, optimistic updates, infinite scroll).

This ADR is the architect's blueprint. Every pattern, every file location, every code example is deliberate. An agent reading this ADR should be able to build a complete data layer from scratch.

## Decision

**Server-first by default. TanStack Query v5 for all client-side data needs. Native `fetch` only (no Axios). Zod validation at every boundary.**

| Concern | Solution |
|---------|----------|
| Data in pages/layouts | `async` Server Components — call service functions directly |
| External HTTP surface | Route Handlers (`app/api/*/route.ts`) + Zod |
| Form mutations | Server Actions → return `Result<T>`, never throw |
| Client-side data (polling, optimistic, infinite) | **TanStack Query v5** (opt-in, not installed by default) |
| Query key management | **`@lukemorales/query-key-factory`** (required with TanStack Query) |
| HTTP client | Native `fetch` — **no Axios** |
| Response contract | `ApiResponse<T>` / `ApiError` from `contracts/common.ts` |
| Validation | Zod — always, at the boundary |

---

## Why TanStack Query Over SWR

The previous version of this ADR recommended SWR as the "simple" default and TanStack Query as an "upgrade." That's a false economy. Here's why TanStack Query is the only choice:

| Factor | SWR | TanStack Query | Winner |
|--------|-----|---------------|--------|
| Query key management | Raw strings | `@lukemorales/query-key-factory` — typed, centralized, refactorable | TQ |
| Optimistic mutations | Manual rollback | Built-in with `onMutate` / `onError` / `onSettled` | TQ |
| Infinite scroll | Basic `useSWRInfinite` | `useInfiniteQuery` with `getNextPageParam` | TQ |
| Dependent queries | `enabled` flag | `enabled` + `select` + `placeholderData` | TQ |
| Devtools | Basic | Advanced (query inspector, cache viewer, timeline) | TQ |
| Structural sharing | ❌ | ✅ (same reference if data unchanged → fewer re-renders) | TQ |
| Cache invalidation | `mutate()` (global or key) | `invalidateQueries()` with key prefix matching | TQ |
| Stale/GC time control | `dedupingInterval` | `staleTime` + `gcTime` (independent, precise) | TQ |
| Bundle | ~4kB | ~40kB | SWR |

**The only advantage SWR has is bundle size.** For any project that grows beyond a single polling endpoint, you'll migrate to TanStack Query anyway. Starting with the right tool avoids a rewrite. The ~36kB difference is negligible for applications that need client-side data fetching.

**Decision: TanStack Query is the sole client-side data library. SWR is not used.**

---

## Architecture: Three Data Paths

```
┌─────────────────────────────────────────────────────────────┐
│                      Server Side                             │
│                                                              │
│  Server Component ──→ Service Function ──→ DB / External API │
│                                                              │
│  Server Action ──→ Zod validate ──→ DB mutate ──→ Result<T>  │
│                                                              │
│  Route Handler ──→ Zod validate ──→ Service ──→ ApiResponse  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Client Side (opt-in)                     │
│                                                              │
│  useQuery hook ──→ fetch('/api/...') ──→ Zod parse ──→ cache │
│  useMutation ──→ Server Action ──→ invalidateQueries         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Path 1: Server Component → Service Function (Default)

For pages and layouts. Zero client JS. Data fetched at request time on the server.

```tsx
// src/app/dashboard/page.tsx
import { getUsers } from '@/services/users'

export default async function DashboardPage() {
  const users = await getUsers()
  return <UserList users={users} />
}
```

### Path 2: Route Handler → ApiResponse (HTTP Surface)

For public API endpoints consumed by external clients or client-side hooks.

### Path 3: TanStack Query → useQuery / useMutation (Client-Side)

For interactive UIs that need caching, polling, optimistic updates, or real-time data.

---

## Rules

### Server Components

| Rule | Level |
|------|-------|
| Fetch in async Server Components by default | **MUST** |
| Don't fetch in Client Components unless interactivity requires it | **MUST NOT** |
| Use native `fetch` with explicit cache option | **MUST** |
| Don't use Axios (bypasses Next.js cache) | **MUST NOT** |
| Tag cacheable fetches: `next: { tags: ['users'] }` | **SHOULD** |

### Route Handlers

| Rule | Level |
|------|-------|
| Use for all public HTTP endpoints | **MUST** |
| Validate with Zod before processing | **MUST** |
| Return `ApiResponse<T>` or `ApiError` envelope | **MUST** |
| Handle all errors with try/catch | **MUST** |
| Don't return raw DB objects — map to contract types | **MUST NOT** |
| Don't return bare arrays or objects | **MUST NOT** |

### Server Actions

| Rule | Level |
|------|-------|
| Use for form mutations (preferred over POST route) | **SHOULD** |
| Validate input with Zod | **MUST** |
| Return `Result<T>` — never throw | **MUST** |
| Don't use for reads (that's Server Component's job) | **MUST NOT** |
| Call `revalidatePath/revalidateTag` after mutations | **SHOULD** |

### TanStack Query (Client-Side)

| Rule | Level |
|------|-------|
| Use `@lukemorales/query-key-factory` for all keys | **MUST** |
| Never use raw string arrays as query keys | **MUST NOT** |
| Call `Schema.parse(data)` inside `queryFn` — not in components | **MUST** |
| Extend `QueryOpts` for all hook option types | **MUST** |
| Gate data rendering with null check (`data &&`), not `isLoading` alone | **MUST** |
| Keep raw fetch functions in `api.ts` with no parsing or error handling | **SHOULD** |
| Never retry mutations (`retry: 0`) | **MUST NOT** |
| Never use `as` type casts on API data — let Zod parse and infer | **MUST NOT** |
| Import from service barrel (`index.ts`) — not internal files | **MUST** |

### Caching

| Rule | Level |
|------|-------|
| Specify `cache` or `revalidate` on every server-side `fetch` | **MUST** |
| Don't rely on fetch defaults (changed in Next.js 15) | **MUST NOT** |
| Use `next: { tags: [] }` on cacheable fetches | **SHOULD** |
| Call `revalidateTag()`/`revalidatePath()` in mutations | **SHOULD** |

---

## Response Contracts

All responses use the envelope types from `contracts/common.ts`:

```ts
// Success (single item)
{ data: T, message?: string }                              // ApiResponse<T>

// Success (paginated list)
{ data: T[], pagination: { page, limit, total, totalPages } } // PaginatedResponse<T>

// Error
{ code: ErrorCode, message: string, details?: [...] }      // ApiError

// Server Action result
{ ok: true, value: T } | { ok: false, error: ApiError }    // Result<T>
```

---

## Server-Side Patterns

### Service Function (Fetch Wrapper)

```ts
// src/services/users/api.ts
import type { ApiResponse } from '@contracts/common'
import { UserSchema, UsersResponseSchema } from './validation'

const API_BASE = process.env.API_URL || ''

export const getUsers = async () => {
  const res = await fetch(`${API_BASE}/api/users`, {
    next: { tags: ['users'], revalidate: 60 },
  })

  if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`)

  const json = await res.json()
  return UsersResponseSchema.parse(json) // Zod validates at boundary
}

export const getUserById = async (id: string) => {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    next: { tags: [`user-${id}`] },
    cache: 'force-cache',
  })

  if (!res.ok) throw new Error(`Failed to fetch user ${id}: ${res.status}`)

  const json = await res.json()
  return UserSchema.parse(json.data)
}
```

### Route Handler

```ts
// src/app/api/users/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse, ApiError } from '@contracts/common'

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

export const GET = async (): Promise<NextResponse> => {
  try {
    const users = await db.user.findMany()
    return NextResponse.json({ data: users } satisfies ApiResponse<typeof users>)
  } catch {
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' } satisfies ApiError,
      { status: 500 },
    )
  }
}

export const POST = async (request: Request): Promise<NextResponse> => {
  try {
    const body = await request.json()
    const parsed = CreateUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: parsed.error.errors.map((e) => ({ path: e.path, message: e.message })),
        } satisfies ApiError,
        { status: 400 },
      )
    }

    const user = await db.user.create({ data: parsed.data })
    return NextResponse.json({ data: user } satisfies ApiResponse<typeof user>, { status: 201 })
  } catch {
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Something went wrong' } satisfies ApiError,
      { status: 500 },
    )
  }
}
```

### Server Action

```ts
// src/app/contacts/_actions/submitContact.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import type { ServerActionResult } from '@contracts/common'

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(10),
})

export const submitContact = async (input: unknown): ServerActionResult<{ id: string }> => {
  const parsed = ContactSchema.safeParse(input)

  if (!parsed.success) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } }
  }

  try {
    const record = await db.contact.create({ data: parsed.data })
    revalidatePath('/contacts')
    return { ok: true, value: { id: record.id } }
  } catch {
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to submit' } }
  }
}
```

---

## Client-Side Patterns (TanStack Query — Opt-In)

### Setup: File Structure

When TanStack Query is adopted, create this structure:

```
src/
  lib/
    query/
      queryClient.ts       # QueryClient with deliberate defaults
      appQueryKeys.ts       # Merged key registry
      types.ts              # QueryOpts, ExcludeQueryOpts
      index.ts              # Barrel export
  providers/
    QueryProvider.tsx        # 'use client' — wraps app
  services/
    <domain>/
      api.ts                # Raw fetch functions (no parsing, no error handling)
      queries.ts            # useQuery hooks (calls api.ts + Zod parse)
      mutations.ts          # useMutation hooks (calls Server Actions)
      queryKeys.ts          # createQueryKeys() definition
      validation.ts         # Zod schemas (if domain-specific)
      types.ts              # Hook option types (extends QueryOpts)
      index.ts              # Barrel export
    shared/
      validation.ts         # Zod schemas shared across domains
      types.ts              # Shared inferred types
      index.ts              # Barrel export
```

### Step 1: QueryClient Configuration

```ts
// src/lib/query/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,   // No surprise refetches on tab switch
      retry: (failureCount, error: unknown) => {
        // Retry only network failures and server errors (5xx), max 2 times
        // Never retry client errors (4xx) — they won't self-resolve
        const status = (error as { status?: number })?.status
        return failureCount < 2 && (status === undefined || status >= 500)
      },
      staleTime: 60_000,            // Data fresh for 1 minute — no background refetch
      gcTime: 600_000,              // Inactive cache kept 10 minutes before GC
      structuralSharing: true,       // Same reference if data unchanged → fewer re-renders
    },
    mutations: {
      retry: 0,                      // Never retry mutations — user must explicitly retry
    },
  },
})
```

**Rationale for each default:**

| Option | Value | Why |
|--------|-------|-----|
| `refetchOnWindowFocus` | `false` | Prevents confusing refetches when users switch tabs. Re-enable per query when real-time data needs it. |
| `retry` | Max 2, only 5xx/network | 4xx errors (validation, not-found) will never self-resolve. Retrying wastes time and confuses users. |
| `staleTime` | 60s | Prevents hammering the server when components re-mount. 1 minute is a reasonable default for most UIs. |
| `gcTime` | 600s (10 min) | Keeps cache warm during navigation. Users returning to a page within 10 min see instant data. |
| `structuralSharing` | `true` | If refetch returns identical data, React sees the same object reference → skips re-render. Free performance. |
| `mutations.retry` | `0` | Mutations have side effects. Automatic retry could double-submit forms, charge credit cards twice, etc. |

### Step 2: Query Key Factory

```ts
// src/services/users/queryKeys.ts
import { createQueryKeys } from '@lukemorales/query-key-factory'

export const userKeys = createQueryKeys('users', {
  all: { queryKey: null },
  detail: (userId: string) => ({ queryKey: [userId] }),
  byEmail: (email: string) => ({ queryKey: [email] }),
})

// Usage:
// userKeys.all           → { queryKey: ['users'] }
// userKeys.detail('123') → { queryKey: ['users', '123'] }
```

```ts
// src/lib/query/appQueryKeys.ts
import { mergeQueryKeys } from '@lukemorales/query-key-factory'

import { userKeys } from '@/services/users/queryKeys'
import { postKeys } from '@/services/posts/queryKeys'

export const appQueryKeys = mergeQueryKeys(userKeys, postKeys)
```

**Why a key factory:** Raw string arrays (`['users', id]`) are error-prone, hard to refactor, and impossible to type-check. The factory guarantees consistent, typed keys and enables IDE autocompletion: `appQueryKeys.users.detail(id)`.

### Step 3: Utility Types

```ts
// src/lib/query/types.ts
export type QueryOpts = {
  enabled?: boolean
}

export type MutationOpts = {
  onSuccess?: () => void
  onError?: (error: unknown) => void
}
```

### Step 4: Raw Fetch Functions

```ts
// src/services/users/api.ts
// Raw HTTP calls. No parsing, no error handling.
// Errors propagate to TanStack Query's error handling.

const API_BASE = '/api'

export const fetchUsers = async () => {
  const res = await fetch(`${API_BASE}/users`)
  if (!res.ok) throw new Error(`GET /api/users failed: ${res.status}`)
  return res.json()
}

export const fetchUserById = async (id: string) => {
  const res = await fetch(`${API_BASE}/users/${id}`)
  if (!res.ok) throw new Error(`GET /api/users/${id} failed: ${res.status}`)
  return res.json()
}
```

### Step 5: Zod Schemas and Inferred Types

```ts
// src/services/users/validation.ts
import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
})

export const UsersResponseSchema = z.object({
  data: z.array(UserSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})

// Types ALWAYS inferred from schemas — never hand-written
export type User = z.infer<typeof UserSchema>
export type UsersResponse = z.infer<typeof UsersResponseSchema>
```

### Step 6: Query Hooks

```ts
// src/services/users/queries.ts
import { useQuery } from '@tanstack/react-query'

import { appQueryKeys } from '@/lib/query'
import { UsersResponseSchema, UserSchema } from './validation'
import { fetchUsers, fetchUserById } from './api'
import type { UseUsersOpts, UseUserOpts } from './types'

export const useUsers = (opts: UseUsersOpts = {}) => {
  const { enabled = true } = opts

  return useQuery({
    ...appQueryKeys.users.all,
    queryFn: async () => {
      const json = await fetchUsers()
      return UsersResponseSchema.parse(json)   // Zod validates at boundary
    },
    enabled,
  })
}

export const useUser = (opts: UseUserOpts) => {
  const { userId, enabled = true } = opts

  return useQuery({
    ...appQueryKeys.users.detail(userId),
    queryFn: async () => {
      const json = await fetchUserById(userId)
      return UserSchema.parse(json.data)       // Unwrap envelope + validate
    },
    enabled: enabled && !!userId,              // Don't fetch if no ID
  })
}
```

### Step 7: Mutation Hooks

```ts
// src/services/users/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { appQueryKeys } from '@/lib/query'
import { createUser } from '@/app/users/_actions/createUser'  // Server Action
import type { CreateUserInput } from './validation'

export const useCreateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const result = await createUser(input)     // Server Action returns Result<T>
      if (!result.ok) throw result.error         // Convert Result error to throw for TQ
      return result.value
    },
    onSuccess: () => {
      // Invalidate the users list so it refetches
      queryClient.invalidateQueries({ queryKey: appQueryKeys.users.all.queryKey })
    },
    // onMutate + onError for optimistic updates (when needed):
    // onMutate: async (input) => {
    //   await queryClient.cancelQueries({ queryKey: appQueryKeys.users.all.queryKey })
    //   const previous = queryClient.getQueryData(appQueryKeys.users.all.queryKey)
    //   queryClient.setQueryData(appQueryKeys.users.all.queryKey, (old) => ({ ...old, data: [...old.data, optimistic] }))
    //   return { previous }
    // },
    // onError: (_err, _input, context) => {
    //   queryClient.setQueryData(appQueryKeys.users.all.queryKey, context?.previous)
    // },
  })
}
```

### Step 8: Hook Option Types

```ts
// src/services/users/types.ts
import type { QueryOpts } from '@/lib/query'

export type UseUsersOpts = QueryOpts

export type UseUserOpts = QueryOpts & {
  userId: string
}
```

### Step 9: Barrel Export

```ts
// src/services/users/index.ts
export { useUsers, useUser } from './queries'
export { useCreateUser } from './mutations'
export { userKeys } from './queryKeys'
export type { User, UsersResponse } from './validation'
```

### Step 10: Provider

```tsx
// src/providers/QueryProvider.tsx
'use client'

import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { queryClient } from '@/lib/query'

export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  // Create client inside component to avoid sharing across requests in SSR
  const [client] = useState(() => queryClient)

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
```

```tsx
// src/app/layout.tsx — add provider
import { QueryProvider } from '@/providers/QueryProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"en">
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
```

---

## Advanced Patterns

### Facade Hook (Choosing Between Services at Runtime)

When a component needs to work with different domains based on runtime data:

```ts
// src/hooks/useProject.ts
'use client'

import { useFurnitureProject } from '@/services/furniture'
import { useDesignProject } from '@/services/design'

type UseProjectOpts = {
  projectId: string
  type: 'furniture' | 'design'
  enabled?: boolean
}

export const useProject = ({ projectId, type, enabled = true }: UseProjectOpts) => {
  const canRun = !!projectId && enabled

  // Both hooks are always called (Rules of Hooks).
  // The `enabled` flag gates the actual network request.
  const furniture = useFurnitureProject({
    furnitureProjectId: projectId,
    enabled: canRun && type === 'furniture',
  })

  const design = useDesignProject({
    designProjectId: projectId,
    enabled: canRun && type === 'design',
  })

  const active = type === 'design' ? design : furniture

  return {
    project: active.data,
    isLoading: active.isLoading,
    error: active.error,
    refetch: active.refetch,
  }
}
```

### Consuming Hooks in Components

```tsx
// ✅ Pattern A — Direct hook in page component
'use client'

import { useUsers } from '@/services/users'

export const UserDashboard = () => {
  const { data, isLoading, error } = useUsers()

  if (error) return <ErrorState error={error} />
  if (!data) return <UsersSkeleton />     // Gate on data, not isLoading

  return <UserList users={data.data} />   // Child knows nothing about TanStack Query
}
```

```tsx
// ✅ Pattern B — Mutation with form
'use client'

import { useCreateUser } from '@/services/users'

export const CreateUserForm = () => {
  const { mutate, isPending } = useCreateUser()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  )
}
```

---

## Adding a New Service — Checklist

1. **Create folder**: `src/services/<domain>/`
2. **Write Zod schema**: `validation.ts` — domain-specific, or add to `services/shared/validation.ts` if shared
3. **Infer types**: In same `validation.ts` — `export type X = z.infer<typeof XSchema>`
4. **Write fetch functions**: `api.ts` — raw `fetch()` calls, no parsing, no error handling
5. **Write query keys**: `queryKeys.ts` — `createQueryKeys('<domain>', { all, detail, ... })`
6. **Register keys**: Add to `src/lib/query/appQueryKeys.ts` via `mergeQueryKeys`
7. **Write query hooks**: `queries.ts` — spread key, call fetch fn, Zod parse in `queryFn`
8. **Write mutation hooks**: `mutations.ts` — wrap Server Actions, invalidate queries on success
9. **Write hook types**: `types.ts` — extend `QueryOpts`
10. **Create barrel**: `index.ts` — export hooks, keys, and types only
11. **If Route Handler needed**: Create `src/app/api/<domain>/route.ts` with `ApiResponse<T>` envelope

---

## Rationale

### Why Server-First

Server Components handle most data fetching — zero client JS for reads. Data is fetched at request time on the server, secrets stay server-side, and Next.js cache/revalidation handles freshness. Client-side fetching is only needed when the UI requires interactivity that can't be expressed as a Server Component.

### Why Native `fetch` Over Axios

Next.js extends `fetch` with caching semantics (`cache`, `revalidate`, `tags`). Axios bypasses this entirely — requests made with Axios are never deduplicated, never cached by Next.js, and never invalidated by `revalidateTag()`. Using Axios in a Next.js project throws away the framework's most powerful feature.

### Why TanStack Query Over SWR

SWR's only advantage is bundle size (~4kB vs ~40kB). For every other concern — query key management, optimistic mutations, structural sharing, devtools, infinite scroll, dependent queries — TanStack Query is superior. Starting with SWR creates a migration burden when the project inevitably outgrows it. The architect's choice is to start with the right tool.

### Why `Result<T>` Over Throwing

Server Actions cross the server/client boundary. If a Server Action `throw`s, Next.js serializes the error, which may leak server details and provides no structured error data. `Result<T>` gives the client a typed, structured error it can handle gracefully.

### Why Zod Parse in `queryFn`

Zod validation at the fetch boundary (inside `queryFn`) catches API contract violations before they propagate into the component tree. If the server returns unexpected data, the error is caught by TanStack Query's error handling — not by a runtime crash in a `map()` call three components deep.

### Why Query Key Factory

Raw string arrays (`['users', id]`) are impossible to type-check, easy to typo, and hard to refactor. `@lukemorales/query-key-factory` provides typed, centralized, auto-completable keys. When you rename a domain, you change one file — not every hook and invalidation call.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| Server Components + native fetch | Server-first, framework-native | ✅ Chosen: zero client JS, native caching |
| TanStack Query v5 (opt-in) | Client-side cache with full feature set | ✅ Chosen: superior DX, query keys, optimistic, devtools |
| SWR (opt-in) | Lightweight client cache | ❌ Rejected: only advantage is bundle size; migration burden when outgrown |
| Axios | HTTP client | ❌ Bypasses Next.js fetch caching entirely |
| tRPC | End-to-end typesafe API | ❌ Over-engineering for most cases; Server Actions fill the gap |
| GraphQL | Query language | ❌ Adds schema layer; REST + Zod is simpler for this use case |

---

## Consequences

**Positive:**
- Server Components handle most data fetching — zero client JS for reads.
- Native `fetch` integrates with Next.js caching, deduplication, and revalidation.
- TanStack Query provides industrial-strength client caching with typed keys and devtools.
- Query key factory eliminates key typos and enables bulk invalidation.
- `Result<T>` gives Server Actions a structured, type-safe error channel.
- Zod parse at the boundary catches contract violations before they reach components.
- Service folder structure is repeatable — any agent can follow the checklist.
- All responses follow the contract envelope — consistent API surface.

**Negative:**
- TanStack Query adds ~40kB to the client bundle when adopted — mitigated by being opt-in (only paid when client-side fetching is actually needed).
- Developers accustomed to Axios must learn `fetch` + `revalidateTag` — mitigated by code templates.
- Explicit `cache` on every `fetch` is verbose — mitigated by service wrapper functions.
- Query key factory adds a dependency — mitigated by being only ~2kB and essential for key management at scale.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (server-first philosophy)
- [ADR-0004](./0004-components.md) — Components (Server vs Client, Suspense boundaries)
- [ADR-0006](./0006-environment.md) — Environment (API URLs in validated env)
- [ADR-0007](./0007-error-handling.md) — Error handling (ApiError envelope, Result type)
- [ADR-0012](./0012-forms.md) — Forms (Server Actions for form submissions, Result<T> contract)
- [ADR-0020](./0020-state-management.md) — State Management (Zustand for UI state; server state stays in TanStack Query)


