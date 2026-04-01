---
name: architecture-nextjs15
description: >-
  Next.js 15 breaking changes — async params, searchParams, cookies, headers, fetch
  caching defaults. Use when writing route handlers, page components, or server-side
  data access in Next.js 15.
---

# Architecture — Next.js 15 Patterns

**Compiled from**: ADR-0001 §Next.js 15 Breaking Changes
**Last synced**: 2026-02-28

---

## Async APIs (Breaking Change)

In Next.js 15, `params`, `searchParams`, `cookies()`, and `headers()` are all async:

```tsx
// ✅ Correct — Next.js 15
const { id } = await params
const { q } = await searchParams
const cookieStore = await cookies()
const headersList = await headers()
const data = await fetch(url, { cache: 'force-cache' })

// ❌ Broken in Next.js 15
const { id } = params // params is a Promise now
const cookieStore = cookies() // Must await
const data = await fetch(url) // NOT cached by default anymore
```

## Health Check Endpoint

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'

export const GET = async () =>
  NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
```
