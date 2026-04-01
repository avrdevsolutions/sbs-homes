---
name: sanity-cms-testing-client-fetch
description: >-
  Sanity CMS testing and client-side data patterns — testing strategy table by
  layer (Vitest for adapters/image helpers/webhook, RTL for Portable Text,
  Playwright for pages), adapter unit test examples with typegen input types,
  MSW v2 handler pattern for mocking Sanity GROQ API endpoint by query content,
  webhook handler test structure with vi.mock for revalidateTag, server-side vs
  client-side Sanity fetch decision tree (static page vs interactive filtering
  vs infinite scroll vs real-time), Route Handler proxy architecture diagram
  (client → useQuery → /api/cms → sanityFetch → Sanity), complete Route Handler
  example, TanStack Query hook with Zod validation in queryFn, query key factory
  with @lukemorales/query-key-factory, rules for client-side Sanity data, when
  NOT to use TanStack Query for Sanity, complete anti-pattern catalog (data
  fetching, caching, Visual Editing, architecture). Use when writing Vitest tests
  for Sanity adapters or webhook handlers, mocking Sanity GROQ queries with MSW
  in tests, implementing client-side Sanity search or infinite scroll with
  TanStack Query via Route Handler, or auditing code for Sanity anti-patterns.
---

# Sanity CMS — Testing & Client-Side Data

**Compiled from**: ADR-0032 Parts 14–15 and Anti-Patterns (Testing, Client-Side CMS Data, Anti-Pattern Catalog)
**Last synced**: 2026-03-31

---

## Part 14: Testing Sanity Integration

### Testing Strategy

| Layer                   | Tool         | What to Test                                     |
| ----------------------- | ------------ | ------------------------------------------------ |
| Adapter functions       | Vitest       | GROQ result → frontend type transformation       |
| Portable Text rendering | Vitest + RTL | Component map renders correct HTML/classes       |
| Image helpers           | Vitest       | `urlFor` produces correct CDN URLs               |
| Webhook handler         | Vitest       | Signature validation, revalidation calls         |
| Page integration        | Playwright   | Sanity-driven pages render with expected content |

### Adapter Unit Tests

```typescript
// src/lib/sanity/adapters/__tests__/posts.test.ts
import { describe, expect, it } from 'vitest'

import { toPostCard } from '../posts'

describe('toPostCard', () => {
  it('transforms a GROQ result to PostCard', () => {
    const raw = {
      _id: 'abc123',
      title: 'Test Post',
      slug: { current: 'test-post' },
      excerpt: 'A test excerpt',
      publishedAt: '2026-04-01',
      mainImage: null,
    }

    const result = toPostCard(raw)

    expect(result).toEqual({
      id: 'abc123',
      title: 'Test Post',
      slug: 'test-post',
      excerpt: 'A test excerpt',
      publishedAt: '2026-04-01',
      imageUrl: null,
      imageAlt: '',
    })
  })

  it('handles missing fields with defaults', () => {
    const raw = {
      _id: 'abc',
      title: null,
      slug: null,
      excerpt: null,
      publishedAt: null,
      mainImage: null,
    }
    const result = toPostCard(raw)
    expect(result.title).toBe('Untitled')
    expect(result.slug).toBe('')
  })
})
```

### Mocking Sanity GROQ with MSW v2

Mock the Sanity GROQ API endpoint by inspecting the `query` parameter:

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const sanityHandlers = [
  http.get('https://:projectId.api.sanity.io/:version/data/query/:dataset', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('query')

    // Return different fixtures based on the GROQ query content
    if (query?.includes('_type == "post"')) {
      return HttpResponse.json({
        result: [{ _id: 'post-1', title: 'Mock Post', slug: { current: 'mock-post' } }],
      })
    }

    return HttpResponse.json({ result: [] })
  }),
]
```

### Webhook Handler Tests

```typescript
// src/app/api/revalidate/__tests__/route.test.ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}))

describe('POST /api/revalidate', () => {
  it('rejects invalid signatures', async () => {
    // Build a request with an invalid signature, assert 401 response
  })

  it('revalidates tag on valid request', async () => {
    // Build a properly signed request with { _type: 'post' }
    // Assert revalidateTag was called with 'post'
  })

  it('returns 400 for missing _type', async () => {
    // Build a valid signature but omit _type
    // Assert 400 response
  })
})
```

---

## Part 15: Client-Side Sanity Data with TanStack Query

Most Sanity data is server-fetched in Server Components. Use client-side fetching only when interactivity requires it.

### Decision Tree

```
Does the UI need Sanity data?
│
├── Static page rendering (blog post, portfolio, landing page)
│   └── Server Component + sanityFetch ← DEFAULT
│
├── Interactive filtering / search of Sanity content
│   └── TanStack Query + Route Handler proxy
│
├── Infinite scroll / Load More of Sanity lists
│   └── TanStack Query useInfiniteQuery + Route Handler proxy
│
├── Polling for Sanity-sourced dashboard data
│   └── TanStack Query with refetchInterval + Route Handler proxy
│
└── Real-time updates when editors publish
    └── SanityLive component ← NOT TanStack Query
```

### Architecture: Route Handler Proxy

Client components **never** import Sanity client code or hold API tokens. A Route Handler proxies the request and is the only path to the Sanity API from the client:

```
Client Component → useQuery → fetch('/api/cms/posts?q=...') → Route Handler → sanityFetch → Sanity
```

```typescript
// src/app/api/cms/posts/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { client } from '@/lib/sanity/client'
import { POSTS_SEARCH_QUERY } from '@/lib/sanity/queries/posts'

export const GET = async (req: NextRequest) => {
  const { searchParams } = req.nextUrl
  const query = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? '0')
  const limit = 12

  const results = await client.fetch(
    POSTS_SEARCH_QUERY,
    { searchTerm: `*${query}*`, start: page * limit, end: (page + 1) * limit },
    {
      next: { revalidate: 30 }, // Short cache for search results
    },
  )

  return NextResponse.json({ data: results })
}
```

### TanStack Query Hook

```typescript
// src/services/cms-posts/queries.ts
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

const CmsPostsResponseSchema = z.object({
  data: z.array(
    z.object({
      _id: z.string(),
      title: z.string().nullable(),
      slug: z.object({ current: z.string() }).nullable(),
    }),
  ),
})

const fetchCmsPosts = async (searchTerm: string) => {
  const res = await fetch(`/api/cms/posts?q=${encodeURIComponent(searchTerm)}`)
  if (!res.ok) throw new Error('Failed to fetch CMS posts')
  return res.json()
}

export const useCmsPostsSearch = (searchTerm: string) =>
  useQuery({
    queryKey: ['cmsPosts', 'search', searchTerm],
    queryFn: async () => {
      const json = await fetchCmsPosts(searchTerm)
      return CmsPostsResponseSchema.parse(json) // Zod validates at boundary
    },
    enabled: searchTerm.length >= 2, // Don't search for < 2 chars
  })

export const useCmsPostsInfinite = () =>
  useInfiniteQuery({
    queryKey: ['cmsPosts', 'all'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/cms/posts?page=${pageParam}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      return CmsPostsResponseSchema.parse(json)
    },
    getNextPageParam: (lastPage, pages) => (lastPage.data.length === 12 ? pages.length : undefined),
    initialPageParam: 0,
  })
```

### Query Key Factory

```typescript
// src/services/cms-posts/queryKeys.ts
import { createQueryKeys } from '@lukemorales/query-key-factory'

export const cmsPostKeys = createQueryKeys('cmsPosts', {
  all: { queryKey: null },
  search: (term: string) => ({ queryKey: [term] }),
  byCategory: (category: string) => ({ queryKey: [category] }),
})
```

### Rules for Client-Side Sanity Data

| Rule                                                                                  | Level      |
| ------------------------------------------------------------------------------------- | ---------- |
| Client-side Sanity data MUST go via a Route Handler proxy — never call directly       | **MUST**   |
| Route Handler MUST NOT expose `SANITY_API_READ_TOKEN` in JSON output                  | **MUST**   |
| Use `@lukemorales/query-key-factory` for all Sanity TanStack Query keys               | **MUST**   |
| Validate Route Handler responses with Zod inside `queryFn`                            | **MUST**   |
| Prefer server-side Sanity fetching — use client-side only when interactivity requires | **SHOULD** |
| Debounce search inputs 200–300ms before triggering queries                            | **SHOULD** |

### When NOT to Use TanStack Query for Sanity

| Scenario                                    | Use Instead                                   |
| ------------------------------------------- | --------------------------------------------- |
| Static page rendering (post, portfolio)     | Server Component + `sanityFetch`              |
| Real-time updates from editor               | `SanityLive` component                        |
| `generateMetadata` / `generateStaticParams` | Server-side `sanityFetch` with `stega: false` |
| Content without interactive filtering       | Server Component — no client JS               |

---

## Anti-Patterns

### Data Fetching

| Anti-Pattern                                  | Why It's Wrong                                             | Correct Pattern                                      |
| --------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `client.fetch()` directly in page components  | No caching control, no Draft Mode support                  | Use `sanityFetch` from `defineLive` or manual helper |
| `useEffect` + `fetch` for Sanity data         | Bypasses proxy, no Zod validation, no query key management | TanStack Query + Route Handler proxy                 |
| `fetch(sanityUrl)` with raw URL construction  | Bypasses client CDN, auth, and stega handling              | Use `sanityFetch` which handles all config           |
| Importing `@sanity/client` in page components | Breaks the data-access layer boundary                      | Import from `@/lib/sanity/` only                     |
| Calling Sanity API from client components     | Exposes token, bypasses cache, no SSR                      | Route Handler proxy + TanStack Query                 |
| TanStack Query for static CMS page data       | Unnecessary client JS — Server Components are zero-JS      | Server Component + `sanityFetch`                     |

### Caching

| Anti-Pattern                                   | Why It's Wrong                                              | Correct Pattern                                       |
| ---------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| No cache option on Sanity fetches              | Next.js 15 doesn't cache by default — hits API every render | Always set `tags` or `revalidate` explicitly          |
| `tags` AND `revalidate` on same fetch          | Mutually exclusive — tag wins, `revalidate` ignored         | Tags with `revalidate: false`, or `revalidate` alone  |
| `revalidate: 1` as "always fresh"              | Creates thundering herd — use `cache: 'no-store'` instead   | `no-store` for truly dynamic, or reasonable intervals |
| Revalidating without `waitForContentLakeEvent` | Webhook fires before CDN propagates → fetches stale data    | Set `parseBody(..., ..., true)` in webhook handler    |

### Visual Editing

| Anti-Pattern                               | Why It's Wrong                                       | Correct Pattern                                             |
| ------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------- |
| Stega enabled in `generateMetadata`        | Invisible chars corrupt `<title>`, `<meta>`, JSON-LD | Always `stega: false` for metadata and structured data      |
| Stega in `generateStaticParams`            | Invisible chars in URL slugs break routing           | Always `stega: false` and `perspective: 'published'`        |
| Missing `stega.studioUrl` in client config | Overlays render but don't link to Studio             | Set `stega.studioUrl` in `createClient`                     |
| `<SanityLive />` in Studio layout          | Causes unexpected reloads in embedded Studio         | Exclude Studio route from the layout rendering `SanityLive` |
| Direct string comparison in Draft Mode     | `value === 'center'` fails with stega chars          | Use `stegaClean(value)` before comparing                    |

### Architecture

| Anti-Pattern                             | Why It's Wrong                                               | Correct Pattern                                           |
| ---------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| Components consuming GROQ types directly | Tight coupling to CMS query shape — breaks on schema change  | Use adapter functions to transform to frontend types      |
| Portable Text rendered with raw HTML     | No consistent styling, insecure link `target`                | Use `@portabletext/react` with project component map      |
| Sanity images with raw `<img>` tag       | No lazy loading, no `srcSet`, no format negotiation          | Use `next/image` or `next-sanity/image`                   |
| Skipping webhook signature validation    | Anyone can trigger revalidation                              | Always validate with `parseBody`                          |
| Same Sanity query fetched multiple times | N+1 problem — multiple API calls for same data in one render | Use React `cache()` to deduplicate within a single render |
