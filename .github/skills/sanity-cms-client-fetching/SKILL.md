---
name: sanity-cms-client-fetching
description: >-
  Sanity CMS data-access layer and fetching setup — src/lib/sanity/ folder
  structure and import boundary diagram, createClient config with useCdn rules
  per context and per-request withConfig overrides, apiVersion pinning strategy,
  defineLive vs manual sanityFetch decision tree, complete defineLive setup in
  live.ts with serverToken/browserToken, full page usage pattern (generateStaticParams,
  generateMetadata, page component with await params), manual sanityFetch helper
  with Draft Mode perspective switching and explicit cache options, GROQ query
  file organization with defineQuery and TypeGen CLI command. Use when setting
  up Sanity data fetching in Next.js 15, choosing between defineLive and manual
  sanityFetch, wiring Sanity queries in page or layout components, or organizing
  Sanity query files with TypeGen support.
---

# Sanity CMS — Client Fetching & Data-Access Layer

**Compiled from**: ADR-0032 Parts 1–4 (Data-Access Layer Architecture, Client Setup, Fetching Strategy, Query Organization)
**Last synced**: 2026-03-31

---

## Part 1: Data-Access Layer Architecture

All Sanity consumption code lives in `src/lib/sanity/`, separated from schema code in `src/sanity/`. Pages and features never import `@sanity/client` or `next-sanity` directly.

```
src/lib/sanity/
├── client.ts          # Sanity client (createClient + config)
├── live.ts            # defineLive → exports sanityFetch + SanityLive
├── image.ts           # urlFor helper (@sanity/image-url)
├── portable-text.ts   # PortableText component map
├── queries/           # GROQ queries organized by domain
│   ├── posts.ts
│   ├── projects.ts
│   ├── settings.ts
│   └── index.ts
├── adapters/          # Transform GROQ results → frontend types
│   ├── posts.ts
│   └── projects.ts
└── index.ts           # Barrel export
```

### Import Boundary

```
src/app/          → imports from → src/lib/sanity/     (adapters, sanityFetch)
src/components/   → imports from → src/lib/sanity/     (image helpers, PT components)
src/lib/sanity/   → imports from → src/sanity/         (schema types for typegen)
                  → imports from → src/lib/env.ts      (validated env vars)
                  → imports from → src/lib/errors.ts   (AppError)
```

Pages and components **never** import from `src/sanity/` directly — that's the schema layer.

---

## Part 2: Sanity Client Setup

### Base Client (`src/lib/sanity/client.ts`)

```typescript
import { createClient } from 'next-sanity'

import { env } from '@/lib/env'

export const client = createClient({
  projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2026-04-01', // Pin to deployment date — never use 'latest' or 'vX'
  useCdn: true, // Edge-cached for published content
  stega: {
    studioUrl: env.NEXT_PUBLIC_SANITY_STUDIO_URL ?? '/studio',
  },
})
```

### `useCdn` Rules

| Situation                   | `useCdn` | Why                                                     |
| --------------------------- | -------- | ------------------------------------------------------- |
| Published content (default) | `true`   | Edge-cached, fastest reads                              |
| Draft Mode / Visual Editing | `false`  | Must read from Content Lake for draft content           |
| `generateStaticParams`      | `true`   | Published content at build time                         |
| Webhook handler             | `false`  | Must confirm latest data propagated before revalidating |

`defineLive` handles `useCdn` switching automatically. For a manual helper, use `client.withConfig({ useCdn: false })` for draft contexts.

### Per-Request Overrides

```typescript
// Disable stega for metadata fetching
client.withConfig({ stega: false })

// Enable Draft Mode — disable CDN, enable token
client.withConfig({
  useCdn: false,
  token: env.SANITY_API_READ_TOKEN,
})
```

### `apiVersion` Strategy

Pin `apiVersion` to a date string (e.g., `'2026-04-01'`). Update when deploying a new version. Never use `'latest'` or semantic versions — they can introduce breaking changes silently.

---

## Part 3: Fetching Strategy

### Decision Tree

```
Need real-time content updates or Visual Editing?
├── Yes → defineLive (RECOMMENDED DEFAULT)
│         • Automatic caching + revalidation
│         • Real-time updates via SanityLive component
│         • Draft Mode support built-in
│         • Returns { data } wrapper
│
└── No → Manual sanityFetch helper
          • Full control over cache options
          • Explicit tags / revalidate per query
          • Must handle Draft Mode manually
```

### Approach A: `defineLive` (Recommended)

```typescript
// src/lib/sanity/live.ts
import { defineLive } from 'next-sanity/live'

import { client } from './client'
import { env } from '@/lib/env'

const token = env.SANITY_API_READ_TOKEN
if (!token) {
  throw new Error('Missing SANITY_API_READ_TOKEN — required for CMS data fetching')
}

export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({ apiVersion: '2026-04-01' }),
  serverToken: token,
  browserToken: token, // Only sent to browser during Draft Mode — not exposed in normal browsing
})
```

**How it works**:

- `sanityFetch` handles caching, revalidation, stega encoding, and perspective switching automatically.
- `SanityLive` subscribes to Content Lake changes and triggers re-renders when content updates.
- In Draft Mode, `sanityFetch` returns draft content with stega encoding; outside Draft Mode, clean published content.

**Usage in pages** (Next.js 15 — `params` is async):

```typescript
// src/app/posts/[slug]/page.tsx
import { notFound } from 'next/navigation'

import { sanityFetch } from '@/lib/sanity/live'
import { POST_QUERY, POST_SLUGS_QUERY } from '@/lib/sanity/queries/posts'

type Props = { params: Promise<{ slug: string }> }

export const generateStaticParams = async () => {
  const { data } = await sanityFetch({
    query: POST_SLUGS_QUERY,
    perspective: 'published', // Only published slugs as URL segments
    stega: false,
  })
  return data
}

export const generateMetadata = async ({ params }: Props) => {
  const { data } = await sanityFetch({
    query: POST_QUERY,
    params: await params,
    stega: false, // stega in <title> corrupts SEO
  })
  return { title: data?.title ?? 'Post not found' }
}

const PostPage = async ({ params }: Props) => {
  const { data: post } = await sanityFetch({
    query: POST_QUERY,
    params: await params,
  })
  if (!post) notFound()
  return <article>...</article>
}

export default PostPage
```

### Approach B: Manual `sanityFetch` Helper

Use when opting out of `defineLive` — requires explicit caching and Draft Mode handling.

```typescript
// src/lib/sanity/fetch.ts
import { draftMode } from 'next/headers'

import { client } from './client'
import { env } from '@/lib/env'

type SanityFetchOptions = {
  query: string
  params?: Record<string, unknown>
  revalidate?: number | false
  tags?: string[]
  stega?: boolean
  perspective?: 'published' | 'drafts' | 'raw'
}

export const sanityFetch = async <T>({
  query,
  params = {},
  revalidate = 60,
  tags = [],
  stega: stegaOverride,
  perspective: perspectiveOverride,
}: SanityFetchOptions): Promise<{ data: T }> => {
  const isDraftMode = (await draftMode()).isEnabled
  const perspective = perspectiveOverride ?? (isDraftMode ? 'drafts' : 'published')
  const stega = stegaOverride ?? isDraftMode
  const useCdn = !isDraftMode

  const data = await client
    .withConfig({
      useCdn,
      stega: stega ? { studioUrl: env.NEXT_PUBLIC_SANITY_STUDIO_URL ?? '/studio' } : false,
    })
    .fetch<T>(query, params, {
      token: isDraftMode ? env.SANITY_API_READ_TOKEN : undefined,
      perspective,
      next: {
        // tags and revalidate are mutually exclusive — when tags is set, revalidate must be false
        revalidate: isDraftMode ? 0 : tags.length ? false : revalidate,
        tags: isDraftMode ? [] : tags,
      },
    })

  return { data }
}
```

---

## Part 4: Query Organization with TypeGen

### `defineQuery` for TypeGen

All GROQ queries use `defineQuery` for automatic TypeScript type inference:

```typescript
// src/lib/sanity/queries/posts.ts
import { defineQuery } from 'next-sanity'

export const POSTS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) [0...12] {
    _id, title, slug, excerpt, publishedAt,
    mainImage { asset->, alt }
  }
`)

export const POST_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug][0] {
    _id, title, slug, publishedAt,
    body,
    mainImage { asset->, alt },
    "author": author-> { name, "slug": slug.current }
  }
`)

export const POST_SLUGS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)] {
    "slug": slug.current
  }
`)
```

### File Organization

```
src/lib/sanity/queries/
├── posts.ts       # All post-related queries
├── projects.ts    # All project-related queries
├── settings.ts    # Singleton/site-wide queries
└── index.ts       # Barrel re-export
```

Co-locate queries near the domain they serve.

### Regenerate Types

After changing schemas or queries, regenerate TypeScript types:

```bash
pnpm sanity typegen generate
```

TypeGen produces types that `defineQuery` uses for automatic inference — no manual type annotations needed on `sanityFetch` calls.

---

## Import Paths (next-sanity 12.x)

| Export                                              | Import From                  |
| --------------------------------------------------- | ---------------------------- |
| `createClient`, `defineQuery`, `groq`, `stegaClean` | `next-sanity`                |
| `defineLive`                                        | `next-sanity/live`           |
| `Image`, `imageLoader`                              | `next-sanity/image`          |
| `VisualEditing`                                     | `next-sanity/visual-editing` |
| `defineEnableDraftMode`                             | `next-sanity/draft-mode`     |
| `useIsPresentationTool`                             | `next-sanity/hooks`          |
| `parseBody`                                         | `next-sanity/webhook`        |
| `PortableText`                                      | `@portabletext/react`        |
