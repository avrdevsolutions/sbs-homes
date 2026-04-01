# ADR-0006: Environment Configuration

**Status**: Accepted
**Date**: 2026-02-27
**Supersedes**: Previous ADR-0006 (2026-02-26)

---

## Context

Environment variables configure database connections, API keys, feature flags, and environment-specific behavior. Poor env management leads to leaked secrets, runtime crashes from `undefined` values, and inconsistent behavior across environments. The configuration system must handle the Next.js-specific concern of client vs server visibility (`NEXT_PUBLIC_` prefix) and the Edge Runtime limitation (middleware can't use Node.js APIs).

## Decision

**Layered environment configuration with Zod validation at startup. All access through `@/lib/env` — never `process.env` directly.**

---

## File Structure

```
.env.example          # Template — committed, documents all vars, no secrets
.env.local            # Local overrides — gitignored, contains secrets
.env.development      # Development defaults — committed, no secrets
.env.production       # Production defaults — committed, no secrets
src/lib/env.ts        # Zod validation + typed export — committed
```

### How Next.js Layers Env Files

Next.js loads env files in this order (later overrides earlier):

```
.env                    ← Base (all environments)
.env.development        ← Development only (NODE_ENV=development)
.env.production         ← Production only (NODE_ENV=production)
.env.local              ← Local overrides (always loaded, always gitignored)
```

**`.env.local` always wins.** This is where developers put their secrets locally.

---

## Rules

| Rule | Level |
|------|-------|
| Import from `@/lib/env`, never `process.env` directly | **MUST** |
| Validate all env vars with Zod at startup | **MUST** |
| Use `safeParse` with formatted error output | **MUST** |
| Provide `.env.example` documenting every var | **MUST** |
| Prefix client-visible vars with `NEXT_PUBLIC_` | **MUST** |
| Don't commit `.env.local` or files containing secrets | **MUST NOT** |
| Don't use `NEXT_PUBLIC_` for secrets (exposed to client bundle) | **MUST NOT** |
| Don't log env var values in production | **MUST NOT** |
| Don't access `process.env` directly outside `src/lib/env.ts` | **MUST NOT** |
| Group related vars with comments in schema and `.env.example` | **SHOULD** |
| Add JSDoc comments on every schema field | **SHOULD** |
| Fail fast with clear error message if required vars are missing | **MUST** |

---

## Client vs Server Visibility

This is a critical Next.js-specific concern:

| Prefix | Where Available | Build Behavior | Use For |
|--------|----------------|----------------|---------|
| `NEXT_PUBLIC_*` | Client + Server | **Inlined at build time** into client JS | Public URLs, app name, feature flags, analytics IDs |
| No prefix | Server only | Available only via `process.env` at runtime | Secrets, API keys, DB URLs, auth tokens |

```tsx
// ✅ Public — safe in client code, inlined at build
env.NEXT_PUBLIC_APP_URL   // 'https://myapp.com' — literally baked into the JS bundle

// ✅ Server-only — never reaches the client
env.DATABASE_URL          // Only available in Server Components, Route Handlers, Server Actions

// ❌ SECURITY RISK — secret with NEXT_PUBLIC_ prefix
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_xxx   // This will be in the client bundle!
```

**⚠️ Build-time inlining means**: Changing a `NEXT_PUBLIC_*` var requires a rebuild. Server-only vars can be changed at runtime (restart required, but no rebuild).

---

## Implementation

### Full `env.ts` Pattern

```typescript
// src/lib/env.ts
import { z } from 'zod'

// =============================================================================
// Schema — documents every env var's type, default, and purpose
// =============================================================================

const envSchema = z.object({
  // --- Server-only ---
  /** Node environment */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /** Internal API base URL */
  API_BASE_URL: z.string().url().default('http://localhost:3000/api'),
  /** Database connection string (optional until DB is added — ADR-0011) */
  DATABASE_URL: z.string().url().optional(),
  /** Auth secret for session encryption (optional until auth is added — ADR-0010) */
  AUTH_SECRET: z.string().min(32).optional(),

  // --- Public (NEXT_PUBLIC_) ---
  /** Base URL of the application (no trailing slash) */
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  /** Environment name for display/logging */
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
})

// =============================================================================
// Validation — fail fast with clear errors
// =============================================================================

const parseEnv = () => {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    API_BASE_URL: process.env.API_BASE_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  })

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment variables — check the errors above')
  }

  return parsed.data
}

// =============================================================================
// Export — single point of access
// =============================================================================

/** Validated, typed environment variables. Always import from here. */
export const env = parseEnv()

/** TypeScript type of the validated environment. */
export type Env = z.infer<typeof envSchema>

// =============================================================================
// Helpers
// =============================================================================

/** Check if running in production. */
export const isProduction = () => env.NODE_ENV === 'production'

/** Check if running in development. */
export const isDevelopment = () => env.NODE_ENV === 'development'

/** Check if running in test environment. */
export const isTest = () => env.NODE_ENV === 'test'
```

### Usage

```typescript
// ✅ Correct — typed, validated
import { env, isProduction } from '@/lib/env'

const apiUrl = env.API_BASE_URL           // string (not string | undefined)
const appUrl = env.NEXT_PUBLIC_APP_URL    // string
const dbUrl = env.DATABASE_URL            // string | undefined (optional)

if (isProduction()) {
  // production-only logic
}

// ❌ Wrong — unvalidated, untyped
const url = process.env.NEXT_PUBLIC_APP_URL   // string | undefined — might be undefined
const db = process.env.DATABASE_URL           // string | undefined — could crash at runtime
```

---

## Edge Runtime (Middleware)

`src/lib/env.ts` uses `process.env` which works in Node.js. In middleware (Edge Runtime), `process.env` is available but `env.ts` may not be importable if it pulls in Node.js-only dependencies.

**Rule**: Keep `env.ts` importable from middleware by ensuring it only uses Zod (which is Edge-compatible). If you add any Node.js-only logic to `env.ts`, create a separate `env.edge.ts` for middleware:

```typescript
// src/middleware.ts — env.ts works here because Zod is Edge-compatible
import { env } from '@/lib/env'

export const middleware = (request: NextRequest) => {
  // ✅ env is available in middleware
  if (env.NEXT_PUBLIC_APP_ENV === 'production') {
    // production-only middleware logic
  }
}
```

**If `env.ts` ever becomes non-Edge-compatible** (e.g., by importing a Node.js-only library), create:

```typescript
// src/lib/env.edge.ts — minimal Edge-safe env access
const edgeEnv = {
  APP_ENV: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const

export { edgeEnv }
```

---

## Adding a New Environment Variable — Checklist

1. **Add to Zod schema** in `src/lib/env.ts` — with JSDoc comment, correct type, default or `.optional()`
2. **Add to `safeParse` call** — map `process.env.NEW_VAR` into the parse object
3. **Add to `.env.example`** — with comment explaining purpose and format
4. **Add to `.env.local`** — with actual value (if secret) or appropriate default
5. **Update ADR-0006** if it's a new category of var (e.g., first analytics var, first payment var)
6. **If `NEXT_PUBLIC_*`**: Remember it's inlined at build time — CI/CD must have it at build, not just runtime
7. **If secret**: Verify it does NOT have `NEXT_PUBLIC_` prefix
8. **If used in middleware**: Verify `env.ts` is still Edge-compatible after the change

---

## CI/CD Environment Variables

| Environment | Where to Set Vars | Notes |
|------------|------------------|-------|
| Local development | `.env.local` | Gitignored, each dev has their own |
| CI (GitHub Actions) | Repository Secrets / Variables | Secrets for sensitive, Variables for public |
| Preview (Vercel) | Vercel Project Settings → Environment Variables | Scoped to "Preview" environment |
| Production (Vercel) | Vercel Project Settings → Environment Variables | Scoped to "Production" environment |

**Vercel-specific**: `NEXT_PUBLIC_*` vars must be set in Vercel project settings (not just runtime env vars) because they're inlined at build time. If you add a `NEXT_PUBLIC_*` var to Vercel runtime-only, it won't be in the client bundle.

---

## `.env.example` Convention

Every var in the schema MUST appear in `.env.example`:

```dotenv
# =============================================================================
# Environment Variables Template
# =============================================================================
# Copy this file to .env.local for local development.
# NEVER commit .env.local or any file containing secrets.
# See docs/adrs/0006-environment.md for the full strategy.
# =============================================================================

# --- App Configuration ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development

# --- API ---
API_BASE_URL=http://localhost:3000/api

# --- Database (uncomment when adding — ADR-0011) ---
# DATABASE_URL=postgresql://user:password@localhost:5432/mydb?schema=public

# --- Authentication (uncomment when adding — ADR-0010) ---
# AUTH_SECRET=generate-a-32-char-secret-here

# --- Analytics (uncomment when adding) ---
# NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
# NEXT_PUBLIC_POSTHOG_KEY=
```

**Rules for `.env.example`:**
- Required vars: show with default value
- Optional vars: show commented out with placeholder
- Secrets: show commented out with description (never real values)
- Group related vars with comments
- Reference the relevant ADR for each group

---

## Anti-Patterns

```typescript
// ❌ Direct process.env access — untyped, unvalidated
const dbUrl = process.env.DATABASE_URL
if (dbUrl) { ... }  // might be undefined at runtime

// ❌ Hardcoded URLs
const apiUrl = 'https://api.myapp.com'  // should be env var

// ❌ Secret with NEXT_PUBLIC_ prefix
NEXT_PUBLIC_DATABASE_URL=postgresql://...  // exposed to client!

// ❌ Logging secrets
console.log('DB:', env.DATABASE_URL)  // don't log secrets in production

// ❌ Optional var used without null check
const db = env.DATABASE_URL.split('/')  // TypeError if undefined

// ✅ Correct optional var usage
if (env.DATABASE_URL) {
  const db = env.DATABASE_URL.split('/')
}
```

---

## Rationale

Direct `process.env` access is fundamentally unsafe: it returns `string | undefined`, provides no compile-time checking, gives no validation at startup, and can't distinguish between "not set" and "set to empty string." A Zod schema validates all env vars at startup and exports a typed object. This catches misconfiguration immediately — not at 3 AM when a missing `DATABASE_URL` crashes the production API.

### Key Factors
1. **Fail fast** — invalid config crashes at startup, not during a user request. A clear error message tells you exactly which var is wrong.
2. **Type safety** — `env.NEXT_PUBLIC_APP_URL` is `string`, not `string | undefined`. Optional vars are explicitly `string | undefined`.
3. **Documentation as code** — the schema documents every env var's type, default, and purpose via JSDoc and Zod validators.
4. **Single point of access** — all env access goes through one file, making it easy to audit what the app depends on.
5. **Edge compatibility** — Zod is Edge-compatible, so the same `env.ts` works in middleware.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| Zod schema in `src/lib/env.ts` | Manual Zod validation with `safeParse` | ✅ Chosen: zero extra dependencies, full control, Zod already installed, Edge-compatible |
| `@t3-oss/env-nextjs` | T3 env validation library | ❌ Deferred: adds a dependency for a solved problem; pre-approved if wanted later |
| Raw `process.env` | No validation | ❌ No type safety, no fail-fast, `undefined` at runtime |
| dotenv-safe | Checks `.env` against `.env.example` | ❌ No TypeScript types, no value validation, not Edge-compatible |

---

## Consequences

**Positive:**
- Build fails early if required vars are missing or invalid — no runtime surprises.
- TypeScript autocomplete for all env vars via `env.*`.
- Helper functions (`isProduction()`, `isDevelopment()`, `isTest()`) available everywhere.
- `.env.example` serves as living documentation for all required and optional vars.
- Single point of access makes env var usage auditable.
- Edge-compatible — works in middleware without a separate env module.

**Negative:**
- Adding a new env var requires updating 2+ files (schema + `.env.example`) — mitigated by the checklist above.
- Startup validation adds a few ms to cold start — negligible.
- `NEXT_PUBLIC_*` vars are inlined at build time, requiring a rebuild to change — this is a Next.js constraint, not our choice.
- Developers must import from `@/lib/env` instead of using `process.env` directly — mitigated by lint rules and code review.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (Zod as validation standard)
- [ADR-0005](./0005-data-fetching.md) — Data fetching (API URLs from env)
- [ADR-0008](./0008-middleware.md) — Middleware (Edge Runtime env access)
- [ADR-0010](./0010-authentication.md) — Authentication (AUTH_SECRET env var)
- [ADR-0011](./0011-database.md) — Database (DATABASE_URL env var)
- [ADR-0013](./0013-seo-metadata.md) — SEO (NEXT_PUBLIC_SITE_URL for canonical URLs, OG tags)


