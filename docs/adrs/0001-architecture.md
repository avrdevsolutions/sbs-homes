# ADR-0001: Architecture & Framework

**Status**: Accepted
**Date**: 2026-02-27
**Supersedes**: Previous ADR-0001 (2026-02-26)

---

## Context

This repository is a reusable Next.js starter template designed for AI-orchestrated development. It must be comprehensive enough to build any project — from a marketing site to an enterprise SaaS platform. We need foundational decisions about framework, language, project structure, code quality tooling, and key technology choices. Every other ADR flows from the decisions made here.

## Decision

**Next.js 15 App Router, TypeScript strict, pnpm, Zod, server-first architecture. Enforced by ESLint, Prettier, Husky, and lint-staged.**

---

## 1. Framework: Next.js 15 (App Router)

**We will use Next.js 15 with the App Router exclusively. Pages Router is forbidden.**

| Factor        | Decision                                                         |
| ------------- | ---------------------------------------------------------------- |
| Router        | App Router only — Pages Router is maintenance-only               |
| Rendering     | Server Components by default (see ADR-0004)                      |
| Data fetching | Server-first with explicit cache (see ADR-0005)                  |
| Deployment    | Vercel recommended, Docker `output: 'standalone'` as alternative |
| Dev server    | `pnpm dev` (Turbopack is default in Next.js 15)                  |

### ⚠️ Next.js 15 Breaking Changes (Critical)

These break silently if agents use Next.js 14 patterns:

```tsx
// ✅ Next.js 15 — Correct
const data = await fetch(url, { cache: 'force-cache' }) // Explicit cache
const cookieStore = await cookies() // Async — MUST await
const headersList = await headers() // Async — MUST await
const { id } = await params // Async — MUST await
const { q } = await searchParams // Async — MUST await

// ❌ Next.js 14 patterns — BROKEN in 15
const data = await fetch(url) // NOT cached by default!
const cookieStore = cookies() // Returns Promise, not CookieStore
const { id } = params // Returns Promise, not object
```

### `next.config.js` Guidance

The config file should remain minimal. Most concerns belong elsewhere:

| Concern                       | Where It Goes                            | NOT in `next.config.js`              |
| ----------------------------- | ---------------------------------------- | ------------------------------------ |
| Security headers              | Middleware (ADR-0008)                    | `headers()` in config is static-only |
| Redirects (dynamic)           | Middleware (ADR-0008)                    | `redirects()` can't use request data |
| Redirects (static, permanent) | `next.config.js` `redirects()`           | —                                    |
| Environment variables         | `src/lib/env.ts` (ADR-0006)              | `env` in config is untyped           |
| Image domains                 | `next.config.js` `images.remotePatterns` | —                                    |
| Output mode                   | `next.config.js` `output: 'standalone'`  | Only for Docker deploys              |
| Webpack customization         | `next.config.js` (last resort)           | Prefer built-in Next.js features     |

```javascript
// next.config.js — keep it minimal
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add remote image patterns as needed:
  // images: {
  //   remotePatterns: [
  //     { protocol: 'https', hostname: 'images.example.com' },
  //   ],
  // },
  // For Docker deployment:
  // output: 'standalone',
}

module.exports = nextConfig
```

---

## 2. Language: TypeScript (Strict Mode)

**TypeScript with `strict: true`. No exceptions.**

### Strict Mode Rules

`strict: true` enables all of these:

| Rule                           | What It Does                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `strictNullChecks`             | `null` and `undefined` are distinct types — prevents "cannot read property of undefined" |
| `noImplicitAny`                | Every variable must have a type — no silent `any`                                        |
| `strictFunctionTypes`          | Function parameter types are checked contravariantly                                     |
| `strictBindCallApply`          | `bind`, `call`, `apply` are correctly typed                                              |
| `strictPropertyInitialization` | Class properties must be initialized                                                     |
| `noImplicitThis`               | `this` must have a type                                                                  |
| `alwaysStrict`                 | Emits `"use strict"` in every file                                                       |

### Type Import Convention

```tsx
// ✅ Correct — inline type import (enforced by ESLint)
import { type ReactNode } from 'react'
import { type Metadata } from 'next'

// ✅ Also correct — type-only import statement
import type { User } from '@contracts/common'

// ❌ Wrong — non-type import of type-only usage
import { ReactNode } from 'react' // ESLint error: use type import
```

**Rule**: `@typescript-eslint/consistent-type-imports` is set to `"error"` with `fixStyle: "inline-type-imports"`. This keeps type imports alongside value imports when both are needed from the same module.

### `const` Object Pattern (Not `enum`)

TypeScript `enum` is forbidden. Use `const` objects for value+type constants (see ADR-0007 for rationale):

```typescript
// ✅ Correct — const object (runtime value + TypeScript type)
export const ErrorCode = {
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

// ❌ Forbidden — native enum (emits IIFE, not tree-shakeable)
export enum ErrorCode {
  NOT_FOUND = 'NOT_FOUND',
}
```

### Path Aliases

```json
// tsconfig.json paths
{
  "paths": {
    "@/*": ["./src/*"],
    "@contracts/*": ["./contracts/*"]
  }
}
```

| Alias         | Maps To      | Use For                                                          |
| ------------- | ------------ | ---------------------------------------------------------------- |
| `@/`          | `src/`       | All app source code: components, lib, hooks, services, providers |
| `@contracts/` | `contracts/` | Shared types, API contracts, error codes                         |

```tsx
// ✅ Using aliases
import { cn } from '@/lib/utils'
import { ErrorCode } from '@contracts/common'
import type { ApiResponse } from '@contracts/common'

// ❌ Relative paths crossing boundaries
import { cn } from '../../../lib/utils'
import type { ApiResponse } from '../../contracts/common'
```

---

## 3. Project Structure

```
┌── src/                        # Application source
│   ├── app/                    # Next.js App Router (pages, layouts, routes)
│   │   ├── api/                # Route Handlers (ADR-0005)
│   │   ├── (auth)/             # Auth pages route group (ADR-0010)
│   │   ├── (protected)/        # Protected pages route group (ADR-0010)
│   │   ├── (admin)/            # Admin pages route group (ADR-0010)
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── error.tsx           # Error boundary
│   │   ├── global-error.tsx    # Root error boundary
│   │   ├── not-found.tsx       # 404 page
│   │   └── globals.css         # Global styles (Tailwind directives)
│   ├── components/             # React components (ADR-0004)
│   │   ├── ui/                 # Tier 1: Primitives (Button, Typography, Container, Stack, Section)
│   │   ├── features/           # Tier 2: Domain-specific, organized by feature domain
│   │   │   └── landing/        # Example domain folder
│   │   │       ├── hero/       # Single-component feature
│   │   │       └── pricing-card/  # Multi-component composition (all parts in one folder)
│   │   └── layout/             # Tier 3: Page structure (Header, Footer, Sidebar)
│   ├── lib/                    # Utilities and core modules
│   │   ├── utils.ts            # cn() helper, general utilities
│   │   ├── env.ts              # Validated environment variables (ADR-0006)
│   │   ├── errors.ts           # AppError class + factory functions (ADR-0007)
│   │   ├── api-utils.ts        # handleApiError, fetch helpers (ADR-0005)
│   │   ├── auth/               # Auth.js config and helpers (ADR-0010)
│   │   ├── db/                 # Prisma client singleton (ADR-0011)
│   │   ├── motion/             # Framer Motion exports (ADR-0003, opt-in)
│   │   └── query/              # TanStack Query client + config (ADR-0005, opt-in)
│   ├── hooks/                  # Custom React hooks (useDebounce, useMediaQuery)
│   ├── services/               # API service layer (ADR-0005, opt-in)
│   │   └── [domain]/           # Per-domain: api.ts, queries.ts, queryKeys.ts, types.ts
│   ├── providers/              # React context providers (SessionProvider, QueryProvider)
│   └── middleware.ts           # Edge middleware (ADR-0008)
├── contracts/                  # Shared TypeScript types (API contracts)
│   ├── common.ts               # ErrorCode, ApiResponse, ApiError, Result
│   └── README.md
├── docs/                       # Documentation (source of truth)
│   ├── adrs/                   # Architecture Decision Records (this file)
│   ├── standards/              # Implementation standards
│   ├── for-ai-agents/          # Agent-specific guides
│   ├── getting-started/        # Onboarding docs
│   └── references/             # Design tokens, approved libs
├── tests/                      # Test infrastructure (ADR-0009, opt-in)
│   ├── setup/                  # vitest.setup.ts, test-utils.tsx, msw/
│   ├── e2e/                    # Playwright E2E tests
│   └── fixtures/               # Test data factories
├── prisma/                     # Database schema + migrations (ADR-0011, opt-in)
├── .github/                    # CI/CD, agent configs, CODEOWNERS
├── tailwind.config.ts          # Design tokens (ADR-0002)
├── next.config.js              # Next.js config (keep minimal)
├── tsconfig.json               # TypeScript config
├── vitest.config.ts            # Test runner config (ADR-0009, opt-in)
├── playwright.config.ts        # E2E config (ADR-0009, opt-in)
└── package.json
```

### Folder Ownership

| Folder            | Owner ADR          | Purpose                                         |
| ----------------- | ------------------ | ----------------------------------------------- |
| `src/app/`        | ADR-0001 (this)    | Pages, layouts, route handlers                  |
| `src/components/` | ADR-0004           | Component tiers (ui → features → layout)        |
| `src/lib/`        | ADR-0001 (this)    | Core modules, utilities, framework integrations |
| `src/hooks/`      | ADR-0004           | Custom React hooks                              |
| `src/services/`   | ADR-0005           | TanStack Query service layer                    |
| `src/providers/`  | ADR-0001 (this)    | React context providers                         |
| `contracts/`      | ADR-0005, ADR-0007 | Shared types, error codes, API contracts        |
| `docs/`           | All ADRs           | Documentation (upstream source of truth)        |
| `tests/`          | ADR-0009           | Test infrastructure                             |
| `prisma/`         | ADR-0011           | Database schema and migrations                  |

---

## 4. Package Manager: pnpm (Required)

**pnpm 9+ is the only supported package manager.**

| Factor      | pnpm                                | npm                  | yarn                     |
| ----------- | ----------------------------------- | -------------------- | ------------------------ |
| Speed       | 2-3x faster                         | Baseline             | ~1.5x faster             |
| Disk usage  | ~50% less (content-addressed store) | Baseline             | Similar to npm           |
| Strict deps | ✅ No phantom dependencies          | ❌ Hoists everything | ⚠️ PnP mode is confusing |
| Lockfile    | `pnpm-lock.yaml`                    | `package-lock.json`  | `yarn.lock`              |

**Rules:**

- `npm` and `yarn` lockfiles MUST NOT exist in the repo.
- `engines` field in `package.json` enforces `"pnpm": ">=9"`.
- `packageManager` field locks the exact pnpm version.

---

## 5. Code Quality Tooling

### ESLint

The ESLint config enforces project standards automatically:

| Rule                                              | Setting                         | Rationale                                                |
| ------------------------------------------------- | ------------------------------- | -------------------------------------------------------- |
| `func-style: ["error", "expression"]`             | Arrow functions enforced        | Consistency — `function` only for Next.js special files  |
| `consistent-type-imports: "error"`                | Inline type imports             | Prevents importing types as values (bundle impact)       |
| `no-explicit-any: "warn"`                         | Warns on `any`                  | Must add `// TODO: type` comment if `any` is unavoidable |
| `import/order: "error"`                           | Enforced import ordering        | Predictable file structure for agents                    |
| `import/no-cycle: "error"`                        | No circular imports             | Prevents module resolution issues                        |
| `unused-imports/no-unused-imports: "error"`       | Auto-removes unused imports     | Clean code, smaller bundles                              |
| `no-console: "warn"` (allow error, warn)          | No `console.log`                | Use `console.error` or `console.warn` only               |
| `tailwindcss/no-contradicting-classname: "error"` | No conflicting Tailwind classes | Prevents `px-4 px-6` (ambiguous)                         |
| `tailwindcss/classnames-order: "warn"`            | Consistent class ordering       | Readability                                              |
| `tailwindcss/no-custom-classname: "warn"`         | Warns on non-Tailwind classes   | Enforces token usage                                     |

### Import Ordering

ESLint enforces this exact import order (with blank lines between groups):

```typescript
// 1. React (always first)
import { useState } from 'react'
import { type ReactNode } from 'react'

// 2. Next.js
import { NextResponse } from 'next/server'
import Link from 'next/link'

// 3. External libraries
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

// 4. Internal (@/ alias)
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// 5. Contracts (@contracts/ alias)
import { ErrorCode } from '@contracts/common'
import type { ApiResponse } from '@contracts/common'

// 6. Relative (parent, sibling)
import { UserAvatar } from './UserAvatar'
import type { UserCardProps } from './types'
```

### Prettier

| Setting              | Value     | Why                                      |
| -------------------- | --------- | ---------------------------------------- |
| `printWidth`         | 100       | Readable without horizontal scroll       |
| `singleQuote`        | true      | Consistent string style                  |
| `trailingComma`      | "all"     | Cleaner git diffs                        |
| `semi`               | false     | Optional — matches modern JS conventions |
| `tailwindcss plugin` | Installed | Auto-sorts Tailwind class names          |

### Husky + lint-staged

Pre-commit hooks enforce quality before code reaches the repo:

```
git commit → Husky triggers → lint-staged runs:
  ├── .ts/.tsx files: Prettier → ESLint --fix
  └── .json/.css/.md files: Prettier
```

This ensures every commit is formatted and lint-clean, regardless of developer IDE setup.

---

## 6. Naming Conventions

| Type             | Convention                         | Example                    | File Location                           |
| ---------------- | ---------------------------------- | -------------------------- | --------------------------------------- |
| Component file   | PascalCase                         | `UserProfile.tsx`          | `src/components/features/user-profile/` |
| Component folder | kebab-case                         | `user-profile/`            | `src/components/features/`              |
| Hook file        | camelCase + `use` prefix           | `useDebounce.ts`           | `src/hooks/`                            |
| Utility file     | camelCase                          | `formatDate.ts`            | `src/lib/`                              |
| Service folder   | kebab-case (domain)                | `users/`                   | `src/services/`                         |
| Route folder     | kebab-case                         | `send-email/`              | `src/app/api/`                          |
| Page file        | `page.tsx` (Next.js convention)    | `page.tsx`                 | `src/app/dashboard/`                    |
| Layout file      | `layout.tsx` (Next.js convention)  | `layout.tsx`               | `src/app/`                              |
| Test file        | Same name + `.test`                | `utils.test.ts`            | Co-located with source                  |
| E2E file         | Descriptive + `.spec`              | `auth.spec.ts`             | `tests/e2e/`                            |
| Type file        | `types.ts` (not `.d.ts`)           | `types.ts`                 | Co-located with feature                 |
| Constant         | UPPER_SNAKE_CASE or `const` object | `MAX_RETRIES`, `ErrorCode` | `contracts/` or `src/lib/`              |
| Env variable     | UPPER_SNAKE_CASE                   | `DATABASE_URL`             | `.env.local`                            |

### Special: Next.js File Conventions

These file names are auto-discovered by Next.js — they MUST use these exact names:

| File               | Purpose                         | Style                               |
| ------------------ | ------------------------------- | ----------------------------------- |
| `page.tsx`         | Route page                      | `export default function`           |
| `layout.tsx`       | Shared layout                   | `export default function`           |
| `loading.tsx`      | Loading UI (Suspense)           | `export default function`           |
| `error.tsx`        | Error boundary (`'use client'`) | `export default function`           |
| `not-found.tsx`    | 404 page                        | `export default function`           |
| `global-error.tsx` | Root error boundary             | `export default function`           |
| `template.tsx`     | Re-renders on navigation        | `export default function`           |
| `route.ts`         | API Route Handler               | Named exports (`GET`, `POST`, etc.) |
| `middleware.ts`    | Edge middleware                 | Named export `middleware`           |
| `globals.css`      | Global styles                   | Tailwind directives                 |

---

## 7. Function Declaration Style

**Arrow function expressions everywhere, except Next.js special files.**

```tsx
// ✅ All regular files — arrow functions
export const UserCard = ({ name }: UserCardProps) => { ... }
export const formatDate = (date: Date): string => { ... }
export const useDebounce = <T>(value: T, delay: number): T => { ... }

// ✅ Next.js special files — function declarations (convention)
// page.tsx, layout.tsx, loading.tsx, error.tsx, not-found.tsx, global-error.tsx, template.tsx
export default function Page() { ... }
export default function RootLayout({ children }: Props) { ... }
export default function Error({ error, reset }: ErrorProps) { ... }

// ✅ Route Handlers — arrow function exports
export const GET = async (request: Request) => { ... }
export const POST = async (request: Request) => { ... }
```

**Rationale**: `func-style: ["error", "expression"]` is enforced by ESLint for consistency. The exception for Next.js special files exists because Next.js documentation and community conventions use function declarations, and forcing arrow functions creates friction with no benefit.

---

## 8. Key Technology Choices

| Category             | Decision                             | When Installed   | ADR      |
| -------------------- | ------------------------------------ | ---------------- | -------- |
| Validation           | Zod                                  | ✅ Pre-installed | This ADR |
| Styling              | Tailwind CSS                         | ✅ Pre-installed | ADR-0002 |
| Class merging        | clsx + tailwind-merge (`cn()`)       | ✅ Pre-installed | ADR-0002 |
| Component primitives | shadcn/ui (Radix UI)                 | When needed      | ADR-0002 |
| Animation            | Framer Motion                        | When needed      | ADR-0003 |
| Client data fetching | TanStack Query v5                    | When needed      | ADR-0005 |
| State management     | React built-ins → Zustand if complex | When needed      | This ADR |
| Forms                | React Hook Form + Zod resolver       | When needed      | This ADR |
| Icons                | lucide-react                         | When needed      | This ADR |
| Authentication       | Auth.js (NextAuth v5)                | When needed      | ADR-0010 |
| Database             | PostgreSQL + Prisma                  | When needed      | ADR-0011 |
| Testing              | Vitest + RTL + Playwright + MSW      | When needed      | ADR-0009 |

### State Management Escalation

```
useState / useReducer (local state)
  ↓ If >3 components need the same state
useContext (shared state — theme, auth, modals)
  ↓ If context re-renders too many consumers
Zustand (global store — complex, mutable, cross-component)
  ↓ If server-state caching is needed
TanStack Query (server state — API responses, cache, sync)
```

**MUST NOT** use Redux / Redux Toolkit. If Zustand is insufficient, escalate to the architecture review before adding another state library.

---

## 9. Deployment

### When to Use What

| Scenario                                   | Choice     | Why                                             |
| ------------------------------------------ | ---------- | ----------------------------------------------- |
| Default / new project                      | **Vercel** | Zero-config, all App Router features, free tier |
| Client requires self-hosting               | **Docker** | Full infrastructure control                     |
| Client requires specific cloud (AWS, GCP)  | **Docker** | Deploy to ECS, Cloud Run, GKE, etc.             |
| Compliance / data residency requirements   | **Docker** | Choose your own region and provider             |
| Cost optimization at scale (>100k req/day) | **Docker** | Vercel gets expensive at scale                  |
| Edge computing needed (global CDN)         | **Vercel** | Edge Middleware, Edge Runtime                   |
| Preview deployments per PR                 | **Vercel** | Built-in, free                                  |

### Vercel (Recommended)

Zero-config for Next.js. Supports all App Router features: Server Components, streaming, middleware, ISR, Server Actions.

```bash
# Deploy via Vercel CLI
pnpm dlx vercel
```

### Docker

For self-hosted or non-Vercel deployments. Requires `output: 'standalone'` in `next.config.js`.

#### 1. Enable Standalone Output

```javascript
// next.config.js
const nextConfig = {
  output: 'standalone',
}

module.exports = nextConfig
```

#### 2. `.dockerignore` (Critical for Build Speed)

```dockerignore
# .dockerignore
node_modules
.next
.git
.github
docs
tests
*.md
.env*.local
.husky
.eslintcache
```

**Why**: Without `.dockerignore`, Docker copies `node_modules` (~500MB+), `.git`, and docs into the build context — adding minutes to every build.

#### 3. Dockerfile (Multi-Stage Production Build)

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# --- Stage 1: Install dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# --- Stage 2: Build the application ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Set build-time env vars if needed (NOT secrets — those go in runtime env)
# ARG NEXT_PUBLIC_API_URL
# ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN corepack enable && pnpm build

# --- Stage 3: Production runner (minimal image) ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Don't run as root (security best practice)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only what's needed to run
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Security note**: The runner stage creates a non-root user (`nextjs`). Never run production containers as root.

#### 4. Docker Compose (Local Development with Database)

When the project uses a database (ADR-0011), Docker Compose runs the app + Postgres together:

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/myapp
      AUTH_SECRET: local-dev-secret-minimum-32-chars-long
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:
```

```bash
# Start everything
docker compose up -d

# Run migrations against the containerized database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp npx prisma migrate deploy

# View logs
docker compose logs -f app

# Stop everything
docker compose down
```

**For local development without Docker**: Just use `pnpm dev` and a local/hosted Postgres. Docker Compose is for testing the production build locally or running in environments without Node.js.

#### 5. Health Check Endpoint

Container orchestrators (Kubernetes, ECS, Docker Compose) need a health check to know the app is alive:

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'

export const GET = async () => {
  // Basic: app is responding
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }

  // Optional: check database connectivity
  // try {
  //   await db.$queryRaw`SELECT 1`
  //   health.database = 'connected'
  // } catch {
  //   health.database = 'disconnected'
  //   return NextResponse.json(health, { status: 503 })
  // }

  return NextResponse.json(health)
}
```

Add health check to the Dockerfile:

```dockerfile
# Add to the runner stage
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

#### 6. Production Deployment Checklist

When deploying with Docker:

- [ ] `output: 'standalone'` is set in `next.config.js`
- [ ] `.dockerignore` excludes `node_modules`, `.git`, `docs`, `tests`
- [ ] Dockerfile runs as non-root user (`nextjs`)
- [ ] Environment variables are injected at runtime (not baked into the image)
- [ ] `NEXT_PUBLIC_*` variables ARE baked in at build time (they're inlined by Next.js)
- [ ] Database migrations run before/during deploy (`prisma migrate deploy`)
- [ ] Health check endpoint exists at `/api/health`
- [ ] Container has resource limits (CPU, memory) set in orchestrator
- [ ] Logs go to stdout/stderr (not files) — container logging best practice

---

## Rationale

### Why Next.js Over Alternatives

Next.js was chosen over Remix, Astro, and plain Vite+React because:

1. **Server Components are first-class** — React's future is server-first; Next.js has the most mature RSC implementation.
2. **Ecosystem size** — largest community, most third-party integrations, best Vercel deployment story.
3. **Full-stack in one repo** — Route Handlers and Server Actions eliminate the need for a separate API server for most use cases.
4. **AI agent support** — Next.js conventions (file-based routing, special file names) give agents predictable, unambiguous structure.

### Why pnpm Over npm/yarn

npm lacks strict dependency resolution (phantom dependencies can cause security issues and unpredictable builds). yarn v4 (Berry) has confusing PnP mode. pnpm combines speed, disk efficiency, and strictness with zero config overhead.

### Why Zod Over Yup/Joi/io-ts

Zod infers TypeScript types from schemas (`z.infer<typeof Schema>`), eliminating the "define type + define schema" duplication. Yup has weaker TS inference. Joi has no TS inference. io-ts is powerful but has a steep learning curve.

### Why Strict ESLint + Prettier + Husky

AI agents and human developers produce consistent code only when formatting and linting are automated and enforced. Without pre-commit hooks, code quality degrades over time. The ESLint config encodes project standards (arrow functions, type imports, import order, Tailwind rules) so they're enforced automatically, not just documented.

### Key Factors

1. **AI-optimized** — predictable file names, folder structure, and conventions let agents generate correct code without guessing.
2. **Server-first** — Server Components reduce client bundle size and enable direct database/API access.
3. **Type safety** — TypeScript strict + Zod + Prisma types create end-to-end type safety from database to UI.
4. **Automated quality** — ESLint + Prettier + Husky catch issues before they reach the repo.
5. **Opt-in complexity** — Only framework essentials are pre-installed. Auth, DB, testing, animation are added when needed.

## Options Considered

| Option                  | Description                | Why Chosen / Why Not                                       |
| ----------------------- | -------------------------- | ---------------------------------------------------------- |
| Next.js 15 (App Router) | Full-stack React framework | ✅ Chosen: RSC, streaming, file routing, largest ecosystem |
| Remix                   | Full-stack React framework | ❌ Smaller ecosystem, less AI tooling support              |
| Astro                   | Content-focused framework  | ❌ Not suited for interactive apps                         |
| Vite + React            | SPA framework              | ❌ No SSR/RSC, requires separate API server                |
| TypeScript strict       | Strict type checking       | ✅ Chosen: catches errors at compile time                  |
| pnpm                    | Package manager            | ✅ Chosen: fast, strict, disk-efficient                    |
| npm                     | Package manager            | ❌ Phantom dependencies, slower                            |
| Zod                     | Schema validation          | ✅ Chosen: best TS inference, runtime + types              |
| Yup                     | Schema validation          | ❌ Weaker TypeScript inference                             |

---

## Consequences

**Positive:**

- Unified full-stack framework eliminates API/frontend split complexity.
- TypeScript strict mode catches bugs at compile time before they reach production.
- pnpm prevents dependency confusion attacks and phantom dependencies.
- Zod provides a single source of truth for both types and runtime validation.
- File-based routing gives AI agents predictable, discoverable structure.
- ESLint + Prettier + Husky enforce standards automatically — no manual code review for formatting.
- Import ordering is consistent across the entire codebase.
- Opt-in complexity means projects start lean and add features as needed.

**Negative:**

- Team members must learn App Router paradigm (Server Components, async APIs) — mitigated by comprehensive docs.
- pnpm is less familiar than npm to some developers — mitigated by requiring only `pnpm install` and `pnpm dev`.
- Next.js vendor coupling — mitigated by keeping business logic in `lib/` and `contracts/`, which are framework-agnostic.
- Strict ESLint rules may slow initial development — mitigated by auto-fix on save and pre-commit hooks.
- Many opt-in features (auth, DB, testing) require additional setup — mitigated by step-by-step guides in each ADR.

## Related ADRs

- [ADR-0002](./0002-styling.md) — Styling (Tailwind CSS, design tokens, component libraries)
- [ADR-0003](./0003-animation.md) — Animation (Framer Motion, opt-in)
- [ADR-0004](./0004-components.md) — Components (tier system, Server Components default)
- [ADR-0005](./0005-data-fetching.md) — Data fetching (server-first, TanStack Query, service layer)
- [ADR-0006](./0006-environment.md) — Environment (Zod-validated env vars)
- [ADR-0007](./0007-error-handling.md) — Error handling (const object ErrorCode, AppError, Result<T>)
- [ADR-0008](./0008-middleware.md) — Middleware (Edge Runtime, security headers, composition)
- [ADR-0009](./0009-testing.md) — Testing (TDD, Vitest, Playwright, MSW)
- [ADR-0010](./0010-authentication.md) — Authentication (Auth.js, database sessions, RBAC)
- [ADR-0011](./0011-database.md) — Database (PostgreSQL, Prisma, connection pooling)
- [ADR-0012](./0012-forms.md) — Forms (tiered strategy, Server Actions, form UI primitives)
- [ADR-0013](./0013-seo-metadata.md) — SEO & Metadata (Metadata API, JSON-LD, sitemap, robots)
- [ADR-0014](./0014-logging-observability.md) — Logging & Observability (structured logger, Sentry, request correlation)
- [ADR-0015](./0015-email-notifications.md) — Email & Notifications (Resend, React Email, Sonner)
- [ADR-0016](./0016-file-upload-storage.md) — File Upload & Storage (UploadThing, S3/R2, presigned URLs)
- [ADR-0017](./0017-caching.md) — Caching (Next.js 15 explicit cache, ISR, unstable_cache, Upstash Redis)
- [ADR-0018](./0018-performance-platform.md) — Performance — Platform, Infrastructure & Core Web Vitals (next/image, next/font, Suspense, budgets)
- [ADR-0019](./0019-accessibility.md) — Accessibility (WCAG 2.1 AA, semantic HTML, axe-core, keyboard testing)
- [ADR-0020](./0020-state-management.md) — State Management (React built-ins first, Zustand for complex shared state)
- [ADR-0021](./0021-performance-react.md) — Performance — React Runtime & Rendering (useMemo, useCallback, useTransition, composition patterns)
- [ADR-0022](./0022-typescript-javascript-patterns.md) — TypeScript & JavaScript Patterns (type vs interface, discriminated unions, immutability, async, closures, equality)
