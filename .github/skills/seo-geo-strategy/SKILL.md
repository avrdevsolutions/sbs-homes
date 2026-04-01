---
name: seo-geo-strategy
description: >-
  Multi-location SEO architecture — when to create dedicated location pages,
  service×city [service]/[city] route with generateStaticParams and per-city
  generateMetadata, geo-data.ts Location and Service types, ServiceArea schema
  for businesses without a physical presence in a city, duplicate content rules
  (200-word unique minimum per location page, per-element uniqueness table).
  Use when building location landing pages, creating a service×city URL matrix,
  setting up generateStaticParams for pre-rendered location pages, or wiring
  per-city JSON-LD schemas for a multi-location or multi-city service business.
---

# SEO — Geo-Targeting & Location Page Architecture

**Compiled from**: ADR-0029 §Multi-Location Geo-Targeting
**Last synced**: 2026-03-27

---

## When to Create Dedicated Location Pages

A single `LocalBusiness` JSON-LD on the home page is sufficient when:
- The business has **one** physical location
- It serves only the immediate area (e.g., a neighborhood restaurant)

You need **dedicated location pages** when:
- The business serves multiple cities (e.g., a furniture workshop in Cluj, București, Timișoara)
- The business has multiple physical locations
- The client wants to rank for `[service] + [city]` combinations

---

## Service × City Architecture

```
/servicii/mobilier-la-comanda              → "mobilier la comandă România"
/servicii/mobilier-la-comanda/bucuresti    → "mobilier la comandă bucurești"
/servicii/mobilier-la-comanda/cluj-napoca  → "mobilier la comandă cluj-napoca"
/servicii/mobilier-la-comanda/timisoara    → "mobilier la comandă timișoara"
```

**File structure:**

```
src/app/
  servicii/
    [service]/
      page.tsx           # Service overview (national)
      [city]/
        page.tsx         # Service + city landing page
```

---

## Implementation Pattern

```tsx
// src/app/servicii/[service]/[city]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/ui/json-ld'
import { canonicalUrl, SEO_SITE_URL } from '@/lib/seo/config'
import { getLocalBusinessSchema, getServiceSchema, getBreadcrumbSchema } from '@/lib/seo/structured-data'
import { LOCATIONS, SERVICES } from '@/lib/seo/geo-data'

type Props = { params: Promise<{ service: string; city: string }> }

export const generateStaticParams = async () =>
  SERVICES.flatMap((service) =>
    LOCATIONS.map((location) => ({ service: service.slug, city: location.slug })),
  )

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
    alternates: { canonical: canonicalUrl(`/servicii/${service}/${city}`) },
    openGraph: { title, description, url: canonicalUrl(`/servicii/${service}/${city}`) },
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
        <h1>{serviceData.name} în {locationData.name}</h1>
        {/* Location-specific content — MUST be unique per city (see below) */}
      </main>
    </>
  )
}
```

---

## Geo Data File

```typescript
// src/lib/seo/geo-data.ts
export type Location = {
  slug: string
  name: string
  phone: string
  address: { street: string; city: string; region: string; postalCode: string; country: string }
  geo: { latitude: number; longitude: number }
  /** City-specific content — REQUIRED to avoid duplicate content penalty */
  localContent: {
    intro: string       // Unique opening paragraph for this city
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

export const LOCATIONS: Location[] = [
  {
    slug: 'bucuresti',
    name: 'București',
    phone: '+40 721 000 001',
    address: { street: 'Str. Exemplu Nr. 10', city: 'București', region: 'București', postalCode: '010001', country: 'RO' },
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

---

## ServiceArea Schema — No Physical Location in That City

When a business serves a city remotely (no storefront), use `areaServed` on the main `LocalBusiness` schema instead of a full per-city schema:

```typescript
getLocalBusinessSchema({
  // ...main location details...
  serviceAreas: [
    { name: 'București', type: 'City' },
    { name: 'Cluj-Napoca', type: 'City' },
    { name: 'Timișoara', type: 'City' },
  ],
})
```

---

## Duplicate Content — The #1 Multi-Location Trap

Google penalizes pages that are essentially the same with only the city name swapped. Each location page **must** have unique content:

| Element | Unique per city? | How |
|---|---|---|
| H1 heading | Yes | `[Service] în [City]` |
| Intro paragraph (100+ words) | **Yes** | City-specific context, landmarks, local references |
| Testimonials | Yes | Client testimonials from that city |
| Portfolio / gallery images | Yes | Projects completed in that city |
| Service description | Shared (OK) | Core description can be identical |
| FAQ section | **Yes** | City-specific questions (parking, delivery, showroom hours) |
| Contact info | Yes | Location-specific phone, address, hours |

**Minimum unique content per location page: 200 words that don't appear on any other location page.**

> This skill covers location page architecture and duplicate content rules. Keyword cluster strategy, content patterns (heading hierarchy, word counts, internal linking, FAQ sections), and blog templates are covered in a separate SEO content strategy skill.
