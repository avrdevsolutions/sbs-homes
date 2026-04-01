---
applyTo: "src/app/**/*.{ts,tsx}, src/lib/seo/**/*.ts, src/components/**/*.{ts,tsx}"
---

# SEO Constraints

## Metadata
- Every public page MUST export a unique `title` — use `title.template` in root layout so child pages auto-get `| Brand`
- Every public page MUST have a unique `<meta name="description">` (120–160 characters)
- Title format MUST follow `[Primary Keyword] | [Brand]` — home page for local businesses MUST include location
- Every page MUST have exactly one `<h1>` matching the page topic (not the brand name)
- `<html lang="...">` in root `layout.tsx` MUST exactly match `lang` in `global-error.tsx`
- `metadataBase` MUST be set to the production URL in root layout

## Crawlability
- `sitemap.ts` MUST include all public, indexable routes — MUST NOT include auth, admin, dashboard, or settings routes
- `robots.ts` MUST disallow all crawling on non-production environments (`VERCEL_ENV !== 'production'`)
- Pages that should rank MUST NOT have `noindex` in their metadata robots config

## Structured Data
- JSON-LD MUST be added to all business, product, article, and service pages
- Open Graph tags (title, description, image, url) MUST be set on every public page
- Twitter Card defaults MUST be set in root layout metadata
- JSON-LD schemas MUST include all required fields — incomplete schemas are worse than none

## URL Integrity
- Every page MUST set `alternates.canonical` using `canonicalUrl()` from `src/lib/seo/config.ts`
- `www` vs non-`www` MUST be canonicalized — pick one, redirect the other
- Trailing slash policy MUST be consistent — set `trailingSlash` in `next.config.js`
- When URLs change, 301 redirects MUST be configured — never let old URLs 404
- Each paginated page MUST have its own unique canonical — MUST NOT all point to page 1
- Multi-language sites MUST set `hreflang` tags including `x-default` on every page

## Link Hygiene
- User-generated outbound links MUST use `rel="nofollow ugc"`
- Sponsored / paid outbound links MUST use `rel="nofollow sponsored"`

## CMS-Driven Pages
- `stega: false` MUST be passed to `sanityFetch` in every `generateMetadata` call — stega encoding injects invisible characters that corrupt `<title>` and `<meta>` tags
- `stega: false` MUST also be passed in `generateStaticParams` — stega chars break slug comparisons
- CMS `seo.noIndex` field MUST be respected: map it to `robots: { index: false, follow: false }` in `generateMetadata`
- `sitemap.ts` MUST include dynamic CMS routes — fetch slug lists from Sanity using `sanityFetch` with `stega: false` and `perspective: 'published'`

## Content Quality
- MUST NOT repeat keywords unnaturally — Google penalizes keyword stuffing
- MUST NOT have duplicate `<title>` or `<meta name="description">` across pages
- Image `alt` attributes MUST be descriptive and include 1–2 relevant keywords — MUST NOT be empty or generic
- Content behind `#fragment` URLs is not crawled — SHOULD use real routes when SEO indexing matters
- Image file names SHOULD be descriptive and kebab-case (not `IMG_2034.jpg`)
- Blog and news sites SHOULD have an RSS feed referenced in root layout metadata
