# ADR-0029: SEO Strategy — Geo-Targeting, Content & Measurement

**Status**: Accepted
**Date**: 2026-03-27
**Supersedes**: N/A

---

## Context

ADR-0013 covers the **technical implementation** of SEO — Metadata API, JSON-LD, sitemaps, robots.txt, structured data generators, redirects, hreflang, and image SEO. All the wiring.

This ADR covers the **strategic layer** — the decisions and patterns that determine whether a site actually ranks. Technical SEO is table stakes; without strategy, a perfectly wired site still doesn't rank. This ADR addresses:

1. **Multi-location geo-targeting** — a client needs to rank for "mobilier la comandă Cluj-Napoca" AND "mobilier la comandă București." How do you build location-specific pages that rank individually?
2. **Keyword cluster strategy** — organizing dozens of keywords into a site structure where each page targets a specific intent.
3. **Content patterns** — heading hierarchy, above-the-fold content, internal linking, FAQ sections as long-tail magnets.
4. **Analytics & measurement setup** — consent-aware Google Analytics 4, Search Console integration, conversion tracking, UTM handling.
5. **SEO audit cadence** — pre-launch, post-launch, monthly, quarterly reviews.

Every client-facing project that depends on organic search traffic SHOULD implement these patterns. The complexity scales with the client's SEO ambition — a single-location restaurant needs less than a multi-city service business.

## Decision

**Multi-location pages via dynamic `[city]/page.tsx` routes with per-location metadata and JSON-LD. Keyword clusters mapped to site architecture. Content templates for agents enforcing heading hierarchy and keyword density. Consent-aware GA4 integration. Structured audit cadence with Google Search Console.**

---

## Multi-Location Geo-Targeting

### When You Need Location Pages

A single `LocalBusiness` JSON-LD on the home page is sufficient when:

- The business has ONE physical location
- It serves only the immediate area (e.g., a neighborhood restaurant)

You need **dedicated location pages** when:

- The business serves multiple cities (e.g., "mobilier la comandă" in Cluj, București, Timișoara)
- The business has multiple physical locations
- The client wants to rank for `[service] + [city]` combinations

### Architecture: Service × Location Matrix

For a furniture business serving 3 cities with 4 services:

```
Pages needed:
/servicii/mobilier-la-comanda                    → "mobilier la comandă România"
/servicii/mobilier-la-comanda/bucuresti          → "mobilier la comandă bucurești"
/servicii/mobilier-la-comanda/cluj-napoca        → "mobilier la comandă cluj-napoca"
/servicii/mobilier-la-comanda/timisoara          → "mobilier la comandă timișoara"
/servicii/mobilier-bucatarie                     → "mobilier bucătărie la comandă"
/servicii/mobilier-bucatarie/bucuresti           → "mobilier bucătărie bucurești"
... and so on
```

### File Structure

```
src/app/
  servicii/
    [service]/
      page.tsx                 # Service overview (national)
      [city]/
        page.tsx               # Service + city landing page
```

### Implementation Pattern

```tsx
// src/app/servicii/[service]/[city]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/ui/json-ld'
import { canonicalUrl, SEO_SITE_URL } from '@/lib/seo/config'
import {
  getLocalBusinessSchema,
  getServiceSchema,
  getBreadcrumbSchema,
} from '@/lib/seo/structured-data'

// Location data — could come from a CMS or database
import { LOCATIONS, SERVICES } from '@/lib/seo/geo-data'

type Props = {
  params: Promise<{ service: string; city: string }>
}

export const generateStaticParams = async () => {
  // Pre-render all service × city combinations at build time
  return SERVICES.flatMap((service) =>
    LOCATIONS.map((location) => ({
      service: service.slug,
      city: location.slug,
    })),
  )
}

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { service, city } = await params
  const serviceData = SERVICES.find((s) => s.slug === service)
  const locationData = LOCATIONS.find((l) => l.slug === city)

  if (!serviceData || !locationData) return {}

  const title = `${serviceData.name} în ${locationData.name}`
  const description = `${serviceData.name} în ${locationData.name}. ${serviceData.shortDescription} Solicită ofertă gratuită.`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl(`/servicii/${service}/${city}`),
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl(`/servicii/${service}/${city}`),
    },
  }
}

export default async function ServiceCityPage({ params }: Props) {
  const { service, city } = await params
  const serviceData = SERVICES.find((s) => s.slug === service)
  const locationData = LOCATIONS.find((l) => l.slug === city)

  if (!serviceData || !locationData) notFound()

  return (
    <>
      <JsonLd
        data={[
          getLocalBusinessSchema({
            name: `Brand — ${locationData.name}`,
            type: 'FurnitureStore',
            description: `${serviceData.name} în ${locationData.name}`,
            phone: locationData.phone,
            image: `${SEO_SITE_URL}/images/locations/${city}.webp`,
            address: locationData.address,
            geo: locationData.geo,
            serviceAreas: [{ name: locationData.name, type: 'City' }],
          }),
          getServiceSchema({
            name: serviceData.name,
            description: serviceData.description,
            url: canonicalUrl(`/servicii/${service}/${city}`),
            serviceAreas: [{ name: locationData.name, type: 'City' }],
          }),
          getBreadcrumbSchema([
            { name: 'Acasă', url: canonicalUrl('/') },
            { name: 'Servicii', url: canonicalUrl('/servicii') },
            { name: serviceData.name, url: canonicalUrl(`/servicii/${service}`) },
            { name: locationData.name, url: canonicalUrl(`/servicii/${service}/${city}`) },
          ]),
        ]}
      />
      <main>
        <h1>
          {serviceData.name} în {locationData.name}
        </h1>
        {/* Location-specific content — NOT duplicate content */}
        {/* Each city page must have unique content (see Content Patterns below) */}
      </main>
    </>
  )
}
```

### Geo Data File

```typescript
// src/lib/seo/geo-data.ts

export type Location = {
  slug: string
  name: string
  phone: string
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
  /** City-specific content — REQUIRED to avoid duplicate content penalty */
  localContent: {
    intro: string // Unique opening paragraph for this city
    highlights: string[] // City-specific selling points
    testimonial?: string // Local client testimonial
  }
}

export type Service = {
  slug: string
  name: string
  shortDescription: string
  description: string
}

// Populated per project — these are illustrative examples
export const LOCATIONS: Location[] = [
  {
    slug: 'bucuresti',
    name: 'București',
    phone: '+40 721 000 001',
    address: {
      street: 'Str. Exemplu Nr. 10',
      city: 'București',
      region: 'București',
      postalCode: '010001',
      country: 'RO',
    },
    geo: { latitude: 44.4268, longitude: 26.1025 },
    localContent: {
      intro: 'Producem mobilier la comandă pentru clienți din toate sectoarele Bucureștiului...',
      highlights: ['Livrare în București în 24h', 'Showroom vizitabil în Sector 1'],
    },
  },
  // Additional locations...
]

export const SERVICES: Service[] = [
  {
    slug: 'mobilier-la-comanda',
    name: 'Mobilier la Comandă',
    shortDescription: 'Mobilier personalizat din lemn masiv.',
    description: 'Proiectăm și fabricăm mobilier la comandă...',
  },
  // Additional services...
]
```

### ServiceArea Schema (No Physical Location in That City)

When a business operates in a city but doesn't have a storefront there, use `areaServed` instead of a full `LocalBusiness`:

```typescript
// The LocalBusiness schema already supports this via serviceAreas param:
getLocalBusinessSchema({
  // ... main location details ...
  serviceAreas: [
    { name: 'București', type: 'City' },
    { name: 'Cluj-Napoca', type: 'City' },
    { name: 'Timișoara', type: 'City' },
    { name: 'Iași', type: 'City' },
  ],
})
```

### Duplicate Content: The #1 Multi-Location Trap

Google penalizes pages that are essentially the same content with only the city name swapped. Each location page **must** have unique content:

| Element                      | Unique Per City? | How                                                    |
| ---------------------------- | ---------------- | ------------------------------------------------------ |
| H1 heading                   | Yes              | `[Service] în [City]`                                  |
| Intro paragraph (100+ words) | **Yes**          | City-specific context, landmarks, local references     |
| Testimonials                 | Yes              | Show reviews from clients in that city                 |
| Portfolio/gallery images     | Yes              | Show projects completed in that city                   |
| Pricing/offers               | Varies           | If pricing varies by location, show it                 |
| Service description          | Shared (OK)      | Core service description can be identical              |
| FAQ section                  | **Yes**          | City-specific questions (parking, delivery area, etc.) |
| Contact info                 | Yes              | Location-specific phone, address, hours                |

**Minimum unique content per location page**: 200 words that don't appear on any other location page.

---

## Keyword Cluster Strategy

### What Is a Keyword Cluster?

A keyword cluster is a group of related search terms that share the same search intent. Instead of building one page per keyword, you build one page per **cluster** — with the primary keyword in the title and secondary keywords woven into the content.

### Mapping Clusters to Site Architecture

```
Cluster 1: "mobilier living"
  Primary: "mobilier living la comandă"
  Secondary: "canapea lemn masiv", "masă living", "bibliotecă living"
  → Page: /servicii/mobilier-living

Cluster 2: "mobilier bucătărie"
  Primary: "mobilier bucătărie la comandă"
  Secondary: "corp bucătărie lemn", "blat bucătărie", "insulă bucătărie"
  → Page: /servicii/mobilier-bucatarie

Cluster 3: "mobilier dormitor"
  Primary: "mobilier dormitor la comandă"
  Secondary: "pat lemn masiv", "dulap dormitor", "noptieră lemn"
  → Page: /servicii/mobilier-dormitor

Each cluster can then expand with location pages:
  /servicii/mobilier-living/bucuresti
  /servicii/mobilier-living/cluj-napoca
  etc.
```

### Keyword Research Workflow

1. **Seed keywords** — Start with the business's core services (e.g., "mobilier la comandă")
2. **Expand with tools**:
   - Google Autocomplete — type the seed, note suggestions
   - Google "People Also Ask" — note the questions
   - Google Keyword Planner — get search volume and related terms
   - Competitor analysis — what keywords do the top 3 results target?
3. **Group into clusters** — Keywords with similar intent go on the same page
4. **Assign to pages** — One cluster per page, one primary keyword per cluster
5. **Document in `keywords.ts`** — Per ADR-0013, centralized keyword config

### Keyword Intent Types

| Intent        | Example Query                          | Page Type                     |
| ------------- | -------------------------------------- | ----------------------------- |
| Informational | "cum se întreține mobilierul din lemn" | Blog article                  |
| Commercial    | "mobilier la comandă prețuri"          | Service/pricing page          |
| Transactional | "comandă mobilier living online"       | Product/service page with CTA |
| Navigational  | "Brand Name contact"                   | Contact page                  |
| Local         | "mobilier la comandă bucurești"        | Location landing page         |

Match page content to search intent. A "how to maintain wood furniture" query expects an educational article, not a product page.

---

## Content Patterns for SEO

### Heading Hierarchy

```
H1: One per page — contains primary keyword
  H2: Section headers — contain secondary keywords or related topics
    H3: Subsection headers — long-tail variations
      H4: Rare — only for deeply structured content (e.g., step-by-step)
```

**Rules:**

- Never skip levels (e.g., H1 → H3 without H2)
- H1 matches the page topic (not the brand name)
- Each H2 introduces a distinct subtopic
- Don't use headings purely for styling — use CSS

### Above-the-Fold Content Rules

The first 100 words of a page carry outsized SEO weight. Google evaluates early content more heavily.

```
✅ Good above-the-fold:
  H1 with primary keyword
  Opening paragraph (2-3 sentences) that includes the primary keyword naturally
  Clear value proposition or answer to the search query

❌ Bad above-the-fold:
  Giant image with no text
  "Welcome to our website" (says nothing)
  Navigation-heavy header that pushes content below the fold
  Slider with promotional text that changes (Google sees only the first slide)
```

### Content Length Guidelines

| Page Type     | Minimum Words | Target Words | Notes                                   |
| ------------- | ------------- | ------------ | --------------------------------------- |
| Home page     | 300           | 500-800      | Include services summary, trust signals |
| Service page  | 500           | 800-1500     | Detail the service, process, benefits   |
| Location page | 300           | 500-800      | Unique city-specific content            |
| Blog article  | 800           | 1200-2500    | In-depth, answers the query fully       |
| Product page  | 200           | 300-500      | Product description, specs, reviews     |
| FAQ page      | 400           | 800-1500     | 5-15 questions with detailed answers    |

These are guidelines — quality matters more than word count. A 400-word page that perfectly answers a query outranks a 2000-word page of filler.

### Internal Linking Strategy

Internal links distribute page authority and help Google discover content. They also help users navigate.

**Rules:**

- Every page should have at least 2-3 internal links to related pages
- Anchor text should be descriptive (not "click here")
- Link from high-authority pages (home, main services) to deeper pages
- Create hub pages that link to all pages in a cluster

```
Hub-and-spoke model:

  /servicii  (hub — links to all services)
    ├── /servicii/mobilier-living  (spoke)
    ├── /servicii/mobilier-bucatarie  (spoke)
    └── /servicii/mobilier-dormitor  (spoke)

Each spoke links back to the hub AND to related spokes.
```

**Anchor text examples:**

```html
<!-- ❌ Generic — tells Google nothing -->
<a href="/servicii/mobilier-living">Click here</a>
<a href="/servicii/mobilier-living">Learn more</a>

<!-- ✅ Descriptive — reinforces the target page's keyword -->
<a href="/servicii/mobilier-living">mobilier living la comandă</a>
<a href="/blog/intretinere-lemn">cum se întreține mobilierul din lemn</a>
```

### FAQ Sections as Long-Tail Keyword Magnets

FAQ sections serve triple duty: they answer user questions, capture long-tail search queries, and qualify for FAQ rich results (via FAQ JSON-LD schema from ADR-0013).

**Where to add FAQ sections:**

- Service pages — questions about the process, pricing, timeline
- Location pages — city-specific questions (parking, delivery area, showroom hours)
- Product pages — material, care, warranty questions
- Dedicated FAQ page — comprehensive, links to detailed pages

**FAQ content rules:**

- Answer the question in 2-4 sentences (Google shows the first ~300 chars in rich results)
- Include relevant keywords naturally in both question AND answer
- Questions should match real search queries (check Google "People Also Ask")
- Add FAQ JSON-LD schema (per ADR-0013 `getFaqSchema()`)

---

## Blog / Content Marketing for SEO

Blog content targets informational keywords — queries where users are researching, not buying. This builds topical authority and attracts backlinks.

### Content Calendar Pattern

```
Monthly cadence for a local business blog:

Week 1: How-to article (e.g., "Cum alegi lemnul pentru mobilier")
  Target: informational keyword cluster
  Internal links: to relevant service pages

Week 2: Case study / portfolio piece (e.g., "Mobilier bucătărie — proiect Sector 3")
  Target: commercial keyword + location
  Internal links: to the service + city landing page

Week 3: FAQ / comparison article (e.g., "MDF vs lemn masiv — ce e mai bun?")
  Target: comparison/commercial keyword
  Internal links: to relevant product/service pages

Week 4: Local / seasonal content (e.g., "Tendințe mobilier 2026 în România")
  Target: trending keywords
  Internal links: to multiple service pages
```

### Blog Article Template

```
Title: [Primary Keyword — How/What/Why question format]
  → "Cum Alegi Lemnul Potrivit pentru Mobilier la Comandă"

Meta description: [Answer the question + CTA, 120-160 chars]
  → "Ghid complet pentru alegerea lemnului masiv. Stejar, nuc sau frasin? Compară durabilitate, preț și estetică. Sfaturi de la meșteri."

H1: = Title

Intro (100 words): State the problem, include primary keyword, preview the answer

H2: [Subtopic 1 — secondary keyword]
  Content: 200-400 words

H2: [Subtopic 2 — secondary keyword]
  Content: 200-400 words

H2: [Subtopic 3 — secondary keyword]
  Content: 200-400 words

H2: Întrebări Frecvente (FAQ)
  3-5 questions with short answers
  → Add FAQ JSON-LD schema

CTA: Link to relevant service page
  → "Vrei mobilier din [wood type]? Solicită ofertă gratuită."
```

---

## Analytics & Measurement Setup

### Google Analytics 4 — Consent-Aware

GA4 must respect cookie consent (per ADR-0024 cookie consent pattern). Only fire tracking after the user grants consent.

**Implementation approach:**

```tsx
// src/components/analytics/GoogleAnalytics.tsx
'use client'

import Script from 'next/script'

import { useCookieConsent } from '@/hooks/useCookieConsent' // From cookie consent implementation

type Props = {
  measurementId: string
}

export const GoogleAnalytics = ({ measurementId }: Props) => {
  const { analyticsConsent } = useCookieConsent()

  // Only load GA4 when the user has granted analytics consent
  if (!analyticsConsent) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy='afterInteractive'
      />
      <Script id='ga4-init' strategy='afterInteractive'>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  )
}
```

```tsx
// In src/app/layout.tsx (server component)
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"ro'>
      <body>
        {children}
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ''} />
      </body>
    </html>
  )
}
```

### Google Tag Manager Alternative

For complex tracking needs (multiple tracking pixels, event-based triggers, A/B testing), use GTM instead of raw GA4:

```tsx
// Same consent-aware pattern — only load GTM when consent is granted
<Script id='gtm' strategy='afterInteractive'>
  {`
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${containerId}');
  `}
</Script>
```

### Google Search Console Integration

Search Console is the primary SEO measurement tool — it shows which queries bring traffic, which pages are indexed, and what errors exist.

**Setup checklist:**

1. Verify domain ownership (DNS TXT record or HTML file upload)
2. Submit sitemap URL: `https://www.example.com/sitemap.xml`
3. Add verification code to root layout metadata:

```tsx
// src/app/layout.tsx metadata
verification: {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '',
},
```

4. Set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in environment variables

**What to monitor:**

- **Performance** → Clicks, impressions, CTR, average position per query
- **Coverage** → Indexed pages, errors, excluded pages
- **URL Inspection** → Test individual URLs for indexing status
- **Core Web Vitals** → CWV field data from real users
- **Sitemaps** → Status of submitted sitemaps

### UTM Parameter Handling

UTM parameters track traffic sources (email campaigns, social posts, ads). They must not break canonical URLs.

```typescript
// The canonicalUrl() function in ADR-0013 already strips query params:
export const canonicalUrl = (path: string): string => {
  const clean = path.split('?')[0].split('#')[0] // ← strips ?utm_source=... etc.
  const normalized = clean === '/' ? '' : clean.replace(/\/$/, '')
  return `${SEO_SITE_URL}${normalized}`
}
```

UTM parameters are preserved for analytics (GA4 reads them automatically) but stripped from canonicals (so Google doesn't index `/page?utm_source=facebook` as a separate page).

### Conversion Tracking

Connect SEO traffic to business outcomes:

```
Search query → Page visit → Goal action

Examples:
  "mobilier la comandă bucurești" → /servicii/mobilier-la-comanda/bucuresti → form submit
  "cum alegi lemn mobilier" → /blog/cum-alegi-lemnul → CTA click → service page → form submit
```

**Track in GA4:**

- Form submissions (contact, quote request)
- Phone number clicks (`tel:` links)
- Email clicks (`mailto:` links)
- CTA button clicks (book appointment, request quote)
- File downloads (catalog PDFs, price lists)

This data reveals which keywords drive conversions (not just traffic), allowing the client to invest in content that generates business.

---

## SEO Audit Cadence

### Pre-Launch Checklist

Before a new site goes live:

- [ ] Run the full Technical Checklist from ADR-0013
- [ ] Run the full Content Checklist from ADR-0013
- [ ] Test every page with Google Rich Results Test
- [ ] Test homepage with Facebook Sharing Debugger
- [ ] Run Lighthouse with SEO category (target ≥ 90)
- [ ] Verify `robots.txt` allows crawling in production
- [ ] Verify `sitemap.xml` includes all public routes
- [ ] Check canonical URLs resolve correctly (no 404s)
- [ ] For migrations: verify all 301 redirects work (test each old URL)
- [ ] Submit sitemap to Google Search Console
- [ ] Verify Google Analytics fires (with consent)

### Post-Launch (First 2 Weeks)

- [ ] Monitor Google Search Console Coverage for new 404 errors
- [ ] Use URL Inspection on key pages — verify they're indexed
- [ ] Check Google for `site:example.com` — see what's indexed
- [ ] For migrations: monitor old URLs — verify redirects are working in production
- [ ] Check Core Web Vitals in Search Console (field data takes ~28 days)

### Monthly Review

- [ ] Review Search Console Performance: top queries, clicks, CTR, average position
- [ ] Identify queries where position is 5-15 (opportunity to improve from page 1 bottom / page 2)
- [ ] Check for new crawl errors in Coverage report
- [ ] Review any new "Page Experience" issues
- [ ] Update blog / content calendar based on trending queries
- [ ] Check competitor titles — have they changed their strategy?

### Quarterly Review

- [ ] Full keyword research refresh — any new high-volume queries emergent?
- [ ] Content audit — which pages rank well? Which have dropped?
- [ ] Refresh stale content (update dates, stats, examples in blog posts)
- [ ] Review and expand FAQ sections with new "People Also Ask" questions
- [ ] Backlink audit — any new links? Any lost links?
- [ ] Technical audit — re-run Lighthouse, check CWV trends
- [ ] Review location page performance (if multi-location)

---

## Anti-Patterns

```
❌ Thin location pages
  Creating /servicii/mobilier/bucuresti and /servicii/mobilier/cluj
  with identical content except the city name swapped out.
  → Google penalizes this as duplicate/thin content. Each page needs 200+ unique words.

❌ Ignoring search intent
  Targeting "cum se întreține lemnul" with a product page instead of a how-to article.
  → Users want information, not a sales pitch. Match page type to intent.

❌ Keyword cannibalization
  Two pages targeting the same primary keyword compete with each other.
  → One page per primary keyword. Use canonical or merge if overlap exists.

❌ Set-and-forget SEO
  Implementing SEO at launch and never reviewing it.
  → SEO requires monthly monitoring and quarterly content refreshes.

❌ No analytics
  Building SEO without measurement — no way to know what's working.
  → GA4 + Search Console from day one. Data drives decisions.

❌ Blocking search engines during development and forgetting to unblock
  robots.txt with disallow:/ never updated after launch.
  → robots.ts is environment-aware (per ADR-0013) — this can't happen if the pattern is followed.

❌ Ignoring mobile
  Desktop-only content or slow mobile load times.
  → Google uses mobile-first indexing. Test on mobile first.

❌ Over-relying on programmatic content
  Auto-generating hundreds of location pages for cities you don't actually serve.
  → Google detects and penalizes this. Only create pages for areas you genuinely serve.

❌ Skipping structured data validation
  Deploying JSON-LD without testing in Google Rich Results Test.
  → Invalid schemas are worse than no schemas (Google may penalize or distrust the site).

❌ Chasing algorithm updates
  Rewriting content after every Google update.
  → Build for users, not for algorithms. Quality content survives updates.
```

---

## Rationale

### Why Dedicated Location Pages Instead of One Page with Multiple Cities

Google ranks **pages**, not websites. A single page targeting "mobilier la comandă" will struggle to rank for "mobilier la comandă cluj-napoca" because the title, H1, and content can't be optimized for both simultaneously. Dedicated pages allow title-tag-level optimization per city — the single most impactful on-page factor.

### Why Content Strategy Is In an ADR

Developers and AI agents often treat SEO as a purely technical problem — add meta tags, generate a sitemap, done. In reality, technical SEO is 30% of the picture. Content strategy (what to write, how to structure it, how to interlink it) and measurement (is it working?) are the other 70%. Without documenting this, agents produce technically perfect but strategically useless pages.

### Why Monthly Audits

SEO is not a deploy-and-forget feature. Google's index updates continuously. Competitors adjust their strategies. Seasonal trends shift query volumes. Monthly monitoring catches drops early (before position 5 becomes position 50) and identifies growth opportunities.

### Key Factors

1. **Multi-location architecture** — `[service]/[city]` dynamic routes with `generateStaticParams` for pre-rendering and per-location JSON-LD.
2. **Keyword clusters** — group related keywords into clusters, map each cluster to one page, avoid cannibalization.
3. **Content quality** — unique content per location page, heading hierarchy, above-the-fold keyword placement.
4. **Consent-aware analytics** — GA4 fires only after cookie consent, UTM params stripped from canonicals.
5. **Structured audit cadence** — pre-launch, post-launch, monthly, quarterly reviews with specific checklists.

## Options Considered

| Option                         | Description                             | Why Chosen / Why Not                                                                           |
| ------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Single page with all locations | One page listing all service areas      | ❌ Can't optimize title/H1 per city — ranking for location queries requires per-location pages |
| Subdomain per city             | `bucuresti.example.com`                 | ❌ Splits domain authority, harder to manage, more hosting complexity                          |
| Subdirectory per city          | `example.com/servicii/[service]/[city]` | ✅ Chosen: consolidates authority, clean URL structure, works with `generateStaticParams`      |
| No analytics until "ready"     | Skip GA4 setup, add later               | ❌ Loses launch-window data. Install consent-aware tracking from day one                       |
| Google Analytics Universal     | Older analytics platform                | ❌ Deprecated July 2023 — GA4 only                                                             |

---

## Consequences

**Positive:**

- Multi-location businesses can rank for `[service] + [city]` combinations — each page optimized individually.
- Keyword cluster mapping prevents cannibalization (two pages competing for the same query).
- Content patterns give agents enough structure to produce SEO-effective content at scale.
- Consent-aware analytics ensure GDPR compliance while still capturing data.
- Audit cadence catches SEO regressions early and identifies growth opportunities.
- Blog/content patterns build topical authority over time (compounding SEO returns).

**Negative:**

- Multi-location pages require unique content per city — generating this content takes effort. Mitigated by providing templates and minimum unique-content thresholds.
- Monthly/quarterly audits require ongoing time investment — mitigated by specific checklists (agents can automate the technical checks).
- Analytics setup adds a client-side dependency (GA4 script) — mitigated by consent-gating and `afterInteractive` loading strategy.
- Keyword research requires human judgment (no AI tool fully replaces understanding local market) — mitigated by documenting the process step by step.

## Related ADRs

- [ADR-0013](./0013-seo-metadata.md) — SEO & Metadata (technical implementation: Metadata API, JSON-LD, sitemaps, robots.txt, redirects, hreflang, image SEO)
- [ADR-0018](./0018-performance-platform.md) — Performance (Core Web Vitals affect rankings — LCP, INP, CLS, image optimization)
- [ADR-0024](./0024-ux-interaction-patterns.md) — UX Interaction Patterns (cookie consent pattern for consent-aware analytics)
- [ADR-0006](./0006-environment.md) — Environment (GA measurement ID, site verification code as env vars)
- [ADR-0001](./0001-architecture.md) — Architecture (Next.js SSR enables server-rendered content for crawlers)
