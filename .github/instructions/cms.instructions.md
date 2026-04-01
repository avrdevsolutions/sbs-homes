---
applyTo: 'src/lib/sanity/**/*.{ts,tsx}, src/sanity/**/*.ts, src/app/api/revalidate/**/*.ts, src/app/api/draft-mode/**/*.ts, src/app/api/cms/**/*.ts, src/app/studio/**/*.tsx, sanity.config.ts, sanity.cli.ts'
---

# CMS (Sanity) Constraints

## File Organization

- All integration code (client, queries, image builder, portable-text renderer) MUST live in `src/lib/sanity/`
- All schema definitions and Studio helpers MUST live in `src/sanity/`
- Schema files MUST NOT be imported by app code — they define the CMS data model only
- GROQ queries MUST be co-located in `src/lib/sanity/queries/` — one file per content domain

## Data Fetching

- MUST use the `sanityFetch` wrapper — MUST NOT call `client.fetch()` directly in pages
- MUST fetch CMS data in Server Components only — MUST NOT fetch in Client Components (except via `SanityLive` in draft mode)
- MUST handle missing CMS data with `notFound()` — MUST NOT render empty pages for null responses

## GROQ Queries

- Every GROQ query MUST be wrapped in `defineQuery()` for type inference
- MUST use `$paramName` for dynamic values — MUST NOT interpolate strings into GROQ queries (injection risk)
- MUST use projections `{ field1, field2 }` — MUST NOT fetch full documents without field selection
- MUST limit result sets with `[0...N]` — MUST NOT fetch unbounded arrays
- SHOULD dereference in the projection (`"author": author->{ name }`) — avoid N+1 client-side fetches

## Schema Conventions

- Document type names MUST be kebab-case (`blog-post`, `case-study`)
- Field names MUST be camelCase (`publishedAt`, `mainImage`)
- MUST have one schema file per document type in `src/sanity/schemas/`
- Every schema type MUST be registered in `src/sanity/schemas/index.ts`
- Every content document type MUST include `title`, `slug`, and `seo` (seo-fields object) fields
- SHOULD run `sanity typegen generate` after schema changes to regenerate types

## Schema Design

- MUST NOT model static page copy (heroes, CTAs, section text, navigation) in Sanity — these are deploy-managed, not editorial
- Slug source MUST always be the `title` field with `maxLength: 96`
- MUST use the `slug` type with a `source` option — MUST NOT use a plain `string` field for slugs
- Shared taxonomies between content types MUST reference the same document type — MUST NOT create separate taxonomy types per content type
- New content types MUST be sketched as TypeScript type aliases and reviewed before implementing schemas

## Caching

- `next.tags` and `next.revalidate` are mutually exclusive in Next.js — when tags are set, `revalidate` MUST be `false`
- Tag-based revalidation SHOULD be preferred over time-based for Sanity CMS content
- `defineLive` and manual `sanityFetch` MUST NOT be mixed in the same project — choose one strategy and apply consistently

## Client-Side CMS Data

- Client-side CMS data MUST go via a Route Handler proxy (`src/app/api/cms/`) — MUST NOT call the Sanity API directly from client components
- Route Handler responses MUST NOT expose `SANITY_API_READ_TOKEN` in JSON output
- Client-side CMS queries MUST use TanStack Query with Zod validation in `queryFn`

## Security

- `SANITY_API_READ_TOKEN` MUST NOT use `NEXT_PUBLIC_` prefix — server-only
- `SANITY_REVALIDATE_SECRET` MUST NOT use `NEXT_PUBLIC_` prefix — server-only
- Webhook revalidation handler MUST validate signatures via `parseBody` before calling `revalidateTag`
- `parseBody` third argument (`waitForContentLakeEvent`) MUST be `true` when `useCdn: true` — prevents stale CDN reads
- All CMS env vars MUST be accessed through `@/lib/env` only (per ADR-0006)
- API tokens for application use MUST be robot tokens — MUST NOT use personal CLI tokens (`sanity login` tokens)
- CORS origins for any domain hosting an embedded Studio MUST have **Allow credentials** enabled

## Metadata & SEO

- `stega: false` MUST be passed to `sanityFetch` in every `generateMetadata` call
- `stega: false` MUST be passed in `generateStaticParams` — use `perspective: 'published'`
- MUST NOT use stega-encoded strings in `<title>`, `<meta>`, or JSON-LD fields

## Rendering

- Portable Text MUST be rendered with `@portabletext/react` and the project component map — MUST NOT use `dangerouslySetInnerHTML`
- Portable Text block styles MUST map to project Typography primitives
- CMS images MUST be rendered through `next/image` with Sanity loader — MUST NOT use bare `<img>` tags
- MUST always call `.auto('format')` on image URL builder — serves WebP/AVIF
- MUST always constrain image dimensions — MUST NOT serve unconstrained originals
- Image `alt` fields MUST have `validation: (rule) => rule.required()` in the schema
