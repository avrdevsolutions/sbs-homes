---
name: seo-page-metadata
description: >-
  Per-page SEO metadata patterns — static metadata export for fixed routes,
  generateMetadata with async params for dynamic routes (blog, products, location pages),
  global-error.tsx lang attribute consistency requirement and fix,
  static OG image guidelines (1200×630px design rules),
  dynamic opengraph-image.tsx with edge runtime pattern.
  Use when adding metadata to a static page, writing generateMetadata for a dynamic
  route, creating Open Graph images, or fixing lang attribute mismatches between
  layout.tsx and global-error.tsx.
---

# SEO — Per-Page Metadata

**Compiled from**: ADR-0013 §Implementation Steps 2–3, §Open Graph Images
**Last synced**: 2026-03-27

---

## Static Per-Page Metadata

```tsx
// src/app/page.tsx — Home page (local business: include location in title)
import type { Metadata } from 'next'
import { canonicalUrl } from '@/lib/seo/config'

export const metadata: Metadata = {
  title: 'Galerie de Artă Contemporană în București',
  // → "Galerie de Artă Contemporană în București | Brand" (via root layout template)
  description:
    'Galerie de artă contemporană în centrul Bucureștiului. Expoziții permanente și temporare. Program: L-V 10-19, S 11-17.',
  alternates: {
    canonical: canonicalUrl('/'),
  },
  openGraph: {
    title: 'Galerie de Artă Contemporană în București',
    description:
      'Galerie de artă contemporană în centrul Bucureștiului. Expoziții permanente și temporare.',
    url: canonicalUrl('/'),
  },
}

export default function HomePage() {
  return (
    <main>
      <h1>Galerie de Artă Contemporană în București</h1>
      {/* H1 must match the primary keyword in the title */}
    </main>
  )
}
```

```tsx
// src/app/exhibitions/page.tsx — Interior page
import type { Metadata } from 'next'
import { canonicalUrl } from '@/lib/seo/config'

export const metadata: Metadata = {
  title: 'Expoziții de Artă Contemporană',
  // → "Expoziții de Artă Contemporană | Brand"
  description:
    'Programul expozițiilor curente și viitoare. Artă contemporană românească și internațională în inima Bucureștiului.',
  alternates: {
    canonical: canonicalUrl('/exhibitions'),
  },
}
```

---

## Dynamic Route Metadata (Blog, Products, Location Pages)

```tsx
// src/app/blog/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/db/queries/posts'
import { canonicalUrl } from '@/lib/seo/config'

type Props = { params: Promise<{ slug: string }> }

// generateMetadata is async — MUST await params (Next.js 15 requirement)
export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}

  return {
    title: post.title,
    description: post.excerpt || post.content.slice(0, 155) + '…',
    alternates: {
      canonical: canonicalUrl(`/blog/${slug}`),
    },
    openGraph: {
      title: post.title,
      description: post.excerpt || post.content.slice(0, 155) + '…',
      url: canonicalUrl(`/blog/${slug}`),
      type: 'article',
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author.name ?? ''],
      images: post.coverImage
        ? [{ url: post.coverImage, width: 1200, height: 630, alt: post.title }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || post.content.slice(0, 155) + '…',
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  return (
    <article>
      <h1>{post.title}</h1>
    </article>
  )
}
```

**Note**: Next.js deduplicates fetches — calling `getPostBySlug(slug)` in both `generateMetadata` and the page component does not cause a double DB hit if using the same cache key.

### CMS (Sanity) Data Source Variant

When the data source is Sanity CMS instead of a database, the `sanityFetch` call **must** include `stega: false` to prevent invisible stega characters from corrupting `<title>` and `<meta>` tags:

```tsx
// src/app/blog/[slug]/page.tsx — Sanity CMS variant
import { sanityFetch } from '@/lib/sanity/live'
import { POST_BY_SLUG_QUERY } from '@/lib/sanity/queries'
import { urlFor } from '@/lib/sanity/image'
import { buildTitle, canonicalUrl } from '@/lib/seo/config'

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { slug } = await params
  const { data: post } = await sanityFetch({
    query: POST_BY_SLUG_QUERY,
    params: { slug },
    stega: false, // CRITICAL — no stega in metadata
  })

  if (!post) return {}

  const title = post.seo?.metaTitle ?? post.title
  const description = post.seo?.metaDescription ?? post.excerpt

  return {
    title: buildTitle(title),
    description,
    alternates: { canonical: canonicalUrl(`/blog/${slug}`) },
    openGraph: {
      title,
      description,
      images: post.mainImage
        ? [{ url: urlFor(post.mainImage).width(1200).height(630).auto('format').url() }]
        : [],
    },
    ...(post.seo?.noIndex && { robots: { index: false, follow: false } }),
  }
}
```

---

## `global-error.tsx` Lang Consistency

`global-error.tsx` renders its own `<html>` and `<body>` tags (Next.js requirement — it replaces the root layout when the layout itself throws). The `lang` attribute **must match** the root layout exactly.

```tsx
// ✅ Correct — both layout.tsx and global-error.tsx use the same lang
// src/app/layout.tsx:   <html lang="ro">

// src/app/global-error.tsx:
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ro">  {/* ← must match layout.tsx lang exactly */}
      <body>
        <h2>Something went wrong</h2>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  )
}

// ❌ Wrong — mismatch tells Google the error page is a different language
// layout.tsx:       <html lang="ro">
// global-error.tsx: <html lang="en">   ← wrong!
```

When generating `global-error.tsx`, always check the root `layout.tsx` for its `lang` value and use the same one.

---

## Static OG Image

Place a 1200×630px image at `public/og-default.png`. This is the social sharing fallback for all pages that don't override it.

**Design rules:**
- 1200×630px (2:1.05 ratio)
- Brand logo visible
- Key text readable at thumbnail size
- High contrast — renders on both light and dark backgrounds
- No critical content in the outer 10% — social platforms may crop edges

---

## Dynamic OG Images (Per-Page)

```tsx
// src/app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Blog post cover'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ slug: string }> }

const Image = async ({ params }: Props) => {
  const { slug } = await params
  const post = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/posts/${slug}`).then((r) =>
    r.json(),
  )

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        background: 'linear-gradient(135deg, #1e293b, #334155)',
        color: 'white',
      }}
    >
      <h1 style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.2 }}>{post.data.title}</h1>
      <p style={{ fontSize: 24, opacity: 0.7, marginTop: 20 }}>My Brand — Blog</p>
    </div>,
    size,
  )
}

export default Image
```

Dynamic OG images run on the Edge runtime. Use them for blog posts, products, or any page type where a branded per-item image meaningfully improves social sharing.

---

## Anti-Patterns

```tsx
// ❌ No canonical set — same page indexable at /page, /page/, /page?ref=google
// ✅ Always set alternates.canonical using canonicalUrl()

// ❌ description over 160 chars — Google truncates it in search results
// ✅ Keep meta description 120–160 chars — concise, keyword included, ends with CTA or distinguishing detail

// ❌ title is just the brand name — "My Brand" tells Google nothing about the page
// ✅ title is the primary keyword for that page: "Expoziții de Artă Contemporană"

// ❌ Missing openGraph.url — sharing debuggers show wrong URL
// ✅ Always set openGraph.url: canonicalUrl('/your-path')

// ❌ Dynamic generateMetadata that doesn't await params — breaks in Next.js 15
export const generateMetadata = ({ params }: Props) => { /* params.slug — wrong! */ }
// ✅ Always async + await
export const generateMetadata = async ({ params }: Props) => {
  const { slug } = await params
  // ...
}
```
