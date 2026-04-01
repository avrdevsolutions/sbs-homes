---
name: sanity-cms-rendering
description: >-
  Sanity CMS rendering patterns — urlFor image URL builder setup, next-sanity/image
  vs next/image with imageLoader choice, image rendering rules (LCP priority, sizes,
  auto format), complete portableTextComponents map (block styles, marks, internal
  and external links, inline images with figcaption), PortableText usage in components,
  adapter functions for transforming Sanity GROQ results to frontend types (toPostCard/
  toPostDetail examples with typegen output types), when-to-use-adapters decision table,
  error handling at the Sanity fetch boundary with AppError and notFound(), graceful
  degradation for non-critical CMS sections. Use when rendering Sanity images with
  next/image, implementing Portable Text rendering for a Sanity-driven page, writing
  adapter functions for Sanity GROQ query results, handling Sanity API errors at the
  data-access boundary, or building non-critical CMS sections with fallback UI.
---

# Sanity CMS — Rendering Patterns

**Compiled from**: ADR-0032 Parts 7–9 and 13 (Image Integration, Portable Text, Adapter Pattern, Error Handling)
**Last synced**: 2026-03-31

---

## Part 7: Image Integration with `next/image`

### `urlFor` Helper (`src/lib/sanity/image.ts`)

```typescript
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url'

import { client } from './client'

const builder = createImageUrlBuilder(client)

export const urlFor = (source: SanityImageSource) => builder.image(source)
```

### Option A: `next-sanity/image` Component (Recommended)

```typescript
import { Image } from 'next-sanity/image'

import { urlFor } from '@/lib/sanity/image'
import type { SanityImageSource } from '@sanity/image-url'

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

The `Image` component from `next-sanity/image` bypasses the Next.js optimization proxy — the Sanity CDN handles resizing, `auto=format` (WebP/AVIF), and edge caching. No `remotePatterns` config needed.

### Option B: `next/image` with `imageLoader`

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

### Image Rules

| Rule                                                                  | Level      |
| --------------------------------------------------------------------- | ---------- |
| LCP image (hero, above-fold) MUST get `priority` prop                 | **MUST**   |
| Every `<Image>` MUST have explicit `width`/`height` or `fill`         | **MUST**   |
| Every CMS image MUST include `alt` from the CMS alt field             | **MUST**   |
| MUST chain `.auto('format')` on `urlFor` (via imageLoader, automatic) | **MUST**   |
| Use `sizes` prop for responsive images                                | **SHOULD** |
| Chain `.width(N)` on `urlFor` to avoid oversized downloads            | **SHOULD** |

---

## Part 8: Portable Text Rendering

### Complete Component Map (`src/lib/sanity/portable-text.ts`)

```typescript
import type { PortableTextReactComponents } from '@portabletext/react'
import NextImage from 'next/image'
import Link from 'next/link'

import { imageLoader } from 'next-sanity/image'

import { urlFor } from './image'

export const portableTextComponents: Partial<PortableTextReactComponents> = {
  block: {
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
import type { PortableTextBlock } from '@portabletext/types'

import { portableTextComponents } from '@/lib/sanity/portable-text'

const PostBody = ({ body }: { body: PortableTextBlock[] }) => (
  <div className='prose-custom mx-auto max-w-prose'>
    <PortableText value={body} components={portableTextComponents} />
  </div>
)
```

### Portable Text Rules

| Rule                                                                       | Level      |
| -------------------------------------------------------------------------- | ---------- |
| All block styles MUST map to project Typography/font-size tokens           | **MUST**   |
| External links MUST have `target="_blank"` and `rel="noopener noreferrer"` | **MUST**   |
| Internal links MUST use Next.js `Link` for client-side navigation          | **MUST**   |
| Inline images MUST use `next/image`                                        | **MUST**   |
| MUST NOT use `dangerouslySetInnerHTML` for Portable Text                   | **MUST**   |
| Component map defined once in `portable-text.ts` — not per component       | **SHOULD** |
| Extend the map when adding new block types in the Sanity schema            | **SHOULD** |

---

## Part 9: Adapter Pattern

Adapter functions transform GROQ query results into frontend-friendly types. Components depend on frontend types, never on raw GROQ shapes.

### Pattern

```typescript
// src/lib/sanity/adapters/posts.ts
import type { POSTS_QUERYResult, POST_QUERYResult } from '@/sanity/types' // typegen output
import type { PortableTextBlock } from '@portabletext/types'

import { urlFor } from '@/lib/sanity/image'

// Frontend types — what components consume
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

// Adapter functions
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
| Component used by both CMS and non-CMS data sources             | **Yes**      |
| Prototype / single-use page with simple query                   | Optional     |

---

## Part 13: Error Handling at the Sanity Boundary

### Error Classification

| Sanity Error               | ErrorCode             | User Experience               |
| -------------------------- | --------------------- | ----------------------------- |
| Sanity API unreachable     | `SERVICE_UNAVAILABLE` | Cached content or fallback UI |
| GROQ query returns `null`  | `NOT_FOUND`           | Call `notFound()` → 404 page  |
| Webhook signature invalid  | `UNAUTHORIZED`        | Return 401 — don't revalidate |
| Malformed GROQ response    | `BAD_REQUEST`         | Log error, show fallback      |
| Rate limited by Sanity API | `RATE_LIMITED`        | Retry with backoff            |

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
    // Re-throw AppError or Next.js notFound() unchanged
    if (error instanceof AppError) throw error
    if (error && typeof error === 'object' && 'digest' in error) throw error

    // CMS boundary error — wrap in AppError
    console.error('CMS fetch error:', error)
    throw serviceUnavailable('Sanity CMS')
  }
}
```

### Graceful Degradation for Non-Critical Sections

```typescript
const RelatedPosts = async () => {
  try {
    const { data } = await sanityFetch({ query: RELATED_POSTS_QUERY })
    if (!data?.length) return null
    return <RelatedPostsList posts={data.map(toPostCard)} />
  } catch {
    return null // Non-critical — don't crash the page
  }
}
```
