---
name: sanity-cms-schema-authoring
description: >-
  Sanity schema file authoring — naming conventions (kebab-case types, camelCase fields), required
  and recommended fields per document type (title, slug, seo-fields, publishedAt, mainImage,
  excerpt), full schema definition pattern with defineType and defineField (project.ts example),
  reusable object types (seo-fields.ts and portable-text.ts full code), singleton document pattern,
  schema registry (schemas/index.ts), slug field pattern with custom slugify and 301 redirect
  protocol, flat and hierarchical category schema code, tag schema, shared taxonomy rule. Use when
  writing a new Sanity schema file, adding fields to an existing Sanity schema, creating reusable
  Sanity object types, building Sanity taxonomy document types, configuring a Sanity singleton,
  or updating the Sanity schema registry.
---

# Sanity CMS — Schema Authoring

**Compiled from**: ADR-0031 §Parts 3, 5, 6
**Last synced**: 2026-03-31

---

## Naming Conventions

| Entity             | Convention                    | Example                                        |
| ------------------ | ----------------------------- | ---------------------------------------------- |
| Document type name | kebab-case                    | `case-study`, `blog-post`, `site-settings`     |
| Field name         | camelCase                     | `publishedAt`, `mainImage`, `seoTitle`         |
| Object type name   | kebab-case                    | `portable-text`, `seo-fields`, `internal-link` |
| Schema file name   | kebab-case matching type name | `case-study.ts`, `site-settings.ts`            |

---

## Required Fields Per Document Type

Every content document type **MUST** include:

| Field   | Sanity Type                   | Purpose                                          |
| ------- | ----------------------------- | ------------------------------------------------ |
| `title` | `string`                      | Human-readable title — Studio list views and SEO |
| `slug`  | `slug` (sourced from `title`) | URL-safe identifier for routing                  |
| `seo`   | `seo-fields` object           | SEO metadata                                     |

> Omit `slug` for singletons and non-page documents (e.g., `author`). Omit `seo` for non-page documents.

Every content document type **SHOULD** also include:

| Field         | Sanity Type                  | Purpose                                               |
| ------------- | ---------------------------- | ----------------------------------------------------- |
| `publishedAt` | `datetime`                   | Publication date for ordering and display             |
| `mainImage`   | `image` with `hotspot: true` | Card thumbnail, OG image                              |
| `excerpt`     | `text` (max 200 chars)       | Short summary — card descriptions, meta desc fallback |

---

## Schema Definition Pattern

```typescript
// src/sanity/schemas/project.ts
import { defineField, defineType } from 'sanity'

export const project = defineType({
  name: 'project', // kebab-case
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
          validation: (rule) => rule.required(), // MUST always be required
        }),
      ],
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'category' }] }],
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

---

## Reusable Object Types

### `seo-fields.ts`

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

### `portable-text.ts` (Schema Only)

The `portable-text` object type defines what rich text editors see in Studio. The JSON output it produces is rendered by `@portabletext/react` in the consuming application.

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
                validation: (rule) =>
                  rule.uri({ allowRelative: true, scheme: ['http', 'https', 'mailto'] }),
              },
              { name: 'openInNewTab', type: 'boolean', initialValue: false },
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'alt', type: 'string', validation: (rule) => rule.required() },
        { name: 'caption', type: 'string' },
      ],
    }),
  ],
})
```

---

## Singleton Document Pattern

Singletons have exactly one instance (site settings, navigation). Query by type with `[0]`:

```groq
*[_type == "site-settings"][0] {
  title,
  description,
  ogImage { asset-> }
}
```

Prevent multiple instances by removing the type from the default document list in `sanity.config.ts` structure plugin config and adding it as a fixed item in the structure.

---

## Schema Registry

Every schema type MUST be registered in `src/sanity/schemas/index.ts` or Studio won't see it:

```typescript
// src/sanity/schemas/index.ts
import { author } from './author'
import { category } from './category'
import { post } from './post'
import { project } from './project'
import { siteSettings } from './site-settings'
import { link } from './objects/link'
import { portableText } from './objects/portable-text'
import { seoFields } from './objects/seo-fields'

export const schemaTypes = [
  // Document types
  post,
  project,
  author,
  category,
  siteSettings,
  // Object types
  portableText,
  seoFields,
  link,
]
```

---

## Slug Field Pattern

```typescript
defineField({
  name: 'slug',
  title: 'Slug',
  type: 'slug',
  options: {
    source: 'title', // MUST always be 'title'
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

**Slugs SHOULD NOT change after publication** (SEO impact). When a slug must change:

1. Create a 301 redirect from old slug → new slug in `next.config.js`
2. Update the Sanity document's slug
3. Verify the redirect works

---

## Taxonomy Schema Code

### Flat Category

```typescript
// src/sanity/schemas/category.ts
import { defineField, defineType } from 'sanity'

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'description', type: 'text', rows: 2 }),
  ],
})
```

For hierarchical categories (max 2 levels), add a parent reference field:

```typescript
defineField({
  name: 'parent',
  title: 'Parent Category',
  type: 'reference',
  to: [{ type: 'category' }],
  // Optional — only set for child categories
})
```

### Tag

```typescript
// src/sanity/schemas/tag.ts
export const tag = defineType({
  name: 'tag',
  title: 'Tag',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
  ],
})
```

### Shared Taxonomy Rule

When multiple content types share a taxonomy, they MUST reference the **same** document type:

```typescript
// ✅ Both reference the same 'category' type

// In project schema:
defineField({
  name: 'categories',
  type: 'array',
  of: [{ type: 'reference', to: [{ type: 'category' }] }],
})

// In post schema — same target type:
defineField({
  name: 'categories',
  type: 'array',
  of: [{ type: 'reference', to: [{ type: 'category' }] }],
})

// ❌ Separate taxonomy types per content type — duplicated data, sync nightmares
```

---

## Anti-Patterns

| Anti-Pattern                                       | Correct Pattern                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| Free-text category field (plain `string`)          | Reference to `category` document type                               |
| 3+ levels of category hierarchy                    | Max 2 levels                                                        |
| Tags without slugs                                 | Always include `slug` with `source: 'title'`                        |
| Separate taxonomy types for shared classifications | Single shared reference target type                                 |
| `array of string` for classifications              | Reference to document type (referential integrity + reverse lookup) |
| Missing `alt` sub-field on image fields            | Always add `alt` with `validation: (rule) => rule.required()`       |
| Schema type not in `schemaTypes` array             | Always register — Studio won't see unregistered types               |
