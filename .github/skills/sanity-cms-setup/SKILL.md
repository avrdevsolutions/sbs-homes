---
name: sanity-cms-setup
description: >-
  Sanity v3 platform setup — when to use CMS vs static content, CMS vs Code boundary table,
  package inventory (sanity, @sanity/vision, styled-components peer dep), Studio embedding in
  Next.js (sanity.config.ts, sanity.cli.ts, catch-all route), file structure under src/sanity/
  and project root, environment variables (Zod schema, variable table, .env.example), middleware
  exclusion, webhook config reference, multi-environment datasets and migration commands, i18n
  strategy options (field-level, document-level, none). Use when setting up Sanity CMS for the
  first time, modifying Sanity Studio config, adding Sanity environment variables, configuring
  Sanity datasets, excluding the Sanity Studio route from middleware, or deciding whether content
  belongs in Sanity or stays as static code.
---

# Sanity CMS — Platform Setup

**Compiled from**: ADR-0031 §Parts 1, 2, 10, 11
**Last synced**: 2026-03-31

---

## When to Use a CMS vs Static Content

Use **Sanity** when:

- Non-developers need to publish/edit content without code deploys
- Content has an editorial workflow (draft → review → publish)
- Content velocity matters (blog posts, case studies, testimonials)
- Same content surfaces on multiple channels (web, mobile, email)
- Content set is large or growing (50+ items requiring search/filter/categorization)

Use **static code** when:

- Content only changes with code deploys (heroes, CTAs, section text, navigation)
- A developer is always the one making the change anyway

### CMS vs Code Boundary

| Sanity (dynamic, editor-managed)                | Static code (deploy-managed)             |
| ----------------------------------------------- | ---------------------------------------- |
| Blog posts, articles                            | Hero headlines, CTA text                 |
| Projects, portfolio items                       | Section labels, specimen text            |
| Case studies                                    | Product descriptions tied to page design |
| Testimonials, reviews                           | Navigation links (if static)             |
| Team member bios                                | Footer copy                              |
| Events, press releases                          | Design tokens, component config          |
| FAQ entries (if editor-managed)                 | FAQ entries (if < 10, static)            |
| Site-wide settings (SEO defaults, social links) | Feature flags                            |

Static page copy ships with the build and has **zero connection** to Sanity. Sanity content is fetched at request/build time via the data-access layer.

---

## Package Inventory

**Core (install when CMS is adopted):**

```bash
pnpm add sanity
pnpm add -D @sanity/vision
```

| Package          | Purpose                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `sanity`         | Studio framework, schema DSL (`defineType`, `defineField`), CLI (`sanity typegen`, `sanity deploy`) |
| `@sanity/vision` | GROQ query playground in Studio (dev tool)                                                          |

> Sanity Studio requires `styled-components` as a peer dep. If pnpm warns, run `pnpm add styled-components`. This is Studio-only — do **not** use `styled-components` in application code.

**Consumption-layer packages** (`next-sanity`, `@sanity/image-url`, `@portabletext/react`) are installed when building the data-access layer — **not during platform setup**.

---

## Studio Embedding in Next.js

The Studio runs inside the Next.js app as a catch-all route at `/studio`.

### `sanity.config.ts` (project root)

```typescript
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
  schema: { types: schemaTypes },
})
```

### `sanity.cli.ts` (project root)

```typescript
import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  },
  studioHost: 'project-name', // Used by `sanity deploy` for hosted Studio URL
  typescript: {
    generateTypes: { extractSchemaTypes: true },
  },
})
```

### Studio Route (`src/app/studio/[[...tool]]/page.tsx`)

```tsx
'use client'

import { NextStudio } from 'next-sanity/studio'
import config from '../../../../sanity.config'

const StudioPage = () => <NextStudio config={config} />

export default StudioPage
```

> This file requires `next-sanity`. Install with `pnpm add next-sanity`.

### Middleware Exclusion

The Studio route MUST be excluded from application middleware:

```typescript
// src/middleware.ts
export const config = {
  matcher: ['/((?!studio|api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## File Structure

```
project root/
├── sanity.config.ts              # Studio config (plugins, schema)
├── sanity.cli.ts                 # CLI config (project ID, dataset, typegen)
└── src/
    ├── sanity/
    │   ├── env.ts                # Sanity-specific env re-exports
    │   ├── schemas/
    │   │   ├── index.ts          # Schema type array — ALL types registered here
    │   │   ├── post.ts           # Blog post document type
    │   │   ├── project.ts        # Portfolio project document type
    │   │   ├── category.ts       # Category taxonomy
    │   │   ├── site-settings.ts  # Singleton: global site settings
    │   │   └── objects/
    │   │       ├── portable-text.ts  # Reusable rich text field
    │   │       ├── seo-fields.ts     # Reusable SEO metadata object
    │   │       └── link.ts           # Internal/external link object
    │   └── presentation/
    │       └── resolve.ts        # Document → URL mapping (Presentation Tool, optional)
    └── app/
        └── studio/
            └── [[...tool]]/
                └── page.tsx      # Embedded Sanity Studio
```

### `src/sanity/env.ts`

```typescript
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-03-30'
```

---

## Environment Variables

Add to the Zod schema in `src/lib/env.ts`:

```typescript
const envSchema = z.object({
  // ... existing vars ...
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_SANITY_DATASET: z.string().default('production'),
  NEXT_PUBLIC_SANITY_API_VERSION: z.string().default('2026-03-30'),
  SANITY_API_READ_TOKEN: z.string().min(1),
  SANITY_REVALIDATE_SECRET: z.string().min(32),
})
```

| Variable                         | NEXT*PUBLIC* | Why                                        |
| -------------------------------- | ------------ | ------------------------------------------ |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`  | Yes          | Studio needs it in the browser             |
| `NEXT_PUBLIC_SANITY_DATASET`     | Yes          | Studio needs it in the browser             |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Yes          | Controls API behavior                      |
| `SANITY_API_READ_TOKEN`          | **No**       | Server-only — grants draft content access  |
| `SANITY_REVALIDATE_SECRET`       | **No**       | Server-only — validates webhook signatures |

`.env.example` (committed, no secrets):

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-03-30
SANITY_API_READ_TOKEN=
SANITY_REVALIDATE_SECRET=
```

---

## Webhook Config Reference

Configure at sanity.io/manage → Project → Settings → API → Webhooks:

| Setting     | Value                                            |
| ----------- | ------------------------------------------------ |
| URL         | `https://your-domain.com/api/revalidate`         |
| Trigger on  | Create, Update, Delete                           |
| Filter      | Leave empty (all types)                          |
| Projection  | `{ _type, _id, slug }`                           |
| HTTP method | POST                                             |
| Drafts      | Disabled                                         |
| Secret      | Same value as `SANITY_REVALIDATE_SECRET` env var |

Sanity sends a POST to your revalidation endpoint with the projected document data and a signature header. The Next.js webhook handler validates the signature and triggers cache revalidation.

---

## Multi-Environment Datasets

| Dataset       | Purpose                       | `useCdn` |
| ------------- | ----------------------------- | -------- |
| `production`  | Live content served to users  | `true`   |
| `staging`     | QA / preview content          | `false`  |
| `development` | Schema experiments, local dev | `false`  |

```bash
# Create additional datasets
pnpm sanity dataset create development
pnpm sanity dataset create staging

# Migrate data between datasets
pnpm sanity dataset export production production-backup.tar.gz
pnpm sanity dataset import production-backup.tar.gz staging --replace
```

Switch datasets via environment variable:

```bash
# .env.development
NEXT_PUBLIC_SANITY_DATASET=development
```

> Start with `production` only. Create `development` and `staging` when the workflow requires them — not upfront.

---

## Internationalization Options

**Option A — Field-Level Translation (Simple)**: Add locale-specific fields (`title`, `titleRo`). Use when: 2–3 languages, few translated fields.

**Option B — Document-Level Translation (Scalable)**: Use `@sanity/document-internationalization` plugin for separate documents per locale. Use when: 4+ languages, full editorial workflow per locale.

**Option C — No i18n (Default)**: Single-language content. Add i18n only when explicitly requested.
