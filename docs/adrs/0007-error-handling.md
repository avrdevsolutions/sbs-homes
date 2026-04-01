# ADR-0007: Error Handling

**Status**: Accepted
**Date**: 2026-02-27
**Supersedes**: Previous ADR-0007 (2026-02-26)

---

## Context

Proper error handling ensures good UX (friendly messages), debuggability (meaningful logs), security (no leaked internals), and reliability (graceful degradation). The error system must span multiple contexts: Route Handlers (HTTP responses), Server Actions (serialized results), Server Components (error boundaries), and Client Components (user-facing states). Error codes must be both a type (for TypeScript) and a runtime value (for mapping to HTTP status, logging, and runtime validation).

## Decision

**Layered error handling with `const` object error codes (value + type), a centralized code → HTTP status map, a single `AppError` class, Next.js error boundaries, and `Result<T>` for Server Actions.**

---

## Error Codes: `const` Object Pattern

Error codes use the `const` object pattern — not string union types, not native `enum`. This gives us both a runtime value and a TypeScript type from a single definition.

### Why `const` Object Over String Union

| Factor | String Union (`type`) | `const` Object | Native `enum` |
|--------|----------------------|----------------|---------------|
| Runtime value | ❌ Erased at compile time | ✅ Real JS object | ✅ Real JS object |
| Refactoring | ❌ Find-replace strings | ✅ Rename symbol → all refs update | ✅ Rename symbol → all refs update |
| Runtime lookups | ❌ Can't iterate or validate | ✅ `Object.values()`, `Object.keys()` | ✅ But reverse-mapping quirks |
| HTTP status map | ❌ Separate unlinked map | ✅ Same source, typed `Record` | ❌ Can only hold strings |
| Tree-shaking | ✅ Zero cost | ✅ Tree-shakeable | ⚠️ Emits IIFE, not shakeable |
| Industry consensus | Common for simple cases | **Recommended** by TS core team | **Discouraged** — legacy feature |

### Definition (in `contracts/common.ts`)

```typescript
// contracts/common.ts

/**
 * Machine-readable error codes.
 * The const object provides both a runtime value and a TypeScript type.
 *
 * Usage as VALUE:  ErrorCode.NOT_FOUND        → 'NOT_FOUND'
 * Usage as TYPE:   code: ErrorCode            → 'NOT_FOUND' | 'UNAUTHORIZED' | ...
 * Runtime check:   Object.values(ErrorCode)   → ['VALIDATION_ERROR', 'NOT_FOUND', ...]
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',       // 400 — Zod parse failed
  BAD_REQUEST: 'BAD_REQUEST',                 // 400 — Malformed request (not validation)
  UNAUTHORIZED: 'UNAUTHORIZED',               // 401 — No valid session/token
  FORBIDDEN: 'FORBIDDEN',                     // 403 — Authenticated but insufficient permissions
  NOT_FOUND: 'NOT_FOUND',                     // 404 — Resource does not exist
  CONFLICT: 'CONFLICT',                       // 409 — Duplicate resource (e.g., email taken)
  RATE_LIMITED: 'RATE_LIMITED',               // 429 — Too many requests
  INTERNAL_ERROR: 'INTERNAL_ERROR',           // 500 — Unexpected server error
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE', // 503 — Downstream service unreachable
} as const

/** Type derived from the const object — use this in type positions. */
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]
```

### Centralized HTTP Status Map (in `contracts/common.ts`)

```typescript
/**
 * Maps each ErrorCode to its HTTP status code.
 * Single source of truth — used by AppError class and handleApiError().
 */
export const ErrorHttpStatus: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
}
```

### Usage

```typescript
// ✅ Using error codes as values — refactorable, autocomplete
import { ErrorCode, ErrorHttpStatus } from '@contracts/common'

// In a Route Handler
return NextResponse.json(
  { code: ErrorCode.NOT_FOUND, message: 'User not found' } satisfies ApiError,
  { status: ErrorHttpStatus[ErrorCode.NOT_FOUND] },  // 404
)

// In a Server Action
return { ok: false, error: { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid input' } }

// Runtime validation — checking if an unknown string is a valid error code
const isValidCode = Object.values(ErrorCode).includes(unknownCode as ErrorCode)

// ❌ Old pattern — raw strings, no refactoring safety
return { code: 'NOT_FOUND', message: '...' }  // typo 'NOT_FOUDN' won't be caught
```

---

## Error Boundary Hierarchy

Next.js provides cascading error boundaries:

```
global-error.tsx     → Root layout errors (MUST render <html> and <body>)
    └── layout.tsx
        └── error.tsx    → Route segment errors ('use client' required)
            └── page.tsx
                └── <Suspense> + Component-level <ErrorBoundary>
```

### `error.tsx` (Route-level)

```tsx
// src/app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-gray-600">
        {process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
      >
        Try again
      </button>
    </div>
  )
}
```

### `global-error.tsx` (Root-level)

```tsx
// src/app/global-error.tsx
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="lang-depends-on-project"en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <button onClick={reset} className="rounded-md bg-primary-600 px-4 py-2 text-white">
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
```

### `not-found.tsx`

```tsx
// src/app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">Not Found</h2>
      <p className="text-gray-600">The page you're looking for doesn't exist.</p>
      <Link href="/" className="text-primary-600 hover:text-primary-700 underline">
        Go home
      </Link>
    </div>
  )
}
```

---

## Custom Error Class: Single `AppError`

Instead of a class hierarchy (5+ subclasses), use a single `AppError` class that looks up the HTTP status from `ErrorHttpStatus`:

```typescript
// src/lib/errors.ts
import { ErrorCode, ErrorHttpStatus } from '@contracts/common'
import type { ApiError } from '@contracts/common'

/**
 * Single application error class.
 * Uses ErrorCode to derive HTTP status automatically.
 *
 * @example
 * throw new AppError(ErrorCode.NOT_FOUND, 'User not found')
 * throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid email', { field: 'email' })
 */
export class AppError extends Error {
  public readonly statusCode: number

  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = ErrorHttpStatus[code]
    Error.captureStackTrace?.(this, this.constructor)
  }

  /** Convert to the ApiError response shape. */
  toJSON(): ApiError {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    }
  }
}

// ---- Convenience factory functions (optional, for readability) ----

export const notFound = (resource: string, id?: string) =>
  new AppError(
    ErrorCode.NOT_FOUND,
    id ? `${resource} with id '${id}' not found` : `${resource} not found`,
  )

export const unauthorized = (message = 'Authentication required') =>
  new AppError(ErrorCode.UNAUTHORIZED, message)

export const forbidden = (message = 'Insufficient permissions') =>
  new AppError(ErrorCode.FORBIDDEN, message)

export const validationError = (message: string, details?: Record<string, unknown>) =>
  new AppError(ErrorCode.VALIDATION_ERROR, message, details)

export const conflict = (message: string) =>
  new AppError(ErrorCode.CONFLICT, message)

export const rateLimited = (message = 'Too many requests') =>
  new AppError(ErrorCode.RATE_LIMITED, message)

export const serviceUnavailable = (service: string) =>
  new AppError(ErrorCode.SERVICE_UNAVAILABLE, `${service} is currently unavailable`)

// ---- Type guards ----

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError

export const hasErrorCode = (error: unknown, code: ErrorCode): boolean =>
  isAppError(error) && error.code === code
```

### Why Single Class Over Class Hierarchy

| Factor | 5+ Subclasses (old) | Single `AppError` + factories (new) |
|--------|---------------------|-------------------------------------|
| HTTP status mapping | Hardcoded in each subclass constructor | Centralized in `ErrorHttpStatus` — one source of truth |
| Adding a new error code | Create new class file, extend AppError | Add to `ErrorCode` const + `ErrorHttpStatus` map + optional factory |
| `instanceof` checks | `instanceof NotFoundError` (specific) | `error.code === ErrorCode.NOT_FOUND` (simpler) |
| Import surface | Import 5+ classes | Import 1 class + factory functions |
| Bundle size | 5 class definitions | 1 class + const objects |

---

## Rules

### Error Codes

| Rule | Level |
|------|-------|
| Use `ErrorCode.X` value (not string literal) everywhere | **MUST** |
| Map to HTTP status via `ErrorHttpStatus` — don't hardcode | **MUST** |
| Add new error codes to `ErrorCode` const AND `ErrorHttpStatus` map | **MUST** |
| Don't use native `enum` for error codes | **MUST NOT** |

### Route Handlers

| Rule | Level |
|------|-------|
| Wrap in try/catch, return correct HTTP status | **MUST** |
| Return `ApiError` shape for all errors | **MUST** |
| Use `handleApiError()` helper for consistency | **SHOULD** |
| Don't leak internal details (stack traces, DB queries) | **MUST NOT** |
| Log errors with context (userId, requestId) | **SHOULD** |

### Server Actions

| Rule | Level |
|------|-------|
| Return `Result<T>` — never throw | **MUST** |
| Use `ErrorCode.X` in error results | **MUST** |
| Log errors server-side before returning | **SHOULD** |

### Server Components

| Rule | Level |
|------|-------|
| Use `notFound()` from `next/navigation` for missing resources | **SHOULD** |
| Use `Promise.allSettled` for partial failures (multiple fetches) | **SHOULD** |
| Let errors bubble to `error.tsx` for full-page failures | **SHOULD** |

### Client Components

| Rule | Level |
|------|-------|
| Show user-facing error state for every data path | **MUST** |
| Never silently swallow errors | **MUST NOT** |
| Check `result.ok` on every Server Action response | **MUST** |
| Show error UI when TanStack Query `error` is truthy | **MUST** |

---

## Patterns

### Route Handler Error Handling

```typescript
// src/lib/api-utils.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AppError, isAppError } from '@/lib/errors'
import { ErrorCode, ErrorHttpStatus } from '@contracts/common'
import type { ApiError } from '@contracts/common'

/**
 * Centralized error handler for Route Handlers.
 * Converts any error into a typed ApiError response.
 */
export const handleApiError = (error: unknown): NextResponse => {
  console.error('[API Error]', error)

  // Known application error
  if (isAppError(error)) {
    return NextResponse.json(error.toJSON() satisfies ApiError, { status: error.statusCode })
  }

  // Zod validation error
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid input',
        details: error.errors.map((e) => ({ path: e.path, message: e.message })),
      } satisfies ApiError,
      { status: ErrorHttpStatus[ErrorCode.VALIDATION_ERROR] },
    )
  }

  // Unknown error — don't leak details
  return NextResponse.json(
    { code: ErrorCode.INTERNAL_ERROR, message: 'An unexpected error occurred' } satisfies ApiError,
    { status: ErrorHttpStatus[ErrorCode.INTERNAL_ERROR] },
  )
}
```

```typescript
// src/app/api/users/route.ts — usage
import { handleApiError } from '@/lib/api-utils'
import { notFound } from '@/lib/errors'

export const GET = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const user = await db.user.findUnique({ where: { id } })

    if (!user) throw notFound('User', id)   // ← factory function

    return NextResponse.json({ data: user } satisfies ApiResponse<typeof user>)
  } catch (error) {
    return handleApiError(error)
  }
}
```

### Server Action Pattern

```typescript
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { ErrorCode } from '@contracts/common'
import type { ServerActionResult } from '@contracts/common'

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

type CreateUserInput = z.infer<typeof CreateUserSchema>

export const createUser = async (input: unknown): ServerActionResult<{ id: string }> => {
  const parsed = CreateUserSchema.safeParse(input)

  if (!parsed.success) {
    return {
      ok: false,
      error: { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid input' },
    }
  }

  try {
    const user = await db.user.create({ data: parsed.data })
    revalidatePath('/users')
    return { ok: true, value: { id: user.id } }
  } catch (error) {
    console.error('[createUser]', error)
    return {
      ok: false,
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'Failed to create user' },
    }
  }
}
```

### Consuming Server Action Results in Client Components

```tsx
'use client'

import { useTransition } from 'react'
import { createUser } from '@/app/users/_actions/createUser'

export const CreateUserForm = () => {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await createUser(Object.fromEntries(formData))

      if (!result.ok) {
        setError(result.error.message)  // Show error to user
        return
      }

      // Success — redirect or update UI
      router.push(`/users/${result.value.id}`)
    })
  }

  return (
    <form action={handleSubmit}>
      {error && <p className="text-error-500" role="alert">{error}</p>}
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
```

### TanStack Query Error Handling

```tsx
'use client'

import { useUsers } from '@/services/users'

export const UserList = () => {
  const { data, error, isLoading } = useUsers()

  // ✅ MUST show error state when error is truthy
  if (error) {
    return (
      <div className="rounded-md border border-error-200 bg-error-50 p-4" role="alert">
        <p className="text-error-700">Failed to load users. Please try again.</p>
      </div>
    )
  }

  if (!data) return <UsersSkeleton />

  return <ul>{data.data.map((user) => <li key={user.id}>{user.name}</li>)}</ul>
}
```

---

## Logging

| Level | When | Example |
|-------|------|---------|
| `console.error` | Unexpected errors, exceptions, failed operations | `console.error('[createUser]', error)` |
| `console.warn` | Handled errors, deprecations, fallback paths | `console.warn('[auth] Session expired, redirecting')` |
| `console.info` | Significant events in production | `console.info('[webhook] Processed payment', { id })` |

| Rule | Level |
|------|-------|
| Use `console.error` for all caught exceptions | **MUST** |
| Include context tag: `[ModuleName]` | **SHOULD** |
| Don't use `console.log` — ESLint warns on it | **MUST NOT** |
| Don't log secrets or PII | **MUST NOT** |

---

## Rationale

### Why `const` Object Over String Union

String union types (`type ErrorCode = 'NOT_FOUND' | ...`) are erased at compile time — they can't be iterated, validated at runtime, or mapped to HTTP statuses. The `const` object pattern provides both a TypeScript type and a runtime value from a single definition. Native `enum` was rejected because TypeScript enums emit IIFEs that don't tree-shake, have confusing reverse-mapping behavior, and are considered a legacy feature by the TypeScript team and community.

### Why Single `AppError` Over Class Hierarchy

Five subclasses (`NotFoundError`, `UnauthorizedError`, etc.) each do the same thing: set a code and status. A single `AppError` class with the code → status lookup centralized in `ErrorHttpStatus` eliminates redundancy. Factory functions (`notFound()`, `unauthorized()`) provide the same ergonomics without the class sprawl. Adding a new error code requires updating the `const` object and the map — not creating a new class file.

### Why `Result<T>` for Server Actions

Server Actions cross the server/client boundary via serialization. If a Server Action `throw`s, Next.js serializes the error, potentially leaking server details and providing no structured data for the client. `Result<T>` is a discriminated union that serializes cleanly, carries a typed `ErrorCode`, and forces the caller to handle both success and failure paths.

### Key Factors
1. **Refactoring safety** — `ErrorCode.NOT_FOUND` is a symbol; renaming it updates all references. String `'NOT_FOUND'` requires find-and-replace.
2. **Single source of truth** — HTTP status lives in one map, not scattered across 5 class constructors.
3. **Runtime validation** — `Object.values(ErrorCode)` lets you check if an unknown string is a valid code.
4. **Type safety** — `ErrorCode` works as both a value and a type. TypeScript enforces exhaustive handling in switch statements.
5. **Security** — `handleApiError()` strips internal details from unknown errors; only `AppError` messages reach the client.
6. **Consistency** — Every error path (Route Handler, Server Action, TanStack Query) uses the same `ErrorCode` values and `ApiError` shape.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| `const` object + derived type | Runtime value + TS type from one definition | ✅ Chosen: refactorable, iterable, maps to HTTP status, tree-shakeable |
| String union type | Compile-time only | ❌ No runtime value, no iteration, no mapping, not refactorable |
| Native `enum` | TS enum keyword | ❌ Emits IIFE (no tree-shake), reverse-mapping quirks, legacy feature |
| Single `AppError` + factories | One class, factory functions for convenience | ✅ Chosen: centralized status map, less code, same ergonomics |
| Class hierarchy (5+ subclasses) | Separate class per error code | ❌ Redundant — each subclass only sets code + status; adds import surface |
| Third-party (`neverthrow`, `fp-ts`) | Functional error libraries | ❌ Adds dependency; `Result<T>` is simple enough for our needs |

---

## Consequences

**Positive:**
- `ErrorCode` is both a value and a type — one definition, used everywhere.
- HTTP status mapping is centralized — change it once, it applies to all error responses.
- Single `AppError` class eliminates 5+ subclass files without losing functionality.
- Factory functions (`notFound()`, `unauthorized()`) provide clean ergonomics.
- `handleApiError()` ensures consistent error responses across all Route Handlers.
- `Result<T>` prevents Server Actions from throwing across the serialization boundary.
- `error.tsx` and `global-error.tsx` catch unhandled errors at route boundaries.
- Runtime validation of error codes via `Object.values(ErrorCode)`.

**Negative:**
- `const` object pattern is less familiar to developers used to `enum` — mitigated by code examples and the fact that the community has largely moved away from `enum`.
- Factory functions are one more thing to import — mitigated by being optional (you can `new AppError(ErrorCode.NOT_FOUND, msg)` directly).
- `Result<T>` adds boilerplate vs bare `throw` — mitigated by code templates and the safety guarantee.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (TypeScript strict mode)
- [ADR-0005](./0005-data-fetching.md) — Data fetching (ApiError/Result types, response contracts)
- [ADR-0008](./0008-middleware.md) — Middleware (error handling in Edge Runtime)
- [ADR-0014](./0014-logging-observability.md) — Logging (structured logger replaces raw console, Sentry for error tracking)


