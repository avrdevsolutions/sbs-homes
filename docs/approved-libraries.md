# Approved Libraries

> **Policy:** No new dependency may be added without an entry here. Update this file in the same PR that adds the package.

---

## Package Manager

**Required:** pnpm 9+ — npm and yarn are forbidden.

```bash
corepack enable && corepack prepare pnpm@latest --activate
```

---

## Installed Dependencies

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.5.x | Framework |
| `react` | ^18.3 | UI runtime |
| `react-dom` | ^18.3 | DOM renderer |
| `motion` | ^12.38 | Animation (Framer Motion v12) — per [ADR-0003](adrs/0003-animation.md) |
| `clsx` | ^2.1 | Conditional className utility |
| `tailwind-merge` | ^2.5 | Merge Tailwind classes |
| `zod` | ^3.24 | Schema validation |

### Dev / Tooling

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.7 | Type checking |
| `eslint` | ^8.57 | Linting |
| `eslint-config-next` | 15.5.x | Next.js ESLint rules |
| `@typescript-eslint/*` | ^8.56 | TypeScript linting |
| `eslint-plugin-import` | ^2.32 | Import validation |
| `eslint-plugin-unused-imports` | ^4.4 | Remove unused imports |
| `eslint-plugin-tailwindcss` | ^3.18 | Tailwind best practices |
| `eslint-import-resolver-typescript` | ^3.10 | TS import resolution |
| `prettier` | ^3.8 | Code formatting |
| `prettier-plugin-tailwindcss` | ^0.7 | Tailwind class sorting |
| `tailwindcss` | ^3.4 | Styling framework |
| `postcss` | ^8.5 | CSS transforms |
| `autoprefixer` | latest | Vendor prefixes |
| `husky` | ^9.1 | Git hooks |
| `lint-staged` | ^15.3 | Staged file linting |
| `@types/node` | ^20 | Node type defs |
| `@types/react` | ^18 | React type defs |
| `@types/react-dom` | ^18 | React DOM type defs |

---

## Pre-Approved (Install When Needed)

### Client Data Fetching

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `@tanstack/react-query` | `pnpm add @tanstack/react-query` | Any client-side data fetching (sole choice) | ADR-0005 |
| `@tanstack/react-query-devtools` | `pnpm add -D @tanstack/react-query-devtools` | Dev-only query inspector (install with TanStack Query) | ADR-0005 |
| `@lukemorales/query-key-factory` | `pnpm add @lukemorales/query-key-factory` | Required with TanStack Query — typed query keys | ADR-0005 |

### Forms

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `react-hook-form` | `pnpm add react-hook-form` | Medium/complex forms (>5 fields, as-you-type validation) — NOT needed for simple forms | ADR-0012 |
| `@hookform/resolvers` | `pnpm add @hookform/resolvers` | With react-hook-form (Zod resolver) | ADR-0012 |

### UI

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `lucide-react` | `pnpm add lucide-react` | When icons are needed | ADR-0001 |
| `sonner` | `pnpm add sonner` | Toast notifications | ADR-0001 |
| shadcn/ui | `pnpm dlx shadcn-ui@latest init` | Accessible components | ADR-0002 |
| `class-variance-authority` | `pnpm add class-variance-authority` | Component variant management (used by shadcn/ui) | ADR-0002 |

### Animation

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `framer-motion` | `pnpm add framer-motion` | When animation is explicitly requested | ADR-0003 |

### Storybook (Opt-In)

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `storybook` | `pnpm dlx storybook@latest init` | 5+ reusable UI components | ADR-0002 |
| `@storybook/react` | Auto-installed by init | React renderer | ADR-0002 |
| `@storybook/nextjs` | Auto-installed by init | Next.js framework support | ADR-0002 |
| `@storybook/addon-essentials` | Auto-installed by init | Controls, docs, viewport | ADR-0002 |
| `@chromatic-com/storybook` | `pnpm add -D @chromatic-com/storybook` | Visual regression testing (optional) | ADR-0002 |

### State

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `zustand` | `pnpm add zustand` | >3 components sharing complex state (see escalation path) | ADR-0020 |

### Testing (Opt-In — Install When First Test Written)

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `vitest` | `pnpm add -D vitest` | When first unit/component test is written | ADR-0009 |
| `@vitejs/plugin-react` | `pnpm add -D @vitejs/plugin-react` | With Vitest (JSX transform) | ADR-0009 |
| `happy-dom` | `pnpm add -D happy-dom` | With Vitest (fast DOM environment) | ADR-0009 |
| `@testing-library/react` | `pnpm add -D @testing-library/react` | Component testing (user-centric) | ADR-0009 |
| `@testing-library/jest-dom` | `pnpm add -D @testing-library/jest-dom` | Custom DOM matchers | ADR-0009 |
| `@testing-library/user-event` | `pnpm add -D @testing-library/user-event` | Simulate real user interactions | ADR-0009 |
| `msw` | `pnpm add -D msw` | Network-level API mocking (Vitest + Storybook) | ADR-0009 |
| `@playwright/test` | `pnpm add -D @playwright/test` | When first E2E test is written | ADR-0009 |

### Infrastructure

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `@t3-oss/env-nextjs` | `pnpm add @t3-oss/env-nextjs` | Enhanced env validation | ADR-0006 |
| `next-auth` | `pnpm add next-auth@beta` | Authentication needed | ADR-0010 |
| `@auth/prisma-adapter` | `pnpm add @auth/prisma-adapter` | With next-auth + Prisma | ADR-0010 |
| `@prisma/client` | `pnpm add @prisma/client` | Database needed | ADR-0011 |
| `prisma` | `pnpm add -D prisma` | Database needed | ADR-0011 |

### Logging & Observability

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `@sentry/nextjs` | `pnpm dlx @sentry/wizard@latest -i nextjs` | Before production launch (recommended) | ADR-0014 |
| `@vercel/analytics` | `pnpm add @vercel/analytics` | Core Web Vitals monitoring (Vercel deploys) | ADR-0014 |
| `@vercel/speed-insights` | `pnpm add @vercel/speed-insights` | Detailed performance data (Vercel deploys) | ADR-0014 |
| `@axiomhq/nextjs` | `pnpm add @axiomhq/nextjs` | Log aggregation beyond Vercel logs | ADR-0014 |

### Email & Notifications

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `resend` | `pnpm add resend` | Transactional email needed | ADR-0015 |
| `@react-email/components` | `pnpm add @react-email/components` | Building email templates | ADR-0015 |
| `react-email` | `pnpm add react-email` | Email template dev server (preview) | ADR-0015 |
| `sonner` | `pnpm add sonner` | Toast notifications | ADR-0015 |

### File Upload

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `uploadthing` | `pnpm add uploadthing` | File uploads (zero-infra) | ADR-0016 |
| `@uploadthing/react` | `pnpm add @uploadthing/react` | React hooks for UploadThing | ADR-0016 |
| `@aws-sdk/client-s3` | `pnpm add @aws-sdk/client-s3` | Self-managed S3/R2 storage | ADR-0016 |
| `@aws-sdk/s3-request-presigner` | `pnpm add @aws-sdk/s3-request-presigner` | Presigned upload URLs | ADR-0016 |

### Caching

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `@upstash/redis` | `pnpm add @upstash/redis` | Redis caching, rate limiting | ADR-0017 |

### Performance

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `@next/bundle-analyzer` | `pnpm add -D @next/bundle-analyzer` | Bundle size analysis | ADR-0018 |

### Accessibility Testing

| Package | Install | When | ADR |
|---------|---------|------|-----|
| `jest-axe` | `pnpm add -D jest-axe @types/jest-axe` | Automated a11y testing in Vitest | ADR-0019 |
| `eslint-plugin-jsx-a11y` | `pnpm add -D eslint-plugin-jsx-a11y` | Static a11y analysis in JSX | ADR-0019 |

---

## Forbidden

| Package | Reason |
|---------|--------|
| `axios` | Use native `fetch` — Axios bypasses Next.js cache (ADR-0005) |
| `swr` | Use TanStack Query — SWR lacks query key management, optimistic mutations, structural sharing (ADR-0005) |
| `styled-components` | Use Tailwind (ADR-0002) |
| `@emotion/*` | Use Tailwind (ADR-0002) |
| `@mui/material` | CSS-in-JS runtime, conflicts with RSC + Tailwind (ADR-0002) |
| `@chakra-ui/*` | CSS-in-JS runtime, conflicts with RSC + Tailwind (ADR-0002) |
| `antd` | Own styling system, massive bundle, not Tailwind-compatible (ADR-0002) |
| `@mantine/*` | CSS-in-JS runtime, conflicts with RSC + Tailwind (ADR-0002) |
| `redux` / `@reduxjs/toolkit` | Use React built-ins or Zustand — see ADR-0020 for full rationale |
| `jotai` | Use React built-ins or Zustand (ADR-0020) |
| `recoil` | Deprecated; use React built-ins or Zustand (ADR-0020) |
| `mobx` / `mobx-react-lite` | Proxy-based, Provider required, conflicts with server-first (ADR-0020) |
| `valtio` | Proxy-based, not needed given Zustand (ADR-0020) |
| `react-helmet` / `next-seo` | Use Next.js Metadata API (ADR-0013) |
| `npm` / `yarn` | Use pnpm only |










