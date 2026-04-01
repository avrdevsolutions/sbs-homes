# ADR-0014: Logging & Observability

**Status**: Accepted (opt-in — implement when project reaches production)
**Date**: 2026-02-27
**Supersedes**: N/A

---

## Context

In development, `console.error` and browser DevTools are sufficient for debugging. In production, they are not. Console output goes to Vercel's function logs (ephemeral, unstructured, hard to search) or Docker stdout (lost without a log aggregator). When a user reports "the page broke," developers need to answer:

1. **What happened?** — the error message and stack trace
2. **Where?** — which page, which API route, which Server Action
3. **Who?** — which user, which session
4. **When?** — timestamp with request correlation
5. **What was the context?** — request ID, input data, environment

Without structured logging and error tracking, debugging production issues means reading raw text logs and guessing. Structured logging gives searchable, filterable, correlated data. Error tracking (Sentry) gives real-time alerts, stack traces, breadcrumbs, and user impact.

This ADR defines a **three-layer observability stack**: structured logging (always), error tracking (recommended), and performance monitoring (opt-in). The logging layer is a thin abstraction — it uses `console` in development and can be swapped to a service (Axiom, Datadog, Pino) in production without changing application code.

## Decision

**Structured logger abstraction in `src/lib/logger.ts`. Sentry for error tracking (recommended). Vercel Analytics or Web Vitals reporting for performance. Request ID correlation from middleware (ADR-0008) flows through all logs.**

---

## The Three Layers

| Layer | Purpose | When to Add | Tool |
|-------|---------|-------------|------|
| **Structured Logging** | Searchable, contextual log output | Always (day 1) | Custom logger → Axiom/Datadog/Pino in production |
| **Error Tracking** | Real-time error alerts, stack traces, user impact | Before production launch | Sentry |
| **Performance Monitoring** | Core Web Vitals, server response times, slow queries | When optimizing | Vercel Analytics / Sentry Performance |

---

## Rules

| Rule | Level |
|------|-------|
| Use the structured logger from `@/lib/logger` — never raw `console.*` in application code | **MUST** |
| Include `requestId` in all server-side log entries (from middleware header) | **MUST** |
| Include context object with relevant data (userId, route, input summary) — never log raw request bodies | **MUST** |
| Log all caught exceptions at `error` level with the original Error object | **MUST** |
| Log significant business events at `info` level (user created, payment processed, email sent) | **MUST** |
| Never log sensitive data (passwords, tokens, full credit card numbers, PII beyond user ID) | **MUST NOT** |
| Never log raw request/response bodies in production (may contain PII) | **MUST NOT** |
| Don't use `console.log` — ESLint warns on it (ADR-0001) | **MUST NOT** |
| Use `warn` level for handled errors, fallback paths, deprecations | **SHOULD** |
| Use `debug` level for detailed development diagnostics (stripped in production) | **SHOULD** |
| Add Sentry before any production launch | **SHOULD** |
| Report Core Web Vitals to analytics | **SHOULD** |

---

## File Structure

```
src/lib/
  logger.ts                    # Structured logger (always present)
  sentry/
    index.ts                   # Sentry init + helpers (opt-in)
    client.ts                  # Client-side Sentry config
    server.ts                  # Server-side Sentry config
src/
  instrumentation.ts           # Next.js instrumentation hook (Sentry server init)
  app/
    global-error.tsx           # Root error boundary (reports to Sentry)
    error.tsx                  # Route error boundary (reports to Sentry)
```

---

## Layer 1: Structured Logger

### The Logger

A thin abstraction over `console` that enforces structure. Every log entry is a JSON-serializable object with consistent fields.

```typescript
// src/lib/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

type LogEntry = {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

/**
 * Structured logger.
 *
 * In development: formats to readable console output.
 * In production: outputs JSON for log aggregators (Vercel, Axiom, Datadog).
 *
 * Usage:
 *   logger.info('User created', { userId: user.id, email: user.email })
 *   logger.error('Failed to create user', { input }, error)
 */
const createLogger = () => {
  const isDev = process.env.NODE_ENV === 'development'

  const formatEntry = (entry: LogEntry): string => {
    if (isDev) {
      // Human-readable format for development
      const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
      const err = entry.error ? `\n  ${entry.error.stack || entry.error.message}` : ''
      return `[${entry.level.toUpperCase()}] ${entry.message}${ctx}${err}`
    }
    // JSON format for production log aggregators
    return JSON.stringify(entry)
  }

  const log = (level: LogLevel, message: string, context?: LogContext, error?: unknown) => {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
      ...(error instanceof Error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    }

    const formatted = formatEntry(entry)

    switch (level) {
      case 'debug':
        if (isDev) console.debug(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }
  }

  return {
    /** Development diagnostics — stripped in production */
    debug: (message: string, context?: LogContext) =>
      log('debug', message, context),

    /** Significant business events — user created, payment processed, email sent */
    info: (message: string, context?: LogContext) =>
      log('info', message, context),

    /** Handled errors, fallback paths, deprecations */
    warn: (message: string, context?: LogContext, error?: unknown) =>
      log('warn', message, context, error),

    /** Unexpected errors, exceptions, failed operations */
    error: (message: string, context?: LogContext, error?: unknown) =>
      log('error', message, context, error),
  }
}

export const logger = createLogger()
```

### Usage in Application Code

```typescript
// ✅ Server Action
'use server'
import { logger } from '@/lib/logger'

export const createUser = async (input: unknown): ServerActionResult<User> => {
  const parsed = UserSchema.safeParse(input)
  if (!parsed.success) {
    logger.warn('User creation validation failed', {
      errors: parsed.error.errors.map((e) => e.path.join('.')),
    })
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: '...' } }
  }

  try {
    const user = await db.user.create({ data: parsed.data })
    logger.info('User created', { userId: user.id, email: user.email })
    return { ok: true, value: user }
  } catch (error) {
    logger.error('Failed to create user', { email: parsed.data.email }, error)
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: '...' } }
  }
}
```

```typescript
// ✅ Route Handler with request ID
import { type NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'

export const GET = async (request: NextRequest) => {
  const requestId = request.headers.get('X-Request-Id') ?? 'unknown'

  logger.info('Fetching posts', { requestId, query: Object.fromEntries(request.nextUrl.searchParams) })

  try {
    const posts = await getPublishedPosts()
    return NextResponse.json({ data: posts })
  } catch (error) {
    logger.error('Failed to fetch posts', { requestId }, error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch posts' },
      { status: 500 },
    )
  }
}
```

```typescript
// ✅ Middleware (already has request ID from ADR-0008)
// Request ID is generated in middleware and passed via headers.
// Route Handlers and Server Components read it from headers:

import { headers } from 'next/headers'

const getRequestId = async (): Promise<string> => {
  const headersList = await headers()
  return headersList.get('X-Request-Id') ?? 'unknown'
}
```

### What the Logger Outputs

**Development** (human-readable):
```
[INFO] User created {"userId":"clx123","email":"alice@example.com"}
[WARN] User creation validation failed {"errors":["email","name"]}
[ERROR] Failed to create user {"email":"bob@example.com"}
  PrismaClientKnownRequestError: Unique constraint failed on the field: `email`
    at Object.createUser (src/app/(admin)/cms/users/_actions/createUser.ts:24:5)
```

**Production** (JSON — parseable by Axiom, Datadog, Vercel):
```json
{"level":"info","message":"User created","timestamp":"2026-02-27T14:30:00.000Z","context":{"userId":"clx123","email":"alice@example.com"}}
{"level":"error","message":"Failed to create user","timestamp":"2026-02-27T14:30:01.000Z","context":{"email":"bob@example.com"},"error":{"name":"PrismaClientKnownRequestError","message":"Unique constraint failed","stack":"..."}}
```

### What NOT to Log

```typescript
// ❌ Logging passwords
logger.info('Login attempt', { email, password })  // NEVER!

// ❌ Logging full request bodies (may contain PII)
logger.info('Request received', { body: await request.json() })

// ❌ Logging tokens
logger.info('Auth check', { token: session.token })

// ❌ Logging credit card numbers
logger.info('Payment', { cardNumber: '4111111111111111' })

// ✅ Log identifiers and safe context only
logger.info('Login attempt', { email })
logger.info('Payment processed', { userId, amount, currency, last4: '1111' })
logger.info('Auth check', { userId: session.user.id, role: session.user.role })
```

---

## Layer 2: Error Tracking (Sentry)

### Why Sentry

| Factor | Sentry | Datadog | LogRocket | Bugsnag |
|--------|--------|---------|-----------|---------|
| Error tracking | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Next.js integration | ✅ Official SDK | ⚠️ Manual | ⚠️ Client-only | ⚠️ Basic |
| Server Components support | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Free tier | 5K errors/month | 14-day trial | 1K sessions/month | 7.5K events/month |
| Performance monitoring | ✅ Included | ✅ Included | ⚠️ Limited | ❌ Separate |
| Session replay | ✅ Included | ⚠️ Separate product | ✅ Core feature | ❌ No |
| Source maps | ✅ Automatic with Next.js | ⚠️ Manual upload | ✅ Yes | ⚠️ Manual |

**Sentry wins because**: it has the only official Next.js SDK with Server Component support, automatic source maps, and the most generous free tier for small projects.

### Installation

```bash
# Sentry wizard handles everything — config files, environment variables, instrumentation
pnpm dlx @sentry/wizard@latest -i nextjs
```

This creates:
- `sentry.client.config.ts` — client-side SDK init
- `sentry.server.config.ts` — server-side SDK init
- `sentry.edge.config.ts` — Edge Runtime SDK init
- `src/instrumentation.ts` — Next.js instrumentation hook
- Updates `next.config.js` with Sentry webpack plugin

### Manual Setup (If Wizard Doesn't Work)

```bash
pnpm add @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',

  // Performance monitoring — capture 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay — capture 1% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],

  // Don't send in development
  enabled: process.env.NODE_ENV === 'production',
})
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,  // Server-only — no NEXT_PUBLIC_ prefix
  environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enabled: process.env.NODE_ENV === 'production',
})
```

```typescript
// src/instrumentation.ts
export const register = async () => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}
```

### Environment Variables

```dotenv
# .env.local (development — Sentry disabled)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Production (Vercel environment variables)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
SENTRY_AUTH_TOKEN=sntrys_xxx  # For source map upload
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

Add to `src/lib/env.ts`:

```typescript
// Sentry (opt-in)
NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
SENTRY_DSN: z.string().url().optional(),
```

### Integrating Sentry with the Logger

When Sentry is installed, the logger should forward errors to Sentry automatically:

```typescript
// src/lib/logger.ts — enhanced with Sentry integration
import * as Sentry from '@sentry/nextjs'

// ... existing createLogger code ...

// Inside the error method:
error: (message: string, context?: LogContext, error?: unknown) => {
  log('error', message, context, error)

  // Forward to Sentry if available
  if (error instanceof Error) {
    Sentry.captureException(error, {
      extra: context,
      tags: { source: 'logger' },
    })
  } else {
    Sentry.captureMessage(message, {
      level: 'error',
      extra: context,
    })
  }
},
```

**Important**: Don't import Sentry unconditionally — use a conditional check or a wrapper:

```typescript
// src/lib/logger.ts — safe Sentry integration (works with or without Sentry installed)

let sentryAvailable = false
let SentryModule: typeof import('@sentry/nextjs') | null = null

try {
  SentryModule = require('@sentry/nextjs')
  sentryAvailable = true
} catch {
  // Sentry not installed — logger still works without it
}

const reportToSentry = (message: string, context?: LogContext, error?: unknown) => {
  if (!sentryAvailable || !SentryModule) return

  if (error instanceof Error) {
    SentryModule.captureException(error, {
      extra: context,
      tags: { source: 'logger' },
    })
  } else {
    SentryModule.captureMessage(message, {
      level: 'error',
      extra: context,
    })
  }
}
```

### Error Boundaries with Sentry

```tsx
// src/app/global-error.tsx
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-foreground/60">An unexpected error occurred.</p>
            <button
              onClick={reset}
              className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
```

```tsx
// src/app/error.tsx
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="mt-2 text-foreground/60">Please try again.</p>
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
```

### Adding User Context to Sentry

When authentication is enabled (ADR-0010), identify the user:

```typescript
// In your auth session provider or layout
import * as Sentry from '@sentry/nextjs'

// After authentication — set user context
Sentry.setUser({
  id: session.user.id,
  email: session.user.email,
  // Don't include name or other PII unless your privacy policy allows it
})

// On sign out — clear user context
Sentry.setUser(null)
```

---

## Layer 3: Performance Monitoring (Opt-In)

### Option 1: Vercel Analytics (Recommended for Vercel Deploys)

Zero-config Core Web Vitals monitoring:

```bash
pnpm add @vercel/analytics
```

```tsx
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

This automatically reports:
- **LCP** (Largest Contentful Paint) — loading performance
- **FID** (First Input Delay) — interactivity
- **CLS** (Cumulative Layout Shift) — visual stability
- **TTFB** (Time to First Byte) — server response time
- **INP** (Interaction to Next Paint) — responsiveness

### Option 2: Vercel Speed Insights

More detailed performance data:

```bash
pnpm add @vercel/speed-insights
```

```tsx
// src/app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

### Option 3: Sentry Performance (Non-Vercel Deploys)

If already using Sentry for error tracking, performance monitoring is included via `tracesSampleRate`:

```typescript
// Already configured in sentry.client.config.ts
Sentry.init({
  tracesSampleRate: 0.1,  // 10% of transactions
})
```

### Option 4: Custom Web Vitals Reporting

For self-hosted analytics or custom dashboards:

```typescript
// src/lib/web-vitals.ts
import type { Metric } from 'web-vitals'

export const reportWebVitals = (metric: Metric) => {
  const body = {
    name: metric.name,     // 'LCP', 'FID', 'CLS', 'TTFB', 'INP'
    value: metric.value,
    rating: metric.rating, // 'good', 'needs-improvement', 'poor'
    delta: metric.delta,
    id: metric.id,
  }

  // Send to your analytics endpoint
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', JSON.stringify(body))
  }
}
```

---

## Request ID Correlation

The middleware (ADR-0008) already generates a unique `X-Request-Id` for every request. This ID must flow through all logs so you can trace a single request across multiple log entries.

### The Flow

```
Browser request → Middleware (generates X-Request-Id: abc-123)
  → Route Handler (logger.info('...', { requestId: 'abc-123' }))
    → Database query (logger.info('query posts', { requestId: 'abc-123' }))
    → External API call (logger.warn('slow response', { requestId: 'abc-123' }))
  → Response (X-Request-Id: abc-123 in response headers)
```

### Extracting Request ID

```typescript
// src/lib/request-context.ts
import { headers } from 'next/headers'

/** Get the current request ID from middleware headers. */
export const getRequestId = async (): Promise<string> => {
  const headersList = await headers()
  return headersList.get('X-Request-Id') ?? 'no-request-id'
}
```

```typescript
// Usage in Route Handlers and Server Actions
import { logger } from '@/lib/logger'
import { getRequestId } from '@/lib/request-context'

export const createPost = async (input: unknown): ServerActionResult<Post> => {
  const requestId = await getRequestId()

  logger.info('Creating post', { requestId })

  try {
    const post = await db.post.create({ data: parsed.data })
    logger.info('Post created', { requestId, postId: post.id })
    return { ok: true, value: post }
  } catch (error) {
    logger.error('Failed to create post', { requestId }, error)
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: '...' } }
  }
}
```

### Finding All Logs for One Request

In your log aggregator, search for the request ID:

```
// Axiom / Datadog / Vercel Logs
requestId:"abc-123"
```

This shows every log entry from that request — from receiving it to the response.

---

## Log Aggregator Options (Production)

For projects that outgrow Vercel's built-in logs:

| Service | Best For | Free Tier | Next.js Support |
|---------|---------|-----------|----------------|
| **Axiom** | Vercel projects | 500MB/month | ✅ Official Vercel integration |
| **Datadog** | Enterprise, multi-service | 14-day trial | ⚠️ Manual setup |
| **Betterstack** (Logtail) | Simple, affordable | 1GB/month | ✅ Vercel integration |
| **Pino** (self-hosted) | Docker deploys, full control | Free (your infra) | ✅ Node.js native |

### Axiom Setup (Recommended for Vercel)

```bash
pnpm add @axiomhq/nextjs
```

```typescript
// next.config.js
const { withAxiom } = require('@axiomhq/nextjs')

module.exports = withAxiom({
  // ... existing config
})
```

```dotenv
# .env.local
NEXT_PUBLIC_AXIOM_TOKEN=xaat-xxx
NEXT_PUBLIC_AXIOM_DATASET=my-app
```

Axiom automatically captures all `console.*` output as structured JSON and adds Vercel metadata (function name, region, request path).

---

## What to Log at Each Level

| Level | When | Examples |
|-------|------|---------|
| `debug` | Development diagnostics, verbose internal state | `logger.debug('Query params', { page, limit, filters })` |
| `info` | Significant business events (audit trail) | `logger.info('User created', { userId })` |
| | | `logger.info('Payment processed', { orderId, amount })` |
| | | `logger.info('Email sent', { to, template })` |
| | | `logger.info('Post published', { postId, slug })` |
| `warn` | Handled errors, fallback paths, deprecations | `logger.warn('Rate limit approaching', { ip, count })` |
| | | `logger.warn('Fallback to default config', { reason })` |
| | | `logger.warn('Deprecated API version', { version })` |
| `error` | Unexpected errors, exceptions, failed operations | `logger.error('Database connection failed', {}, error)` |
| | | `logger.error('Payment provider error', { orderId }, error)` |
| | | `logger.error('Email send failed', { to, template }, error)` |

### What Constitutes an `info` vs `warn` vs `error`

```
Did the operation succeed?
  YES → info (business event)
  NO ↓

Was the failure expected and handled gracefully?
  YES → warn (e.g., validation error, rate limit, auth failure)
  NO ↓

Was the failure unexpected (exception, crash, data corruption)?
  YES → error (e.g., DB down, null pointer, timeout)
```

---

## Anti-Patterns

```typescript
// ❌ Raw console.error — unstructured, no context
console.error('Something failed')

// ✅ Structured logger with context
logger.error('User creation failed', { email: input.email, step: 'db-insert' }, error)

// ❌ Logging sensitive data
logger.info('Login', { email, password, token })

// ✅ Log identifiers only
logger.info('Login successful', { userId, email })

// ❌ Logging everything (noise drowns signal)
logger.info('Entering function')
logger.info('Step 1 complete')
logger.info('Step 2 complete')
logger.info('Exiting function')

// ✅ Log meaningful events
logger.info('Post created', { postId, authorId })

// ❌ No request ID — can't correlate logs
logger.error('Failed', { error: error.message })

// ✅ Request ID for correlation
logger.error('Failed', { requestId, error: error.message }, error)

// ❌ Catching errors without logging them
try {
  await riskyOperation()
} catch {
  return { ok: false, error: { code: 'INTERNAL_ERROR', message: '...' } }
}

// ✅ Log before returning the error result
try {
  await riskyOperation()
} catch (error) {
  logger.error('Risky operation failed', { requestId }, error)
  return { ok: false, error: { code: 'INTERNAL_ERROR', message: '...' } }
}

// ❌ Using console.log (ESLint warns — ADR-0001)
console.log('debug info')

// ✅ Use logger.debug (only outputs in development)
logger.debug('debug info', { details })
```

---

## Observability Checklist (Per Project)

### Before Production Launch

- [ ] `src/lib/logger.ts` is created and used across all Server Actions and Route Handlers
- [ ] Request ID from middleware is included in log entries
- [ ] No `console.log` in the codebase (ESLint should catch this)
- [ ] No sensitive data in logs (passwords, tokens, PII)
- [ ] Sentry is installed and configured (or alternative error tracking)
- [ ] Error boundaries (`error.tsx`, `global-error.tsx`) report to Sentry
- [ ] `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` set in production environment
- [ ] Source maps uploaded to Sentry (automatic with `@sentry/nextjs`)
- [ ] Performance monitoring enabled (Vercel Analytics, Sentry, or custom)

### After Production Launch

- [ ] Sentry alerts configured (email/Slack on new errors)
- [ ] Error budget defined (acceptable error rate)
- [ ] Core Web Vitals monitored (LCP < 2.5s, CLS < 0.1, INP < 200ms)
- [ ] Log aggregator connected if needed (Axiom for Vercel)
- [ ] Weekly review of Sentry dashboard for new/unresolved errors

---

## Rationale

### Why a Custom Logger Over Pino / Winston

Pino and Winston are excellent Node.js logging libraries, but they add dependencies and configuration overhead. For Next.js on Vercel, `console.*` output is captured and structured automatically by the platform. Our thin abstraction provides the structured format we need (JSON in production, human-readable in dev) without a runtime dependency. If the project outgrows this (self-hosted Docker, high-volume logging), Pino can replace the internals without changing application code — the `logger.info()` / `logger.error()` API stays the same.

### Why Sentry Over Alternatives

Sentry has the only official Next.js SDK that supports Server Components, Server Actions, and the Edge Runtime. The `@sentry/wizard` configures everything automatically (instrumentation, source maps, error boundaries). The free tier (5K errors/month) is generous enough for most projects. Datadog is superior for large-scale microservices but overkill for most Next.js apps.

### Why Request ID Correlation

Without request IDs, debugging a production error means searching logs by timestamp and guessing which entries belong together. With request IDs, you search for one ID and see every log entry from that request — from middleware to database query to response. ADR-0008 already generates the IDs; this ADR ensures they're used everywhere.

### Key Factors
1. **Structured logging** — JSON output is parseable by log aggregators; raw text is not.
2. **Request ID correlation** — links all logs from a single request together.
3. **Safe by default** — the logger's API encourages context objects over string interpolation, reducing accidental PII logging.
4. **Progressive complexity** — start with `console`-based logger, add Sentry, add Axiom as needed.
5. **Error tracking is not logging** — Sentry provides stack traces, breadcrumbs, user impact, and alerts that logs alone cannot.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| Custom logger (`src/lib/logger.ts`) | Thin structured abstraction over `console` | ✅ Chosen: zero dependencies, sufficient for most projects, replaceable internals |
| Pino | High-performance Node.js logger | ❌ Deferred: adds dependency, unnecessary on Vercel (console is captured) |
| Winston | Full-featured Node.js logger | ❌ Heavy, many transports we don't need |
| Sentry | Error tracking + performance | ✅ Chosen: official Next.js SDK, best free tier, Server Component support |
| Datadog | Full observability platform | ❌ Overkill for most Next.js apps, expensive |
| Axiom | Log aggregation for Vercel | ✅ Recommended when outgrowing Vercel logs |
| Vercel Analytics | Core Web Vitals | ✅ Chosen: zero-config for Vercel deploys |

---

## Consequences

**Positive:**
- Every error in production is logged with context and can be traced by request ID.
- Sentry provides real-time alerts — the team knows about errors before users report them.
- Structured JSON logs are searchable and filterable in any log aggregator.
- The logger abstraction means application code doesn't change when switching log backends.
- Request ID correlation makes debugging multi-step operations trivial.
- Performance monitoring catches regressions in Core Web Vitals.
- Progressive setup — start simple (logger only), add Sentry, add Axiom as the project grows.

**Negative:**
- Sentry adds ~30kB to client bundle — mitigated by lazy loading and being opt-in.
- Structured logging requires discipline (always include context, never log PII) — mitigated by the API design and code review.
- Log volume in production can incur costs on aggregators — mitigated by appropriate log levels (debug only in dev, info/warn/error in prod).
- `@sentry/nextjs` modifies `next.config.js` — mitigated by the wizard handling this automatically.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (ESLint `no-console` rule, `console.log` forbidden)
- [ADR-0006](./0006-environment.md) — Environment (SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN env vars)
- [ADR-0007](./0007-error-handling.md) — Error handling (AppError, logging guidelines, error codes)
- [ADR-0008](./0008-middleware.md) — Middleware (X-Request-Id generation, request correlation)
- [ADR-0009](./0009-testing.md) — Testing (mock logger in tests)

