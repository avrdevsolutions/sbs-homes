---
name: architecture-structure
description: >-
  Project structure, naming conventions, file organization, import ordering, ESLint/Prettier
  config, state management escalation. Use when creating new files, organizing folders,
  choosing naming patterns, or setting up project configuration.
---

# Architecture — Structure & Naming Patterns

**Compiled from**: ADR-0001 §Project Structure, Naming Conventions, File Conventions
**Last synced**: 2026-03-13

---

## Setup

### `tsconfig.json` Path Aliases

```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@contracts/*": ["./contracts/*"]
    }
  }
}
```

### `next.config.js` — Minimal

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig
```

---

## Project Structure

```
src/
  app/                         # Next.js App Router (pages, layouts, routes)
    api/                       # Route Handlers
    (auth)/                    # Auth pages route group
    (protected)/               # Protected pages route group
    (admin)/                   # Admin pages route group
    layout.tsx / page.tsx / error.tsx / global-error.tsx / not-found.tsx / globals.css
  components/
    ui/                        # Tier 1: Primitives (Button, Typography, Container, Stack, Section)
    features/                  # Tier 2: Domain-specific, organized by feature domain
      └── landing/             # Example domain folder
          ├── hero/            # Single-component feature
          └── pricing-card/    # Multi-component composition (all parts in one folder)
    layout/                    # Tier 3: Page structure (Header, Footer, Sidebar)
  lib/                         # Utilities: utils.ts, env.ts, errors.ts, api-utils.ts, auth/, db/, motion/, query/
  hooks/                       # Custom React hooks
  services/                    # API service layer (per-domain)
  providers/                   # React context providers
  middleware.ts                # Edge middleware
contracts/                     # Shared TypeScript types (API-only contracts)
docs/                          # Documentation
prisma/                        # Database schema + migrations (opt-in)
```

---

## Naming Conventions

| Type             | Convention                         | Example                    |
| ---------------- | ---------------------------------- | -------------------------- |
| Component file   | PascalCase                         | `UserProfile.tsx`          |
| Component folder | kebab-case                         | `user-profile/`            |
| Hook file        | camelCase + `use` prefix           | `useDebounce.ts`           |
| Utility file     | camelCase                          | `formatDate.ts`            |
| Service folder   | kebab-case (domain)                | `users/`                   |
| Route folder     | kebab-case                         | `send-email/`              |
| Test file        | Same name + `.test`                | `utils.test.ts`            |
| E2E file         | Descriptive + `.spec`              | `auth.spec.ts`             |
| Type file        | `types.ts`                         | Co-located                 |
| Constant         | UPPER_SNAKE_CASE or `const` object | `MAX_RETRIES`, `ErrorCode` |

### Next.js Special Files (MUST use exact names)

| File               | Purpose                         | Style                         |
| ------------------ | ------------------------------- | ----------------------------- |
| `page.tsx`         | Route page                      | `export default function`     |
| `layout.tsx`       | Shared layout                   | `export default function`     |
| `loading.tsx`      | Loading UI (Suspense)           | `export default function`     |
| `error.tsx`        | Error boundary (`'use client'`) | `export default function`     |
| `not-found.tsx`    | 404 page                        | `export default function`     |
| `global-error.tsx` | Root error boundary             | `export default function`     |
| `route.ts`         | API Route Handler               | Named exports (`GET`, `POST`) |
| `middleware.ts`    | Edge middleware                 | Named export `middleware`     |

---

## Code Style

### Function Declaration Style

```tsx
// Regular files — arrow functions
export const UserCard = ({ name }: UserCardProps) => { ... }
// Next.js special files — function declarations
export default function Page() { ... }
// Route Handlers — arrow function exports
export const GET = async (request: Request) => { ... }
```

### Type Import Convention

```tsx
import { type ReactNode } from 'react'
import type { User } from '@contracts/common'
```

### Const Object Pattern

```typescript
export const ErrorCode = { NOT_FOUND: 'NOT_FOUND', UNAUTHORIZED: 'UNAUTHORIZED' } as const
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]
```

### Import Ordering

```typescript
// 1. React → 2. Next.js → 3. External → 4. Internal (@/ including content) → 5. API Contracts (@contracts/) → 6. Relative
```

### State Management Escalation

| Option              | When To Use                           |
| ------------------- | ------------------------------------- |
| useState/useReducer | Local state                           |
| useContext          | >3 components need same state         |
| Zustand             | Complex cross-component mutable state |
| TanStack Query      | Server state caching                  |

---

## Configuration & Defaults

### ESLint Rules

| Rule                                     | Setting                      |
| ---------------------------------------- | ---------------------------- |
| `func-style`                             | `["error", "expression"]`    |
| `consistent-type-imports`                | `"error"` with inline style  |
| `no-explicit-any`                        | `"warn"`                     |
| `import/order`                           | `"error"`                    |
| `import/no-cycle`                        | `"error"`                    |
| `unused-imports/no-unused-imports`       | `"error"`                    |
| `no-console`                             | `"warn"` (allow error, warn) |
| `tailwindcss/no-contradicting-classname` | `"error"`                    |

### Prettier

| Setting         | Value |
| --------------- | ----- |
| `printWidth`    | 100   |
| `singleQuote`   | true  |
| `trailingComma` | "all" |
| `semi`          | false |

---

## Anti-Patterns

```tsx
// ❌ Relative paths crossing boundaries
import { cn } from '../../../lib/utils'
// ✅ Path aliases
import { cn } from '@/lib/utils'

// ❌ npm/yarn lockfiles — ✅ pnpm only
// ❌ Redux — ✅ Zustand if complex state needed
```
