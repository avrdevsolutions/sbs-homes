# ADR-0009: Testing Strategy & Test-Driven Development

**Status**: Accepted
**Date**: 2026-02-27
**Supersedes**: Previous ADR-0009 (2026-02-26)

---

## Context

Testing is a first-class concern — not an afterthought. Every feature should be built test-first using TDD (red-green-refactor). The testing strategy must cover the full Next.js App Router stack: pure utilities, Zod schemas, Server Components, Client Components, Route Handlers, Server Actions, TanStack Query hooks, and full user flows. Each of these has unique testing challenges in Next.js 15 (async `cookies()`, async `params`, server-only imports, client/server boundary).

## Decision

**Test-Driven Development as the default workflow. Vitest + React Testing Library for unit/component/integration tests. Playwright for E2E tests. MSW v2 for API mocking. All tools installed when the first test is written — not before.**

---

## Test-Driven Development (TDD)

### The Workflow: Red → Green → Refactor

TDD is not "write tests after coding." It is a design discipline:

```
1. RED    — Write a failing test that describes the desired behavior
2. GREEN  — Write the minimum code to make the test pass
3. REFACTOR — Improve the code without changing behavior (tests still pass)
4. REPEAT
```

### Why TDD

| Benefit | How |
|---------|-----|
| **Drives design** | Writing the test first forces you to think about the API before implementation |
| **Prevents over-engineering** | You only write code that makes a test pass — no speculative features |
| **Documents behavior** | Tests are living documentation — they describe what the code does, not how |
| **Catches regressions** | Every change is validated against the full test suite |
| **Faster debugging** | When a test fails, you know exactly which behavior broke and when |

### TDD in Practice

```typescript
// 1. RED — Write the failing test first
// src/lib/formatCurrency.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency } from './formatCurrency'

describe('formatCurrency', () => {
  it('formats USD with 2 decimal places', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50')
  })

  it('formats EUR with comma decimal separator', () => {
    expect(formatCurrency(1234.5, 'EUR')).toBe('€1,234.50')
  })

  it('returns $0.00 for zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00')
  })

  it('handles negative values', () => {
    expect(formatCurrency(-50, 'USD')).toBe('-$50.00')
  })
})

// 2. GREEN — Write the minimum implementation
// src/lib/formatCurrency.ts
export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

// 3. REFACTOR — improve (add memoization, handle edge cases, etc.)
// Tests still pass after refactoring — that's the safety net.
```

### When to Apply TDD

| Scenario | TDD? | Why |
|----------|------|-----|
| Utility functions (`lib/`, `utils/`) | **Always** | Pure functions are ideal for TDD — clear inputs/outputs |
| Zod schemas (`contracts/`, `validation.ts`) | **Always** | Schemas define contracts — test the edge cases first |
| Server Actions | **Always** | Critical business logic — test every success/error path |
| Route Handlers | **Always** | Public API surface — test request/response contracts |
| Custom hooks | **Usually** | Test the hook's return values and state changes |
| UI components | **Sometimes** | TDD works well for complex conditional rendering; less useful for pure layout |
| E2E flows | **No** | E2E tests verify integration — write them after implementation |

---

## Tools

| Tool | Purpose | When to Install |
|------|---------|----------------|
| **Vitest** | Unit, component, integration tests | When first test is written |
| **React Testing Library** | Component testing (user-centric) | With Vitest |
| **@testing-library/user-event** | Simulate real user interactions | With RTL |
| **@testing-library/jest-dom** | Custom DOM matchers (`.toBeVisible()`, `.toHaveTextContent()`) | With RTL |
| **Playwright** | E2E browser tests | When first E2E test is written |
| **MSW v2** | API/network mocking | When testing components that fetch data |
| **happy-dom** | Fast DOM implementation for Vitest | With Vitest (default environment) |

---

## Installation

### Phase 1: Unit & Component Tests

```bash
pnpm add -D vitest @vitejs/plugin-react happy-dom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  msw
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### Phase 2: E2E Tests

```bash
pnpm add -D @playwright/test
npx playwright install
```

Add scripts:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Configuration

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,                    // describe, it, expect without imports
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'contracts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}', 'contracts/**/*.ts'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.tsx',
        'src/app/**/layout.tsx',
        'src/app/**/loading.tsx',
        'src/app/**/not-found.tsx',
        'src/**/*.d.ts',
      ],
      thresholds: {
        'contracts/': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/lib/': { statements: 80, branches: 80, functions: 80, lines: 80 },
        'src/components/ui/': { statements: 70, branches: 70, functions: 70, lines: 70 },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@contracts': path.resolve(__dirname, './contracts'),
    },
  },
})
```

### Vitest Setup File

```typescript
// tests/setup/vitest.setup.ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Clean up DOM after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js modules that don't exist in test environment
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    getAll: vi.fn(() => []),
  })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))
```

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,           // Fail if .only() in CI
  retries: process.env.CI ? 2 : 0,        // Retry on CI only
  workers: process.env.CI ? 1 : undefined, // Parallel locally, serial in CI
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',              // Capture trace on failure
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## File Structure

```
src/
  lib/
    utils.ts
    utils.test.ts                   # Co-located unit test
    errors.ts
    errors.test.ts
    env.ts
    env.test.ts
  components/
    ui/button/
      Button.tsx
      Button.test.tsx               # Co-located component test
      Button.stories.tsx            # Storybook (when opted in — ADR-0002)
    features/user-profile/
      UserProfile.tsx
      UserProfile.test.tsx
  app/
    api/users/
      route.ts
      route.test.ts                 # Route Handler test
    users/
      _actions/
        createUser.ts
        createUser.test.ts          # Server Action test
contracts/
  common.ts
  common.test.ts                    # Contract/schema tests
tests/
  setup/
    vitest.setup.ts                 # Global test setup
    test-utils.tsx                  # Custom render, providers, helpers
    msw/
      handlers.ts                   # Default MSW request handlers
      server.ts                     # MSW server instance
  e2e/
    auth.spec.ts                    # E2E: authentication flow
    navigation.spec.ts              # E2E: page navigation
    forms.spec.ts                   # E2E: form submissions
  fixtures/
    users.ts                        # Shared test data factories
vitest.config.ts
playwright.config.ts
```

---

## Rules

### General

| Rule | Level |
|------|-------|
| Use TDD (red-green-refactor) for utilities, schemas, actions, handlers | **MUST** |
| Co-locate tests next to source files (`Foo.test.ts` next to `Foo.ts`) | **MUST** |
| Test behavior, not implementation — no testing internal state or private functions | **MUST** |
| One assertion concept per `it` block (multiple `expect` ok if testing one concept) | **SHOULD** |
| Tests must be deterministic — no reliance on time, random values, or external services | **MUST** |
| Don't test third-party code (Zod's parsing, React's useState) | **MUST NOT** |
| Don't use `@ts-ignore` or `any` in tests — tests should be typed | **MUST NOT** |
| Don't test implementation details (internal state, private methods) | **MUST NOT** |

### Naming

| Convention | Example |
|-----------|---------|
| Test file | `formatCurrency.test.ts` (same name + `.test`) |
| E2E file | `auth.spec.ts` (`.spec` for E2E) |
| `describe` block | Name of the unit: `describe('formatCurrency', ...)` |
| `it` block | Behavior in plain English: `it('formats USD with 2 decimal places', ...)` |
| Nested `describe` | For grouped scenarios: `describe('when amount is negative', ...)` |

```typescript
// ✅ Good naming
describe('createUser', () => {
  describe('with valid input', () => {
    it('returns ok with the new user id', async () => { ... })
    it('calls revalidatePath for /users', async () => { ... })
  })

  describe('with invalid input', () => {
    it('returns VALIDATION_ERROR when email is missing', async () => { ... })
    it('returns VALIDATION_ERROR when name is empty', async () => { ... })
  })

  describe('when database fails', () => {
    it('returns INTERNAL_ERROR', async () => { ... })
    it('logs the error with context', async () => { ... })
  })
})

// ❌ Bad naming
describe('tests', () => {
  it('works', () => { ... })
  it('test 2', () => { ... })
})
```

---

## Test Helpers

### Custom Render (with Providers)

```tsx
// tests/setup/test-utils.tsx
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'

// Create a fresh QueryClient for each test (no shared state between tests)
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,         // Don't retry in tests — fail fast
        gcTime: Infinity,     // Don't garbage collect during test
      },
      mutations: { retry: false },
    },
  })

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  queryClient?: QueryClient
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {},
) => {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}

// Re-export everything from RTL so tests import from one place
export * from '@testing-library/react'
export { renderWithProviders as render }
```

### Test Data Factories

```typescript
// tests/fixtures/users.ts
import type { User } from '@/services/users/validation'

let idCounter = 0

export const createUser = (overrides: Partial<User> = {}): User => ({
  id: `user-${++idCounter}`,
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: new Date().toISOString(),
  ...overrides,
})

export const createUsers = (count: number, overrides: Partial<User> = {}): User[] =>
  Array.from({ length: count }, (_, i) =>
    createUser({ name: `User ${i + 1}`, email: `user${i + 1}@example.com`, ...overrides }),
  )
```

### MSW Setup

```typescript
// tests/setup/msw/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Default handlers — override per-test as needed
  http.get('/api/users', () => {
    return HttpResponse.json({
      data: [
        { id: '1', name: 'Alice', email: 'alice@example.com', createdAt: '2026-01-01T00:00:00Z' },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
  }),

  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({
      data: { id: params.id, name: 'Alice', email: 'alice@example.com', createdAt: '2026-01-01T00:00:00Z' },
    })
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { data: { id: 'new-1', ...body } },
      { status: 201 },
    )
  }),
]
```

```typescript
// tests/setup/msw/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

Add to `vitest.setup.ts`:

```typescript
// tests/setup/vitest.setup.ts — add MSW lifecycle
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

## Test Patterns by Layer

### 1. Pure Utility Tests

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('resolves Tailwind conflicts (last wins)', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', true && 'visible')).toBe('base visible')
  })

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null)).toBe('base')
  })
})
```

### 2. Zod Schema Tests

```typescript
// contracts/common.test.ts
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
// Test the schema directly, not through the type

// Import or inline the schema you're testing
const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
})

describe('UserSchema', () => {
  it('accepts valid user', () => {
    const result = UserSchema.safeParse({ id: '1', name: 'Alice', email: 'alice@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = UserSchema.safeParse({ id: '1', email: 'alice@example.com' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = UserSchema.safeParse({ id: '1', name: 'Alice', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = UserSchema.safeParse({ id: '1', name: '', email: 'alice@example.com' })
    expect(result.success).toBe(false)
  })
})
```

### 3. Custom Error Tests

```typescript
// src/lib/errors.test.ts
import { describe, it, expect } from 'vitest'
import { AppError, notFound, isAppError } from './errors'
import { ErrorCode, ErrorHttpStatus } from '@contracts/common'

describe('AppError', () => {
  it('creates error with correct code and status', () => {
    const error = new AppError(ErrorCode.NOT_FOUND, 'User not found')
    expect(error.code).toBe(ErrorCode.NOT_FOUND)
    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('User not found')
  })

  it('serializes to ApiError shape', () => {
    const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Bad input', { field: 'email' })
    expect(error.toJSON()).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Bad input',
      details: { field: 'email' },
    })
  })

  it('maps every ErrorCode to the correct HTTP status', () => {
    for (const code of Object.values(ErrorCode)) {
      const error = new AppError(code, 'test')
      expect(error.statusCode).toBe(ErrorHttpStatus[code])
    }
  })
})

describe('notFound', () => {
  it('creates NOT_FOUND error with resource name', () => {
    const error = notFound('User')
    expect(error.code).toBe(ErrorCode.NOT_FOUND)
    expect(error.message).toBe('User not found')
  })

  it('includes id in message when provided', () => {
    const error = notFound('User', '123')
    expect(error.message).toBe("User with id '123' not found")
  })
})

describe('isAppError', () => {
  it('returns true for AppError instances', () => {
    expect(isAppError(new AppError(ErrorCode.INTERNAL_ERROR, 'err'))).toBe(true)
  })

  it('returns false for plain Error', () => {
    expect(isAppError(new Error('err'))).toBe(false)
  })

  it('returns false for non-errors', () => {
    expect(isAppError('string')).toBe(false)
    expect(isAppError(null)).toBe(false)
  })
})
```

### 4. Server Action Tests

```typescript
// src/app/users/_actions/createUser.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUser } from './createUser'
import { ErrorCode } from '@contracts/common'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      create: vi.fn(),
    },
  },
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

describe('createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('with valid input', () => {
    it('returns ok with the new user id', async () => {
      vi.mocked(db.user.create).mockResolvedValue({ id: 'new-1', name: 'Alice', email: 'alice@example.com' })

      const result = await createUser({ name: 'Alice', email: 'alice@example.com' })

      expect(result).toEqual({ ok: true, value: { id: 'new-1' } })
    })

    it('calls revalidatePath for /users', async () => {
      vi.mocked(db.user.create).mockResolvedValue({ id: 'new-1', name: 'Alice', email: 'alice@example.com' })

      await createUser({ name: 'Alice', email: 'alice@example.com' })

      expect(revalidatePath).toHaveBeenCalledWith('/users')
    })
  })

  describe('with invalid input', () => {
    it('returns VALIDATION_ERROR when email is missing', async () => {
      const result = await createUser({ name: 'Alice' })

      expect(result).toEqual({
        ok: false,
        error: expect.objectContaining({ code: ErrorCode.VALIDATION_ERROR }),
      })
    })

    it('returns VALIDATION_ERROR when name is empty', async () => {
      const result = await createUser({ name: '', email: 'alice@example.com' })

      expect(result).toEqual({
        ok: false,
        error: expect.objectContaining({ code: ErrorCode.VALIDATION_ERROR }),
      })
    })

    it('does not call the database', async () => {
      await createUser({ name: '' })

      expect(db.user.create).not.toHaveBeenCalled()
    })
  })

  describe('when database fails', () => {
    it('returns INTERNAL_ERROR', async () => {
      vi.mocked(db.user.create).mockRejectedValue(new Error('Connection refused'))

      const result = await createUser({ name: 'Alice', email: 'alice@example.com' })

      expect(result).toEqual({
        ok: false,
        error: expect.objectContaining({ code: ErrorCode.INTERNAL_ERROR }),
      })
    })
  })
})
```

### 5. Route Handler Tests

```typescript
// src/app/api/users/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { ErrorCode } from '@contracts/common'

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'

describe('GET /api/users', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns users with 200', async () => {
    const users = [{ id: '1', name: 'Alice', email: 'alice@example.com' }]
    vi.mocked(db.user.findMany).mockResolvedValue(users)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toEqual(users)
  })

  it('returns 500 on database error', async () => {
    vi.mocked(db.user.findMany).mockRejectedValue(new Error('DB down'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.code).toBe(ErrorCode.INTERNAL_ERROR)
  })
})

describe('POST /api/users', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates user and returns 201', async () => {
    vi.mocked(db.user.create).mockResolvedValue({ id: 'new-1', name: 'Bob', email: 'bob@example.com' })

    const request = new Request('http://localhost/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bob', email: 'bob@example.com' }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.data.id).toBe('new-1')
  })

  it('returns VALIDATION_ERROR for invalid body', async () => {
    const request = new Request('http://localhost/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),  // Missing email, empty name
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.code).toBe(ErrorCode.VALIDATION_ERROR)
  })
})
```

### 6. Component Tests (React Testing Library)

```tsx
// src/components/ui/button/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/tests/setup/test-utils'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={onClick}>Click</Button>)
    await user.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    render(<Button disabled onClick={onClick}>Click</Button>)
    await user.click(screen.getByRole('button'))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies variant classes', () => {
    render(<Button variant="danger">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-error')
  })
})
```

### 7. Client Component with Data (TanStack Query + MSW)

```tsx
// src/components/features/user-list/UserList.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@/tests/setup/test-utils'
import { http, HttpResponse } from 'msw'
import { server } from '@/tests/setup/msw/server'
import { UserList } from './UserList'

describe('UserList', () => {
  it('shows loading skeleton initially', () => {
    render(<UserList />)
    expect(screen.getByTestId('users-skeleton')).toBeInTheDocument()
  })

  it('renders users after loading', async () => {
    render(<UserList />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
  })

  it('shows error state when API fails', async () => {
    // Override default handler for this test
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'Server error' },
          { status: 500 },
        )
      }),
    )

    render(<UserList />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no users', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json({
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        })
      }),
    )

    render(<UserList />)

    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument()
    })
  })
})
```

### 8. Custom Hook Tests

```typescript
// src/hooks/useDebounce.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500))
    expect(result.current).toBe('hello')
  })

  it('does not update value before delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'hello' } },
    )

    rerender({ value: 'world' })
    vi.advanceTimersByTime(499)

    expect(result.current).toBe('hello')
  })

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'hello' } },
    )

    rerender({ value: 'world' })
    vi.advanceTimersByTime(500)

    expect(result.current).toBe('world')
  })
})
```

### 9. E2E Tests (Playwright)

```typescript
// tests/e2e/navigation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/My App/)
  })

  test('navigates to dashboard', async ({ page }) => {
    await page.goto('/')
    await page.click('a[href="/dashboard"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('shows 404 for unknown routes', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.getByText('Not Found')).toBeVisible()
  })
})
```

```typescript
// tests/e2e/forms.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Contact Form', () => {
  test('submits successfully', async ({ page }) => {
    await page.goto('/contact')

    await page.fill('input[name="name"]', 'Alice')
    await page.fill('input[name="email"]', 'alice@example.com')
    await page.fill('textarea[name="message"]', 'Hello, this is a test message.')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/thank you/i)).toBeVisible()
  })

  test('shows validation errors', async ({ page }) => {
    await page.goto('/contact')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/required/i)).toBeVisible()
  })
})
```

---

## Coverage Thresholds

| Category | Statements | Branches | Functions | Lines |
|----------|-----------|----------|-----------|-------|
| `contracts/` | 90% | 90% | 90% | 90% |
| `src/lib/` | 80% | 80% | 80% | 80% |
| `src/components/ui/` | 70% | 70% | 70% | 70% |
| `src/components/features/` | 60% | 60% | 60% | 60% |
| `src/app/api/` | 80% | 80% | 80% | 80% |
| Global | 70% | 70% | 70% | 70% |

**Why these numbers:** Contracts and lib utilities are the foundation — they need the highest coverage because bugs here cascade. UI components have visual aspects that are better tested via Storybook/E2E. Feature components are integration-heavy — E2E tests provide more value than unit tests.

---

## CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:run --coverage
      - run: pnpm build  # Ensure it builds after tests pass

  e2e:
    runs-on: ubuntu-latest
    needs: test  # Only run E2E if unit tests pass
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: pnpm build
      - run: pnpm test:e2e
```

**Pipeline order:** Lint → Type check → Unit/Component tests → Build → E2E tests. Fast feedback first — if lint fails, don't waste time running tests.

---

## Anti-Patterns

```typescript
// ❌ Testing implementation details
it('calls setState with the correct value', () => {
  const { result } = renderHook(() => useState(0))
  // This tests React, not your code
})

// ❌ Snapshot tests (fragile, hard to review)
it('matches snapshot', () => {
  const { container } = render(<UserProfile />)
  expect(container).toMatchSnapshot()
  // One class change breaks this — reviewer can't tell what changed
})

// ❌ Testing third-party code
it('zod validates emails', () => {
  expect(z.string().email().safeParse('test@test.com').success).toBe(true)
  // This tests Zod, not your schema
})

// ❌ Non-deterministic tests
it('generates unique id', () => {
  expect(generateId()).not.toBe(generateId())
  // Race conditions, randomness — will flake
})

// ❌ Over-mocking (test has no connection to reality)
it('does something', () => {
  vi.mock('./everything')  // Everything is mocked — what are you actually testing?
})

// ✅ Test YOUR schema's rules, not Zod's validation
it('rejects empty name', () => {
  const result = UserSchema.safeParse({ id: '1', name: '', email: 'a@b.com' })
  expect(result.success).toBe(false)  // Tests YOUR business rule
})

// ✅ Test behavior users care about
it('shows error message when submission fails', async () => {
  server.use(http.post('/api/users', () => HttpResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 })))
  render(<CreateUserForm />)
  await user.click(screen.getByRole('button', { name: 'Create' }))
  expect(screen.getByRole('alert')).toHaveTextContent(/failed/i)
})
```

---

## Rationale

### Why TDD

TDD produces better-designed code because it forces you to think about the interface before the implementation. A function that's hard to test is a function that's poorly designed. TDD's red-green-refactor cycle also prevents the "write code first, never write tests" pattern that plagues most projects. When the test exists first, it always exists.

### Why Vitest Over Jest

Vitest is ESM-native — it handles Next.js App Router code (which uses ESM exclusively) without the transform configuration hell that Jest requires. It shares Vite's resolve/transform pipeline, runs tests in parallel workers, and has a Jest-compatible API so migration is trivial. Jest is not wrong — it's just heavier for this stack.

### Why React Testing Library Over Enzyme

Enzyme tests implementation details (state values, method calls, shallow rendering). RTL tests what users see and do (text content, button clicks, form submissions). Implementation details change during refactoring — user behavior doesn't. RTL tests survive refactors; Enzyme tests break on them.

### Why Playwright Over Cypress

Playwright runs on Chromium, Firefox, and WebKit (Safari engine). Cypress is Chromium-only by default (Firefox support is experimental). For a template that builds any project, cross-browser testing is non-negotiable. Playwright also runs faster in CI (native parallelism) and has better trace/video debugging tools.

### Why MSW Over Manual Mocks

MSW intercepts at the network level — your code makes real `fetch` calls, and MSW responds with mock data. This means your test exercises the full fetch → parse → display pipeline. Manual mocks (`vi.mock('./api')`) skip the fetch layer entirely, hiding real bugs. MSW v2 also works identically in browser (Storybook) and Node.js (Vitest) environments.

### Why Not Installed by Default

A starter template shouldn't force 200MB of test dependencies on every project. Testing tools are added when the first test is written. The ADR provides exact install commands, configs, and patterns so the setup takes minutes, not hours.

### Key Factors
1. **TDD is a design tool** — it produces better APIs, catches edge cases earlier, and prevents the "no tests" trap.
2. **Behavior > implementation** — RTL tests survive refactors. Enzyme/snapshot tests break on them.
3. **Fast feedback** — Vitest's HMR-powered watch mode re-runs only affected tests in milliseconds.
4. **Co-location** — tests next to source files are discoverable and maintained. A `tests/` folder becomes a graveyard.
5. **MSW = realistic mocking** — network-level interception exercises the full data pipeline.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| Vitest + RTL | ESM-native, user-centric testing | ✅ Chosen: fast, native ESM, Jest-compatible |
| Jest + RTL | Popular test runner + RTL | ❌ Requires ESM transform config, slower |
| Playwright | Cross-browser E2E | ✅ Chosen: Chromium + Firefox + WebKit, fast CI |
| Cypress | E2E testing | ❌ Chromium-only default, larger CI footprint |
| MSW v2 | Network-level API mocking | ✅ Chosen: realistic, works in Vitest + Storybook |
| Manual mocks | `vi.mock` for API calls | ❌ Skips fetch layer, hides real bugs |
| Enzyme | Component testing | ❌ Deprecated, tests implementation details |
| Snapshot tests | Serialize component output | ❌ Fragile, hard to review, low signal |

---

## Consequences

**Positive:**
- TDD produces well-designed, well-documented, regression-free code.
- Tests are not mandatory for the starter — zero overhead until adoption.
- Co-located tests are discoverable — `Foo.test.tsx` is always next to `Foo.tsx`.
- MSW handlers are reusable between Vitest and Storybook.
- Coverage thresholds per directory ensure critical code has the highest test density.
- CI pipeline catches regressions before merge — lint, types, tests, build, then E2E.
- Every test pattern in this ADR is a copy-paste template — agents can produce correct tests immediately.

**Negative:**
- TDD requires discipline — developers must write the test first. Mitigated by code review and CI enforcement.
- No tests exist by default — teams must actively decide to add them. Mitigated by clear install steps and patterns.
- Two test runners (Vitest + Playwright) require two configs — mitigated by providing both configs.
- MSW v2 has a different API than v1 — mitigated by providing exact v2 patterns (no outdated `rest.get` examples).
- Test infrastructure adds ~200MB to `node_modules` — mitigated by being dev-only dependencies.
- `happy-dom` doesn't implement every browser API — mitigated by using Playwright for tests that need real browser behavior.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (TypeScript strict mode catches many bugs at compile time)
- [ADR-0004](./0004-components.md) — Components (co-located test files, component tier testing)
- [ADR-0005](./0005-data-fetching.md) — Data fetching (MSW mocks for TanStack Query, Zod validation testing)
- [ADR-0007](./0007-error-handling.md) — Error handling (AppError/Result testing, error boundary testing)

