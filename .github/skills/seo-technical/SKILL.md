---
name: seo-technical
description: >-
  Technical SEO edge cases — 301 redirects in next.config.js (static, pattern,
  www/non-www canonicalization, trailing slash), middleware-based dynamic redirect
  map for large URL migrations, post-migration monitoring steps, hreflang
  implementation with x-default and URL structure decision table, per-locale
  sitemap, RSS/Atom feed route handler, rel=nofollow for UGC and sponsored links,
  pagination canonical rules, fragment URL indexing caveat.
  Use when migrating URLs, configuring redirects, building multilingual or
  multi-locale sites, implementing hreflang, adding an RSS feed, or handling
  SEO edge cases like UGC links, paginated content, or hash-fragment pages.
---

# SEO — Technical Edge Cases

**Compiled from**: ADR-0013 §301 Redirects, §Hreflang, §RSS Feed, §Technical Edge Cases
**Last synced**: 2026-03-27

---

## 301 Redirects — Static (Known URL Changes)

```javascript
// next.config.js
const nextConfig = {
  async redirects() {
    return [
      // Single page redirect
      { source: '/old-about', destination: '/about', permanent: true },

      // Pattern redirect (old blog URL structure)
      { source: '/blog/posts/:slug', destination: '/blog/:slug', permanent: true },

      // Entire section rename
      { source: '/news/:path*', destination: '/blog/:path*', permanent: true },

      // Old domain paths (coming from a different site)
      { source: '/ro/galerie/:slug', destination: '/galerie/:slug', permanent: true },
    ]
  },
}

module.exports = nextConfig
```

**Rule**: `permanent: true` issues a 301 — passes accumulated SEO authority to the new URL. Without redirects, all accumulated rankings for the old URL are lost.

---

## www vs non-www Canonicalization

Pick one form (`www.example.com` or `example.com`) and redirect the other permanently:

```javascript
// next.config.js redirects — redirect non-www to www:
{
  source: '/:path*',
  has: [{ type: 'host', value: 'example.com' }],
  destination: 'https://www.example.com/:path*',
  permanent: true,
}
```

On Vercel: add both domains in the project dashboard, set one as redirect target.

---

## Trailing Slash Consistency

```javascript
// next.config.js
const nextConfig = {
  trailingSlash: false,  // Pick one and be consistent
  // false: /about/ → redirects to /about
  // true:  /about  → redirects to /about/
}
```

The `canonicalUrl()` helper already strips trailing slashes from canonical URLs.

---

## Dynamic Redirects via Middleware (Large Migration Maps)

For migrations with hundreds of URL mappings, handle in middleware instead of `next.config.js`:

```typescript
// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

// For very large maps, load from a JSON file. Replace with DB lookup if needed.
const LEGACY_REDIRECTS: Record<string, string> = {
  '/old-page': '/new-page',
  '/produse/categorie-veche': '/produse/categorie-noua',
  // ...
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

---

## Post-Migration Monitoring

After a URL migration:

1. **Coverage report** in Google Search Console — watch for 404 errors on old URLs
2. **URL Inspection tool** — verify new URLs are indexed
3. **Performance report** — watch for ranking drops (expect 2–4 weeks of fluctuation)
4. Keep old redirects for **at least 1 year** — Google needs time to update its index

---

## Hreflang / Multi-Language SEO

### When You Need Hreflang

- Same content in multiple languages (Romanian + English)
- Same language targeting different countries (English for US vs UK)
- Mixed: some pages translated, some not

### Implementation

```tsx
// src/app/[locale]/page.tsx
import type { Metadata } from 'next'
import { canonicalUrl, SEO_SITE_URL } from '@/lib/seo/config'

type Props = { params: Promise<{ locale: string }> }

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { locale } = await params

  return {
    alternates: {
      canonical: canonicalUrl(locale === 'ro' ? '/' : `/${locale}`),
      languages: {
        ro: `${SEO_SITE_URL}/`,        // Romanian (default)
        en: `${SEO_SITE_URL}/en`,      // English
        'x-default': `${SEO_SITE_URL}/`,  // ← required — fallback for unlisted locales
      },
    },
  }
}
```

**Output in `<head>`:**
```html
<link rel="canonical" href="https://www.example.com/" />
<link rel="alternate" hreflang="ro" href="https://www.example.com/" />
<link rel="alternate" hreflang="en" href="https://www.example.com/en" />
<link rel="alternate" hreflang="x-default" href="https://www.example.com/" />
```

### URL Structure Decision Table

| Pattern | Example | Pros | Cons |
|---|---|---|---|
| Subdirectory (**recommended**) | `example.com/en/about` | Single domain authority, easy setup | Slightly longer URLs |
| Subdomain | `en.example.com/about` | Separate indexing per language | Domain authority split, DNS complexity |
| Separate domain | `example.co.uk` | Clear country targeting | Separate SEO effort per domain |

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

## RSS / Atom Feed

For blogs and news sites — enables content syndication, helps crawlers discover new content:

```tsx
// src/app/feed.xml/route.ts
import { SEO_SITE_URL, SEO_BRAND } from '@/lib/seo/config'
// import { db } from '@/lib/db'

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
    ${posts.map((post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SEO_SITE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SEO_SITE_URL}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${post.createdAt.toUTCString()}</pubDate>
    </item>`).join('')}
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

Reference the feed in root layout metadata (`src/app/layout.tsx`):

```typescript
alternates: {
  types: {
    'application/rss+xml': `${SEO_SITE_URL}/feed.xml`,
  },
},
```

---

## Technical Edge Cases

### Nofollow — UGC and Sponsored Links

When users can submit content (comments, profiles, forum posts), their links MUST NOT pass SEO authority:

```tsx
// ✅ User-generated content links
<a href={user.website} rel="nofollow ugc" target="_blank">{user.website}</a>

// ✅ Sponsored / paid links
<a href={sponsor.url} rel="nofollow sponsored" target="_blank">{sponsor.name}</a>

// ❌ No rel on untrusted external links — passes authority to unknown destinations
<a href={user.website}>{user.website}</a>
```

### Pagination and SEO

Google deprecated `rel="next"` / `rel="prev"` — it discovers paginated content naturally. However:

- Each paginated page MUST have a **unique canonical** (not all pointing to page 1)
- Paginated pages SHOULD be in the sitemap
- For infinite scroll — use `pushState` to update the URL per "page" so each scroll increment has a crawlable URL
- Consider "View All" pages for small data sets (often better for SEO than pagination)

### Fragment (#) URLs

Content behind `#fragments` is **not crawled by Google**. Client-side tab switching or accordion content that lives only behind hash fragments won't be indexed. If tab content matters for SEO, use real routes (`/features/pricing`, `/features/security`).
