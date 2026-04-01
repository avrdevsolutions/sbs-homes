---
name: sanity-cms-draft-mode
description: >-
  Sanity Visual Editing and Draft Mode — generateStaticParams with perspective:
  'published' and stega:false, generateMetadata stega:false requirement with
  full context table (generateStaticParams/generateMetadata/JSON-LD/string
  comparisons), stegaClean() for string comparisons in Draft Mode, CMS-driven
  JSON-LD structured data with stega-free fetch, SEO checklist for Sanity-driven
  pages, Visual Editing architecture diagram with step-by-step editor flow,
  Draft Mode enable/disable route handlers (defineEnableDraftMode), root layout
  integration with SanityLive and VisualEditing, DisableDraftMode client
  component with useIsPresentationTool, Presentation Tool config in sanity.config.ts,
  document location resolver, Visual Editing contracts and troubleshooting table.
  Use when setting up Sanity Visual Editing, implementing Sanity Draft Mode routes,
  configuring the Sanity Presentation Tool, wiring generateStaticParams or
  generateMetadata for Sanity-driven pages, or debugging stega encoding issues
  in metadata, URLs, or string comparisons.
---

# Sanity CMS — Draft Mode & Visual Editing

**Compiled from**: ADR-0032 Parts 10–12 (Route Wiring, SEO Integration, Visual Editing & Draft Mode)
**Last synced**: 2026-03-31

---

## Part 10: Route Wiring

### `generateStaticParams`

Pre-render Sanity-driven pages at build time:

```typescript
// src/app/posts/[slug]/page.tsx
export const generateStaticParams = async () => {
  const { data } = await sanityFetch({
    query: POST_SLUGS_QUERY,
    perspective: 'published', // MUST — only published slugs as URL segments
    stega: false, // MUST — stega chars in slugs break routing
  })
  return data.map((post) => ({ slug: post.slug }))
}
```

### `generateMetadata`

CMS-driven metadata with SEO safety (Next.js 15 — `params` is async):

```typescript
export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { data } = await sanityFetch({
    query: POST_QUERY,
    params: await params,
    stega: false, // CRITICAL — stega chars corrupt <title> and <meta> tags
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

### `stega: false` — Required Contexts

| Context                 | `stega`               | Why                                                          |
| ----------------------- | --------------------- | ------------------------------------------------------------ |
| `generateStaticParams`  | `false`               | Slug values become URL segments — invisible chars break URLs |
| `generateMetadata`      | `false`               | `<title>`, `<meta>`, OG tags — stega corrupts SEO            |
| JSON-LD structured data | `false`               | Search engines parse raw JSON — stega breaks structured data |
| String comparisons      | `stegaClean()` before | `align === 'center'` fails with stega chars                  |
| Page component body     | Default (omit)        | Stega encoding is correct here — enables click-to-edit       |

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

## Part 11: SEO Integration with Sanity Content

### CMS-Driven JSON-LD

JSON-LD must use stega-free data — use a separate fetch or `stegaClean`:

```typescript
const PostPage = async ({ params }: Props) => {
  const { data: post } = await sanityFetch({
    query: POST_QUERY,
    params: await params,
    // Default stega for body rendering
  })

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
    author: seoData?.author
      ? { '@type': 'Person', name: seoData.author.name }
      : undefined,
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

### SEO Checklist for Sanity-Driven Pages

| Item                                    | Implementation                                                |
| --------------------------------------- | ------------------------------------------------------------- |
| `<title>` from Sanity with brand suffix | `generateMetadata` → `title: data.title` (template in layout) |
| Meta description from excerpt           | `generateMetadata` → `description: data.excerpt`              |
| OG image from Sanity image field        | `urlFor(mainImage).width(1200).height(630).url()`             |
| Canonical URL                           | `metadataBase` in root layout                                 |
| JSON-LD structured data                 | Per content type — Article, Product, FAQ, etc.                |
| Sitemap includes Sanity routes          | `sitemap.ts` fetches published slugs from Sanity              |

---

## Part 12: Visual Editing & Draft Mode

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
│  Editor changes field  → SanityLive re-renders page │
└─────────────────────────────────────────────────────┘
```

### Flow

1. Editor opens Presentation Tool in Sanity Studio
2. Studio loads the Next.js frontend in an iframe
3. Studio hits `/api/draft-mode/enable` → activates Draft Mode
4. `sanityFetch` returns draft content with stega encoding (invisible chars encoding document ID + field path + Studio URL)
5. `<VisualEditing />` reads stega from DOM → draws click-to-edit overlays
6. Editor clicks overlay → Studio navigates to that document/field
7. Editor changes field → `<SanityLive />` picks up mutation → page re-renders

### Draft Mode Enable Route

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

### Draft Mode Disable Route

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

### Root Layout Integration

```tsx
// src/app/layout.tsx — additions for Visual Editing
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

**Important for embedded Studio**: If Studio runs on `/studio` inside the same Next.js app, do **not** include `<SanityLive />` or `<VisualEditing />` in the Studio layout. Use a layout group `(site)` to exclude the `/studio` route.

### Disable Draft Mode Button

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

### Presentation Tool Config (`sanity.config.ts`)

```typescript
import { presentationTool } from 'sanity/presentation'
import { resolve } from './src/presentation/resolve'

// In the plugins array:
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
// src/sanity/presentation/resolve.ts (schema layer)
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

### Visual Editing Contracts (Must Stay in Sync)

| Studio Side                                     | Frontend Side                             |
| ----------------------------------------------- | ----------------------------------------- |
| `previewMode.enable` path                       | Must match an actual route handler        |
| URLs from `resolve.ts` (e.g., `/posts/${slug}`) | Must match actual `src/app/` routes       |
| `stega.studioUrl` in client                     | Must point to running Sanity Studio       |
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
