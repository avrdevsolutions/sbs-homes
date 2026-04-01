# ADR-0031: Sanity CMS

**Status**: Accepted (opt-in — adopt when the project needs a CMS)
**Date**: 2026-03-31

---

## Context

Some projects need non-developers to create and manage content — blog posts, portfolio projects, case studies, testimonials, events — without code deploys. A headless CMS provides a structured content database with an authoring UI, exposing data via API. The frontend (or backend) queries this API and renders content however it wants.

Sanity v3 is the chosen CMS platform. This ADR covers everything about Sanity as a platform: why Sanity, Studio setup, schema design, content modeling, query language, image CDN, data formats, webhooks, and datasets.

**This ADR does NOT cover how the frontend or backend consumes Sanity data.** Data fetching, adapter patterns, rendering, caching strategies, and route wiring are a separate concern (future CMS Consumption ADR). The boundary is:

| This ADR (Sanity Platform)          | Consumption ADR (Future)                         |
| ----------------------------------- | ------------------------------------------------ |
| Schema definitions in `src/sanity/` | Client setup in `src/lib/sanity/`                |
| GROQ query language & patterns      | Query file organization & co-location            |
| Image CDN URL transforms            | `next/image` integration with Sanity loader      |
| Portable Text data format           | `@portabletext/react` rendering                  |
| Webhook config in Sanity dashboard  | Webhook handler route in Next.js                 |
| Studio setup & embedding            | Draft Mode / Visual Editing                      |
| `sanity typegen` CLI                | Adapter functions (GROQ result → frontend types) |

## Decision

**Sanity v3 as the CMS platform. Content is stored in Sanity's Content Lake and queried via GROQ. Editors use Sanity Studio to create and manage content. The frontend never directly imports Sanity client code — it consumes CMS data through a data-access layer.**

---

## Rules

| Rule                                                                                               | Level        |
| -------------------------------------------------------------------------------------------------- | ------------ |
| All Sanity schema code lives in `src/sanity/`                                                      | **MUST**     |
| Schema type names use kebab-case; field names use camelCase                                        | **MUST**     |
| Schema files organized one-document-type-per-file in `src/sanity/schemas/`                         | **MUST**     |
| Every content document type includes `title`, `slug`, and `seo` fields                             | **MUST**     |
| New content types are sketched as TypeScript type aliases and reviewed before implementing schemas | **MUST**     |
| Slug source is always the `title` field with a max length of 96 characters                         | **MUST**     |
| Shared taxonomies between content types reference the same document type (not duplicated types)    | **MUST**     |
| Image fields always include an `alt` sub-field with `required()` validation                        | **MUST**     |
| GROQ queries use parameter injection (`$slug`) — never string interpolation                        | **MUST**     |
| CMS environment variables validated in `src/lib/env.ts` with Zod (per ADR-0006)                    | **MUST**     |
| Taxonomy document types use flat categories unless hierarchy is explicitly needed                  | **SHOULD**   |
| Self-referencing relationships limit depth to 1 level in GROQ                                      | **SHOULD**   |
| Run `sanity typegen generate` after schema or query changes                                        | **SHOULD**   |
| GROQ queries use projections to select only needed fields                                          | **SHOULD**   |
| Do not model static page copy (heroes, CTAs, section text) in Sanity                               | **MUST NOT** |
| Do not use free-text for slugs — always use `slug` type with `source` option                       | **MUST NOT** |
| Do not create duplicate taxonomy types for content types sharing a classification                  | **MUST NOT** |
| Do not store Sanity API tokens in `NEXT_PUBLIC_*` vars                                             | **MUST NOT** |

---

## Part 1: Why Sanity & When to Use a CMS

### When to Use a CMS

A CMS is needed when:

- Non-developers need to publish, edit, or schedule content without code deploys
- Content has an editorial workflow (draft → review → publish)
- Content velocity matters — blog posts, case studies, testimonials need fast turnaround
- The same content is consumed by multiple surfaces (web, mobile, email)
- The content set is large or growing (50+ items) and needs search/filter/categorization

### When NOT to Use a CMS

Not everything belongs in a CMS:

| Content Type                          | Where                            | Why                            |
| ------------------------------------- | -------------------------------- | ------------------------------ |
| Application state (cart, preferences) | Database (ADR-0011)              | Transactional, per-user        |
| Authentication data                   | Auth provider (ADR-0010)         | Security concern               |
| Feature flags, env config             | Environment variables (ADR-0006) | Runtime behavior, not content  |
| Real-time data (prices, inventory)    | API routes / external service    | Changes too frequently for CMS |
| Design tokens, component config       | `tailwind.config.ts`, code       | Code concern, not editorial    |

### Why Sanity v3

| Factor           | Sanity v3                                                  | Contentful                                          | Strapi                            | Payload CMS                       |
| ---------------- | ---------------------------------------------------------- | --------------------------------------------------- | --------------------------------- | --------------------------------- |
| Query language   | **GROQ** — projection-based joins, no pagination limits    | GraphQL — verbose, multiple queries for nested refs | REST — limited filtering          | Local API — tight DB coupling     |
| Admin UI         | Embeddable in Next.js, fully customizable React components | Hosted web app — no customization                   | Self-hosted — ops burden          | Embedded but requires DB          |
| Real-time collab | Built-in (Google Docs–style presence)                      | Optimistic locking only                             | No built-in                       | No built-in                       |
| Image pipeline   | CDN with on-the-fly transforms (resize, crop, AVIF/WebP)   | Built-in CDN + transforms                           | Local/S3 — manual optimization    | Local/S3 — manual optimization    |
| Rich text        | Portable Text — JSON AST, renderable to any format         | Rich text as HTML blob                              | Rich text as HTML/Markdown        | Lexical/Slate — less portable     |
| Pricing          | Free: 3 users, 500k API CDN requests/month, 20GB bandwidth | Free: 5 users, 25k records limit                    | Free (self-hosted) but ops costs  | Free (self-hosted) but ops costs  |
| TypeScript       | First-class — `sanity typegen` generates types from GROQ   | Codegen from GraphQL schema                         | Partial — community types         | Good — code-first schema          |
| Deployment       | Managed (Content Lake SaaS) — zero infrastructure          | Managed                                             | Self-hosted — DB, server, backups | Self-hosted — DB, server, backups |

### Content Boundary: CMS vs Code

This is a hard boundary, not a spectrum:

| Sanity (dynamic, editor-managed)                | Code (static, deploy-managed)            |
| ----------------------------------------------- | ---------------------------------------- |
| Blog posts, articles                            | Hero headlines, CTA text                 |
| Projects, portfolio items                       | Section labels, specimen text            |
| Case studies                                    | Product descriptions tied to page design |
| Testimonials, reviews                           | Navigation links (if static)             |
| Team member bios                                | Footer copy                              |
| Events, press releases                          | Design tokens, component config          |
| FAQ entries (if editor-managed)                 | FAQ entries (if < 10, static)            |
| Site-wide settings (SEO defaults, social links) | Feature flags (ADR-0006)                 |

Static page copy ships with the build and is outside the CMS concern. Sanity content is fetched at request/build time via the data-access layer.

---

## Part 2: Platform Setup

### Package Inventory

**Core (install when CMS is adopted):**

| Package             | Version | Purpose                                                                   |
| ------------------- | ------- | ------------------------------------------------------------------------- |
| `sanity`            | ^3.x    | Sanity Studio + schema framework + CLI                                    |
| `styled-components` | ^6.x    | Required peer dep of Sanity Studio (Studio UI only, not used in app code) |

**Development tools:**

| Package          | Version | Purpose                         |
| ---------------- | ------- | ------------------------------- |
| `@sanity/vision` | ^3.x    | GROQ query playground in Studio |

**Consumption-layer packages** (`next-sanity`, `@sanity/image-url`, `@portabletext/react`) are documented in the CMS Consumption ADR.

**Installation:**

```bash
pnpm add sanity
pnpm add -D @sanity/vision
```

### Studio Setup

Sanity Studio is a React application that serves as the admin interface where editors create and manage content. It can be embedded in the Next.js app or deployed standalone.

#### Embedded at `/studio` (Default)

The Studio runs inside the Next.js app as a catch-all route. Single deployment, same-origin, shared domain.

```tsx
// src/app/studio/[[...tool]]/page.tsx
'use client'

import { NextStudio } from 'next-sanity/studio'

import config from '../../../../sanity.config'

const StudioPage = () => <NextStudio config={config} />

export default StudioPage
```

```typescript
// sanity.config.ts (project root)
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'

import { schemaTypes } from '@/sanity/schemas'

export default defineConfig({
  name: 'studio',
  title: 'Project Studio',

  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,

  plugins: [
    structureTool(),
    visionTool({ defaultApiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION }),
  ],

  schema: {
    types: schemaTypes,
  },
})
```

```typescript
// sanity.cli.ts (project root)
import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  },
})
```

#### Standalone Studio (Alternative)

For enterprise setups where Studio and frontend are separate deployments:

- Studio runs as its own Sanity-hosted or Vercel-deployed app
- Add CORS origins for the frontend domain in Sanity project management (sanity.io/manage)
- Benefits: independent scaling, separate access control, no Studio bundle in frontend app

This ADR assumes embedded Studio. The schema definitions and GROQ patterns are identical regardless of Studio deployment.

#### Excluding Studio from Middleware

The Studio route must bypass application middleware (security headers, auth guards):

```typescript
// src/middleware.ts — add to matcher exclusion
export const config = {
  matcher: ['/((?!studio|api|_next/static|_next/image|favicon.ico).*)'],
}
```

### File Structure

```
project root/
├── sanity.config.ts              # Studio config (plugins, schema)
├── sanity.cli.ts                 # CLI config (project ID, dataset, typegen)
├── src/
│   ├── sanity/
│   │   ├── env.ts                # Sanity-specific env re-exports from @/lib/env
│   │   ├── schemas/
│   │   │   ├── index.ts          # Schema type array export
│   │   │   ├── post.ts           # Blog post document type
│   │   │   ├── project.ts        # Portfolio project document type
│   │   │   ├── case-study.ts     # Case study document type
│   │   │   ├── testimonial.ts    # Testimonial document type
│   │   │   ├── author.ts         # Author document type
│   │   │   ├── category.ts       # Category document type
│   │   │   ├── tag.ts            # Tag document type
│   │   │   ├── site-settings.ts  # Singleton: global site settings
│   │   │   └── objects/
│   │   │       ├── portable-text.ts  # Reusable rich text field
│   │   │       ├── seo-fields.ts     # Reusable SEO metadata object
│   │   │       └── link.ts          # Internal/external link object
│   │   └── presentation/
│   │       └── resolve.ts        # Document → URL mapping for Presentation Tool (optional)
│   └── app/
│       └── studio/
│           └── [[...tool]]/
│               └── page.tsx      # Embedded Sanity Studio
```

**Consumption-layer files** (`src/lib/sanity/` — client, queries, adapters, image loader, Portable Text renderer) are documented in the CMS Consumption ADR.

### Environment Variables

Add to `src/lib/env.ts` Zod schema (per ADR-0006):

```typescript
const envSchema = z.object({
  // ... existing vars ...

  // --- Sanity CMS ---
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_SANITY_DATASET: z.string().default('production'),
  NEXT_PUBLIC_SANITY_API_VERSION: z.string().default('2026-03-30'),

  // Server-only
  SANITY_API_READ_TOKEN: z.string().min(1),
  SANITY_REVALIDATE_SECRET: z.string().min(32),
})
```

| Variable                         | Prefix         | Visibility      | Why                                                           |
| -------------------------------- | -------------- | --------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`  | `NEXT_PUBLIC_` | Client + Server | Studio needs it in browser. Project ID alone is not a secret. |
| `NEXT_PUBLIC_SANITY_DATASET`     | `NEXT_PUBLIC_` | Client + Server | Studio needs it in browser.                                   |
| `NEXT_PUBLIC_SANITY_API_VERSION` | `NEXT_PUBLIC_` | Client + Server | Determines API behavior.                                      |
| `SANITY_API_READ_TOKEN`          | None           | Server only     | Grants read access to draft content.                          |
| `SANITY_REVALIDATE_SECRET`       | None           | Server only     | Validates webhook signatures. Must never reach client.        |

`.env.example`:

```bash
# --- Sanity CMS ---
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-03-30

# Server-only
SANITY_API_READ_TOKEN=
SANITY_REVALIDATE_SECRET=
```

---

## Part 3: Schema Conventions

### Naming Rules

| Entity             | Convention                    | Example                                        |
| ------------------ | ----------------------------- | ---------------------------------------------- |
| Document type name | kebab-case                    | `case-study`, `blog-post`, `site-settings`     |
| Field name         | camelCase                     | `publishedAt`, `mainImage`, `seoTitle`         |
| Object type name   | kebab-case                    | `portable-text`, `seo-fields`, `internal-link` |
| Schema file name   | kebab-case matching type name | `case-study.ts`, `site-settings.ts`            |

### Required Fields Per Document Type

Every content document type MUST include:

| Field   | Type                          | Purpose                                          |
| ------- | ----------------------------- | ------------------------------------------------ |
| `title` | `string`                      | Human-readable title — Studio list views and SEO |
| `slug`  | `slug` (sourced from `title`) | URL-safe identifier for routing                  |
| `seo`   | `seo-fields` object           | SEO metadata per ADR-0013                        |

Omit `slug` only for singletons and non-page documents (e.g., `author`). Omit `seo` for non-page documents.

Every content document type SHOULD include:

| Field         | Type                         | Purpose                                                      |
| ------------- | ---------------------------- | ------------------------------------------------------------ |
| `publishedAt` | `datetime`                   | Publication date for ordering and display                    |
| `mainImage`   | `image` with `hotspot: true` | Primary visual — card thumbnail, OG image                    |
| `excerpt`     | `text` (max 200 chars)       | Short summary — card descriptions, meta description fallback |

### Schema Definition Pattern

```typescript
// src/sanity/schemas/project.ts
import { defineField, defineType } from 'sanity'

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(200),
    }),
    defineField({
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'string',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
    }),
    defineField({
      name: 'completionDate',
      title: 'Completion Date',
      type: 'datetime',
    }),
    defineField({
      name: 'services',
      title: 'Services',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'service' }] }],
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'category' }] }],
    }),
    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({ name: 'caption', title: 'Caption', type: 'string' }),
          ],
        },
      ],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'portable-text',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo-fields',
    }),
  ],
  preview: {
    select: { title: 'title', media: 'mainImage', subtitle: 'client' },
  },
  orderings: [
    {
      title: 'Published (Newest)',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
})
```

### Reusable Object Types

Object types are field groups embedded inside documents. They have no independent identity — no `_id`, not queryable on their own.

```typescript
// src/sanity/schemas/objects/seo-fields.ts
import { defineField, defineType } from 'sanity'

export const seoFields = defineType({
  name: 'seo-fields',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'string',
      validation: (rule) => rule.max(60),
      description: 'Override the page title for search engines (max 60 chars)',
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(160),
      description: 'Description shown in search results (max 160 chars)',
    }),
    defineField({
      name: 'ogImage',
      title: 'Social Share Image',
      type: 'image',
      description: '1200×630px recommended for Open Graph',
    }),
    defineField({
      name: 'noIndex',
      title: 'Hide from search engines',
      type: 'boolean',
      initialValue: false,
    }),
  ],
})
```

### Singleton Document Pattern

Some content types have exactly one instance (site settings, navigation). Singletons are queried by type:

```groq
*[_type == "site-settings"][0] {
  title,
  description,
  ogImage { asset-> }
}
```

Prevent multiple instances via `structureTool` config in `sanity.config.ts` — remove the type from the default document list and add it as a fixed item in the structure.

```typescript
// src/sanity/schemas/site-settings.ts
import { defineField, defineType } from 'sanity'

export const siteSettings = defineType({
  name: 'site-settings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Site Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Site Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'ogImage',
      title: 'Default Social Share Image',
      type: 'image',
    }),
  ],
})
```

### Schema Registry

```typescript
// src/sanity/schemas/index.ts
import { author } from './author'
import { caseStudy } from './case-study'
import { category } from './category'
import { post } from './post'
import { project } from './project'
import { siteSettings } from './site-settings'
import { tag } from './tag'
import { testimonial } from './testimonial'

import { link } from './objects/link'
import { portableText } from './objects/portable-text'
import { seoFields } from './objects/seo-fields'

export const schemaTypes = [
  // Document types
  post,
  project,
  caseStudy,
  author,
  category,
  tag,
  testimonial,
  siteSettings,
  // Object types
  portableText,
  seoFields,
  link,
]
```

Every schema type MUST be registered here or Studio won't see it.

---

## Part 4: Content Modeling

### Schema-First Design Workflow

Before writing any `defineType()` or `defineField()`, design the content type as a TypeScript type sketch. This ensures the shape is reviewable, relationships are explicit, and the query projection is designed upfront.

**Protocol:**

```
Step 1: Sketch the content type
  Write a TypeScript type alias representing the document shape.
  This is a temporary design artifact — in a PR description, design doc,
  or scratch file. NOT a committed source file — keep in PR description, design doc, or scratch file.

Step 2: Review
  Verify field names follow camelCase.
  Verify relationships are explicit (reference IDs, arrays for collections).
  Verify it includes title, slug, and seo fields.
  Get approval before proceeding.

Step 3: Implement Sanity schema
  Translate the sketch to defineType/defineField code in src/sanity/schemas/.
  Register in schema index.

Step 4: Write GROQ query
  Write the query with a projection matching the sketch shape.

Step 5: Run sanity typegen
  pnpm sanity typegen generate
  Types are auto-generated from the GROQ query projections.
```

Steps beyond this (adapters, route wiring, component integration) are consumption-layer concerns.

**Example sketch:**

```typescript
// Sketch — temporary design artifact, not a file in the project
type Project = {
  id: string
  title: string
  slug: string
  excerpt: string
  publishedAt: string
  client?: string
  location?: string
  completionDate?: string
  mainImage?: { src: string; alt: string; width: number; height: number }
  categories: Array<{ id: string; title: string; slug: string }>
  services: Array<{ id: string; title: string; slug: string }>
  gallery: Array<{ src: string; alt: string; caption?: string }>
  body: PortableTextBlock[] // Rich text
}
```

### Document Types vs Object Types

| Concept           | When to Use                                                                        | Identity                         | Queryable Independently                  |
| ----------------- | ---------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------- |
| **Document type** | Content with its own lifecycle (created, edited, published, deleted independently) | Has `_id`, `_type`, `_createdAt` | Yes — `*[_type == "project"]`            |
| **Object type**   | Reusable field groups embedded inside documents (no independent lifecycle)         | No `_id`                         | No — only accessible via parent document |

**Decision tree:**

```
Is this content created and managed independently by editors?
  │
  ├── YES → Does it need its own listing page or detail page?
  │          ├── YES → Document type (with slug)
  │          └── NO  → Document type (without slug, e.g., 'author', 'site-settings')
  │
  └── NO  → Is the same field group reused across 2+ document types?
             ├── YES → Object type (e.g., 'seo-fields', 'portable-text', 'link')
             └── NO  → Inline fields on the parent document
```

### Singleton vs Collection

| Pattern                  | When                                               | Implementation                                                              |
| ------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------- |
| **Collection** (default) | Multiple instances — posts, projects, testimonials | Normal document type, listed in Studio                                      |
| **Singleton**            | Exactly one instance — site settings, navigation   | structureTool config to prevent duplicates, query as `*[_type == "..."][0]` |

### Type-to-Schema Field Mapping

| TypeScript Type         | Sanity Field Type               | Notes                                       |
| ----------------------- | ------------------------------- | ------------------------------------------- | -------------------------------------- |
| `string`                | `string`                        | Use `text` for multi-line (> 1 line)        |
| `number`                | `number`                        | Add `min`/`max` validation                  |
| `boolean`               | `boolean`                       | Set `initialValue`                          |
| `string` (long)         | `text`                          | Set `rows` for textarea height              |
| `PortableTextBlock[]`   | `portable-text` (custom object) | Rich text, JSON AST                         |
| `string` (enum)         | `string` with `options.list`    | Or separate document type for dynamic lists |
| `string` (ISO date)     | `datetime`                      | ISO 8601                                    |
| image object            | `image` with `hotspot: true`    | Always include `alt` sub-field              |
| `T[]` (inline objects)  | `array` of objects              | Embedded in parent document                 |
| `T[]` (referenced docs) | `array` of `reference`          | Separate document type                      |
| `T` (single reference)  | `reference`                     | `to: [{ type: 'target-type' }]`             |
| `T                      | undefined`                      | field without `required()`                  | Optional fields omit `rule.required()` |

### Relationship Patterns

#### One-to-One

A document has exactly one related document (e.g., a post has one author):

```typescript
defineField({
  name: 'author',
  title: 'Author',
  type: 'reference',
  to: [{ type: 'author' }],
  validation: (rule) => rule.required(),
})
```

GROQ projection:

```groq
"author": author->{ name, "slug": slug.current, image { asset->, alt } }
```

#### One-to-Many (Referenced Documents)

A document has an ordered list of related documents (e.g., a post has many categories):

```typescript
defineField({
  name: 'categories',
  title: 'Categories',
  type: 'array',
  of: [{ type: 'reference', to: [{ type: 'category' }] }],
})
```

GROQ projection:

```groq
"categories": categories[]->{ "id": _id, title, "slug": slug.current }
```

#### One-to-Many (Embedded Objects)

Child data only exists within the parent — no independent identity:

```typescript
defineField({
  name: 'credentials',
  title: 'Credentials',
  type: 'array',
  of: [{ type: 'string' }],
})
```

#### Many-to-Many

Both sides have multiple connections (e.g., posts ↔ tags). Modeled by storing references on one side. Sanity's `references()` function enables reverse lookups:

```groq
// Forward: post → tags
"tags": tags[]->{ "id": _id, title, "slug": slug.current }

// Reverse: tag → posts that reference it
*[_type == "tag" && slug.current == $slug][0] {
  title,
  "posts": *[_type == "post" && references(^._id)] | order(publishedAt desc) {
    "id": _id,
    title,
    "slug": slug.current
  },
  "postCount": count(*[_type == "post" && references(^._id)])
}
```

#### Self-Referencing

A document relates to other documents of the same type (e.g., "related projects"). Always limit depth to 1 level:

```groq
// ✅ Single level
"relatedProjects": *[_type == "project" && _id != ^._id && count(categories[@._ref in ^.^.categories[]._ref]) > 0] | order(publishedAt desc) [0...3] {
  "id": _id, title, "slug": slug.current, mainImage { asset->, alt }
}

// ❌ Recursive — never do this
"related": relatedPosts[]->{ ..., "related": relatedPosts[]->{ ... } }
```

#### Polymorphic References

A field references multiple document types (e.g., a link to either a post or a case study):

```typescript
defineField({
  name: 'reference',
  title: 'Link To',
  type: 'reference',
  to: [{ type: 'post' }, { type: 'case-study' }],
})
```

Include `_type` in the projection for discriminated unions:

```groq
"link": reference->{ "type": _type, "slug": slug.current, title }
```

### Embed vs Reference Decision Tree

```
Does the child data have independent identity?
  ├── YES → Does it appear in 2+ parent types?
  │          ├── YES → Reference (separate document type)
  │          └── NO  → Reference if editors manage it independently
  │                     Embed if always edited in context of parent
  └── NO  → Embed (array of objects or primitives)
```

### Relationship Pattern Decision Tree

```
How many B's per A?
  │
  ├── Exactly 1 → ONE-TO-ONE (reference field)
  │
  └── Many → Does B have independent identity?
              │
              ├── NO  → EMBEDDED OBJECTS (array of objects)
              │
              └── YES → Is B→A also many?
                         │
                         ├── YES → MANY-TO-MANY (references + reverse lookup)
                         └── NO  → ONE-TO-MANY (array of references)

Special cases:
  A relates to A → SELF-REFERENCING (limit depth to 1)
  A relates to B or C → POLYMORPHIC (multi-type reference)
```

---

## Part 5: Taxonomy Design

### Categories vs Tags

| Dimension         | Categories                            | Tags                                        |
| ----------------- | ------------------------------------- | ------------------------------------------- |
| Purpose           | Primary classification — "what type?" | Secondary annotation — "what topics?"       |
| Cardinality       | Few (5-20)                            | Many (20-200+)                              |
| Structure         | Can be hierarchical (parent/child)    | Always flat                                 |
| Assignment        | Usually 1-3 per document              | 1-10 per document                           |
| Editorial control | Tightly curated                       | Loosely curated                             |
| URL route         | Usually has a listing page            | May or may not have one                     |
| Example           | "Windows", "Doors", "Conservatories"  | "Victorian", "Energy Efficient", "Heritage" |

### Taxonomy Decision Tree

```
Is this the PRIMARY organizational axis?
  │
  ├── YES → CATEGORIES
  │         Sub-classifications needed?
  │           ├── YES → Hierarchical (max 2 levels, see below)
  │           └── NO  → Flat categories (default)
  │
  └── NO → Cross-cutting topics/themes?
            │
            ├── YES → TAGS
            │
            └── NO → Fixed set < 5 options?
                      ├── YES → Enum field (string with options.list)
                      └── NO  → TAGS
```

### Flat Categories (Default)

```typescript
// src/sanity/schemas/category.ts
import { defineField, defineType } from 'sanity'

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
    }),
  ],
})
```

### Hierarchical Categories (Max 2 Levels)

Self-referencing with a parent field. **Limit depth to 2 levels.** Deeper hierarchies create Studio UX confusion and complex queries.

```typescript
defineField({
  name: 'parent',
  title: 'Parent Category',
  type: 'reference',
  to: [{ type: 'category' }],
  // Optional — only set for child categories
})
```

GROQ — category with parent and children:

```groq
*[_type == "category" && slug.current == $slug][0] {
  "id": _id,
  title,
  "slug": slug.current,
  "parent": parent->{ "id": _id, title, "slug": slug.current },
  "children": *[_type == "category" && parent._ref == ^._id] {
    "id": _id, title, "slug": slug.current
  }
}
```

### Tags

```typescript
// src/sanity/schemas/tag.ts
import { defineField, defineType } from 'sanity'

export const tag = defineType({
  name: 'tag',
  title: 'Tag',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
  ],
})
```

### Shared Taxonomy Across Content Types

When multiple content types share a taxonomy, they MUST reference the **same** document type:

```typescript
// ✅ Both reference the same 'category' type
// In project schema:
defineField({
  name: 'categories',
  type: 'array',
  of: [{ type: 'reference', to: [{ type: 'category' }] }],
})

// In post schema:
defineField({
  name: 'categories',
  type: 'array',
  of: [{ type: 'reference', to: [{ type: 'category' }] }],
})

// ❌ Separate taxonomy types per content type — data duplication, sync nightmares
```

### Taxonomy Anti-Patterns

| Anti-Pattern                                       | Why It's Wrong                                    | Correct Pattern                       |
| -------------------------------------------------- | ------------------------------------------------- | ------------------------------------- |
| Free-text category field (plain `string`)          | No referential integrity, typos create duplicates | Reference to `category` document type |
| 3+ levels of hierarchy                             | Studio UX confusion, complex queries              | Max 2 levels                          |
| Tags without slugs                                 | Can't create listing pages, no SEO value          | Always include `slug`                 |
| Separate taxonomy types for shared classifications | Duplicated data, out-of-sync                      | Single shared document type           |
| `array of string` for categories                   | Not referenceable, no reverse lookup              | Reference to document type            |

---

## Part 6: Slug Strategy

### Slug Rules

| Rule         | Value                                                                 |
| ------------ | --------------------------------------------------------------------- |
| Source field | `title` (always)                                                      |
| Max length   | 96 characters                                                         |
| Format       | Lowercase, hyphen-separated, no special characters                    |
| Uniqueness   | Enforced by Sanity's `slug` type (unique per document type)           |
| Immutability | Slugs SHOULD NOT change after publication — SEO impact (ADR-0013)     |
| Required     | All content document types with public pages MUST have a `slug` field |

### Slug Field Pattern

```typescript
defineField({
  name: 'slug',
  title: 'Slug',
  type: 'slug',
  options: {
    source: 'title',
    maxLength: 96,
    slugify: (input: string) =>
      input
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 96),
  },
  validation: (rule) => rule.required(),
})
```

### Slug Change Protocol

When a slug must change after publication:

1. Create a 301 redirect from old slug → new slug (in `next.config.js` or CMS redirect document)
2. Update the Sanity document's slug
3. Verify the redirect works
4. Monitor Search Console for crawl errors per ADR-0013

---

## Part 7: GROQ Query Language

GROQ (Graph-Relational Object Queries) is Sanity's query language. It supports filtering, projection, joins, sorting, and slicing in a single expression.

### Query Anatomy

```groq
*[_type == "post" && defined(slug.current)]  // Filter
  | order(publishedAt desc)                   // Sort
  [0...10]                                    // Slice
  {                                            // Projection
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    excerpt,
    mainImage { asset->, hotspot, crop, alt },
    "author": author->{ name, "slug": slug.current },
    "categories": categories[]->{ _id, title, "slug": slug.current }
  }
```

- `*` — all documents
- `[filter]` — constraint
- `| order(field direction)` — sort
- `[start...end]` — slice (exclusive end)
- `{ projection }` — select fields
- `->` — dereference a reference (join)
- `@` — current item in scope

### Type Generation with `sanity typegen`

GROQ queries should be wrapped in `defineQuery()` (from `next-sanity` or `groq`) for automatic TypeScript type generation:

```typescript
import { defineQuery } from 'next-sanity'

export const POSTS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    _id, title, "slug": slug.current, publishedAt, excerpt,
    mainImage { asset->, alt }
  }
`)
```

Generate types:

```bash
pnpm sanity typegen generate
```

This produces a `sanity.types.ts` file with types inferred from query projections. Run after every schema or query change.

TypeGen configuration in `sanity.cli.ts`:

```typescript
export default defineCliConfig({
  api: { ... },
  typescript: {
    generateTypes: {
      extractSchemaTypes: true,
    },
  },
})
```

### GROQ Rules

| Rule                                                    | Why                                                              |
| ------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| Always use projections `{ field1, field2 }`             | Prevents over-fetching. Reduces payload. Enables type inference. |
| Dereference in projection: `"author": author->{ name }` | Avoids N+1 client-side fetches.                                  |
| Use `defined(slug.current)` in filters                  | Excludes documents with no slug (drafts, incomplete).            |
| Use `$paramName` for dynamic values                     | Prevents GROQ injection. Parameters are escaped automatically.   |
| Limit arrays: `[0...10]`                                | Prevents unbounded result sets.                                  |
| Use `                                                   | order(field desc)` before slicing                                | Ensures consistent ordering across cache hits. |
| Wrap queries in `defineQuery()`                         | Required for type generation.                                    |

### GROQ Anti-Patterns

```groq
// ❌ No projection — fetches EVERYTHING
*[_type == "post"][0]

// ✅ Project only what you need
*[_type == "post"][0] { _id, title, "slug": slug.current, body }

// ❌ String interpolation — GROQ injection risk
`*[_type == "post" && slug.current == "${slug}"]`

// ✅ Parameters — safe, escaped automatically
*[_type == "post" && slug.current == $slug]

// ❌ Client-side filtering
const allPosts = await fetch(ALL_POSTS)
const filtered = allPosts.filter(p => p.category === 'news')

// ✅ Filter in GROQ — executed server-side in Content Lake
*[_type == "post" && "news" in categories[]->slug.current]

// ❌ N+1 fetches
const post = await fetch(POST_QUERY)
const author = await fetch(`*[_id == "${post.authorId}"]`)

// ✅ Dereference in projection — single query
*[_type == "post" && slug.current == $slug][0] {
  ..., "author": author->{ name, image }
}
```

---

## Part 8: Image CDN

Sanity's Content Lake includes an image CDN with on-the-fly transforms. Editors upload images via Studio, and consumers request optimized versions via URL parameters.

### URL Transform Parameters

Base URL format: `https://cdn.sanity.io/images/{projectId}/{dataset}/{imageId}.{ext}`

| Parameter | Example             | Purpose                                                            |
| --------- | ------------------- | ------------------------------------------------------------------ |
| `w`       | `?w=800`            | Width in pixels                                                    |
| `h`       | `?h=600`            | Height in pixels                                                   |
| `fit`     | `?fit=crop`         | Fit mode: `clip`, `crop`, `fill`, `fillmax`, `max`, `scale`, `min` |
| `auto`    | `?auto=format`      | Serve WebP/AVIF where supported (30-50% smaller)                   |
| `q`       | `?q=80`             | Quality (1-100)                                                    |
| `rect`    | `?rect=0,0,500,500` | Crop coordinates                                                   |

**Always append `auto=format`** to serve modern formats. Always set `w` to prevent serving multi-megabyte originals.

### Hotspot & Crop

Editors define a focal point (hotspot) and crop region in Studio. The `@sanity/image-url` builder respects these automatically when generating URLs with `fit=crop`. The hotspot ensures the most important part of the image is preserved when cropped to different aspect ratios.

### Responsive Images

For responsive layouts, generate URLs at multiple widths. The consumption layer can use these with `srcset`:

```
# Same image at different widths
https://cdn.sanity.io/images/.../image.jpg?w=400&auto=format
https://cdn.sanity.io/images/.../image.jpg?w=800&auto=format
https://cdn.sanity.io/images/.../image.jpg?w=1200&auto=format
```

### `next.config.js` Remote Pattern

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },
}

module.exports = nextConfig
```

### Image Anti-Patterns

| Anti-Pattern                                     | Correct Pattern                                             |
| ------------------------------------------------ | ----------------------------------------------------------- |
| No `auto=format` — serves original JPEG/PNG      | Always append `auto=format`                                 |
| No width constraint — serves 6000×4000 originals | Always set `w` parameter                                    |
| Missing `alt` text on image fields               | Always include `alt` sub-field with `required()` validation |
| Hardcoded CDN URLs in content                    | Let `@sanity/image-url` build URLs from asset references    |

---

## Part 9: Portable Text Format

Portable Text is Sanity's rich text format — a JSON AST (Abstract Syntax Tree) that represents structured content as an array of typed blocks. Unlike HTML, it's a structured data format that can be rendered to any output: React, email HTML, Markdown, plain text.

### What GROQ Returns

A Portable Text field returns a JSON array:

```json
[
  {
    "_type": "block",
    "style": "h2",
    "children": [{ "_type": "span", "text": "The Challenge" }]
  },
  {
    "_type": "block",
    "style": "normal",
    "children": [
      { "_type": "span", "text": "The original windows were " },
      { "_type": "span", "text": "severely damaged", "marks": ["strong"] },
      { "_type": "span", "text": " by decades of exposure." }
    ]
  },
  {
    "_type": "image",
    "asset": { "_ref": "image-abc123-800x600-jpg" },
    "alt": "Detail of damaged sash window frame"
  }
]
```

**There is no HTML, no CSS, no styling.** The consuming application decides how each block type, style, and mark renders. This is why Portable Text is portable — the same content can render differently on web, mobile, and email.

### Schema Definition

```typescript
// src/sanity/schemas/objects/portable-text.ts
import { defineArrayMember, defineType } from 'sanity'

export const portableText = defineType({
  name: 'portable-text',
  title: 'Rich Text',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'H2', value: 'h2' },
        { title: 'H3', value: 'h3' },
        { title: 'H4', value: 'h4' },
        { title: 'Quote', value: 'blockquote' },
      ],
      marks: {
        decorators: [
          { title: 'Bold', value: 'strong' },
          { title: 'Italic', value: 'em' },
          { title: 'Code', value: 'code' },
        ],
        annotations: [
          {
            name: 'link',
            type: 'object',
            title: 'Link',
            fields: [
              {
                name: 'href',
                type: 'url',
                title: 'URL',
                validation: (rule) =>
                  rule.uri({ allowRelative: true, scheme: ['http', 'https', 'mailto'] }),
              },
              {
                name: 'openInNewTab',
                type: 'boolean',
                title: 'Open in new tab',
                initialValue: false,
              },
            ],
          },
          {
            name: 'internalLink',
            type: 'object',
            title: 'Internal Link',
            fields: [
              {
                name: 'reference',
                type: 'reference',
                to: [{ type: 'post' }, { type: 'case-study' }, { type: 'project' }],
              },
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'alt', type: 'string', title: 'Alt Text', validation: (rule) => rule.required() },
        { name: 'caption', type: 'string', title: 'Caption' },
      ],
    }),
  ],
})
```

### Block Structure Summary

| Block Type | Purpose                                 | Styles Available                         |
| ---------- | --------------------------------------- | ---------------------------------------- |
| `block`    | Text paragraphs, headings, quotes       | `normal`, `h2`, `h3`, `h4`, `blockquote` |
| `image`    | Inline images with alt text and caption | N/A                                      |

| Mark Type   | Purpose                             | Examples                                                   |
| ----------- | ----------------------------------- | ---------------------------------------------------------- |
| Decorators  | Inline formatting                   | `strong`, `em`, `code`                                     |
| Annotations | Inline metadata (links, references) | `link` (external URL), `internalLink` (document reference) |

The consumption layer renders these with `@portabletext/react`, mapping each block type and mark to React components using the project's Typography primitives.

---

## Part 10: Webhooks & Environments

### Webhook Configuration

Webhooks notify the consuming application when content changes in Sanity. Configure in **sanity.io/manage → Project → API → Webhooks**:

| Setting     | Value                                              |
| ----------- | -------------------------------------------------- |
| URL         | `https://your-domain.com/api/revalidate`           |
| Trigger on  | Create, Update, Delete                             |
| Filter      | Leave empty (all types) or scope to specific types |
| Projection  | `{ _type, slug }`                                  |
| HTTP method | POST                                               |
| Secret      | Same value as `SANITY_REVALIDATE_SECRET` env var   |

The webhook sends a POST request with:

- The projected document data in the body
- A signature header for verification

The consuming application's webhook handler (documented in the CMS Consumption ADR) validates the signature and triggers cache revalidation.

### Multi-Environment Datasets

Sanity datasets are isolated content databases within a project:

| Dataset       | Purpose                      | `useCdn` |
| ------------- | ---------------------------- | -------- |
| `production`  | Live content served to users | `true`   |
| `staging`     | Content preview, QA testing  | `false`  |
| `development` | Local dev, experiments       | `false`  |

Switch datasets via environment variable:

```bash
# .env.development
NEXT_PUBLIC_SANITY_DATASET=development

# .env.production
NEXT_PUBLIC_SANITY_DATASET=production
```

### Dataset Migration

```bash
# Export from production
pnpm sanity dataset export production production-backup.tar.gz

# Import into staging
pnpm sanity dataset import production-backup.tar.gz staging --replace
```

---

## Part 11: Internationalization

If the project requires multilingual content:

**Option A: Field-Level Translation (Simple)** — Add locale-specific fields (`title`, `titleRo`). Use when: 2-3 languages, few translated fields.

**Option B: Document-Level Translation (Scalable)** — Use `@sanity/document-internationalization` plugin for separate documents per locale. Use when: 4+ languages, full translation, editorial workflow per locale.

**Option C: No i18n (Default)** — Single-language content. Add i18n only when explicitly requested.

---

## Anti-Patterns

| Anti-Pattern                                                | Why It's Wrong                                        | Correct Pattern                             |
| ----------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------- |
| Modeling static page copy (heroes, CTAs) in Sanity          | Unnecessary CMS overhead for deploy-managed content   | Keep as static code — not CMS-managed       |
| Creating schema from verbal description without type sketch | Shape mismatches surface late, no reviewable artifact | Schema-first workflow (Part 4)              |
| Free-text slugs without validation                          | Duplicates, special characters, SEO damage            | `slug` type with `source` + `slugify`       |
| Deep self-referencing in GROQ (related → related → related) | Exponential payload, unbounded queries                | Limit to 1 level of depth                   |
| Separate taxonomy types for same classification             | Data duplication, sync nightmares                     | Single shared reference target              |
| `array of string` for classifications                       | No referential integrity, no reverse lookup           | Reference to document type                  |
| No projection in GROQ query                                 | Over-fetching, large payloads, slow queries           | Always use `{ field1, field2 }` projections |
| String interpolation in GROQ                                | GROQ injection risk                                   | Use `$paramName` parameters                 |
| Missing `alt` text validation on image fields               | Accessibility violation (ADR-0019)                    | `validation: (rule) => rule.required()`     |
| Not registering schema in index                             | Type exists on disk but Studio doesn't see it         | Always add to `src/sanity/schemas/index.ts` |
| Changing slugs after publication without redirects          | Broken links, SEO rank loss, 404 errors               | Create 301 redirect first (ADR-0013)        |
| Hierarchical categories deeper than 2 levels                | Studio UX confusion, complex queries                  | Start flat, add 1 level of nesting max      |
| Storing API tokens in `NEXT_PUBLIC_*` vars                  | Token exposed in client bundle                        | Server-only env var                         |
| Images without `auto=format`                                | Serves unoptimized formats                            | Always append `auto=format` to CDN URLs     |

---

## Cross-References

| ADR                                 | Relationship                                                 |
| ----------------------------------- | ------------------------------------------------------------ |
| [ADR-0006](./0006-environment.md)   | All CMS env vars validated in `src/lib/env.ts` with Zod      |
| [ADR-0008](./0008-middleware.md)    | Exclude `/studio` from middleware matcher                    |
| [ADR-0013](./0013-seo-metadata.md)  | `seo-fields` object type, slug change → redirect requirement |
| [ADR-0019](./0019-accessibility.md) | Image alt text required on all CMS image fields              |
| [ADR-0029](./0029-seo-strategy.md)  | Keyword strategy alignment with content types                |
