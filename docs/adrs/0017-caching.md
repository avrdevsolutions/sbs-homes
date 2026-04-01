# ADR-0017: Caching Strategy

**Status**: Accepted
**Date**: 2026-02-27
**Supersedes**: N/A

---

## Context

Caching is the single most impactful performance optimization. A cache hit avoids a database query, an API call, or a computation entirely — turning a 200ms response into a 5ms response. Next.js 15 changed caching defaults significantly: `fetch` is **no longer cached by default** (it was in 14). This means every fetch call must explicitly opt into caching, or performance degrades silently.

This ADR defines the complete caching strategy — from Next.js built-in caching (fetch cache, Data Cache, Full Route Cache, Router Cache) to application-level caching (React `cache()`, `unstable_cache`, revalidation) to external caching (Upstash Redis — opt-in). The strategy must cover when to cache, how long, how to invalidate, and how to avoid stale data.

## Decision

**Explicit caching on every `fetch` call (Next.js 15 requires it). `unstable_cache` for database queries. `revalidatePath`/`revalidateTag` for on-demand invalidation. Upstash Redis for rate limiting and session-independent server cache (opt-in).**

---

## ⚠️ Next.js 15 Breaking Change (Critical)

```tsx
// ❌ Next.js 14 — fetch was cached by default
const data = await fetch('https://api.example.com/posts')
// This WAS cached automatically. In Next.js 15, it is NOT.

// ✅ Next.js 15 — explicit cache required
const data = await fetch('https://api.example.com/posts', {
  cache: 'force-cache',  // Static data — cache indefinitely until revalidated
})

const data = await fetch('https://api.example.com/posts', {
  next: { revalidate: 60 },  // Revalidate every 60 seconds (ISR)
})

const data = await fetch('https://api.example.com/posts', {
  cache: 'no-store',  // Never cache — always fresh (dynamic data)
})
```

**If you don't set a cache option, the request hits the origin every time.** This is the #1 performance regression when migrating to Next.js 15.

---

## Rules

| Rule | Level |
|------|-------|
| Every `fetch` call MUST have an explicit cache option | **MUST** |
| Database queries in Server Components SHOULD use `unstable_cache` or React `cache` | **SHOULD** |
| Mutations (Server Actions, POST/PUT/DELETE) MUST call `revalidatePath` or `revalidateTag` | **MUST** |
| Never cache user-specific data in shared caches (use `cache: 'no-store'` or per-user cache keys) | **MUST NOT** |
| Use `revalidateTag` over `revalidatePath` when possible (more precise) | **SHOULD** |
| Set reasonable `revalidate` values — not too short (defeats purpose), not too long (stale data) | **SHOULD** |
| Don't cache error responses | **MUST NOT** |
| Log cache misses for critical paths in production (ADR-0014) | **SHOULD** |

---

## Next.js 15 Cache Layers (How They Work Together)

```
Browser ──► Router Cache (client, in-memory, 30s-5min)
  │
  ├── Static page → Full Route Cache (server, built at build time)
  │
  └── Dynamic page → Data Cache (server, per-fetch)
                        │
                        ├── fetch with cache: 'force-cache' → Cached indefinitely
                        ├── fetch with next: { revalidate: N } → Cached for N seconds
                        └── fetch with cache: 'no-store' → No cache (always fresh)
```

| Cache Layer | Where | What It Caches | How To Invalidate |
|------------|-------|---------------|-------------------|
| **Router Cache** | Client (browser memory) | Prefetched routes, back/forward navigation | `router.refresh()`, navigation, auto-expires |
| **Full Route Cache** | Server (CDN/build) | Complete rendered HTML of static pages | `revalidatePath()`, `revalidateTag()`, redeploy |
| **Data Cache** | Server (CDN) | Individual `fetch` responses | `revalidateTag()`, `revalidatePath()`, time-based |
| **React `cache()`** | Server (per-request) | Deduplicated function calls within ONE render | Auto — scoped to single request |
| **`unstable_cache`** | Server (persistent) | Database queries, computations | `revalidateTag()`, time-based |

---

## Fetch Caching Patterns

### Static Data (Rarely Changes)

```typescript
// Blog posts list, product catalog, site configuration
// Cache forever — invalidate with revalidateTag when content changes
const posts = await fetch('https://api.example.com/posts', {
  cache: 'force-cache',
  next: { tags: ['posts'] },
})
```

### Semi-Dynamic Data (Changes Periodically)

```typescript
// Dashboard stats, trending content, weather
// ISR: serve cached version, revalidate in background after N seconds
const stats = await fetch('https://api.example.com/stats', {
  next: { revalidate: 60 },  // Revalidate every 60 seconds
})

const trending = await fetch('https://api.example.com/trending', {
  next: { revalidate: 300, tags: ['trending'] },  // 5 minutes + tag for manual invalidation
})
```

### Dynamic Data (Always Fresh)

```typescript
// User-specific data, shopping cart, real-time prices
const cart = await fetch('https://api.example.com/cart', {
  cache: 'no-store',  // Never cache — always hit origin
  headers: { Authorization: `Bearer ${token}` },
})
```

### Revalidation Cheat Sheet

| Data Type | Strategy | `revalidate` | Example |
|-----------|----------|-------------|---------|
| Site config, legal pages | `force-cache` + tag | — | Config, terms of service |
| Blog posts, CMS content | `force-cache` + tag | — | Invalidate when editor publishes |
| Product catalog | ISR + tag | 300 (5 min) | Revalidate on price change |
| Dashboard analytics | ISR | 60 (1 min) | Time-based freshness |
| News feed, trending | ISR | 300 (5 min) | Time-based freshness |
| User profile, cart | `no-store` | — | Always fresh, per-user |
| Search results | `no-store` | — | Dynamic query params |
| Real-time data | `no-store` | — | Stock prices, live scores |

---

## Database Query Caching

### React `cache()` — Per-Request Deduplication

```typescript
// src/lib/db/queries/posts.ts
import { cache } from 'react'

import { db } from '@/lib/db'

/**
 * Get a single post by slug.
 * Deduplicated within a single request — if called by both
 * generateMetadata() and the page component, the DB is hit once.
 */
export const getPostBySlug = cache(async (slug: string) => {
  return db.post.findUnique({
    where: { slug, published: true },
    include: { author: true },
  })
})
```

**Key**: React `cache()` is scoped to a single server render. It does NOT persist across requests. Its purpose is **deduplication** — calling the same function twice in one render only hits the DB once.

### `unstable_cache` — Persistent Cross-Request Cache

```typescript
// src/lib/db/queries/posts.ts
import { unstable_cache } from 'next/cache'

import { db } from '@/lib/db'

/**
 * Get all published posts.
 * Cached across requests — revalidated by tag when posts change.
 */
export const getPublishedPosts = unstable_cache(
  async () => {
    return db.post.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true } } },
    })
  },
  ['published-posts'],         // Cache key
  {
    tags: ['posts'],           // Invalidation tag
    revalidate: 300,           // Also revalidate every 5 minutes as safety net
  },
)

/**
 * Get post by slug — cached with dynamic key.
 */
export const getCachedPostBySlug = unstable_cache(
  async (slug: string) => {
    return db.post.findUnique({
      where: { slug, published: true },
      include: { author: true },
    })
  },
  ['post-by-slug'],
  {
    tags: ['posts'],
    revalidate: 300,
  },
)
```

### When to Use Which

```
Same function called multiple times in ONE render (metadata + page)?
  → React cache() — deduplication within one request

Data that's the same for all users and changes infrequently?
  → unstable_cache — persistent, tagged, revalidatable

User-specific data?
  → Don't cache in shared cache. Use React cache() for dedup only.

External API call in a Server Component?
  → Use fetch with explicit cache option (force-cache, revalidate, or no-store)
```

---

## Cache Invalidation (On-Demand)

When data changes (Server Action creates/updates/deletes), invalidate the relevant cache:

### By Tag (Preferred — Precise)

```typescript
// src/app/(admin)/cms/posts/_actions/createPost.ts
'use server'

import { revalidateTag } from 'next/cache'

export const createPost = async (input: unknown): ServerActionResult<Post> => {
  // ... validate and create post ...
  
  revalidateTag('posts')  // Invalidates all caches tagged with 'posts'
  return { ok: true, value: post }
}

export const updatePost = async (id: string, input: unknown): ServerActionResult<Post> => {
  // ... validate and update ...
  
  revalidateTag('posts')         // Invalidates post list
  revalidateTag(`post-${id}`)    // Invalidates this specific post
  return { ok: true, value: post }
}
```

### By Path (Broader — Invalidates Entire Route)

```typescript
import { revalidatePath } from 'next/cache'

// Invalidate a specific page
revalidatePath('/blog')

// Invalidate a dynamic route
revalidatePath(`/blog/${slug}`)

// Invalidate an entire route layout
revalidatePath('/blog', 'layout')

// Nuclear option — invalidate everything
revalidatePath('/', 'layout')
```

### Tag vs Path: When to Use Which

| Scenario | Use | Why |
|----------|-----|-----|
| CMS content updated | `revalidateTag('posts')` | Invalidates post data in all routes that use it |
| User profile updated | `revalidatePath(`/profile/${userId}`)` | Only that profile page needs refreshing |
| Settings changed | `revalidatePath('/settings')` | One specific page |
| Multiple related data changed | `revalidateTag` for each | More precise than path |
| "Purge everything" admin action | `revalidatePath('/', 'layout')` | Last resort |

---

## External Cache: Upstash Redis (Opt-In)

For caching that goes beyond Next.js built-in caching (rate limiting, session-independent cache, cross-service cache):

### When to Add Redis

```
Do you need rate limiting (ADR-0008)?
  → YES: Upstash Redis (already recommended in ADR-0008)
Do you need to cache expensive computations across deploys?
  → YES: Upstash Redis
Do you need a shared cache between multiple serverless functions?
  → YES: Upstash Redis
Is Next.js built-in caching sufficient?
  → YES: Don't add Redis
```

### Installation

```bash
pnpm add @upstash/redis
```

### Setup

```typescript
// src/lib/cache/redis.ts
import { Redis } from '@upstash/redis'

import { env } from '@/lib/env'

export const redis = env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

export const isRedisConfigured = (): boolean => redis !== null
```

### Typed Cache Helper

```typescript
// src/lib/cache/index.ts
import { logger } from '@/lib/logger'

import { redis, isRedisConfigured } from './redis'

type CacheOptions = {
  /** Time-to-live in seconds */
  ttl: number
}

/**
 * Get-or-set cache pattern.
 * If Redis is configured, uses Redis. Otherwise falls through to the factory function.
 */
export const cached = async <T>(
  key: string,
  factory: () => Promise<T>,
  options: CacheOptions,
): Promise<T> => {
  if (!isRedisConfigured() || !redis) {
    return factory()
  }

  // Try cache
  const cached = await redis.get<T>(key)
  if (cached !== null) {
    logger.debug('Cache hit', { key })
    return cached
  }

  // Cache miss — compute and store
  logger.debug('Cache miss', { key })
  const value = await factory()
  await redis.set(key, value, { ex: options.ttl })
  return value
}

/**
 * Invalidate a cache key or pattern.
 */
export const invalidateCache = async (key: string): Promise<void> => {
  if (!redis) return
  await redis.del(key)
  logger.debug('Cache invalidated', { key })
}
```

### Usage

```typescript
import { cached, invalidateCache } from '@/lib/cache'

// Cache an expensive computation for 5 minutes
const analytics = await cached(
  'dashboard:analytics:weekly',
  async () => computeWeeklyAnalytics(),
  { ttl: 300 },
)

// Invalidate when data changes
await invalidateCache('dashboard:analytics:weekly')
```

---

## Caching Decision Flowchart

```
Is the data the same for all users?
  NO → cache: 'no-store' (or React cache() for request dedup only)
  YES ↓

Does it change frequently (< 1 minute)?
  YES → cache: 'no-store' or next: { revalidate: 30 }
  NO ↓

Does it change on specific events (CMS publish, user action)?
  YES → force-cache + revalidateTag('tag-name')
  NO ↓

Does it change periodically but timing doesn't matter?
  YES → next: { revalidate: N } (ISR)
  NO ↓

Is it truly static (legal pages, config)?
  YES → force-cache (no revalidation needed)
```

---

## Performance Impact Examples

| Scenario | Without Cache | With Cache | Speedup |
|----------|-------------|-----------|---------|
| Blog post page (DB query) | ~200ms | ~5ms (Full Route Cache) | **40x** |
| Product listing (API call) | ~300ms | ~10ms (Data Cache, ISR 60s) | **30x** |
| Dashboard stats (complex query) | ~500ms | ~5ms (unstable_cache, tag revalidation) | **100x** |
| User profile (per-user) | ~150ms | ~150ms (no shared cache — use React cache for dedup) | **1x** (dedup saves repeated calls) |

---

## Anti-Patterns

```typescript
// ❌ No cache option on fetch (NOT cached in Next.js 15!)
const data = await fetch('https://api.example.com/posts')

// ✅ Always explicit
const data = await fetch('https://api.example.com/posts', { cache: 'force-cache' })

// ❌ Caching user-specific data in shared cache
export const getUserProfile = unstable_cache(async (userId: string) => {
  return db.user.findUnique({ where: { id: userId } })
}, ['user-profile'])  // Other users see this user's data!

// ✅ Don't cache per-user data in shared cache
export const getUserProfile = cache(async (userId: string) => {
  return db.user.findUnique({ where: { id: userId } })
})  // React cache() — deduplicated per request only

// ❌ Mutation without revalidation — stale data persists
export const createPost = async (data) => {
  await db.post.create({ data })
  // Forgot to revalidate! Cached post lists are now stale.
}

// ✅ Always revalidate after mutation
export const createPost = async (data) => {
  await db.post.create({ data })
  revalidateTag('posts')
}

// ❌ Caching error responses
export const getPost = unstable_cache(async (slug: string) => {
  const post = await db.post.findUnique({ where: { slug } })
  if (!post) return null  // null gets cached — post will 404 even after creation!
})

// ✅ Don't cache not-found results (or cache with very short TTL)
export const getPost = unstable_cache(async (slug: string) => {
  const post = await db.post.findUnique({ where: { slug } })
  if (!post) throw new Error('not-found')  // Throws aren't cached
  return post
}, ['post'], { tags: ['posts'] })

// ❌ Revalidating too broadly
revalidatePath('/', 'layout')  // Nukes EVERYTHING — rarely needed

// ✅ Revalidate precisely
revalidateTag('posts')  // Only post-related caches
```

---

## Rationale

### Why Explicit Caching Over Automatic

Next.js 14 cached fetch by default — which led to subtle bugs where developers didn't realize data was cached, and stale data appeared in production. Next.js 15 flipped the default: nothing is cached unless you say so. This is safer but requires explicit decisions. This ADR ensures every fetch has a conscious caching choice.

### Why `unstable_cache` Over Custom Cache Layer

`unstable_cache` integrates with Next.js's revalidation system — `revalidateTag` works automatically. A custom Redis cache requires manual invalidation logic. For most use cases, `unstable_cache` is sufficient. Redis is recommended only when you need cross-deploy, cross-function cache or rate limiting.

### Why Upstash Over Self-Hosted Redis

Upstash provides serverless Redis with a REST API — compatible with Edge Runtime and Vercel serverless functions. Self-hosted Redis requires a persistent server, which conflicts with serverless deployment. Upstash's free tier (10,000 commands/day) covers development and small production workloads.

### Key Factors
1. **Next.js 15 defaults** — fetch is NOT cached by default; explicit options prevent performance regressions.
2. **Tag-based invalidation** — `revalidateTag` is more precise than `revalidatePath`, reducing unnecessary cache busting.
3. **Layer separation** — React `cache()` for dedup, `unstable_cache` for persistence, Redis for cross-service.
4. **Safety** — no shared caching of user-specific data; no caching of error responses.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| Next.js built-in caching | fetch cache + Data Cache + unstable_cache | ✅ Chosen: zero config, tag revalidation, ISR |
| Upstash Redis | Serverless Redis | ✅ Chosen (opt-in): rate limiting, cross-deploy cache |
| Self-hosted Redis | Persistent Redis server | ❌ Incompatible with serverless deployment |
| memcached | In-memory cache | ❌ Same serverless incompatibility |
| React `cache()` | Per-request deduplication | ✅ Chosen: complementary to persistent cache |

---

## Consequences

**Positive:**
- Every fetch has an explicit caching strategy — no accidental uncached requests.
- Tag-based invalidation enables precise cache busting without over-invalidating.
- `unstable_cache` integrates natively with Next.js revalidation.
- Redis is opt-in — most projects don't need it.
- Clear decision flowchart helps agents choose the right strategy per data type.
- ISR (Incremental Static Regeneration) provides a middle ground between static and dynamic.

**Negative:**
- `unstable_cache` API may change (it's "unstable") — mitigated by Next.js team's commitment to the pattern.
- Developers must remember to revalidate after every mutation — mitigated by making it a MUST rule.
- Over-caching leads to stale data; under-caching leads to slow pages — mitigated by the cheat sheet and flowchart.
- Redis adds a dependency and potential point of failure — mitigated by being opt-in with fallthrough.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (Next.js 15 caching defaults)
- [ADR-0005](./0005-data-fetching.md) — Data fetching (fetch with explicit cache, Server Component patterns)
- [ADR-0008](./0008-middleware.md) — Middleware (rate limiting with Upstash Redis)
- [ADR-0011](./0011-database.md) — Database (query caching with unstable_cache)

