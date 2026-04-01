---
name: seo-structured-data
description: >-
  JSON-LD structured data — business-type-to-schema decision table, 11 schema
  generator functions (WebSite, Organization, LocalBusiness, BreadcrumbList,
  Article, FAQ, Service, Product, Event, HowTo, VideoObject), reusable JsonLd
  component, and usage examples for home page, blog posts, and location pages.
  Use when adding structured data to any page, choosing which schema type to use,
  implementing product rich results, generating FAQ rich snippets, wiring Product
  or Event schemas, or injecting JSON-LD via the JsonLd component.
---

# SEO — Structured Data (JSON-LD)

**Compiled from**: ADR-0013 §JSON-LD Structured Data, §Additional JSON-LD Schemas
**Last synced**: 2026-03-27

---

## Schema Type Decision Table

| Business type | Schemas to use |
|---|---|
| Local business (gallery, restaurant, shop) | `LocalBusiness`, `WebSite`, `BreadcrumbList` |
| E-commerce | `Product`, `Offer`, `AggregateRating`, `BreadcrumbList` |
| Blog / content site | `Article`, `BlogPosting`, `WebSite`, `BreadcrumbList` |
| SaaS product | `WebApplication`, `SoftwareApplication`, `Organization`, `FAQ` |
| Service business (agency, consulting) | `ProfessionalService`, `Service`, `Organization`, `FAQ` |
| Event venue | `EventVenue`, `Event`, `LocalBusiness` |

---

## JsonLd Component

```tsx
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
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  )
}
```

---

## Schema Generators — `src/lib/seo/structured-data.ts`

```typescript
import { SEO_SITE_URL, SEO_BRAND } from './config'

/** WebSite — place on home page. Enables sitelinks search box. */
export const getWebsiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SEO_BRAND,
  url: SEO_SITE_URL,
})

/** Organization — place on home or about page. */
export const getOrganizationSchema = (params: {
  name: string
  legalName?: string
  description: string
  logo: string
  phone?: string
  email?: string
  address?: { street: string; city: string; region: string; postalCode: string; country: string }
  socialProfiles?: string[]
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: params.name,
  legalName: params.legalName,
  url: SEO_SITE_URL,
  logo: params.logo,
  description: params.description,
  ...(params.phone && { contactPoint: { '@type': 'ContactPoint', telephone: params.phone, contactType: 'customer service', ...(params.email && { email: params.email }) } }),
  ...(params.address && { address: { '@type': 'PostalAddress', streetAddress: params.address.street, addressLocality: params.address.city, addressRegion: params.address.region, postalCode: params.address.postalCode, addressCountry: params.address.country } }),
  ...(params.socialProfiles && { sameAs: params.socialProfiles }),
})

/**
 * LocalBusiness — CRITICAL for local SEO.
 * Place on home page and contact page. Powers Google Maps results and knowledge panel.
 */
export const getLocalBusinessSchema = (params: {
  name: string
  type?: string  // 'ArtGallery', 'FurnitureStore', 'Restaurant', etc.
  description: string
  phone: string
  email?: string
  image: string
  address: { street: string; city: string; region: string; postalCode: string; country: string }
  geo: { latitude: number; longitude: number }
  priceRange?: string  // '$', '$$', '$$$', '$$$$'
  openingHours?: string[]  // ['Mo-Fr 09:00-18:00', 'Sa 10:00-14:00']
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
  address: { '@type': 'PostalAddress', streetAddress: params.address.street, addressLocality: params.address.city, addressRegion: params.address.region, postalCode: params.address.postalCode, addressCountry: params.address.country },
  geo: { '@type': 'GeoCoordinates', latitude: params.geo.latitude, longitude: params.geo.longitude },
  ...(params.openingHours && { openingHours: params.openingHours }),
  ...(params.serviceAreas && { areaServed: params.serviceAreas.map((a) => ({ '@type': a.type, name: a.name })) }),
  ...(params.socialProfiles && { sameAs: params.socialProfiles }),
})

/** BreadcrumbList — helps Google display breadcrumbs in search results. */
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

/** Article — enables rich results with publish date, author, and featured image. */
export const getArticleSchema = (params: {
  title: string
  description: string
  url: string
  image: string
  datePublished: string  // ISO 8601
  dateModified: string   // ISO 8601
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
  author: { '@type': 'Person', name: params.authorName },
  publisher: { '@type': 'Organization', name: SEO_BRAND, url: SEO_SITE_URL },
})

/** FAQPage — enables accordion-style Q&A directly in search results. Significant CTR boost. */
export const getFaqSchema = (questions: Array<{ question: string; answer: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: questions.map((q) => ({
    '@type': 'Question',
    name: q.question,
    acceptedAnswer: { '@type': 'Answer', text: q.answer },
  })),
})

/** Service — for service-based businesses describing a specific offering. */
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
  provider: { '@type': 'LocalBusiness', name: params.providerName || SEO_BRAND, url: SEO_SITE_URL },
  ...(params.serviceAreas && { areaServed: params.serviceAreas.map((a) => ({ '@type': a.type, name: a.name })) }),
})

/** Product — enables price, availability, and rating stars in search results. */
export const getProductSchema = (params: {
  name: string
  description: string
  image: string | string[]
  url: string
  sku?: string
  brand?: string
  price: number
  currency: string  // 'RON', 'EUR', 'USD'
  availability: 'InStock' | 'OutOfStock' | 'PreOrder' | 'BackOrder'
  ratingValue?: number   // 1–5
  reviewCount?: number
  reviews?: Array<{ author: string; rating: number; body: string; datePublished: string }>
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: params.name,
  description: params.description,
  image: params.image,
  url: params.url,
  ...(params.sku && { sku: params.sku }),
  ...(params.brand && { brand: { '@type': 'Brand', name: params.brand } }),
  offers: { '@type': 'Offer', price: params.price, priceCurrency: params.currency, availability: `https://schema.org/${params.availability}`, url: params.url },
  ...(params.ratingValue && params.reviewCount && { aggregateRating: { '@type': 'AggregateRating', ratingValue: params.ratingValue, reviewCount: params.reviewCount } }),
  ...(params.reviews && { review: params.reviews.map((r) => ({ '@type': 'Review', author: { '@type': 'Person', name: r.author }, reviewRating: { '@type': 'Rating', ratingValue: r.rating }, reviewBody: r.body, datePublished: r.datePublished })) }),
})

/** Event — enables rich results with date, location, and ticket info. */
export const getEventSchema = (params: {
  name: string
  description: string
  startDate: string  // ISO 8601
  endDate?: string
  url: string
  image?: string
  location: { name: string; address: { street: string; city: string; region: string; postalCode: string; country: string } }
  performer?: string
  offers?: { price: number; currency: string; availability: 'InStock' | 'SoldOut' | 'PreOrder'; url: string }
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
  location: { '@type': 'Place', name: params.location.name, address: { '@type': 'PostalAddress', streetAddress: params.location.address.street, addressLocality: params.location.address.city, addressRegion: params.location.address.region, postalCode: params.location.address.postalCode, addressCountry: params.location.address.country } },
  ...(params.performer && { performer: { '@type': 'Person', name: params.performer } }),
  ...(params.offers && { offers: { '@type': 'Offer', price: params.offers.price, priceCurrency: params.offers.currency, availability: `https://schema.org/${params.offers.availability}`, url: params.offers.url } }),
  ...(params.organizer && { organizer: { '@type': 'Organization', name: params.organizer } }),
})

/** HowTo — enables step-by-step rich results. Significant visibility boost. */
export const getHowToSchema = (params: {
  name: string
  description: string
  totalTime?: string  // ISO 8601 duration e.g. 'PT30M'
  estimatedCost?: { currency: string; value: number }
  image?: string
  steps: Array<{ name: string; text: string; image?: string }>
}) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: params.name,
  description: params.description,
  ...(params.totalTime && { totalTime: params.totalTime }),
  ...(params.estimatedCost && { estimatedCost: { '@type': 'MonetaryAmount', currency: params.estimatedCost.currency, value: params.estimatedCost.value } }),
  ...(params.image && { image: params.image }),
  step: params.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text, ...(s.image && { image: s.image }) })),
})

/** VideoObject — enables video rich results with thumbnail, duration, and upload date. */
export const getVideoSchema = (params: {
  name: string
  description: string
  thumbnailUrl: string
  uploadDate: string  // ISO 8601
  duration?: string   // ISO 8601 duration e.g. 'PT5M30S'
  contentUrl?: string // Direct video URL
  embedUrl?: string   // YouTube / Vimeo embed URL
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

## Usage Examples

```tsx
// Home page — WebSite + LocalBusiness
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
            address: { street: 'Str. Lipscani 10', city: 'București', region: 'București', postalCode: '030031', country: 'RO' },
            geo: { latitude: 44.4268, longitude: 26.1025 },
            priceRange: '$$',
            openingHours: ['Mo-Fr 10:00-19:00', 'Sa 11:00-17:00'],
            socialProfiles: ['https://www.facebook.com/galeria.x', 'https://www.instagram.com/galeria.x'],
          }),
        ]}
      />
      <main><h1>Galerie de Artă Contemporană în București</h1></main>
    </>
  )
}
```

```tsx
// Blog post — Article + BreadcrumbList
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
      <article><h1>{post.title}</h1></article>
    </>
  )
}
```

---

## Anti-Patterns

```tsx
// ❌ Incomplete LocalBusiness schema — missing address, phone, geo
getLocalBusinessSchema({ name: 'My Biz' })
// ✅ Always include all required fields — incomplete schemas are worse than none

// ❌ Deploying JSON-LD without validation
// ✅ Test every schema at https://search.google.com/test/rich-results before shipping

// ❌ FAQ schema with very long answers (Google shows ~300 chars in rich results)
// ✅ Answer each FAQ in 2–4 sentences. Include keywords naturally in both question AND answer.
```
