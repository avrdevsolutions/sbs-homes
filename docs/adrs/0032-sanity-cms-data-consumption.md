# ADR-0032: Sanity CMS Data Consumption

**Status**: Accepted (opt-in — adopt alongside ADR-0031)
**Date**: 2026-04-01
**Depends on**: ADR-0031 (Sanity CMS), ADR-0005 (Data Fetching), ADR-0017 (Caching), ADR-0007 (Error Handling)

---

## Context

ADR-0031 defines the CMS platform — schemas, GROQ query language, image CDN, Portable Text format, webhook dashboard config, and Studio setup. This companion ADR covers the **consumption side**: how the Next.js frontend fetches, caches, transforms, renders, and tests CMS data.

The boundary between the two ADRs:

| ADR-0031 (Sanity Platform)          | This ADR (Consumption)                           |
| ----------------------------------- | ------------------------------------------------ |
| Schema definitions in `src/sanity/` | Client setup in `src/lib/sanity/`                |
| GROQ query language & patterns      | Query file organization & co-location            |
| Image CDN URL transforms            | `next/image` integration with Sanity loader      |
| Portable Text data format           | `@portabletext/react` rendering                  |
| Webhook config in Sanity dashboard  | Webhook handler route in Next.js                 |
| Studio setup & embedding            | Draft Mode / Visual Editing / Presentation Tool  |
| `sanity typegen` CLI                | Adapter functions (GROQ result → frontend types) |

**Generic vs Sanity-specific**: Sections marked with 🟠 contain Sanity-specific patterns. Unmarked sections describe CMS-agnostic consumption patterns that apply to any headless CMS. When migrating to a different CMS, replace only the 🟠 sections — the architecture, adapters, caching strategy, error handling, and testing patterns remain.

## Decision

**CMS data is consumed through a data-access layer in `src/lib/sanity/`. `defineLive` is the default fetching strategy (automatic caching + real-time). Tag-based revalidation via webhook is the primary cache invalidation strategy. GROQ results are transformed through adapter functions before reaching components. All CMS images use `next/image` with the Sanity CDN loader. Portable Text is rendered with `@portabletext/react` mapped to project UI primitives. Visual Editing is the default preview strategy.**

---

## Rules

| Rule                                                                                                   | Level        |
| ------------------------------------------------------------------------------------------------------ | ------------ |
| All CMS consumption code lives in `src/lib/sanity/` — never import `@sanity/client` directly in pages  | **MUST**     |
| Every CMS fetch uses the `sanityFetch` helper (from `defineLive` or manual) — never raw `client.fetch` | **MUST**     |
| `generateMetadata` and `generateStaticParams` always pass `stega: false`                               | **MUST**     |
| Webhook handler validates signatures with `parseBody` — never skip validation                          | **MUST**     |
| CMS environment variables validated in `src/lib/env.ts` with Zod (per ADR-0006)                        | **MUST**     |
| CMS errors at the fetch boundary return `Result<T>` or throw `AppError` with `SERVICE_UNAVAILABLE`     | **MUST**     |
| CMS images use `next/image` with the Sanity CDN loader — no raw `<img>` tags for CMS images            | **MUST**     |
| Portable Text rendering maps to project Typography/UI primitives — no unstyled `<p>` tags              | **MUST**     |
| GROQ query files use `defineQuery` for TypeGen support                                                 | **MUST**     |
| Adapter functions transform GROQ results to frontend-friendly types at the data-access layer boundary  | **SHOULD**   |
| Tag-based revalidation preferred over time-based for CMS content                                       | **SHOULD**   |
| `SanityLive` component placed in root layout for real-time updates                                     | **SHOULD**   |
| Co-locate GROQ queries near the page/feature that uses them                                            | **SHOULD**   |
| CMS data is server-fetched by default — client-side fetching only via TanStack Query proxy (Part 15)   | **MUST**     |
| Do not expose `SANITY_API_READ_TOKEN` in `NEXT_PUBLIC_*` vars (per ADR-0031)                           | **MUST NOT** |
| Do not use `client.fetch` directly in page components — always use the `sanityFetch` wrapper           | **MUST NOT** |
| Do not render Portable Text with raw HTML — always use `@portabletext/react`                           | **MUST NOT** |

---

## Part 1: Data-Access Layer Architecture

All CMS consumption code lives in `src/lib/sanity/`, separated from the Sanity schema code in `src/sanity/`. This separation means pages and features never import `@sanity/client` or `next-sanity` directly — they import from `src/lib/sanity/`.

```
src/lib/sanity/
├── client.ts          # 🟠 Sanity client (createClient + config)
├── live.ts            # 🟠 defineLive → exports sanityFetch + SanityLive
├── image.ts           # 🟠 urlFor helper (@sanity/image-url)
├── portable-text.ts   # 🟠 PortableText component map
├── queries/           # 🟠 GROQ queries organized by domain
│   ├── posts.ts
│   ├── projects.ts
│   └── settings.ts
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

Pages and components **never** import from `src/sanity/` directly (that's the schema layer per ADR-0031). The data-access layer in `src/lib/sanity/` is the **only** bridge between the CMS platform and the frontend.

---

## Part 2: Sanity Client Setup 🟠

### Base Client

```typescript
// src/lib/sanity/client.ts
import { createClient } from 'next-sanity'

import { env } from '@/lib/env'

export const client = createClient({
  projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2026-04-01', // Use a date-based API version — pin to deployment date
  useCdn: true, // CDN for published content (edge-cached)
  stega: {
    studioUrl: env.NEXT_PUBLIC_SANITY_STUDIO_URL ?? '/studio',
  },
})
```

### `useCdn` Rules

| Situation                   | `useCdn` | Why                                                             |
| --------------------------- | -------- | --------------------------------------------------------------- |
| Published content (default) | `true`   | Edge-cached, fastest reads                                      |
| Draft Mode / Visual Editing | `false`  | Must read directly from Content Lake for draft content          |
| `generateStaticParams`      | `true`   | Published content at build time                                 |
| Webhook handler             | `false`  | Must confirm the latest data was propagated before revalidating |

`defineLive` handles `useCdn` switching automatically. If building a manual `sanityFetch`, use `client.withConfig({ useCdn: false })` for draft contexts.

### `withConfig` for Per-Request Overrides

```typescript
// Override for metadata fetching — disable stega
client.withConfig({ stega: false })

// Override for Draft Mode — disable CDN, enable token
client.withConfig({
  useCdn: false,
  token: env.SANITY_API_READ_TOKEN,
})
```

### `apiVersion` Strategy

Pin `apiVersion` to a date. When deploying a new version, update the date. Avoid `'vX'` or `'latest'` — they can introduce breaking changes without warning.

---

## Part 3: Fetching Strategy 🟠

### Decision Tree: Which Fetch Approach

```
Need real-time content updates or Visual Editing?
├── Yes → defineLive (recommended)
│         • Automatic caching + revalidation
│         • Real-time updates via SanityLive
│         • Draft Mode support built-in
│         • Returns { data } wrapper
│
└── No → Manual sanityFetch helper
          • Full control over cache options
          • Explicit tags / revalidate per query
          • No real-time subscription overhead
          • Must handle Draft Mode manually
```

**Default: `defineLive`.** Use the manual helper only when you need granular caching control that `defineLive` doesn't expose, or when the project explicitly opts out of the Live Content API.

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
  browserToken: token, // Only sent to browser during Draft Mode
})
```

**How it works**:

- `sanityFetch` handles caching, revalidation, stega encoding, and perspective switching automatically.
- `SanityLive` subscribes to Content Lake changes and triggers re-renders when content updates.
- In Draft Mode, `sanityFetch` returns draft content with stega encoding; outside Draft Mode, it returns clean published content.
- The `browserToken` is **only shared with the client during Draft Mode** — it's never exposed in normal browsing.

**Usage in pages**:

```typescript
// src/app/posts/[slug]/page.tsx
import { sanityFetch } from '@/lib/sanity/live'
import { POST_QUERY, POST_SLUGS_QUERY } from '@/lib/sanity/queries/posts'

type Props = { params: Promise<{ slug: string }> }

export const generateStaticParams = async () => {
  const { data } = await sanityFetch({
    query: POST_SLUGS_QUERY,
    perspective: 'published',
    stega: false,
  })
  return data
}

export const generateMetadata = async ({ params }: Props) => {
  const { data } = await sanityFetch({
    query: POST_QUERY,
    params: await params,
    stega: false, // CRITICAL — stega in <title> corrupts SEO
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

type SanityFetchOptions<T = unknown> = {
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
}: SanityFetchOptions<T>): Promise<{ data: T }> => {
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
        // Tags and time-based revalidation are mutually exclusive in Next.js
        revalidate: isDraftMode ? 0 : tags.length ? false : revalidate,
        tags: isDraftMode ? [] : tags,
      },
    })

  return { data }
}
```

**Key rule from ADR-0017**: In Next.js 15, `fetch` is **not cached by default**. The manual helper must always set explicit `next.revalidate` or `next.tags`. Tags and time-based revalidation are mutually exclusive — when `tags` are set, omit `revalidate` (set to `false`).

---

## Part 4: Query Organization 🟠

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

Co-locate queries near the domain they serve:

```
src/lib/sanity/queries/
├── posts.ts       # All post-related queries
├── projects.ts    # All project-related queries
├── settings.ts    # Singleton/site-wide queries
└── index.ts       # Barrel re-export
```

### TypeGen

After changing schemas or queries, regenerate types:

```bash
pnpm sanity typegen generate
```

This produces types that `defineQuery` uses for automatic inference — no manual type annotations needed on `sanityFetch` calls.

---

## Part 5: Caching & Revalidation

CMS content has a two-layer cache architecture. This section implements ADR-0017's caching strategy specifically for CMS data.

### Two Cache Layers 🟠

```
Browser ──► Next.js Data Cache ──► Sanity CDN ──► Content Lake
             (tags / revalidate)     (useCdn: true)
```

| Layer             | Controlled By                            | Invalidated By                                              |
| ----------------- | ---------------------------------------- | ----------------------------------------------------------- |
| **Sanity CDN**    | `useCdn: true` (default)                 | Automatic — propagates within seconds of mutation           |
| **Next.js Cache** | `next.tags` / `next.revalidate` on fetch | `revalidateTag()` / `revalidatePath()` from webhook handler |

### Cache Strategy Decision Tree

```
Is the content user-specific or session-dependent?
├── Yes → cache: 'no-store' (per ADR-0017) — rare for CMS content
│
└── No → Is webhook-based revalidation set up?
    ├── Yes → Tag-based revalidation (PREFERRED)
    │         • Tags: use document _type as tag (e.g., 'post', 'project')
    │         • Set revalidate: false (tags handle invalidation)
    │         • Webhook calls revalidateTag(body._type)
    │
    └── No → Time-based revalidation (FALLBACK)
              ├── Content changes frequently (blog drafts)  → revalidate: 30-60
              ├── Content changes daily (portfolio)         → revalidate: 3600
              ├── Content rarely changes (legal, about)     → revalidate: 86400
              └── Content changes only on editor publish    → revalidate: false (manual)
```

### Tag-Based Revalidation Pattern

With `defineLive`, caching + tagging is automatic. With the manual helper:

```typescript
// Tags = document types that the query touches
const { data } = await sanityFetch({
  query: POSTS_QUERY,
  tags: ['post', 'author'], // Invalidate when any post or author changes
})
```

When a webhook fires with `{ _type: 'post' }`, calling `revalidateTag('post')` invalidates all queries tagged with `'post'`.

### Revalidation Cheat Sheet (CMS-Specific Extension of ADR-0017)

| CMS Content Type        | Strategy            | Tags                      | `revalidate`  |
| ----------------------- | ------------------- | ------------------------- | ------------- |
| Blog posts list         | Tag-based           | `['post']`                | `false`       |
| Single blog post        | Tag-based           | `['post', 'author']`      | `false`       |
| Site settings singleton | Tag-based           | `['siteSettings']`        | `false`       |
| Project portfolio       | Tag-based           | `['project', 'category']` | `false`       |
| FAQ page                | Tag-based           | `['faq']`                 | `false`       |
| Rarely updated legal    | Time-based fallback | —                         | `86400` (24h) |

---

## Part 6: Webhook Handler Route 🟠

The webhook handler is the server-side endpoint that Sanity calls when content changes. It validates the request signature and triggers cache invalidation.

### Tag-Based Handler (Recommended)

```typescript
// src/app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { parseBody } from 'next-sanity/webhook'

type WebhookPayload = {
  _type: string
}

export const POST = async (req: NextRequest) => {
  try {
    const secret = process.env.SANITY_REVALIDATE_SECRET
    if (!secret) {
      return new Response('Missing SANITY_REVALIDATE_SECRET', { status: 500 })
    }

    const { isValidSignature, body } = await parseBody<WebhookPayload>(
      req,
      secret,
      true, // Wait for Content Lake propagation (prevents stale CDN reads)
    )

    if (!isValidSignature) {
      return new Response(JSON.stringify({ message: 'Invalid signature', isValidSignature }), {
        status: 401,
      })
    }

    if (!body?._type) {
      return new Response(JSON.stringify({ message: 'Bad request — missing _type', body }), {
        status: 400,
      })
    }

    revalidateTag(body._type)

    return NextResponse.json({
      revalidated: true,
      tag: body._type,
      now: Date.now(),
    })
  } catch (err: unknown) {
    console.error('Webhook handler error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(message, { status: 500 })
  }
}
```

### Security Requirements

| Requirement                   | Implementation                                         |
| ----------------------------- | ------------------------------------------------------ |
| Signature validation          | `parseBody` verifies HMAC — **never skip**             |
| Strong secret                 | `openssl rand -base64 32` — minimum 32 characters      |
| Secret out of version control | `.env.local` locally, hosting provider secrets in prod |
| Rate limiting                 | Infrastructure-level (Vercel/Cloudflare) recommended   |
| `waitForContentLakeEvent`     | Set to `true` when `useCdn: true` to avoid stale reads |

### Webhook Dashboard Config (Sanity Side — Per ADR-0031/0033)

| Field       | Value                                      |
| ----------- | ------------------------------------------ |
| URL         | `https://your-domain.com/api/revalidate`   |
| Events      | Create, Update, Delete                     |
| Filter      | `_type in ["post", "project", "faq", ...]` |
| Projection  | `{_type}`                                  |
| Secret      | Same as `SANITY_REVALIDATE_SECRET`         |
| HTTP method | POST                                       |

---

## Part 7: Image Integration 🟠

CMS images use the Sanity CDN for transforms and `next/image` for rendering. This combines Sanity's edge-cached image optimization with Next.js lazy loading, `srcSet` generation, and priority hints (per ADR-0018).

### `urlFor` Helper

```typescript
// src/lib/sanity/image.ts
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url'

import { client } from './client'

const builder = createImageUrlBuilder(client)

export const urlFor = (source: SanityImageSource) => builder.image(source)
```

### Option A: `next-sanity/image` Component (Alpha)

```typescript
import { Image } from 'next-sanity/image'
import { urlFor } from '@/lib/sanity/image'

const SanityImage = ({ image, alt, priority = false }: {
  image: SanityImageSource
  alt: string
  priority?: boolean
}) => (
  <Image
    src={urlFor(image).width(1200).url()}
    alt={alt}
    width={1200}
    height={675}
    priority={priority}
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1200px"
  />
)
```

**How it works**: The `Image` component from `next-sanity/image` wraps `next/image` with a Sanity-aware loader. It bypasses the Next.js optimization proxy entirely — the Sanity CDN handles resizing, format conversion (`auto=format` for WebP/AVIF), and edge caching. No `remotePatterns` config needed.

### Option B: `next/image` with `imageLoader`

For more control over `next/image` props:

```typescript
import NextImage from 'next/image'
import { imageLoader } from 'next-sanity/image'
import { urlFor } from '@/lib/sanity/image'

const SanityImage = ({ image, alt, priority = false }: {
  image: SanityImageSource
  alt: string
  priority?: boolean
}) => (
  <NextImage
    loader={imageLoader}
    src={urlFor(image).width(1200).url()}
    alt={alt}
    width={1200}
    height={675}
    priority={priority}
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1200px"
  />
)
```

### Image Rules (Extending ADR-0018)

| Rule                                                                                         | Level      |
| -------------------------------------------------------------------------------------------- | ---------- |
| LCP image (hero, above-fold) gets `priority` prop                                            | **MUST**   |
| Every `<Image>` has explicit `width`/`height` or `fill`                                      | **MUST**   |
| Every CMS image includes `alt` from the CMS alt field                                        | **MUST**   |
| Use `sizes` prop for responsive images                                                       | **SHOULD** |
| Chain `.width(N)` on `urlFor` to avoid oversized downloads                                   | **SHOULD** |
| Crop/hotspot settings are respected by `urlFor` automatically when passing full image object | **SHOULD** |

---

## Part 8: Portable Text Rendering 🟠

Portable Text is Sanity's structured rich text format (JSON AST — see ADR-0031). The `@portabletext/react` library renders it to React components. The component map **must** use project UI primitives, not raw HTML.

### Component Map

```typescript
// src/lib/sanity/portable-text.ts
import type { PortableTextReactComponents } from '@portabletext/react'
import NextImage from 'next/image'
import Link from 'next/link'

import { imageLoader } from 'next-sanity/image'
import { urlFor } from './image'

export const portableTextComponents: Partial<PortableTextReactComponents> = {
  block: {
    // Map block styles to Typography variants (per ADR-0023)
    normal: ({ children }) => <p className="text-body leading-relaxed">{children}</p>,
    h2: ({ children }) => <h2 className="text-heading-2 font-bold">{children}</h2>,
    h3: ({ children }) => <h3 className="text-heading-3 font-semibold">{children}</h3>,
    h4: ({ children }) => <h4 className="text-heading-4 font-semibold">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary-300 pl-4 italic">
        {children}
      </blockquote>
    ),
  },
  marks: {
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="rounded bg-surface-200 px-1 py-0.5 font-mono text-sm">{children}</code>
    ),
    link: ({ value, children }) => {
      const href = value?.href ?? '#'
      const isExternal = href.startsWith('http')
      return isExternal ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 underline hover:text-primary-700"
        >
          {children}
        </a>
      ) : (
        <Link href={href} className="text-primary-600 underline hover:text-primary-700">
          {children}
        </Link>
      )
    },
    internalLink: ({ value, children }) => (
      <Link
        href={`/${value?.slug ?? ''}`}
        className="text-primary-600 underline hover:text-primary-700"
      >
        {children}
      </Link>
    ),
  },
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null
      return (
        <figure className="my-8">
          <NextImage
            loader={imageLoader}
            src={urlFor(value).width(800).url()}
            alt={value.alt ?? ''}
            width={800}
            height={450}
            sizes="(max-width: 768px) 100vw, 800px"
            className="rounded-lg"
          />
          {value.caption && (
            <figcaption className="mt-2 text-center text-sm text-muted">
              {value.caption}
            </figcaption>
          )}
        </figure>
      )
    },
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
}
```

### Usage in Components

```tsx
import { PortableText } from '@portabletext/react'

import { portableTextComponents } from '@/lib/sanity/portable-text'

const PostBody = ({ body }: { body: PortableTextBlock[] }) => (
  <div className='prose-custom mx-auto max-w-prose'>
    <PortableText value={body} components={portableTextComponents} />
  </div>
)
```

### Portable Text Rules

| Rule                                                                                       | Level      |
| ------------------------------------------------------------------------------------------ | ---------- |
| All block styles must map to project Typography/font-size tokens                           | **MUST**   |
| External links must have `target="_blank"` and `rel="noopener noreferrer"`                 | **MUST**   |
| Internal links must use Next.js `Link` for client-side navigation                          | **MUST**   |
| Inline images must use `next/image` (per ADR-0018)                                         | **MUST**   |
| The component map is defined once in `src/lib/sanity/portable-text.ts` — not per-component | **SHOULD** |
| Extend the map when adding new block types in the Sanity schema                            | **SHOULD** |

---

## Part 9: Adapter Pattern

Adapter functions sit between GROQ query results and frontend components. They transform CMS-specific data shapes into the types that components actually need. This is a **CMS-agnostic** pattern — regardless of the CMS, adapters provide:

1. **Decoupling** — components don't depend on CMS query shape
2. **Type safety** — adapters validate and narrow the CMS response
3. **Transformation** — date formatting, URL construction, null coalescing
4. **Migration safety** — when CMS schema changes, only adapters update

### Pattern

```typescript
// src/lib/sanity/adapters/posts.ts
import type { POSTS_QUERYResult, POST_QUERYResult } from '@/sanity/types' // typegen output

// Frontend type — what components consume
export type PostCard = {
  id: string
  title: string
  slug: string
  excerpt: string
  publishedAt: string
  imageUrl: string | null
  imageAlt: string
}

export type PostDetail = PostCard & {
  body: PortableTextBlock[]
  author: { name: string; slug: string } | null
}

// Adapter function — transforms GROQ result to frontend type
export const toPostCard = (raw: NonNullable<POSTS_QUERYResult>[number]): PostCard => ({
  id: raw._id,
  title: raw.title ?? 'Untitled',
  slug: raw.slug?.current ?? '',
  excerpt: raw.excerpt ?? '',
  publishedAt: raw.publishedAt ?? '',
  imageUrl: raw.mainImage?.asset ? urlFor(raw.mainImage).width(600).url() : null,
  imageAlt: raw.mainImage?.alt ?? '',
})

export const toPostDetail = (raw: NonNullable<POST_QUERYResult>): PostDetail => ({
  ...toPostCard(raw),
  body: raw.body ?? [],
  author: raw.author ? { name: raw.author.name ?? '', slug: raw.author.slug ?? '' } : null,
})
```

### When to Use Adapters

| Situation                                                       | Use Adapter? |
| --------------------------------------------------------------- | ------------ |
| GROQ result shape matches component props 1:1                   | Optional     |
| GROQ result needs date formatting, URL building, or defaults    | **Yes**      |
| Multiple components consume the same query with different views | **Yes**      |
| Component is used by both CMS and non-CMS data sources          | **Yes**      |
| Prototype / single-use page with simple query                   | Optional     |

---

## Part 10: Route Wiring

CMS-driven pages use Next.js App Router conventions for static generation and metadata.

### `generateStaticParams`

Pre-render CMS pages at build time:

```typescript
// src/app/posts/[slug]/page.tsx
export const generateStaticParams = async () => {
  const { data } = await sanityFetch({
    query: POST_SLUGS_QUERY,
    perspective: 'published', // Only published content
    stega: false, // Slugs used as URL segments
  })
  return data.map((post) => ({ slug: post.slug }))
}
```

### `generateMetadata` (Per ADR-0013)

CMS-driven metadata with SEO safety:

```typescript
export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { data } = await sanityFetch({
    query: POST_QUERY,
    params: await params, // Next.js 15: params is async
    stega: false, // CRITICAL — stega corrupts <title> and <meta>
  })

  if (!data) return { title: 'Not Found' }

  return {
    title: data.title,
    description: data.excerpt,
    openGraph: {
      title: data.title,
      description: data.excerpt,
      images: data.mainImage?.asset
        ? [{ url: urlFor(data.mainImage).width(1200).height(630).url() }]
        : [],
    },
  }
}
```

### `stega: false` Requirements

| Context                 | `stega`                   | Why                                                          |
| ----------------------- | ------------------------- | ------------------------------------------------------------ |
| `generateStaticParams`  | `false`                   | Slug values become URL segments — invisible chars break URLs |
| `generateMetadata`      | `false`                   | `<title>`, `<meta>`, OG tags — stega corrupts SEO            |
| JSON-LD structured data | `false`                   | Search engines parse raw JSON — stega breaks structured data |
| String comparisons      | Clean with `stegaClean()` | `align === 'center'` fails with stega chars                  |
| Page component body     | Default                   | Stega encoding is correct here — enables click-to-edit       |

### `stegaClean` for Conditional Logic

When CMS string values are used in conditional logic (not just rendering), strip stega:

```typescript
import { stegaClean } from 'next-sanity'

// In a component receiving CMS data with potential stega encoding
const alignment = stegaClean(data.alignment)
if (alignment === 'center') {
  // Safe comparison
}
```

---

## Part 11: SEO Integration with CMS Content

Extends ADR-0013 (SEO & Metadata) for CMS-sourced content.

### CMS-Driven JSON-LD 🟠

```typescript
// In a blog post page
import { sanityFetch } from '@/lib/sanity/live'

const PostPage = async ({ params }: Props) => {
  const { data: post } = await sanityFetch({
    query: POST_QUERY,
    params: await params,
  })

  // JSON-LD uses a separate stega-free fetch or stegaClean
  const { data: seoData } = await sanityFetch({
    query: POST_QUERY,
    params: await params,
    stega: false, // JSON-LD must be clean
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: seoData?.title,
    datePublished: seoData?.publishedAt,
    author: seoData?.author ? { '@type': 'Person', name: seoData.author.name } : undefined,
    image: seoData?.mainImage?.asset
      ? urlFor(seoData.mainImage).width(1200).height(630).url()
      : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>...</article>
    </>
  )
}
```

### SEO Checklist for CMS Pages

| Item                                 | Implementation                                                |
| ------------------------------------ | ------------------------------------------------------------- |
| `<title>` from CMS with brand suffix | `generateMetadata` → `title: data.title` (template in layout) |
| Meta description from CMS excerpt    | `generateMetadata` → `description: data.excerpt`              |
| OG image from CMS image field        | `urlFor(mainImage).width(1200).height(630).url()`             |
| Canonical URL                        | `metadataBase` in root layout (per ADR-0013)                  |
| JSON-LD structured data              | Per content type — Article, Product, FAQ, etc.                |
| Sitemap includes CMS routes          | `sitemap.ts` fetches published slugs                          |
| CMS `seo` object type fields         | Override title/description per document (defined in ADR-0031) |

---

## Part 12: Visual Editing & Draft Mode 🟠

Visual Editing enables editors to click on content in the frontend preview and jump directly to the corresponding field in Sanity Studio. This is the recommended preview strategy.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│ Sanity Studio (Presentation Tool)                   │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ Next.js Frontend (iframe)                     │  │
│  │                                                │  │
│  │  Draft Mode ON → stega-encoded strings        │  │
│  │  <VisualEditing /> → click-to-edit overlays   │  │
│  │  <SanityLive /> → real-time content updates   │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  Editor clicks overlay → Studio navigates to field  │
│  Editor changes field → SanityLive re-renders page  │
└─────────────────────────────────────────────────────┘
```

### The Flow

1. Editor opens Presentation Tool in Studio
2. Studio loads the Next.js frontend in an iframe
3. Studio hits `/api/draft-mode/enable` → activates Draft Mode
4. `sanityFetch` returns draft content with stega encoding (invisible chars encoding document ID + field path + Studio URL)
5. `<VisualEditing />` reads stega from DOM → draws click-to-edit overlays
6. Editor clicks overlay → Studio navigates to that document/field
7. Editor changes field → `<SanityLive />` picks up mutation → page re-renders

### Required Files

#### Draft Mode Enable Route

```typescript
// src/app/api/draft-mode/enable/route.ts
import { defineEnableDraftMode } from 'next-sanity/draft-mode'

import { client } from '@/lib/sanity/client'
import { env } from '@/lib/env'

export const { GET } = defineEnableDraftMode({
  client: client.withConfig({
    token: env.SANITY_API_READ_TOKEN,
  }),
})
```

#### Draft Mode Disable Route

```typescript
// src/app/api/draft-mode/disable/route.ts
import { draftMode } from 'next/headers'
import { NextResponse } from 'next/server'

export const GET = async () => {
  ;(await draftMode()).disable()
  return NextResponse.redirect(
    new URL('/', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  )
}
```

#### Root Layout Integration

```tsx
// src/app/layout.tsx (additions for Visual Editing)
import { draftMode } from 'next/headers'
import { VisualEditing } from 'next-sanity/visual-editing'

import { SanityLive } from '@/lib/sanity/live'
import { DisableDraftMode } from '@/app/_components/DisableDraftMode'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body>
        {children}
        <SanityLive />
        {(await draftMode()).isEnabled && (
          <>
            <VisualEditing />
            <DisableDraftMode />
          </>
        )}
      </body>
    </html>
  )
}
```

**Important for embedded Studio**: If your Studio runs on a route like `/studio` inside the same Next.js app, do **not** include `<SanityLive />` or `<VisualEditing />` in the Studio layout. Use a layout group `(site)` to exclude the `/studio` route.

#### Disable Draft Mode Button

```tsx
// src/app/_components/DisableDraftMode.tsx
'use client'

import { useIsPresentationTool } from 'next-sanity/hooks'

export const DisableDraftMode = () => {
  const isPresentationTool = useIsPresentationTool()
  // Hide when inside the Presentation Tool iframe — Studio controls Draft Mode there
  if (isPresentationTool) return null

  return (
    <a
      href='/api/draft-mode/disable'
      className='bg-surface-900 fixed right-4 bottom-4 z-50 rounded-full px-4 py-2 text-sm text-white'
    >
      Disable Draft Mode
    </a>
  )
}
```

### Studio-Side: Presentation Tool Config

In `sanity.config.ts` (covered in ADR-0031/0033 for setup):

```typescript
// sanity.config.ts (add to plugins array)
import { presentationTool } from 'sanity/presentation'
import { resolve } from './src/presentation/resolve'

presentationTool({
  resolve,
  previewUrl: {
    origin: process.env.SANITY_STUDIO_PREVIEW_URL ?? 'http://localhost:3000',
    previewMode: {
      enable: '/api/draft-mode/enable',
    },
  },
}),
```

### Document Location Resolver

```typescript
// src/sanity/presentation/resolve.ts (lives in schema layer — ADR-0031)
import { defineLocations, type PresentationPluginOptions } from 'sanity/presentation'

export const resolve: PresentationPluginOptions['resolve'] = {
  locations: {
    post: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc) => ({
        locations: [
          { title: doc?.title ?? 'Untitled', href: `/posts/${doc?.slug}` },
          { title: 'All posts', href: '/posts' },
        ],
      }),
    }),
    // Add more document types as needed
  },
}
```

### Visual Editing Contracts

These must stay in sync — changing one side requires checking the other:

| Studio Side                                     | Frontend Side                             |
| ----------------------------------------------- | ----------------------------------------- |
| `previewMode.enable` path                       | Must match an actual route handler        |
| URLs from `resolve.ts` (e.g., `/posts/${slug}`) | Must match actual `src/app/` routes       |
| `stega.studioUrl` in client                     | Must point to running Studio              |
| CORS origins with credentials                   | Frontend origin added in Sanity dashboard |

### Visual Editing Troubleshooting

| Symptom                                   | Cause                              | Fix                                             |
| ----------------------------------------- | ---------------------------------- | ----------------------------------------------- |
| Overlays appear but clicking does nothing | `stega.studioUrl` missing          | Add `stega: { studioUrl }` to `createClient`    |
| Blank iframe in Presentation Tool         | `origin` missing in config         | Add `origin` to `presentationTool` config       |
| Meta tags have garbled/invisible text     | Stega active in `generateMetadata` | Always pass `stega: false`                      |
| 403 errors in browser console             | Frontend origin not in CORS        | Add origin with credentials in Sanity dashboard |
| String comparisons fail in Draft Mode     | Stega chars in string values       | Use `stegaClean()` before comparing             |
| Page doesn't update when editor types     | `<SanityLive />` missing           | Add to root layout                              |

---

## Part 13: Error Handling at the CMS Boundary

CMS fetches cross an external service boundary. Apply ADR-0007's error handling strategy specifically for CMS errors.

### Error Classification

| CMS Error                  | ErrorCode             | User Experience                    |
| -------------------------- | --------------------- | ---------------------------------- |
| Sanity API unreachable     | `SERVICE_UNAVAILABLE` | Show cached content or fallback UI |
| GROQ query returns `null`  | `NOT_FOUND`           | Call `notFound()` → 404 page       |
| Webhook signature invalid  | `UNAUTHORIZED`        | Return 401 — don't revalidate      |
| Malformed GROQ response    | `BAD_REQUEST`         | Log error, show fallback           |
| Rate limited by Sanity API | `RATE_LIMITED`        | Retry with backoff                 |

### Service Function Pattern

```typescript
// src/lib/sanity/adapters/posts.ts
import { notFound } from 'next/navigation'

import { AppError, serviceUnavailable } from '@/lib/errors'
import { sanityFetch } from '@/lib/sanity/live'
import { POST_QUERY } from '@/lib/sanity/queries/posts'

export const getPost = async (slug: string) => {
  try {
    const { data } = await sanityFetch({
      query: POST_QUERY,
      params: { slug },
    })

    if (!data) notFound()

    return toPostDetail(data)
  } catch (error) {
    // If it's already an AppError or Next.js notFound, re-throw
    if (error instanceof AppError) throw error
    // NotFoundError from Next.js notFound() — let it propagate
    if (error && typeof error === 'object' && 'digest' in error) throw error

    // CMS boundary error — wrap in AppError
    console.error('CMS fetch error:', error)
    throw serviceUnavailable('Sanity CMS')
  }
}
```

### Graceful Degradation

For non-critical CMS content (e.g., testimonials sidebar, related posts), catch errors and render fallback UI instead of crashing the page:

```typescript
const RelatedPosts = async () => {
  try {
    const { data } = await sanityFetch({ query: RELATED_POSTS_QUERY })
    if (!data?.length) return null
    return <RelatedPostsList posts={data.map(toPostCard)} />
  } catch {
    // Non-critical — don't break the page
    return null
  }
}
```

---

## Part 14: Testing CMS Integration

Extends ADR-0009's testing strategy for CMS-specific concerns.

### Testing Strategy

| Layer                   | Tool         | What to Test                                  |
| ----------------------- | ------------ | --------------------------------------------- |
| Adapter functions       | Vitest       | GROQ result → frontend type transformation    |
| Portable Text rendering | Vitest + RTL | Component map renders correct HTML/classes    |
| Image helpers           | Vitest       | `urlFor` produces correct CDN URLs            |
| Webhook handler         | Vitest       | Signature validation, revalidation calls      |
| Page integration        | Playwright   | CMS-driven pages render with expected content |

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

### Mocking CMS Fetches with MSW

Per ADR-0009, use MSW v2 for API mocking. For Sanity, mock the GROQ API endpoint:

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const sanityHandlers = [
  http.get('https://:projectId.api.sanity.io/:version/data/query/:dataset', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('query')

    // Return different fixtures based on the query
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
    // ... test with invalid signature returns 401
  })

  it('revalidates tag on valid request', async () => {
    // ... test with valid signature calls revalidateTag
  })

  it('returns 400 for missing _type', async () => {
    // ... test with valid signature but no _type returns 400
  })
})
```

---

## Part 15: Client-Side CMS Data with TanStack Query

Most CMS data is server-fetched in Server Components (Part 3). However, some interactive UIs need client-side CMS data — search, filtering, infinite scroll, or polling for CMS-sourced dashboards. For these cases, use TanStack Query (per ADR-0005) with a **server-side proxy route** — never call the Sanity API directly from the client.

### Decision Tree: Server-Side vs Client-Side CMS Fetch

```
Does the UI need CMS data?
├── Static page rendering (blog post, portfolio, landing page)
│   └── Server Component + sanityFetch (Part 3) ← DEFAULT
│
├── Interactive filtering / search of CMS content
│   └── TanStack Query + Route Handler proxy
│
├── Infinite scroll / Load More of CMS lists
│   └── TanStack Query useInfiniteQuery + Route Handler proxy
│
├── Polling for CMS-sourced dashboard data
│   └── TanStack Query with refetchInterval + Route Handler proxy
│
└── Real-time updates when editors publish
    └── SanityLive (Part 3, Approach A) ← NOT TanStack Query
```

### Architecture: Route Handler Proxy 🟠

Client components **never** import Sanity client code or hold API tokens. A Route Handler proxies the request:

```
Client Component → useQuery → fetch('/api/cms/posts?q=...') → Route Handler → sanityFetch → Sanity
```

```typescript
// src/app/api/cms/posts/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

### TanStack Query Hook (Per ADR-0005)

```typescript
// src/services/cms-posts/queries.ts
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'

import { appQueryKeys } from '@/lib/query'
import { fetchCmsPosts, fetchCmsPostsPage } from './api'
import { CmsPostsResponseSchema } from './validation'
import type { UseCmsPostsSearchOpts } from './types'

export const useCmsPostsSearch = (searchTerm: string, opts: UseCmsPostsSearchOpts = {}) => {
  const { enabled = true } = opts

  return useQuery({
    ...appQueryKeys.cmsPosts.search(searchTerm),
    queryFn: async () => {
      const json = await fetchCmsPosts(searchTerm)
      return CmsPostsResponseSchema.parse(json) // Zod validates at boundary
    },
    enabled: enabled && searchTerm.length >= 2, // Don't search for 1 char
  })
}

export const useCmsPostsInfinite = () =>
  useInfiniteQuery({
    ...appQueryKeys.cmsPosts.all,
    queryFn: async ({ pageParam = 0 }) => {
      const json = await fetchCmsPostsPage(pageParam)
      return CmsPostsResponseSchema.parse(json)
    },
    getNextPageParam: (lastPage, pages) => (lastPage.data.length === 12 ? pages.length : undefined),
    initialPageParam: 0,
  })
```

### Query Key Factory (Per ADR-0005)

```typescript
// src/services/cms-posts/queryKeys.ts
import { createQueryKeys } from '@lukemorales/query-key-factory'

export const cmsPostKeys = createQueryKeys('cmsPosts', {
  all: { queryKey: null },
  search: (term: string) => ({ queryKey: [term] }),
  byCategory: (category: string) => ({ queryKey: [category] }),
})
```

### Rules for Client-Side CMS Data

| Rule                                                                                        | Level      |
| ------------------------------------------------------------------------------------------- | ---------- |
| Client-side CMS data must go through a Route Handler proxy — never call Sanity API directly | **MUST**   |
| Route Handler must not expose `SANITY_API_READ_TOKEN` to the client                         | **MUST**   |
| Use `@lukemorales/query-key-factory` for all CMS query keys (per ADR-0005)                  | **MUST**   |
| Validate Route Handler responses with Zod inside `queryFn` (per ADR-0005)                   | **MUST**   |
| Prefer server-side fetching — use client-side only when interactivity requires it           | **SHOULD** |
| Debounce search inputs (200-300ms) before triggering queries                                | **SHOULD** |
| Use `useInfiniteQuery` with `getNextPageParam` for paginated CMS lists                      | **SHOULD** |

### When NOT to Use TanStack Query for CMS

| Scenario                                        | Use Instead                                 |
| ----------------------------------------------- | ------------------------------------------- |
| Static page rendering (post, portfolio)         | Server Component + `sanityFetch` (Part 3)   |
| Real-time updates from editor                   | `SanityLive` component (Part 3, Approach A) |
| `generateMetadata` / `generateStaticParams`     | Server-side `sanityFetch` (Part 10)         |
| Content that doesn't need interactive filtering | Server Component — no client JS             |

---

## Anti-Patterns

### Data Fetching

| Anti-Pattern                                   | Why It's Wrong                                                 | Correct Pattern                                      |
| ---------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| `client.fetch()` directly in page components   | No caching control, no Draft Mode support                      | Use `sanityFetch` from `defineLive` or manual helper |
| Client-side CMS fetching (`useEffect` + fetch) | Bypasses the proxy, no Zod validation, no query key management | Use TanStack Query + Route Handler proxy (Part 15)   |
| `fetch(sanityUrl)` with raw URL construction   | Bypasses the Sanity client's CDN, auth, and stega handling     | Use `sanityFetch` which handles all config           |
| Importing `@sanity/client` in page components  | Breaks the data-access layer boundary                          | Import from `@/lib/sanity/` only                     |
| Calling Sanity API from client components      | Exposes token, bypasses cache, no SSR                          | Route Handler proxy + TanStack Query (Part 15)       |
| Using TanStack Query for static CMS page data  | Unnecessary client JS — Server Components are zero-JS          | Server Component + `sanityFetch`                     |

### Caching

| Anti-Pattern                                   | Why It's Wrong                                               | Correct Pattern                                           |
| ---------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| No cache option on CMS fetches                 | Next.js 15 doesn't cache by default — hits API every request | Always set `tags` or `revalidate` explicitly              |
| `tags` AND `revalidate` on same fetch          | Mutually exclusive in Next.js — tag wins, revalidate ignored | Use tags with `revalidate: false`, or revalidate alone    |
| `revalidate: 1` as "always fresh"              | Creates thundering herd — use `cache: 'no-store'` instead    | Use `no-store` for truly dynamic, or reasonable intervals |
| Revalidating without `waitForContentLakeEvent` | Webhook fires before CDN propagates → fetches stale data     | Set `parseBody(..., ..., true)` in webhook handler        |

### Visual Editing

| Anti-Pattern                               | Why It's Wrong                                       | Correct Pattern                                             |
| ------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------- |
| Stega enabled in `generateMetadata`        | Invisible chars corrupt `<title>`, `<meta>`, JSON-LD | Always `stega: false` for metadata and structured data      |
| Stega enabled in `generateStaticParams`    | Invisible chars in URL slugs break routing           | Always `stega: false` and `perspective: 'published'`        |
| Missing `stega.studioUrl` in client config | Overlays render but don't link to Studio             | Set `stega.studioUrl` in `createClient`                     |
| `<SanityLive />` in Studio layout          | Causes unexpected reloads in embedded Studio         | Exclude Studio route from the layout rendering `SanityLive` |
| Direct string comparison in Draft Mode     | `value === 'center'` fails with stega chars          | Use `stegaClean(value)` before comparing                    |

### Architecture

| Anti-Pattern                                 | Why It's Wrong                                              | Correct Pattern                                      |
| -------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| Components consuming GROQ types directly     | Tight coupling to CMS query shape — breaks on schema change | Use adapter functions to transform to frontend types |
| Portable Text rendered with raw HTML         | No consistent styling, no security (link `target`)          | Use `@portabletext/react` with project component map |
| CMS image with raw `<img>` tag               | No lazy loading, no `srcSet`, no format negotiation         | Use `next/image` or `next-sanity/image`              |
| Skipping webhook signature validation        | Anyone can trigger revalidation (or worse)                  | Always validate with `parseBody`                     |
| Same query fetched multiple times per render | N+1 problem — multiple calls for same data in one page      | React `cache()` deduplicates within a single render  |

---

## Cross-References

| ADR                               | Relationship                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| ADR-0005 (Data Fetching)          | Server-first fetching, `Result<T>` pattern, TanStack Query for client-side CMS search/filter/infinite scroll via Route Handler proxy |
| ADR-0006 (Environment)            | All CMS env vars validated with Zod in `src/lib/env.ts`                                                                              |
| ADR-0007 (Error Handling)         | `AppError`, `SERVICE_UNAVAILABLE` for CMS boundary errors                                                                            |
| ADR-0009 (Testing)                | Vitest + RTL for adapters/PT, MSW for GROQ mocking, Playwright for pages                                                             |
| ADR-0013 (SEO & Metadata)         | `generateMetadata` from CMS, JSON-LD, `stega: false` for all SEO contexts                                                            |
| ADR-0017 (Caching)                | Next.js 15 cache rules, tag-based revalidation, two-layer cache architecture                                                         |
| ADR-0018 (Performance)            | `next/image` for all CMS images, LCP `priority` prop, responsive `sizes`                                                             |
| ADR-0023 (UI Primitives)          | Portable Text component map uses project Typography/primitives                                                                       |
| ADR-0031 (Sanity CMS)             | Platform companion — schemas, GROQ, image CDN, Portable Text format                                                                  |
| ADR-0033 (Sanity Getting Started) | Bootstrap — Studio, env vars, webhook config, packages                                                                               |

---

## Library Reference 🟠

| Package               | Version | Purpose                                                                | Status          |
| --------------------- | ------- | ---------------------------------------------------------------------- | --------------- |
| `next-sanity`         | 12.x    | Sanity client, `defineLive`, `defineQuery`, Visual Editing, Draft Mode | **Recommended** |
| `@sanity/image-url`   | 2.x     | Image CDN URL builder                                                  | **Recommended** |
| `@portabletext/react` | 6.x     | Portable Text rendering                                                | **Recommended** |

### Import Paths (next-sanity 12.x)

| Export                                              | Import From                  |
| --------------------------------------------------- | ---------------------------- |
| `createClient`, `defineQuery`, `groq`, `stegaClean` | `next-sanity`                |
| `defineLive`                                        | `next-sanity/live`           |
| `Image`, `imageLoader`                              | `next-sanity/image`          |
| `VisualEditing`                                     | `next-sanity/visual-editing` |
| `defineEnableDraftMode`                             | `next-sanity/draft-mode`     |
| `useIsPresentationTool`, `useOptimistic`            | `next-sanity/hooks`          |
| `parseBody`                                         | `next-sanity/webhook`        |
| `PortableText`                                      | `@portabletext/react`        |
