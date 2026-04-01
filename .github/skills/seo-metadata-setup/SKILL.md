---
name: seo-metadata-setup
description: >-
  SEO infrastructure setup — config.ts with SEO_BRAND/SEO_SITE_URL/buildTitle/canonicalUrl,
  root layout metadata (title.template, metadataBase, default OG/Twitter/robots blocks),
  sitemap.ts with static and dynamic routes and sitemap priority table, robots.ts with
  env-aware disallow, environment variable setup, keywords.ts keyword strategy file,
  image SEO (descriptive file naming, alt text patterns, LCP priority prop).
  Use when initializing SEO on a new project, wiring the SEO config file,
  generating a sitemap, configuring robots.txt, or implementing image SEO basics.
---

# SEO — Infrastructure Setup

**Compiled from**: ADR-0013 §Implementation Steps 1–2, §Sitemap, §Robots.txt, §Keyword Strategy File, §Image SEO, §Environment Variable
**Last synced**: 2026-03-27

---

## File Structure

```
src/
  lib/
    seo/
      config.ts              # Centralized SEO constants — single source of truth
      keywords.ts            # Keyword strategy per page (keyword-heavy projects)
      structured-data.ts     # JSON-LD schema generators
      types.ts               # SEO-related types
  app/
    layout.tsx               # Root metadata (title template, defaults)
    sitemap.ts               # Auto-generated sitemap
    robots.ts                # Auto-generated robots.txt (env-aware)
```

---

## Step 1: SEO Config — Single Source of Truth

```typescript
// src/lib/seo/config.ts
import { env } from '@/lib/env'

export const SEO_BRAND = 'My Brand'                          // TODO: replace per project
export const SEO_SITE_URL = env.NEXT_PUBLIC_SITE_URL || 'https://www.example.com'
export const SEO_DEFAULT_OG_IMAGE = `${SEO_SITE_URL}/og-default.png`

export const SEO_DEFAULTS = {
  title: SEO_BRAND,
  description: 'TODO: Add default site description',         // TODO: replace per project
  locale: 'en',                                              // 'ro' for Romanian sites
  type: 'website',
} as const

/** Builds "[Page Topic] | [Brand]" pattern */
export const buildTitle = (pageTitle: string): string => `${pageTitle} | ${SEO_BRAND}`

/**
 * Full canonical URL — strips query params and hash fragments.
 * canonicalUrl('/blog?utm_source=x') → 'https://www.example.com/blog'
 */
export const canonicalUrl = (path: string): string => {
  const clean = path.split('?')[0].split('#')[0]
  const normalized = clean === '/' ? '' : clean.replace(/\/$/, '')
  return `${SEO_SITE_URL}${normalized}`
}
```

**Rule**: every title, canonical URL, OG image, and brand reference derives from this file. When the brand or URL changes, only this file updates.

---

## Step 2: Root Layout Metadata

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { SEO_BRAND, SEO_SITE_URL, SEO_DEFAULT_OG_IMAGE, SEO_DEFAULTS } from '@/lib/seo/config'

export const metadata: Metadata = {
  title: {
    default: SEO_BRAND,
    template: `%s | ${SEO_BRAND}`,  // Child pages set just 'Exhibitions' → "Exhibitions | Brand"
  },
  description: SEO_DEFAULTS.description,
  metadataBase: new URL(SEO_SITE_URL),  // Required — resolves relative URLs in metadata

  openGraph: {
    type: 'website',
    locale: SEO_DEFAULTS.locale,
    siteName: SEO_BRAND,
    images: [{ url: SEO_DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SEO_BRAND }],
  },
  twitter: {
    card: 'summary_large_image',
    // site: '@yourtwitterhandle',  // Add if applicable
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // verification: { google: 'your-google-verification-code' },  // Add after Search Console setup
}
```

Child pages only need `title: 'Exhibitions'` — the template appends `| Brand` automatically.

---

## Sitemap — Next.js Native

No XML scripts needed — Next.js generates from TypeScript:

```typescript
// src/app/sitemap.ts
import type { MetadataRoute } from 'next'
import { SEO_SITE_URL } from '@/lib/seo/config'

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SEO_SITE_URL,                  lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SEO_SITE_URL}/exhibitions`, lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${SEO_SITE_URL}/artists`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SEO_SITE_URL}/contact`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ]

  // Dynamic routes — fetch from database and add to return array:
  // const posts = await db.post.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } })
  // const dynamicRoutes = posts.map((post) => ({
  //   url: `${SEO_SITE_URL}/blog/${post.slug}`,
  //   lastModified: post.updatedAt,
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.6,
  // }))
  // return [...staticRoutes, ...dynamicRoutes]

  return staticRoutes
}

export default sitemap
```

**Priority guidelines:**

| Page type | Priority | Change frequency |
|---|---|---|
| Home page | 1.0 | weekly |
| Key landing pages (services, products) | 0.9 | weekly |
| Category / listing pages | 0.8 | weekly |
| Individual content (blog, products) | 0.6 | weekly |
| Contact, about, legal | 0.5–0.7 | monthly |
| Auth, admin, dashboard | **Do not include** | — |

Submit `https://www.example.com/sitemap.xml` to Google Search Console after launch.

---

## Robots.txt — Env-Aware

```typescript
// src/app/robots.ts
import type { MetadataRoute } from 'next'
import { SEO_SITE_URL } from '@/lib/seo/config'

const robots = (): MetadataRoute.Robots => {
  const isProduction =
    process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'

  if (!isProduction) {
    return { rules: { userAgent: '*', disallow: '/' } }  // Block staging from Google
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/cms/', '/dashboard/', '/settings/', '/_next/'],
      },
    ],
    sitemap: `${SEO_SITE_URL}/sitemap.xml`,
  }
}

export default robots
```

**Critical**: staging/preview MUST return `disallow: /` — otherwise Google indexes staging and creates duplicate content penalties.

---

## Environment Variable

```typescript
// src/lib/env.ts — add:
NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
```

```dotenv
# .env.local
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Production (Vercel dashboard)
NEXT_PUBLIC_SITE_URL=https://www.example.com
```

---

## Keyword Strategy File (Keyword-Heavy Projects)

For local businesses, e-commerce, or content sites — keeps per-page keyword targets in one place:

```typescript
// src/lib/seo/keywords.ts
type PageKeywords = {
  path: string
  primary: string
  secondary: string[]
  titleTemplate: string
  descriptionTemplate: string
}

export const PAGE_KEYWORDS: PageKeywords[] = [
  {
    path: '/',
    primary: 'galerie artă bucurești',
    secondary: ['galerie artă contemporană bucurești', 'expoziții artă bucurești'],
    titleTemplate: 'Galerie de Artă Contemporană în București',
    descriptionTemplate:
      'Galerie de artă contemporană în centrul Bucureștiului. Expoziții permanente și temporare. Program: L-V 10-19, S 11-17.',
  },
  // One entry per page — one primary keyword each
]
```

**Rule**: one primary keyword per page. Don't try to rank for everything on every page.

---

## Image SEO

### File Naming

```
❌  IMG_2034.jpg    photo1.webp    untitled.png
✅  galerie-arta-contemporana-bucuresti.webp
✅  mobilier-lemn-masiv-living.webp
✅  expozitie-pictura-abstracta-2024.webp
```

File names are part of the image URL — Google reads them. Rename before uploading.

### Alt Text

```tsx
// ❌ Missing / generic
<Image src="/hero.webp" alt="" />
<Image src="/hero.webp" alt="photo" />

// ❌ Keyword stuffing
<Image src="/hero.webp" alt="art gallery bucharest art gallery contemporary art romania art" />

// ✅ Descriptive, natural, 1–2 keywords
<Image src="/hero.webp" alt="Expoziție de artă contemporană în galeria din centrul Bucureștiului" />
<Image src="/masa-stejar.webp" alt="Masă din lemn masiv de stejar, 180cm, pentru sufragerie" />
```

### LCP Image (Hero / Above the Fold)

```tsx
// Hero image — the Largest Contentful Paint element
<Image
  src="/hero-galerie.webp"
  alt="Galerie de artă contemporană în București"
  width={1200}
  height={600}
  priority       // ← disables lazy loading, adds <link rel="preload">
  sizes="100vw"  // ← full-width — helps browser pick correct source
/>

// Below-the-fold images — no priority flag (lazy load by default)
<Image src="/artist-portrait.webp" alt="Portret artist Ion Popescu" width={400} height={400} />
```

---

## Anti-Patterns

```tsx
// ❌ Same title on every page
export const metadata = { title: 'My Brand' }

// ✅ Per-page title — root layout template appends "| Brand"
export const metadata = { title: 'Exhibitions' }  // → "Exhibitions | My Brand"

// ❌ Missing description — Google writes its own (poorly)
export const metadata = { title: 'About Us' }

// ✅ Always 120–160 chars, keyword included, ends with CTA or distinguishing detail
export const metadata = {
  title: 'About Us',
  description: 'Learn about our art gallery in Bucharest. Founded 2015, showcasing contemporary Romanian and international art.',
}

// ❌ No metadataBase → relative OG image URLs break on social platforms
// ✅ Set metadataBase: new URL(SEO_SITE_URL) in root layout

// ❌ Placeholder text in production
export const metadata = { title: 'My App', description: 'TODO: Add description' }

// ❌ robots.ts allows crawling on staging → staging gets indexed by Google
// ✅ robots.ts checks VERCEL_ENV/NODE_ENV — disallows everything on non-production
```
