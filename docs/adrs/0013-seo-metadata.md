# ADR-0013: SEO & Metadata

**Status**: Accepted
**Date**: 2026-02-27
**Supersedes**: N/A

---

## Context

Search Engine Optimization (SEO) determines whether clients' websites appear in search results. For local businesses (art galleries, furniture workshops, restaurants), ranking for location-specific queries like "galerie artă bucurești" or "mobilier la comandă Cluj-Napoca" is the difference between getting customers and being invisible. For SaaS products, SEO drives organic acquisition.

Next.js App Router has native, first-class SEO support — unlike SPAs (React + Vite) where SEO requires build-time hacks (meta tag injection, static sitemap generation, headless browser rendering). With Server-Side Rendering, every page delivers complete HTML with metadata to crawlers. The Metadata API, `sitemap.ts`, `robots.ts`, and JSON-LD structured data all work out of the box.

This ADR covers the complete SEO architecture: from how search engines work (so agents understand WHY), to the exact implementation patterns for metadata, structured data, sitemaps, Open Graph, keywords, and local SEO. Every project that serves public pages MUST implement these patterns.

## Decision

**Next.js Metadata API for all meta tags. Static `sitemap.ts` and `robots.ts` (Next.js native). JSON-LD structured data for rich results. Per-page keyword strategy. Centralized SEO config as single source of truth.**

---

## How Search Engines Work (The Knowledge You Need)

Understanding WHY each technique matters is critical. Without this, agents apply patterns mechanically without optimizing for what actually affects rankings.

### What Google Evaluates (Simplified)

```
1. CRAWLING — Can Google find and read your pages?
   → Sitemap tells Google what pages exist
   → robots.txt tells Google what NOT to crawl
   → Internal links help Google discover pages
   → Server-rendered HTML (Next.js SSR) = immediately readable

2. INDEXING — Does Google understand what each page is about?
   → <title> tag — the most important on-page signal
   → <meta description> — affects click-through rate in results
   → <h1> tag — confirms the page topic
   → Content quality and relevance — does the page answer the search query?
   → Structured data (JSON-LD) — helps Google understand entity types

3. RANKING — Where does Google place the page in results?
   → Relevance — does the page match the search intent?
   → Keywords — do title, headings, and content contain the searched terms?
   → Backlinks — do other websites link to this page? (biggest off-page factor)
   → User experience — Core Web Vitals (speed, interactivity, layout stability)
   → Mobile-friendly — responsive design
   → HTTPS — secure connection
   → Domain authority — age, history, trust signals
```

### Your Art Gallery Example: "galerie artă bucurești"

To rank for "galerie artă bucurești" (or any local business query), you need:

| Factor                      | What To Do                                                                                                                                             | Why                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Title tag**               | `Galerie de Artă în București                                                                                                                          | [Numele Galeriei]`                                                     | Google weighs `<title>` heavily. Include the exact search phrase. |
| **Meta description**        | "Galerie de artă contemporană în centrul Bucureștiului. Expoziții permanente și temporare, artă românească și internațională. Vizitează-ne pe Str. X." | Appears below the title in results — affects click-through rate        |
| **H1 heading**              | "Galerie de Artă Contemporană în București"                                                                                                            | Confirms the page topic to Google                                      |
| **Content**                 | 300+ words about the gallery, artists, exhibitions, location, hours                                                                                    | Google needs content to understand the page. Empty pages don't rank    |
| **LocalBusiness JSON-LD**   | Name, address, phone, geo coordinates, opening hours                                                                                                   | Enables rich results (Google Maps pin, knowledge panel, business info) |
| **Google Business Profile** | Claim and verify the business on Google Maps                                                                                                           | #1 local ranking factor — not in your code, but client must do this    |
| **NAP consistency**         | Same Name, Address, Phone everywhere (website, Google Maps, Yelp, Facebook)                                                                            | Google cross-references — inconsistency hurts rankings                 |
| **Backlinks**               | Get other websites (local directories, art blogs) to link to the gallery                                                                               | External authority signal — the hardest but most impactful factor      |
| **Romanian language**       | All content in Romanian (with proper diacritics: ă, â, î, ș, ț)                                                                                        | Google ranks pages in the language users search in                     |
| **Images with alt text**    | `alt="Expoziție artă contemporană galerie București"`                                                                                                  | Google Image Search is a significant traffic source                    |

### Keywords: How To Think About Them

**Keywords are the phrases people type into Google.** Your job is to make each page match one primary keyword phrase.

```
Page: Home
  Primary keyword: "galerie artă bucurești"
  Secondary keywords: "expoziții artă bucurești", "galerie artă contemporană"
  Title: "Galerie de Artă în București | [Brand]"

Page: Exhibitions
  Primary keyword: "expoziții artă contemporană bucurești"
  Title: "Expoziții de Artă Contemporană | [Brand]"

Page: Artists
  Primary keyword: "artiști contemporani români"
  Title: "Artiști Contemporani Români | [Brand]"

Page: Contact
  Primary keyword: "galerie artă bucurești contact"
  Title: "Contact & Program | [Brand]"
```

**Rule of thumb**: One page = one primary keyword. Don't try to rank for everything on every page.

### Keyword Research Process

Before writing any SEO config, research what people actually search for:

1. **Google Autocomplete** — type "galerie artă" and see what Google suggests
2. **Google "People Also Ask"** — search your keyword, look at the questions box
3. **Google Keyword Planner** (free with Google Ads account) — search volume data
4. **Competitor analysis** — Google your keyword, look at what the top 3 results have in their titles
5. **Think like a customer** — what would someone type to find this business?

**Location keywords matter enormously for local businesses:**

- "galerie artă bucurești" (city)
- "galerie artă sector 1" (district)
- "galerie artă centrul vechi" (neighborhood)
- "galerie artă lângă mine" (near me — Google uses GPS)

---

## Rules

| Rule                                                                                                                                | Level                           |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Every public page has a unique `<title>` tag containing the primary keyword                                                         | **MUST**                        |
| Every public page has a unique `<meta name="description">` (120-160 characters)                                                     | **MUST**                        |
| Title format: `[Primary Keyword Phrase] \| [Brand Name]`                                                                            | **MUST**                        |
| Home page title includes location: `[Service] în [City] \| [Brand]`                                                                 | **MUST** (for local businesses) |
| Every page has one `<h1>` tag matching the page topic (not the brand name)                                                          | **MUST**                        |
| Canonical URL set on every page (prevents duplicate content)                                                                        | **MUST**                        |
| `sitemap.ts` exists and includes all indexable routes                                                                               | **MUST**                        |
| `robots.ts` exists — allow in production, disallow in preview/staging                                                               | **MUST**                        |
| JSON-LD structured data on all business/product/article pages                                                                       | **MUST**                        |
| Open Graph tags for social media sharing (og:title, og:description, og:image)                                                       | **MUST**                        |
| All images have descriptive `alt` text containing relevant keywords                                                                 | **MUST**                        |
| No keyword stuffing (repeating keywords unnaturally) — Google penalizes this                                                        | **MUST NOT**                    |
| No duplicate titles across pages                                                                                                    | **MUST NOT**                    |
| No duplicate meta descriptions across pages                                                                                         | **MUST NOT**                    |
| No `noindex` on pages you want ranked (common mistake)                                                                              | **MUST NOT**                    |
| `lang` attribute MUST be consistent across ALL HTML root elements — including `global-error.tsx` which renders its own `<html>` tag | **MUST**                        |
| 301 redirects configured for all changed URLs (SEO migration)                                                                       | **MUST** (when URLs change)     |
| `hreflang` tags set on every page for multi-language sites                                                                          | **MUST** (when multilingual)    |
| `rel="nofollow"` on user-generated and untrusted outbound links                                                                     | **MUST**                        |
| Image file names are descriptive and keyword-relevant (kebab-case)                                                                  | **SHOULD**                      |
| RSS/Atom feed exists for blog/news content                                                                                          | **SHOULD**                      |
| `www` vs non-`www` canonicalized (pick one, redirect the other)                                                                     | **MUST**                        |
| Use semantic HTML (`<main>`, `<article>`, `<section>`, `<nav>`, `<header>`, `<footer>`)                                             | **SHOULD**                      |
| Internal linking between related pages                                                                                              | **SHOULD**                      |
| URL slugs contain keywords (kebab-case, lowercase, no special characters)                                                           | **SHOULD**                      |

---

## File Structure

```
src/
  lib/
    seo/
      config.ts              # Centralized SEO constants (brand, URL, defaults)
      keywords.ts            # Keyword strategy per page (optional — for keyword-heavy projects)
      structured-data.ts     # JSON-LD schema generators
      types.ts               # SEO-related types
  app/
    layout.tsx               # Root metadata (defaults, template)
    page.tsx                 # Home page metadata (override)
    sitemap.ts               # Dynamic sitemap generation
    robots.ts                # Dynamic robots.txt generation
    [every-route]/
      page.tsx               # Per-page metadata export
    opengraph-image.tsx      # Dynamic OG image (optional)
```

---

## Implementation

### Step 1: SEO Configuration (Single Source of Truth)

```typescript
// src/lib/seo/config.ts
import { env } from '@/lib/env'

/** Brand name — appears in every title */
export const SEO_BRAND = 'My Brand' // TODO: Replace per project

/** Production URL — used for canonical URLs, sitemap, OG tags */
export const SEO_SITE_URL = env.NEXT_PUBLIC_SITE_URL || 'https://www.example.com'

/** Default OG image (1200×630) */
export const SEO_DEFAULT_OG_IMAGE = `${SEO_SITE_URL}/og-default.png`

/** Default metadata applied to all pages (overridden per-page) */
export const SEO_DEFAULTS = {
  title: SEO_BRAND,
  description: 'TODO: Add default site description', // TODO: Replace per project
  locale: 'en', // 'ro' for Romanian sites
  type: 'website',
} as const

/**
 * Build a consistent page title.
 * Pattern: "[Page Topic] | [Brand]"
 * For home: "[Service] în [City] | [Brand]"
 */
export const buildTitle = (pageTitle: string): string => `${pageTitle} | ${SEO_BRAND}`

/**
 * Normalize a URL path to a full canonical URL.
 * Removes trailing slashes, query params, and hash fragments.
 */
export const canonicalUrl = (path: string): string => {
  const clean = path.split('?')[0].split('#')[0]
  const normalized = clean === '/' ? '' : clean.replace(/\/$/, '')
  return `${SEO_SITE_URL}${normalized}`
}
```

### Step 2: Root Layout Metadata (Defaults + Template)

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'

import { SEO_BRAND, SEO_SITE_URL, SEO_DEFAULT_OG_IMAGE, SEO_DEFAULTS } from '@/lib/seo/config'

export const metadata: Metadata = {
  // Title template — every page title gets " | Brand" appended automatically
  title: {
    default: SEO_BRAND,
    template: `%s | ${SEO_BRAND}`,
  },
  description: SEO_DEFAULTS.description,

  // Base URL for relative URLs in metadata
  metadataBase: new URL(SEO_SITE_URL),

  // Default Open Graph (inherited by all pages unless overridden)
  openGraph: {
    type: 'website',
    locale: SEO_DEFAULTS.locale,
    siteName: SEO_BRAND,
    images: [
      {
        url: SEO_DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SEO_BRAND,
      },
    ],
  },

  // Twitter Card defaults
  twitter: {
    card: 'summary_large_image',
    // site: '@yourtwitterhandle',  // TODO: Add if applicable
  },

  // Robots — allow indexing in production (robots.ts handles per-env logic)
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

  // Verification — add when search consoles are set up
  // verification: {
  //   google: 'your-google-verification-code',
  //   yandex: 'your-yandex-verification-code',
  // },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={SEO_DEFAULTS.locale}>
      <body>{children}</body>
    </html>
  )
}
```

**Key**: The `title.template` pattern means child pages only need to set `title: 'My Page'` and it automatically becomes `"My Page | Brand"`. No manual concatenation needed.

### Language Tag Consistency (`global-error.tsx`)

`global-error.tsx` renders its own `<html>` and `<body>` tags (required by Next.js — it replaces the root layout when the layout itself throws). The `lang` attribute in `global-error.tsx` **MUST match the root layout's `lang` attribute**. A mismatch tells Google the error page is in a different language, which can confuse indexing.

```tsx
// ✅ Correct — lang matches root layout
// src/app/layout.tsx: <html lang="lang-depends-on-project"ro">
// src/app/global-error.tsx:
export default function GlobalError({ error, reset }) {
  return (
    <html lang="lang-depends-on-project"ro'>
      {' '}
      {/* ← matches root layout */}
      <body>...</body>
    </html>
  )
}

// ❌ Wrong — different lang than root layout
export default function GlobalError({ error, reset }) {
  return (
    <html lang="lang-depends-on-project"en'>
      {' '}
      {/* ← root layout uses "ro" — mismatch! */}
      <body>...</body>
    </html>
  )
}
```

**Agent note**: When generating `global-error.tsx`, always check the root `layout.tsx` for its `lang` attribute and use the same value.

### Step 3: Per-Page Metadata

```tsx
// src/app/page.tsx (Home page)
import type { Metadata } from 'next'

import { canonicalUrl, SEO_SITE_URL } from '@/lib/seo/config'

// For local businesses — include location in title
export const metadata: Metadata = {
  title: 'Galerie de Artă Contemporană în București', // → "Galerie de Artă Contemporană în București | Brand"
  description:
    'Galerie de artă contemporană în centrul Bucureștiului. Expoziții permanente și temporare, artă românească și internațională. Vizitează-ne pe Str. X, Nr. Y.',
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
      {/* Content matching the SEO keyword */}
    </main>
  )
}
```

```tsx
// src/app/exhibitions/page.tsx
import type { Metadata } from 'next'

import { canonicalUrl } from '@/lib/seo/config'

export const metadata: Metadata = {
  title: 'Expoziții de Artă Contemporană',
  description:
    'Expoziții de artă contemporană: programul expozițiilor curente și viitoare. Artă românească și internațională în inima Bucureștiului.',
  alternates: {
    canonical: canonicalUrl('/exhibitions'),
  },
}
```

### Dynamic Routes (Blog Posts, Products, etc.)

```tsx
// src/app/blog/[slug]/page.tsx
import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import { getPostBySlug } from '@/lib/db/queries/posts'
import { canonicalUrl, SEO_SITE_URL } from '@/lib/seo/config'

type Props = {
  params: Promise<{ slug: string }>
}

// Dynamic metadata — fetched per page
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
      {/* Article content */}
    </article>
  )
}
```

---

## Sitemap (Next.js Native)

No build scripts needed — Next.js generates the sitemap from a TypeScript file:

```typescript
// src/app/sitemap.ts
import type { MetadataRoute } from 'next'

import { SEO_SITE_URL } from '@/lib/seo/config'

// For dynamic routes (blog, products), fetch from DB:
// import { db } from '@/lib/db'

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  // Static routes — list all public pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SEO_SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SEO_SITE_URL}/exhibitions`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SEO_SITE_URL}/artists`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SEO_SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]

  // Dynamic routes — fetch from database
  // const posts = await db.post.findMany({
  //   where: { published: true },
  //   select: { slug: true, updatedAt: true },
  //   orderBy: { updatedAt: 'desc' },
  // })
  //
  // const dynamicRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
  //   url: `${SEO_SITE_URL}/blog/${post.slug}`,
  //   lastModified: post.updatedAt,
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.6,
  // }))
  //
  // return [...staticRoutes, ...dynamicRoutes]

  return staticRoutes
}

export default sitemap
```

**Result**: `https://www.example.com/sitemap.xml` is auto-generated. No build scripts, no manual XML. Submit this URL to Google Search Console.

### Priority Guidelines

| Page Type                                 | Priority      | Change Frequency |
| ----------------------------------------- | ------------- | ---------------- |
| Home page                                 | 1.0           | weekly           |
| Key landing pages (services, products)    | 0.9           | weekly           |
| Category/listing pages                    | 0.8           | weekly           |
| Individual content (blog posts, products) | 0.6           | weekly           |
| Contact, about, legal pages               | 0.5-0.7       | monthly          |
| Utility pages (login, settings)           | Don't include | —                |

---

## Robots.txt (Next.js Native)

```typescript
// src/app/robots.ts
import type { MetadataRoute } from 'next'

import { SEO_SITE_URL } from '@/lib/seo/config'

const robots = (): MetadataRoute.Robots => {
  // Prevent staging/preview environments from being indexed
  const isProduction =
    process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'

  if (!isProduction) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/', // Block everything on non-production
      },
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/', // Don't index API routes
          '/cms/', // Don't index admin panel
          '/dashboard/', // Don't index user dashboards
          '/settings/', // Don't index user settings
          '/_next/', // Don't index Next.js internals
        ],
      },
    ],
    sitemap: `${SEO_SITE_URL}/sitemap.xml`,
  }
}

export default robots
```

**Critical**: Preview/staging environments MUST return `disallow: /` — otherwise Google indexes your staging site and you get duplicate content penalties.

---

## JSON-LD Structured Data

Structured data tells Google what TYPE of thing a page is about (business, article, product, event, FAQ). It enables **rich results** — enhanced search listings with stars, prices, hours, images.

### Schema Types By Business Type

| Business Type                                  | Schemas To Use                                                 |
| ---------------------------------------------- | -------------------------------------------------------------- |
| Local business (art gallery, restaurant, shop) | `LocalBusiness`, `WebSite`, `BreadcrumbList`                   |
| E-commerce                                     | `Product`, `Offer`, `AggregateRating`, `BreadcrumbList`        |
| Blog / content site                            | `Article`, `BlogPosting`, `WebSite`, `BreadcrumbList`          |
| SaaS product                                   | `WebApplication`, `SoftwareApplication`, `Organization`, `FAQ` |
| Service business (agency, consulting)          | `ProfessionalService`, `Service`, `Organization`, `FAQ`        |
| Event venue                                    | `EventVenue`, `Event`, `LocalBusiness`                         |
| Real estate                                    | `RealEstateListing`, `Place`, `LocalBusiness`                  |

### Schema Generator Functions

```typescript
// src/lib/seo/structured-data.ts

import { SEO_SITE_URL, SEO_BRAND } from './config'

/**
 * Generate a WebSite schema.
 * Place on the home page. Enables the sitelinks search box in Google results.
 */
export const getWebsiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SEO_BRAND,
  url: SEO_SITE_URL,
  // Optional: enable sitelinks search box
  // potentialAction: {
  //   '@type': 'SearchAction',
  //   target: { '@type': 'EntryPoint', urlTemplate: `${SEO_SITE_URL}/search?q={search_term_string}` },
  //   'query-input': 'required name=search_term_string',
  // },
})

/**
 * Generate an Organization schema.
 * Place on the home page or about page.
 */
export const getOrganizationSchema = (params: {
  name: string
  legalName?: string
  description: string
  logo: string
  phone?: string
  email?: string
  address?: {
    street: string
    city: string
    region: string
    postalCode: string
    country: string
  }
  socialProfiles?: string[]
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: params.name,
  legalName: params.legalName,
  url: SEO_SITE_URL,
  logo: params.logo,
  description: params.description,
  ...(params.phone && {
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: params.phone,
      contactType: 'customer service',
      ...(params.email && { email: params.email }),
    },
  }),
  ...(params.address && {
    address: {
      '@type': 'PostalAddress',
      streetAddress: params.address.street,
      addressLocality: params.address.city,
      addressRegion: params.address.region,
      postalCode: params.address.postalCode,
      addressCountry: params.address.country,
    },
  }),
  ...(params.socialProfiles && { sameAs: params.socialProfiles }),
})

/**
 * Generate a LocalBusiness schema.
 * CRITICAL for local SEO. Place on the home page and contact page.
 * This is what powers Google Maps results and the knowledge panel.
 */
export const getLocalBusinessSchema = (params: {
  name: string
  type?: string // e.g., 'ArtGallery', 'FurnitureStore', 'Restaurant'
  description: string
  phone: string
  email?: string
  image: string
  address: {
    street: string
    city: string
    region: string
    postalCode: string
    country: string
  }
  geo: {
    latitude: number
    longitude: number
  }
  priceRange?: string // '$', '$$', '$$$', '$$$$'
  openingHours?: string[] // ['Mo-Fr 09:00-18:00', 'Sa 10:00-14:00']
  serviceAreas?: Array<{ name: string; type: 'City' | 'State' }>
  socialProfiles?: string[]
}) => ({
  '@context': 'https://schema.org',
  '@type': params.type || 'LocalBusiness',
  name: params.name,
  image: params.image,
  url: SEO_SITE_URL,
  telephone: params.phone,
  ...(params.email && { email: params.email }),
  ...(params.priceRange && { priceRange: params.priceRange }),
  description: params.description,
  address: {
    '@type': 'PostalAddress',
    streetAddress: params.address.street,
    addressLocality: params.address.city,
    addressRegion: params.address.region,
    postalCode: params.address.postalCode,
    addressCountry: params.address.country,
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: params.geo.latitude,
    longitude: params.geo.longitude,
  },
  ...(params.openingHours && { openingHours: params.openingHours }),
  ...(params.serviceAreas && {
    areaServed: params.serviceAreas.map((area) => ({
      '@type': area.type,
      name: area.name,
    })),
  }),
  ...(params.socialProfiles && { sameAs: params.socialProfiles }),
})

/**
 * Generate a BreadcrumbList schema.
 * Helps Google display breadcrumb navigation in search results.
 */
export const getBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
})

/**
 * Generate an Article schema (for blog posts / news).
 * Enables rich results with publish date, author, and featured image.
 */
export const getArticleSchema = (params: {
  title: string
  description: string
  url: string
  image: string
  datePublished: string // ISO 8601
  dateModified: string // ISO 8601
  authorName: string
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: params.title,
  description: params.description,
  url: params.url,
  image: params.image,
  datePublished: params.datePublished,
  dateModified: params.dateModified,
  author: {
    '@type': 'Person',
    name: params.authorName,
  },
  publisher: {
    '@type': 'Organization',
    name: SEO_BRAND,
    url: SEO_SITE_URL,
  },
})

/**
 * Generate a FAQ schema.
 * Enables FAQ rich results — accordion-style Q&A directly in search results.
 * Significant click-through-rate boost.
 */
export const getFaqSchema = (questions: Array<{ question: string; answer: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: questions.map((q) => ({
    '@type': 'Question',
    name: q.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: q.answer,
    },
  })),
})

/**
 * Generate a Service schema.
 * For service-based businesses — describes a specific service offered.
 */
export const getServiceSchema = (params: {
  name: string
  description: string
  url: string
  providerName?: string
  serviceAreas?: Array<{ name: string; type: 'City' | 'State' }>
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: params.name,
  description: params.description,
  url: params.url,
  provider: {
    '@type': 'LocalBusiness',
    name: params.providerName || SEO_BRAND,
    url: SEO_SITE_URL,
  },
  ...(params.serviceAreas && {
    areaServed: params.serviceAreas.map((area) => ({
      '@type': area.type,
      name: area.name,
    })),
  }),
})
```

### Injecting JSON-LD Into Pages

```tsx
// Reusable component for injecting JSON-LD
// src/components/ui/json-ld/JsonLd.tsx

type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[]
}

export const JsonLd = ({ data }: JsonLdProps) => {
  const schemas = Array.isArray(data) ? data : [data]

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  )
}
```

```tsx
// Usage in a page
// src/app/page.tsx
import { JsonLd } from '@/components/ui/json-ld'
import { getWebsiteSchema, getLocalBusinessSchema } from '@/lib/seo/structured-data'

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          getWebsiteSchema(),
          getLocalBusinessSchema({
            name: 'Galeria de Artă X',
            type: 'ArtGallery',
            description: 'Galerie de artă contemporană în centrul Bucureștiului.',
            phone: '+40 721 000 000',
            email: 'contact@galeria-x.ro',
            image: 'https://www.galeria-x.ro/og-default.png',
            address: {
              street: 'Strada Lipscani, Nr. 10',
              city: 'București',
              region: 'București',
              postalCode: '030031',
              country: 'RO',
            },
            geo: { latitude: 44.4268, longitude: 26.1025 },
            priceRange: '$$',
            openingHours: ['Mo-Fr 10:00-19:00', 'Sa 11:00-17:00'],
            socialProfiles: [
              'https://www.facebook.com/galeria.x',
              'https://www.instagram.com/galeria.x',
            ],
          }),
        ]}
      />
      <main>
        <h1>Galerie de Artă Contemporană în București</h1>
        {/* Page content */}
      </main>
    </>
  )
}
```

```tsx
// Blog post with Article schema
// src/app/blog/[slug]/page.tsx
import { JsonLd } from '@/components/ui/json-ld'
import { getArticleSchema, getBreadcrumbSchema } from '@/lib/seo/structured-data'
import { canonicalUrl } from '@/lib/seo/config'

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  return (
    <>
      <JsonLd
        data={[
          getArticleSchema({
            title: post.title,
            description: post.excerpt || '',
            url: canonicalUrl(`/blog/${slug}`),
            image: post.coverImage || '',
            datePublished: post.createdAt.toISOString(),
            dateModified: post.updatedAt.toISOString(),
            authorName: post.author.name || '',
          }),
          getBreadcrumbSchema([
            { name: 'Home', url: canonicalUrl('/') },
            { name: 'Blog', url: canonicalUrl('/blog') },
            { name: post.title, url: canonicalUrl(`/blog/${slug}`) },
          ]),
        ]}
      />
      <article>
        <h1>{post.title}</h1>
        {/* Content */}
      </article>
    </>
  )
}
```

---

## Open Graph Images

### Static OG Image (Default)

Place a 1200×630px image at `public/og-default.png`. This is the fallback image when sharing on social media.

**Design guidelines for OG images:**

- 1200×630px (2:1.05 ratio)
- Brand logo visible
- Key text readable at small sizes
- High contrast — works on both light and dark backgrounds
- No important content in the outer 10% (platforms may crop)

### Dynamic OG Images (Per-Page)

Next.js can generate OG images dynamically using `opengraph-image.tsx`:

```tsx
// src/app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Blog post cover'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = {
  params: Promise<{ slug: string }>
}

const Image = async ({ params }: Props) => {
  const { slug } = await params
  // Fetch post title (light query — only need title)
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

---

## Keyword Strategy File (For Keyword-Heavy Projects)

For local businesses, e-commerce, or content sites where keyword targeting is critical:

```typescript
// src/lib/seo/keywords.ts

/**
 * Centralized keyword strategy.
 * Each page has ONE primary keyword and 2-3 secondary keywords.
 * This file is the source of truth for what each page targets.
 *
 * How to use:
 * 1. Research keywords (Google Autocomplete, Keyword Planner, competitor analysis)
 * 2. Assign one primary keyword per page
 * 3. Use in title, h1, meta description, and naturally in content
 * 4. DON'T stuff keywords — write for humans, optimize for Google
 */

type PageKeywords = {
  path: string
  primary: string
  secondary: string[]
  titleTemplate: string
  descriptionTemplate: string
}

// Example: Art Gallery in Bucharest
export const PAGE_KEYWORDS: PageKeywords[] = [
  {
    path: '/',
    primary: 'galerie artă bucurești',
    secondary: ['galerie artă contemporană bucurești', 'expoziții artă bucurești'],
    titleTemplate: 'Galerie de Artă Contemporană în București',
    descriptionTemplate:
      'Galerie de artă contemporană în centrul Bucureștiului. Expoziții permanente și temporare, artă românească și internațională. Program: L-V 10-19, S 11-17.',
  },
  {
    path: '/exhibitions',
    primary: 'expoziții artă contemporană bucurești',
    secondary: ['expoziții curente bucurești', 'evenimente artă bucurești'],
    titleTemplate: 'Expoziții de Artă Contemporană',
    descriptionTemplate:
      'Programul expozițiilor curente și viitoare. Artă contemporană românească și internațională. Intrare liberă.',
  },
  {
    path: '/artists',
    primary: 'artiști contemporani români',
    secondary: ['artiști galerie bucurești', 'artă românească contemporană'],
    titleTemplate: 'Artiști Contemporani Români',
    descriptionTemplate:
      'Artiștii reprezentați de galerie. Pictură, sculptură, grafică și artă digitală de artiști contemporani români.',
  },
  {
    path: '/contact',
    primary: 'galerie artă bucurești contact',
    secondary: ['program galerie artă', 'adresă galerie artă bucurești'],
    titleTemplate: 'Contact & Program Vizitare',
    descriptionTemplate:
      'Contact și program de vizitare. Adresă: Str. Lipscani 10, Sector 3, București. Tel: 0721 000 000. L-V 10-19, S 11-17.',
  },
]

/**
 * Location keywords for local SEO.
 * Used in title tags, descriptions, and content.
 */
export const LOCATION_TARGETS = [
  { city: 'București', variations: ['Bucuresti', 'Bucharest'] },
  { city: 'Sector 1', variations: [] },
  { city: 'Sector 3', variations: [] },
  { city: 'Centrul Vechi', variations: ['Old Town'] },
]
```

---

## Environment Variable

Add to `src/lib/env.ts`:

```typescript
NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
```

Add to `.env.local`:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Production (Vercel):

```dotenv
NEXT_PUBLIC_SITE_URL=https://www.example.com
```

---

## 301 Redirects & URL Migration

When URLs change (rebranding, restructuring, migrating from an old site), **301 redirects** are critical. Old URLs pass their search authority to the new URL. Without redirects, all accumulated rankings are lost.

### Static Redirects (Known URL Changes)

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Single page redirect
      {
        source: '/old-about',
        destination: '/about',
        permanent: true, // 301 — passes SEO authority
      },
      // Pattern redirect (e.g., old blog structure)
      {
        source: '/blog/posts/:slug',
        destination: '/blog/:slug',
        permanent: true,
      },
      // Redirect entire section
      {
        source: '/news/:path*',
        destination: '/blog/:path*',
        permanent: true,
      },
      // Old domain paths (common when migrating from a different site)
      {
        source: '/ro/galerie/:slug',
        destination: '/galerie/:slug',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
```

### www vs non-www Canonicalization

Pick one (e.g., `www.example.com`) and redirect the other. Most hosting platforms handle this, but verify:

```javascript
// In next.config.js redirects:
{
  source: '/:path*',
  has: [{ type: 'host', value: 'example.com' }],  // non-www
  destination: 'https://www.example.com/:path*',
  permanent: true,
}
```

On Vercel, configure this in the project dashboard under Domains — add both domains, set one as redirect.

### Trailing Slash Normalization

```javascript
// next.config.js
const nextConfig = {
  trailingSlash: false, // Choose one and be consistent
  // When false: /about/ → redirects to /about
  // When true:  /about  → redirects to /about/
}
```

### Dynamic Redirects (From Database)

For large migrations with hundreds of URL mappings, store redirects in the database and handle in middleware:

```typescript
// src/middleware.ts — redirect lookup
import { NextResponse, type NextRequest } from 'next/server'

// For large migration maps, load from a JSON file or DB
// This example uses a static map — replace with DB lookup for large sets
const LEGACY_REDIRECTS: Record<string, string> = {
  '/old-page': '/new-page',
  '/produse/categorie-veche': '/produse/categorie-noua',
}

export const middleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl

  const redirectTo = LEGACY_REDIRECTS[pathname]
  if (redirectTo) {
    const url = request.nextUrl.clone()
    url.pathname = redirectTo
    return NextResponse.redirect(url, 301)
  }

  return NextResponse.next()
}
```

### Post-Migration Monitoring

After a migration, monitor in Google Search Console:

1. **Coverage report** — check for 404 errors on old URLs
2. **URL Inspection tool** — verify new URLs are indexed
3. **Performance report** — watch for ranking drops (expect 2-4 weeks of fluctuation)
4. Keep old redirects for **at least 1 year** — Google needs time to update its index

---

## Hreflang / Multi-Language SEO

For sites serving content in multiple languages or targeting multiple countries, `hreflang` tags tell Google which version to show in each locale's search results.

### When You Need Hreflang

- Same content in multiple languages (e.g., Romanian + English)
- Same language targeting different countries (e.g., English for US vs UK)
- Mixed: some pages translated, some not

### Implementation with Next.js Metadata API

```tsx
// src/app/[locale]/page.tsx
import type { Metadata } from 'next'

import { canonicalUrl, SEO_SITE_URL } from '@/lib/seo/config'

type Props = {
  params: Promise<{ locale: string }>
}

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { locale } = await params

  return {
    alternates: {
      canonical: canonicalUrl(locale === 'ro' ? '/' : `/${locale}`),
      languages: {
        ro: `${SEO_SITE_URL}/`, // Romanian (default)
        en: `${SEO_SITE_URL}/en`, // English
        'x-default': `${SEO_SITE_URL}/`, // Fallback — shows to users whose language isn't listed
      },
    },
  }
}
```

**Output:**

```html
<link rel="canonical" href="https://www.example.com/" />
<link rel="alternate" hreflang="lang-depends-on-project"ro" href="https://www.example.com/" />
<link rel="alternate" hreflang="lang-depends-on-project"en" href="https://www.example.com/en" />
<link rel="alternate" hreflang="lang-depends-on-project"x-default" href="https://www.example.com/" />
```

### URL Structure Patterns for i18n

| Pattern                    | Example                | Pros                                    | Cons                                    |
| -------------------------- | ---------------------- | --------------------------------------- | --------------------------------------- |
| Subdirectory (recommended) | `example.com/en/about` | Single domain authority, easy to set up | Slightly longer URLs                    |
| Subdomain                  | `en.example.com/about` | Separate indexing per language          | Domain authority split, more DNS config |
| Separate domain            | `example.co.uk`        | Clear country targeting                 | Separate SEO efforts per domain         |

**Recommendation**: Subdirectory (`/en/`, `/ro/`) — consolidates domain authority.

### Per-Locale Sitemap

```typescript
// src/app/sitemap.ts — with locale support
import type { MetadataRoute } from 'next'

import { SEO_SITE_URL } from '@/lib/seo/config'

const LOCALES = ['ro', 'en'] as const
const DEFAULT_LOCALE = 'ro'

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const routes = ['/', '/about', '/contact', '/services']

  return routes.flatMap((route) =>
    LOCALES.map((locale) => ({
      url: `${SEO_SITE_URL}${locale === DEFAULT_LOCALE ? '' : `/${locale}`}${route === '/' ? '' : route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '/' ? 1.0 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((l) => [
            l,
            `${SEO_SITE_URL}${l === DEFAULT_LOCALE ? '' : `/${l}`}${route === '/' ? '' : route}`,
          ]),
        ),
      },
    })),
  )
}

export default sitemap
```

---

## Additional JSON-LD Schemas

These schemas extend the base set (WebSite, Organization, LocalBusiness, Article, FAQ, Service, Breadcrumb) defined above.

### Product Schema (E-Commerce)

```typescript
// Add to src/lib/seo/structured-data.ts

/**
 * Generate a Product schema with Offer.
 * Enables rich results with price, availability, and rating stars in search results.
 */
export const getProductSchema = (params: {
  name: string
  description: string
  image: string | string[]
  url: string
  sku?: string
  brand?: string
  price: number
  currency: string // 'RON', 'EUR', 'USD'
  availability: 'InStock' | 'OutOfStock' | 'PreOrder' | 'BackOrder'
  ratingValue?: number // 1-5
  reviewCount?: number
  reviews?: Array<{
    author: string
    rating: number
    body: string
    datePublished: string // ISO 8601
  }>
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: params.name,
  description: params.description,
  image: params.image,
  url: params.url,
  ...(params.sku && { sku: params.sku }),
  ...(params.brand && { brand: { '@type': 'Brand', name: params.brand } }),
  offers: {
    '@type': 'Offer',
    price: params.price,
    priceCurrency: params.currency,
    availability: `https://schema.org/${params.availability}`,
    url: params.url,
  },
  ...(params.ratingValue &&
    params.reviewCount && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: params.ratingValue,
        reviewCount: params.reviewCount,
      },
    }),
  ...(params.reviews && {
    review: params.reviews.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      reviewRating: { '@type': 'Rating', ratingValue: r.rating },
      reviewBody: r.body,
      datePublished: r.datePublished,
    })),
  }),
})

/**
 * Generate an Event schema.
 * Enables rich results with date, location, and ticket info.
 */
export const getEventSchema = (params: {
  name: string
  description: string
  startDate: string // ISO 8601
  endDate?: string
  url: string
  image?: string
  location: {
    name: string
    address: {
      street: string
      city: string
      region: string
      postalCode: string
      country: string
    }
  }
  performer?: string
  offers?: {
    price: number
    currency: string
    availability: 'InStock' | 'SoldOut' | 'PreOrder'
    url: string
  }
  organizer?: string
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: params.name,
  description: params.description,
  startDate: params.startDate,
  ...(params.endDate && { endDate: params.endDate }),
  url: params.url,
  ...(params.image && { image: params.image }),
  location: {
    '@type': 'Place',
    name: params.location.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: params.location.address.street,
      addressLocality: params.location.address.city,
      addressRegion: params.location.address.region,
      postalCode: params.location.address.postalCode,
      addressCountry: params.location.address.country,
    },
  },
  ...(params.performer && {
    performer: { '@type': 'Person', name: params.performer },
  }),
  ...(params.offers && {
    offers: {
      '@type': 'Offer',
      price: params.offers.price,
      priceCurrency: params.offers.currency,
      availability: `https://schema.org/${params.offers.availability}`,
      url: params.offers.url,
    },
  }),
  ...(params.organizer && {
    organizer: { '@type': 'Organization', name: params.organizer },
  }),
})

/**
 * Generate a HowTo schema.
 * Enables step-by-step rich results — significant visibility boost.
 */
export const getHowToSchema = (params: {
  name: string
  description: string
  totalTime?: string // ISO 8601 duration, e.g., 'PT30M'
  estimatedCost?: { currency: string; value: number }
  image?: string
  steps: Array<{
    name: string
    text: string
    image?: string
  }>
}) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: params.name,
  description: params.description,
  ...(params.totalTime && { totalTime: params.totalTime }),
  ...(params.estimatedCost && {
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: params.estimatedCost.currency,
      value: params.estimatedCost.value,
    },
  }),
  ...(params.image && { image: params.image }),
  step: params.steps.map((s, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: s.name,
    text: s.text,
    ...(s.image && { image: s.image }),
  })),
})

/**
 * Generate a VideoObject schema.
 * Enables video rich results with thumbnail, duration, and upload date.
 */
export const getVideoSchema = (params: {
  name: string
  description: string
  thumbnailUrl: string
  uploadDate: string // ISO 8601
  duration?: string // ISO 8601 duration, e.g., 'PT5M30S'
  contentUrl?: string // Direct video URL
  embedUrl?: string // Embed URL (YouTube, Vimeo)
}) => ({
  '@context': 'https://schema.org',
  '@type': 'VideoObject',
  name: params.name,
  description: params.description,
  thumbnailUrl: params.thumbnailUrl,
  uploadDate: params.uploadDate,
  ...(params.duration && { duration: params.duration }),
  ...(params.contentUrl && { contentUrl: params.contentUrl }),
  ...(params.embedUrl && { embedUrl: params.embedUrl }),
})
```

---

## Image SEO

Images are a significant traffic source (Google Images search). Proper image SEO compounds with page SEO.

### File Naming

```
❌ IMG_2034.jpg
❌ photo1.webp
❌ untitled.png

✅ galerie-arta-contemporana-bucuresti.webp
✅ mobilier-lemn-masiv-living.webp
✅ expozitie-pictura-abstracta-2024.webp
```

**Rule**: Image file names should be descriptive, kebab-case, and include relevant keywords. Rename before uploading — file names are part of the image URL that Google reads.

### Alt Text Strategy

Alt text serves two purposes: accessibility (screen readers) and SEO (Google Image Search).

```tsx
// ❌ Generic / missing
<Image src="/hero.webp" alt="" />
<Image src="/hero.webp" alt="image" />
<Image src="/hero.webp" alt="photo" />

// ❌ Keyword stuffing
<Image src="/hero.webp" alt="art gallery bucharest art gallery contemporary art gallery romania art" />

// ✅ Descriptive, natural, includes 1-2 keywords
<Image src="/hero.webp" alt="Expoziție de artă contemporană în galeria din centrul Bucureștiului" />

// ✅ Product images — describe the product
<Image src="/masa-stejar.webp" alt="Masă din lemn masiv de stejar, 180cm, pentru sufragerie" />
```

### LCP Image Optimization

The Largest Contentful Paint image (hero image, above-the-fold) **must** load as fast as possible:

```tsx
// Hero image — the LCP element
<Image
  src="/hero-galerie.webp"
  alt="Galerie de artă contemporană în București"
  width={1200}
  height={600}
  priority                // ← Disables lazy loading, adds preload link
  sizes="100vw"           // ← Tells the browser this is full-width
/>

// Below-the-fold images — lazy load (default)
<Image
  src="/artist-portrait.webp"
  alt="Portret artist Ion Popescu"
  width={400}
  height={400}
  // priority NOT set — lazy loads by default
/>
```

**Cross-reference**: See ADR-0018 for full image optimization patterns (formats, sizes, quality, CDN).

---

## RSS / Atom Feed

For blogs and news sites, an RSS feed enables content syndication, helps crawlers discover new content, and is expected by power users and aggregators.

```tsx
// src/app/feed.xml/route.ts
import { SEO_SITE_URL, SEO_BRAND } from '@/lib/seo/config'

// import { db } from '@/lib/db'  // Uncomment when database is set up

export const GET = async () => {
  // const posts = await db.post.findMany({
  //   where: { published: true },
  //   orderBy: { createdAt: 'desc' },
  //   take: 20,
  //   select: { slug: true, title: true, excerpt: true, createdAt: true },
  // })

  const posts: Array<{ slug: string; title: string; excerpt: string; createdAt: Date }> = []

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SEO_BRAND}</title>
    <link>${SEO_SITE_URL}</link>
    <description>Latest articles from ${SEO_BRAND}</description>
    <language>ro</language>
    <atom:link href="${SEO_SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${posts
      .map(
        (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SEO_SITE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SEO_SITE_URL}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${post.createdAt.toUTCString()}</pubDate>
    </item>`,
      )
      .join('')}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
```

Reference the feed in root layout metadata:

```tsx
// In src/app/layout.tsx metadata
alternates: {
  types: {
    'application/rss+xml': `${SEO_SITE_URL}/feed.xml`,
  },
},
```

---

## Technical Edge Cases

### Nofollow on Untrusted / User-Generated Links

When users can submit content (comments, profiles, forum posts), their links should not pass SEO authority:

```tsx
// ✅ UGC links — rel="nofollow ugc"
<a href={user.website} rel="nofollow ugc" target="_blank">
  {user.website}
</a>

// ✅ Sponsored / paid links — rel="nofollow sponsored"
<a href={sponsor.url} rel="nofollow sponsored" target="_blank">
  {sponsor.name}
</a>

// ❌ Never pass authority to untrusted URLs
<a href={user.website}>{user.website}</a>
```

### Pagination and SEO

Google deprecated `rel="next"` / `rel="prev"` — it now discovers paginated content naturally. However:

- **Each paginated page should have a unique canonical** (not all pointing to page 1)
- Paginated pages should still be in the sitemap
- Consider "View All" pages for small data sets (better for SEO than pagination)
- For infinite scroll — use `pushState` to update the URL so each "page" has a unique URL that Google can crawl

### Trailing Slash Consistency

A page at `/about` and `/about/` are different URLs to Google. Pick one:

```javascript
// next.config.js
const nextConfig = {
  trailingSlash: false, // All URLs without trailing slash
}
```

Then ensure `canonicalUrl()` strips trailing slashes (already handled in the implementation above).

### Fragment (#) URLs

Content behind `#fragments` is **not crawled by Google**. Client-side tab switching or accordion content that uses only `#` fragments won't be indexed. If the content behind tabs matters for SEO, use real routes (`/features/pricing`, `/features/security`).

---

## SEO Checklist (Per Project)

### Technical (Agent Responsibility)

- [ ] Root layout has `title.template` and default metadata
- [ ] Every public page has unique `title` and `description`
- [ ] `metadataBase` set to production URL
- [ ] `sitemap.ts` includes all public routes
- [ ] `robots.ts` blocks non-production environments
- [ ] Canonical URL set on every page (`alternates.canonical`)
- [ ] Open Graph tags set (title, description, image, url)
- [ ] Twitter Card tags set
- [ ] JSON-LD structured data on home page (WebSite + Organization/LocalBusiness)
- [ ] JSON-LD structured data on content pages (Article, Product, etc.)
- [ ] All images have descriptive `alt` text
- [ ] Semantic HTML used (`<main>`, `<article>`, `<section>`, `<nav>`)
- [ ] No `noindex` on pages that should be indexed
- [ ] Admin/auth pages excluded from sitemap and blocked in robots.txt
- [ ] `<html lang="lang-depends-on-project"...">` set correctly (matches `global-error.tsx`)
- [ ] 301 redirects configured for any changed/migrated URLs
- [ ] `www` vs non-`www` canonicalized (pick one, redirect the other)
- [ ] Trailing slash policy consistent (`trailingSlash` in `next.config.js`)
- [ ] `hreflang` tags set if site serves multiple languages
- [ ] RSS feed exists and is referenced in root layout metadata (for blog/news sites)
- [ ] `rel="nofollow ugc"` on all user-generated outbound links
- [ ] LCP image uses `priority` prop (no lazy loading on hero image)
- [ ] Image file names are descriptive and keyword-relevant

### Content (Client/Developer Responsibility)

- [ ] Keyword research completed (Google Autocomplete, Keyword Planner)
- [ ] One primary keyword assigned per page
- [ ] Title tags contain the primary keyword
- [ ] H1 headings match the page topic and contain the primary keyword
- [ ] Meta descriptions are 120-160 characters, contain keyword, and include a call-to-action
- [ ] Content is 300+ words on key landing pages
- [ ] Internal links connect related pages
- [ ] Images are optimized (WebP, appropriate size, compressed)
- [ ] Image file names are descriptive before uploading (not IMG_2034.webp)
- [ ] OG images created (1200×630px) with brand elements
- [ ] Heading hierarchy follows H1→H2→H3 (no skipped levels)
- [ ] Primary keyword appears in first 100 words of page content
- [ ] FAQ sections added to high-value pages (long-tail keyword capture)

### Off-Page (Client Responsibility — Not Code)

- [ ] Google Business Profile claimed and verified (local businesses)
- [ ] Google Search Console set up and sitemap submitted
- [ ] Google Analytics 4 (or alternative) set up with consent-aware tracking
- [ ] NAP (Name, Address, Phone) consistent across all platforms
- [ ] Social media profiles created and linked
- [ ] Business listed in relevant directories
- [ ] Backlink strategy initiated (local press, directories, partners)
- [ ] Content calendar planned for ongoing SEO (blog, case studies, guides)

---

## Testing & Validation

### Tools

| Tool                         | URL                                          | Tests                                       |
| ---------------------------- | -------------------------------------------- | ------------------------------------------- |
| Google Rich Results Test     | https://search.google.com/test/rich-results  | JSON-LD validation, rich result eligibility |
| Google PageSpeed Insights    | https://pagespeed.web.dev                    | Core Web Vitals, performance                |
| Facebook Sharing Debugger    | https://developers.facebook.com/tools/debug/ | Open Graph tags, preview                    |
| Twitter Card Validator       | https://cards-dev.twitter.com/validator      | Twitter Card preview                        |
| Schema.org Validator         | https://validator.schema.org/                | JSON-LD syntax validation                   |
| Google Search Console        | https://search.google.com/search-console     | Indexing status, errors, search queries     |
| Lighthouse (Chrome DevTools) | Built into Chrome                            | SEO audit score (target ≥ 90)               |

### Automated Checks

```bash
# In development — view the generated HTML
curl -s http://localhost:3000 | grep -E '<title>|<meta name="description"|<link rel="canonical"|application/ld\+json' | head -20

# Check sitemap
curl -s http://localhost:3000/sitemap.xml

# Check robots.txt
curl -s http://localhost:3000/robots.txt
```

---

## Common SEO Mistakes (Anti-Patterns)

```tsx
// ❌ Same title on every page — Google can't distinguish pages
export const metadata = { title: 'My Brand' }  // Same title everywhere!

// ✅ Unique title per page using the template
export const metadata = { title: 'Exhibitions' }  // → "Exhibitions | My Brand"

// ❌ Missing meta description — Google generates one (badly)
export const metadata = { title: 'About Us' }  // No description!

// ✅ Always include description (120-160 chars, with keyword)
export const metadata = {
  title: 'About Us',
  description: 'Learn about our art gallery in Bucharest. Founded in 2015, we showcase contemporary Romanian and international art.',
}

// ❌ Keyword stuffing — Google penalizes this
export const metadata = {
  title: 'Art Gallery Bucharest Art Gallery Romania Art Contemporary Art',
  description: 'Art gallery art gallery art contemporary art bucharest art...',
}

// ✅ Natural keyword placement — readable by humans
export const metadata = {
  title: 'Galerie de Artă Contemporană în București',
  description: 'Galerie de artă contemporană în centrul Bucureștiului. Expoziții permanente și temporare.',
}

// ❌ No canonical URL — duplicate content risk
// (Same page accessible at /page, /page/, /page?ref=google)

// ✅ Canonical always set
export const metadata = {
  alternates: { canonical: canonicalUrl('/exhibitions') },
}

// ❌ Placeholder text shipped to production
export const metadata = {
  title: 'My App',  // TODO: Replace
  description: 'TODO: Add description',
}

// ✅ Every project replaces placeholders before launch

// ❌ JSON-LD with missing required fields
getLocalBusinessSchema({ name: 'My Biz' })  // No address, phone, geo!

// ✅ Complete required fields — incomplete schemas are worse than none
getLocalBusinessSchema({
  name: 'My Business',
  phone: '+40...',
  address: { ... },
  geo: { ... },
})

// ❌ robots.txt allows indexing on staging
// staging.example.com shows up in Google results!

// ✅ robots.ts checks environment — blocks non-production automatically

// ❌ Images without alt text
<img src="/gallery.jpg" />

// ✅ Descriptive alt text with keyword
<Image src="/gallery.jpg" alt="Expoziție artă contemporană galerie București" />
```

---

## Next.js vs SPA: Why This Is So Much Better

In the definee project (React + Vite SPA), SEO required:

- Build scripts to inject meta tags into `index.html`
- Manual sitemap generation scripts
- Manual robots.txt generation
- react-helmet-async for per-route meta tags
- DOM manipulation hacks for JSON-LD (because Helmet doesn't support `<script>` with content)
- All of this happening client-side, with Google needing to execute JavaScript to see any of it

In Next.js, ALL of this is native:

- `export const metadata` — server-rendered into HTML
- `generateMetadata()` — dynamic metadata per page, server-rendered
- `sitemap.ts` — auto-generated, can query database
- `robots.ts` — auto-generated, environment-aware
- `<script type="application/ld+json">` — server-rendered into HTML
- `opengraph-image.tsx` — dynamic OG images generated at the Edge

**Zero build scripts. Zero client-side hacks. Full SSR. Google sees everything on first request.**

---

## Rationale

### Why Native Metadata API Over react-helmet / next-seo

Next.js Metadata API is server-rendered — metadata is in the HTML before any JavaScript executes. Third-party libraries like `next-seo` add a client-side dependency for something the framework handles natively and better. `react-helmet-async` (used in SPAs) requires JavaScript execution for metadata — crawlers may miss it.

### Why JSON-LD Over Microdata

JSON-LD (JavaScript Object Notation for Linked Data) is Google's preferred structured data format. Microdata is embedded in HTML attributes (harder to maintain). RDFa is verbose. JSON-LD is a separate `<script>` tag that's easy to generate, validate, and maintain independently of the HTML structure.

### Why Centralized SEO Config

A single `src/lib/seo/config.ts` prevents brand name typos, inconsistent URLs, and missing metadata. When the brand name or URL changes, one file updates everything. The definee project learned this lesson — `business.ts` as the single source of truth.

### Key Factors

1. **Server-rendered metadata** — Google sees complete HTML on first request, no JavaScript required.
2. **Centralized configuration** — brand, URL, and defaults in one file prevents inconsistencies.
3. **Native framework features** — `sitemap.ts`, `robots.ts`, `generateMetadata()` eliminate custom build scripts.
4. **JSON-LD structured data** — enables rich results (knowledge panels, FAQ accordions, article cards).
5. **Environment-aware robots** — prevents staging/preview sites from being indexed.
6. **Keyword strategy** — one primary keyword per page, used in title, h1, description, and content.

## Options Considered

| Option                     | Description                   | Why Chosen / Why Not                                          |
| -------------------------- | ----------------------------- | ------------------------------------------------------------- |
| Next.js Metadata API       | Native metadata management    | ✅ Chosen: server-rendered, zero dependencies, best DX        |
| next-seo                   | Third-party metadata library  | ❌ Redundant — Metadata API does everything it does, natively |
| react-helmet-async         | Client-side metadata          | ❌ Client-rendered — crawlers may miss it                     |
| JSON-LD structured data    | Schema.org in `<script>` tags | ✅ Chosen: Google's preferred format, easy to generate        |
| Microdata                  | Schema.org in HTML attributes | ❌ Harder to maintain, mixed into HTML                        |
| Build-time sitemap scripts | Generate XML at build         | ❌ Next.js `sitemap.ts` handles this natively                 |

---

## Consequences

**Positive:**

- Every page has server-rendered metadata — visible to crawlers without JavaScript.
- `sitemap.ts` and `robots.ts` eliminate build scripts (no definee-style `scripts/generate-*.js`).
- JSON-LD structured data enables rich results in Google search.
- Environment-aware robots prevent staging indexing (common production mistake).
- Centralized SEO config prevents brand/URL inconsistencies.
- Keyword strategy documentation gives developers and agents SEO knowledge.
- OG images ensure professional social media sharing appearance.
- Testing checklist with tools ensures nothing is missed before launch.

**Negative:**

- SEO requires content strategy (keyword research, content writing) that code alone can't solve — mitigated by documenting the process.
- `generateMetadata()` adds async data fetching per page — mitigated by Next.js request deduplication (same fetch in metadata and page is cached).
- Dynamic OG images (`opengraph-image.tsx`) require Edge Runtime — mitigated by being optional (static images work fine).
- JSON-LD schemas must be kept accurate (wrong address/phone hurts more than no schema) — mitigated by centralized config.
- SEO results take weeks/months to materialize — mitigated by setting correct expectations with clients.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (Next.js SSR enables server-rendered metadata)
- [ADR-0006](./0006-environment.md) — Environment (NEXT_PUBLIC_SITE_URL for canonical URLs)
- [ADR-0008](./0008-middleware.md) — Middleware (security headers affect SEO — HTTPS, HSTS)
- [ADR-0011](./0011-database.md) — Database (dynamic sitemap from DB, generateMetadata from DB)
- [ADR-0018](./0018-performance-platform.md) — Performance (Core Web Vitals directly affect rankings — LCP, INP, CLS)
- [ADR-0029](./0029-seo-strategy.md) — SEO Strategy: Geo-Targeting, Content & Measurement (strategic layer — multi-location pages, keyword clusters, content templates, analytics)
