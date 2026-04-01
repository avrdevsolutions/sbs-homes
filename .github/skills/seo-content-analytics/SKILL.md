---
name: seo-content-analytics
description: >-
  SEO analytics setup and audit cadences — consent-aware GoogleAnalytics.tsx
  component (fires only after cookie consent), GTM alternative snippet,
  Google Search Console setup (verification code in metadata, sitemap submission,
  what to monitor: Performance/Coverage/CWV/Sitemaps), UTM parameter stripping
  from canonical URLs, GA4 conversion tracking events, Technical SEO checklist
  (22 items), Content checklist (13 items), Off-Page checklist (8 items),
  pre-launch checklist, post-launch first-two-weeks review, monthly review,
  quarterly review, testing tools table (Rich Results Test, PageSpeed, Lighthouse),
  automated curl checks for title/sitemap/robots.
  Use when setting up GA4 or GTM, configuring Search Console, running a pre-launch
  SEO audit, implementing conversion tracking, or executing monthly/quarterly SEO reviews.
---

# SEO — Analytics, Measurement & Audit Cadence

**Compiled from**: ADR-0029 §Analytics & Measurement, ADR-0013 §SEO Checklist, §Testing & Validation
**Last synced**: 2026-03-27

---

## Google Analytics 4 — Consent-Aware

GA4 must fire only after the user grants analytics consent. Loading it unconditionally violates GDPR/CCPA and creates legal risk.

```tsx
// src/components/analytics/GoogleAnalytics.tsx
'use client'

import Script from 'next/script'
import { useCookieConsent } from '@/hooks/useCookieConsent'

type Props = { measurementId: string }

export const GoogleAnalytics = ({ measurementId }: Props) => {
  const { analyticsConsent } = useCookieConsent()

  // Only mount GA4 scripts when the user has granted analytics consent
  if (!analyticsConsent) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { page_path: window.location.pathname });
        `}
      </Script>
    </>
  )
}
```

```tsx
// In src/app/layout.tsx (Server Component)
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        {children}
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ''} />
      </body>
    </html>
  )
}
```

Add to environment variables:

```dotenv
# .env.local (and Vercel dashboard)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## Google Tag Manager Alternative

For complex tracking needs (multiple pixels, event-based triggers, A/B testing), use GTM instead of raw GA4:

```tsx
// src/components/analytics/GoogleTagManager.tsx
'use client'

import Script from 'next/script'
import { useCookieConsent } from '@/hooks/useCookieConsent'

type Props = { containerId: string }

export const GoogleTagManager = ({ containerId }: Props) => {
  const { analyticsConsent } = useCookieConsent()
  if (!analyticsConsent) return null

  return (
    <Script id="gtm" strategy="afterInteractive">
      {`
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${containerId}');
      `}
    </Script>
  )
}
```

---

## Google Search Console Setup

### Verification

Add the verification code to root layout metadata — never hardcode the value, always from env:

```typescript
// src/app/layout.tsx metadata
verification: {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '',
},
```

```dotenv
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-code-here
```

### Sitemap Submission

After launch, submit: `https://www.example.com/sitemap.xml` in Search Console → Sitemaps.

### What to Monitor

| Report | What to check |
|---|---|
| **Performance** | Top queries, clicks, CTR, average position per query |
| **Coverage** | Indexed pages, crawl errors, excluded pages |
| **URL Inspection** | Indexing status for individual URLs |
| **Core Web Vitals** | LCP, INP, CLS field data (takes ~28 days to populate) |
| **Sitemaps** | Status of submitted sitemaps |

---

## UTM Parameter Handling

UTM parameters track traffic sources (email campaigns, social posts, ads) and should NOT appear in canonical URLs — otherwise Google indexes `/page?utm_source=facebook` as a separate page. The `canonicalUrl()` helper already strips them:

```typescript
export const canonicalUrl = (path: string): string => {
  const clean = path.split('?')[0].split('#')[0]  // ← strips ?utm_source=... etc.
  const normalized = clean === '/' ? '' : clean.replace(/\/$/, '')
  return `${SEO_SITE_URL}${normalized}`
}
```

UTM parameters are preserved for GA4 (it reads them automatically from the URL) but stripped from canonical tags. No additional code needed.

---

## Conversion Tracking

Connect SEO traffic to business outcomes in GA4:

```
Example funnel:
  Search query → Page visit → Goal action
  "mobilier la comandă bucurești" → /servicii/.../bucuresti → form submit
```

**Events to track:**
- Form submissions (contact form, quote request)
- Phone number clicks (`tel:` links)
- Email clicks (`mailto:` links)
- CTA button clicks (book appointment, request quote)
- File downloads (catalog PDFs, price lists)

This data reveals which keywords drive conversions (not just traffic), allowing investment in content that generates business — not just impressions.

---

## SEO Checklists

### Technical Checklist (Agent Responsibility)

- [ ] Root layout has `title.template` and default metadata
- [ ] Every public page has unique `title` and `description`
- [ ] `metadataBase` set to production URL
- [ ] `sitemap.ts` includes all public routes
- [ ] `robots.ts` blocks non-production environments
- [ ] Canonical URL set on every page (`alternates.canonical`)
- [ ] Open Graph tags set (title, description, image, url)
- [ ] Twitter Card tags set in root layout
- [ ] JSON-LD structured data on home page (WebSite + Organization/LocalBusiness)
- [ ] JSON-LD structured data on content pages (Article, Product, etc.)
- [ ] All images have descriptive `alt` text
- [ ] Semantic HTML used (`<main>`, `<article>`, `<section>`, `<nav>`)
- [ ] No `noindex` on pages that should be indexed
- [ ] Admin/auth pages excluded from sitemap and blocked in robots.txt
- [ ] `<html lang="...">` set correctly — matches `global-error.tsx`
- [ ] 301 redirects configured for any changed/migrated URLs
- [ ] `www` vs non-`www` canonicalized (pick one, redirect the other)
- [ ] Trailing slash policy consistent (`trailingSlash` in `next.config.js`)
- [ ] `hreflang` tags set if site serves multiple languages
- [ ] RSS feed exists and referenced in root layout metadata (for blog/news sites)
- [ ] `rel="nofollow ugc"` on all user-generated outbound links
- [ ] LCP image uses `priority` prop — no lazy loading on hero image
- [ ] Image file names are descriptive and keyword-relevant

### Content Checklist (Client / Developer Responsibility)

- [ ] Keyword research completed (Google Autocomplete, Keyword Planner)
- [ ] One primary keyword assigned per page
- [ ] Title tags contain the primary keyword
- [ ] H1 headings match the page topic and contain the primary keyword
- [ ] Meta descriptions are 120–160 characters, contain keyword, and include a CTA
- [ ] Content is 300+ words on key landing pages
- [ ] Internal links connect related pages with descriptive anchor text
- [ ] Images are optimized (WebP, appropriate size, compressed)
- [ ] Image file names are descriptive before uploading (not IMG_2034.webp)
- [ ] OG images created (1200×630px) with brand elements
- [ ] Heading hierarchy follows H1→H2→H3 (no skipped levels)
- [ ] Primary keyword appears in first 100 words of page content
- [ ] FAQ sections added to high-value pages (long-tail keyword capture)

### Off-Page Checklist (Client Responsibility — Not Code)

- [ ] Google Business Profile claimed and verified (local businesses)
- [ ] Google Search Console set up and sitemap submitted
- [ ] Google Analytics 4 set up with consent-aware tracking
- [ ] NAP (Name, Address, Phone) consistent across all platforms
- [ ] Social media profiles created and linked from the website
- [ ] Business listed in relevant directories
- [ ] Backlink strategy initiated (local press, directories, partners)
- [ ] Content calendar planned for ongoing SEO (blog, case studies, guides)

---

## Audit Cadence

### Pre-Launch

- [ ] Run the full Technical Checklist above
- [ ] Run the full Content Checklist above
- [ ] Test every page's JSON-LD at https://search.google.com/test/rich-results
- [ ] Test homepage at Facebook Sharing Debugger
- [ ] Run Lighthouse with SEO category (target ≥ 90)
- [ ] Verify `robots.txt` allows crawling in production
- [ ] Verify `sitemap.xml` includes all public routes
- [ ] Check canonical URLs resolve correctly (no 404s)
- [ ] For URL migrations: verify all 301 redirects work — test each old URL
- [ ] Submit sitemap to Google Search Console
- [ ] Verify Google Analytics fires (with consent)

### Post-Launch (First 2 Weeks)

- [ ] Monitor Search Console Coverage for new 404 errors
- [ ] Use URL Inspection on key pages — verify they're indexed
- [ ] Check Google for `site:example.com` — see what's indexed
- [ ] For migrations: monitor old URLs — verify redirects work in production
- [ ] Core Web Vitals field data begins populating after ~28 days — note the date

### Monthly Review

- [ ] Review Search Console Performance: top queries, clicks, CTR, average position
- [ ] Identify queries where position is 5–15 (opportunity zone — page 1 bottom / page 2)
- [ ] Check for new crawl errors in Coverage report
- [ ] Review new "Page Experience" issues
- [ ] Update blog / content calendar based on trending queries
- [ ] Check competitor titles — have they changed their strategy?

### Quarterly Review

- [ ] Full keyword research refresh — any new high-volume queries emerging?
- [ ] Content audit — which pages rank well? Which have dropped?
- [ ] Refresh stale content (update dates, stats, examples in blog posts)
- [ ] Review and expand FAQ sections with new "People Also Ask" questions
- [ ] Backlink audit — new links? Lost links? Toxic links to disavow?
- [ ] Technical audit — re-run Lighthouse, check CWV trends in Search Console
- [ ] Review location page performance (if multi-location — which cities rank, which don't?)

---

## Testing Tools

| Tool | URL | What it tests |
|---|---|---|
| Google Rich Results Test | https://search.google.com/test/rich-results | JSON-LD validation, rich result eligibility |
| Google PageSpeed Insights | https://pagespeed.web.dev | Core Web Vitals, performance |
| Facebook Sharing Debugger | https://developers.facebook.com/tools/debug/ | Open Graph tags, social preview |
| Schema.org Validator | https://validator.schema.org/ | JSON-LD syntax validation |
| Google Search Console | https://search.google.com/search-console | Indexing status, errors, search queries |
| Lighthouse (Chrome DevTools) | Built into Chrome | SEO audit score (target ≥ 90) |

## Automated Checks (Development)

```bash
# Check generated HTML for key SEO tags
curl -s http://localhost:3000 | grep -E '<title>|<meta name="description"|<link rel="canonical"|application/ld\+json' | head -20

# Check sitemap
curl -s http://localhost:3000/sitemap.xml

# Check robots.txt
curl -s http://localhost:3000/robots.txt
```
