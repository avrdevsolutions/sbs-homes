---
name: sanity-cms-groq
description: >-
  GROQ query language patterns for Sanity — query anatomy with annotated components (filter, sort,
  slice, projection, dereference operator ->, current-item @, parent-scope ^, count/defined/
  references functions), defineQuery() for automatic TypeScript type generation, sanity typegen
  CLI config in sanity.cli.ts and generate command, GROQ rules table (projections required,
  parameter injection, defined() filter, order before slice, array limits, dereference in
  projection), GROQ anti-patterns with side-by-side correct patterns (no projection, string
  interpolation injection, client-side filtering, N+1 fetches). Common query patterns for list
  pagination, single-by-slug, singleton, and filtered-by-category reverse lookup. Use when writing
  GROQ queries, adding type safety with defineQuery and typegen, debugging GROQ results, reviewing
  queries for injection vulnerabilities or over-fetching, or implementing Sanity GROQ queries for
  new content types.
---

# Sanity CMS — GROQ Query Language

**Compiled from**: ADR-0031 §Part 7
**Last synced**: 2026-03-31

---

## Query Anatomy

```groq
*[_type == "post" && defined(slug.current) && !(_id in path("drafts.**"))]
│  │                                                                      │
│  └── Filter: boolean expression on document fields                      │
└── Universe: all documents                                               │
                                                                          │
| order(publishedAt desc)                                                 │
│                                                                         │
│ [0...10]                                                                │
│  └── Slice: zero-based, exclusive end                                   │
│                                                                         │
{                                                                         │
  "id": _id,           // Rename field                                    │
  title,               // Pass-through                                    │
  "slug": slug.current,// Access nested field                             │
  "author": author-> { name, image { asset->, alt } } // Dereference     │
}
```

**Operator reference:**

| Operator            | Meaning                                                                    |
| ------------------- | -------------------------------------------------------------------------- |
| `->`                | Dereference — follow a reference to the referenced document                |
| `@`                 | Current item — used inside array filters `[@.published == true]`           |
| `^`                 | Parent scope — used in nested queries (e.g., `^._id` = parent doc's `_id`) |
| `count()`           | Length of an array expression                                              |
| `defined()`         | True if field is not null/undefined                                        |
| `references()`      | True if document contains a reference to the given `_id`                   |
| `path("drafts.**")` | Match all `_id` values under the `drafts.*` namespace                      |

---

## Type Generation with `sanity typegen`

Wrap queries in `defineQuery()` to get automatic TypeScript types from `pnpm sanity typegen generate`.

```typescript
// src/lib/sanity/queries/post.queries.ts
import { defineQuery } from 'next-sanity'

export const POSTS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current) && !(_id in path("drafts.**"))]
  | order(publishedAt desc) [$start...$end] {
    "id": _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    mainImage { asset->, alt },
    "categories": categories[]->{ "id": _id, title, "slug": slug.current },
  }
`)

export const POST_BY_SLUG_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
    "id": _id,
    title,
    "slug": slug.current,
    publishedAt,
    mainImage { asset->, alt },
    "categories": categories[]->{ "id": _id, title, "slug": slug.current },
    "author": author->{ name, image { asset->, alt } },
    body,
    seoTitle,
    seoDescription,
  }
`)
```

**typegen config in `sanity.cli.ts`:**

```typescript
// sanity.cli.ts
import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  },
  studioHost: 'sash-bespoke',
  autoUpdates: true,
  typegen: {
    generateOnBuild: true,
    target: './sanity.types.ts',
    overloadClientMethods: true,
  },
})
```

**Generate command:** `pnpm sanity typegen generate`

---

## GROQ Rules

| Rule                      | Detail                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Always use projections    | Never use `*[_type == "post"]` without `{ }` — reads entire document including unpublished drafts fields |
| Use parameterized queries | Always `$param` injection — never string interpolation in GROQ                                           |
| Filter drafts             | Include `!(_id in path("drafts.**"))` unless you explicitly need draft access (preview mode only)        |
| Use `defined()` guard     | Filter out documents missing required fields: `defined(slug.current)`                                    |
| Order before slice        | `                                                                                                        | order(publishedAt desc) [0...10]` — order first, slice second |
| Limit array dereferences  | Cap array derefs to a reasonable depth — never more than 2 levels                                        |
| Dereference in projection | Put `->` inside the projection, not in the filter                                                        |

---

## Anti-Patterns

### No Projection (Over-Fetching)

```groq
// ❌ Returns entire documents including all fields, _rev, etc.
*[_type == "post"]

// ✅ Project only what the UI needs
*[_type == "post"] { "id": _id, title, "slug": slug.current, excerpt }
```

### String Interpolation (Injection Risk)

```typescript
// ❌ Security risk — user input injected into query string
const query = `*[_type == "post" && category == "${userInput}"]`

// ✅ Parameterized — safe
const query = defineQuery(`*[_type == "post" && category == $category]`)
const result = await client.fetch(query, { category: userInput })
```

### Client-Side Filtering (Performance)

```typescript
// ❌ Fetches all posts, filters in browser
const allPosts = await client.fetch(`*[_type == "post"] { ... }`)
const filtered = allPosts.filter((p) => p.category === targetCategory)

// ✅ Filter in GROQ, on the CDN
const filtered = await client.fetch(
  defineQuery(`*[_type == "post" && $category in categories[]->slug.current] { ... }`),
  { category: targetCategory },
)
```

### N+1 Fetches

```typescript
// ❌ One query per post to get author — N+1
const posts = await client.fetch(`*[_type == "post"] { title, author }`)
for (const post of posts) {
  post.authorData = await client.fetch(`*[_id == $id][0]`, { id: post.author._ref })
}

// ✅ Dereference in the projection — single query
const posts = await client.fetch(
  defineQuery(`
  *[_type == "post"] { title, "author": author->{ name, image { asset->, alt } } }
`),
)
```

---

## Common Query Patterns

### List (Paginated)

```groq
*[_type == "post" && defined(slug.current) && !(_id in path("drafts.**"))]
| order(publishedAt desc) [$start...$end] {
  "id": _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  mainImage { asset->, alt },
  "categories": categories[]->{ "id": _id, title, "slug": slug.current },
}
```

Parameters: `{ start: 0, end: 10 }`

### Single Document by Slug

```groq
*[_type == "post" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
  "id": _id,
  title,
  "slug": slug.current,
  publishedAt,
  "author": author->{ name, image { asset->, alt } },
  body,
}
```

Parameters: `{ slug: "my-post-slug" }`

### Singleton

```groq
*[_type == "site-settings"][0] {
  siteName,
  seoTitle,
  seoDescription,
  "logo": logo { asset->, alt },
  navigation { items[] { label, href } },
}
```

### Filtered by Category (Reverse Lookup)

```groq
*[_type == "category" && slug.current == $categorySlug][0] {
  "id": _id,
  title,
  "slug": slug.current,
  "posts": *[_type == "post" && references(^._id) && !(_id in path("drafts.**"))]
    | order(publishedAt desc) {
      "id": _id,
      title,
      "slug": slug.current,
      excerpt,
    },
  "postCount": count(*[_type == "post" && references(^._id)]),
}
```

Parameters: `{ categorySlug: "typography" }`
