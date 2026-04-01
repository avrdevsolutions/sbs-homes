---
name: sanity-cms-content-modeling
description: >-
  Sanity content modeling decisions — schema-first design workflow (5-step protocol with TypeScript
  type sketch example), document types vs object types (table and decision tree), singleton vs
  collection, TypeScript-to-Sanity field type mapping table, all relationship patterns with schema
  code and GROQ projections (one-to-one, one-to-many referenced, one-to-many embedded, many-to-many
  with reverse lookup via references(), self-referencing with depth limit, polymorphic references),
  embed vs reference decision tree, relationship pattern selection decision tree, taxonomy design
  decision tree (categories vs tags vs enum vs document type). Use when planning a new content type,
  choosing between document and object types, modeling relationships between content types, designing
  taxonomy structure, or writing a TypeScript type sketch before implementing a Sanity schema.
---

# Sanity CMS — Content Modeling

**Compiled from**: ADR-0031 §Parts 4, 5
**Last synced**: 2026-03-31

---

## Schema-First Design Workflow

Before writing any `defineType()`, design the content type as a TypeScript type sketch:

```
Step 1: Sketch the content type as a TypeScript type alias.
        Temporary design artifact — in a PR description or design doc.
        NOT a committed source file (keep in PR description or design doc).

Step 2: Review
        Verify field names are camelCase.
        Verify relationships are explicit (reference IDs, arrays for collections).
        Verify it includes title, slug, and seo fields (for page-based content).
        Get approval before proceeding.

Step 3: Implement Sanity schema
        Translate the sketch to defineType/defineField code in src/sanity/schemas/.
        Register in the schema index.

Step 4: Write GROQ query
        Write the query with a projection matching the sketch shape.

Step 5: Run typegen
        pnpm sanity typegen generate
        Types are generated from GROQ query projections.
```

Steps beyond this (adapters, route wiring, rendering) are consumption-layer concerns.

**Example type sketch:**

```typescript
// Temporary design artifact — not a project file
type Project = {
  id: string
  title: string
  slug: string
  excerpt: string
  publishedAt: string
  client?: string
  mainImage?: { src: string; alt: string; width: number; height: number }
  categories: Array<{ id: string; title: string; slug: string }>
  gallery: Array<{ src: string; alt: string; caption?: string }>
  body: PortableTextBlock[] // Rich text
}
```

---

## Document Types vs Object Types

| Concept           | When to Use                                                               | Identity                         | Queryable Independently                  |
| ----------------- | ------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------- |
| **Document type** | Content with its own lifecycle (created, edited, published independently) | Has `_id`, `_type`, `_createdAt` | Yes — `*[_type == "project"]`            |
| **Object type**   | Reusable field groups embedded in documents (no independent lifecycle)    | No `_id`                         | No — only accessible via parent document |

**Decision tree:**

```
Is this content created and managed independently by editors?
  │
  ├── YES → Does it need its own listing page or detail page?
  │          ├── YES → Document type (with slug)
  │          └── NO  → Document type (without slug — e.g., author, site-settings)
  │
  └── NO  → Is the same field group reused across 2+ document types?
             ├── YES → Object type (e.g., seo-fields, portable-text, link)
             └── NO  → Inline fields on the parent document
```

---

## Singleton vs Collection

| Pattern                  | When                                               | Implementation                                                              |
| ------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------- |
| **Collection** (default) | Multiple instances — posts, projects, testimonials | Normal document type, listed in Studio                                      |
| **Singleton**            | Exactly one instance — site settings, navigation   | structureTool config to prevent duplicates; query as `*[_type == "..."][0]` |

---

## TypeScript → Sanity Field Type Mapping

| TypeScript Type             | Sanity Field Type                    | Notes                                       |
| --------------------------- | ------------------------------------ | ------------------------------------------- |
| `string` (short)            | `string`                             | Use `text` for multi-line                   |
| `string` (long, multi-line) | `text`                               | Set `rows` for textarea height              |
| `number`                    | `number`                             | Add `min`/`max` validation                  |
| `boolean`                   | `boolean`                            | Set `initialValue`                          |
| `PortableTextBlock[]`       | `portable-text` (custom object type) | Rich text, JSON AST                         |
| `string` (enum)             | `string` with `options.list`         | Or separate document type for dynamic lists |
| `string` (ISO date)         | `datetime`                           | ISO 8601                                    |
| image object                | `image` with `hotspot: true`         | Always include `alt` sub-field              |
| `T[]` (inline objects)      | `array` of objects                   | Embedded in parent document                 |
| `T[]` (referenced docs)     | `array` of `reference`               | Separate document type                      |
| `T` (single reference)      | `reference`                          | `to: [{ type: 'target-type' }]`             |
| `T \| undefined`            | field without `required()`           | Optional fields omit `rule.required()`      |

---

## Relationship Patterns

### One-to-One

```typescript
defineField({
  name: 'author',
  type: 'reference',
  to: [{ type: 'author' }],
  validation: (rule) => rule.required(),
})
```

GROQ projection:

```groq
"author": author->{ name, "slug": slug.current, image { asset->, alt } }
```

### One-to-Many (Referenced Documents)

```typescript
defineField({
  name: 'categories',
  type: 'array',
  of: [{ type: 'reference', to: [{ type: 'category' }] }],
})
```

GROQ projection:

```groq
"categories": categories[]->{ "id": _id, title, "slug": slug.current }
```

### One-to-Many (Embedded Objects)

Child data only exists within the parent — no independent identity:

```typescript
defineField({
  name: 'gallery',
  type: 'array',
  of: [
    {
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', type: 'string', validation: (rule) => rule.required() }),
        defineField({ name: 'caption', type: 'string' }),
      ],
    },
  ],
})
```

### Many-to-Many (References + Reverse Lookup)

References are stored on one side. Use Sanity's `references()` function for reverse lookups:

```groq
// Forward: post → tags
"tags": tags[]->{ "id": _id, title, "slug": slug.current }

// Reverse: tag → all posts that reference it
*[_type == "tag" && slug.current == $slug][0] {
  title,
  "posts": *[_type == "post" && references(^._id)] | order(publishedAt desc) {
    "id": _id, title, "slug": slug.current
  },
  "postCount": count(*[_type == "post" && references(^._id)])
}
```

### Self-Referencing (Limit to 1 Level)

```groq
// ✅ Single level — safe
"relatedProjects": *[_type == "project" && _id != ^._id &&
  count(categories[@._ref in ^.^.categories[]._ref]) > 0]
  | order(publishedAt desc) [0...3] {
    "id": _id, title, "slug": slug.current
  }

// ❌ Never — recursive, unbounded, exponential payload
"related": relatedPosts[]->{ ..., "related": relatedPosts[]->{ ... } }
```

### Polymorphic References (Multiple Target Types)

```typescript
defineField({
  name: 'reference',
  title: 'Link To',
  type: 'reference',
  to: [{ type: 'post' }, { type: 'case-study' }],
})
```

Always include `_type` in the projection for discriminated union handling:

```groq
"link": reference->{ "type": _type, "slug": slug.current, title }
```

---

## Embed vs Reference Decision Tree

```
Does the child data have independent identity?
  │
  ├── YES → Does it appear in 2+ parent types or is it managed independently by editors?
  │          ├── YES → Reference (separate document type)
  │          └── NO  → Reference if edited independently; Embed if always edited in context of parent
  │
  └── NO  → Embed (array of objects or primitives)
```

## Relationship Decision Tree

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
                         ├── YES → MANY-TO-MANY (references + reverse lookup via references())
                         └── NO  → ONE-TO-MANY (array of references)

Special cases:
  A relates to A → SELF-REFERENCING (limit GROQ depth to 1 level)
  A relates to B or C → POLYMORPHIC (multi-type reference — include _type in projection)
```

---

## Taxonomy Design Decision Tree

```
Is this the PRIMARY organizational axis?
  │
  ├── YES → CATEGORIES
  │         Sub-classifications needed?
  │           ├── YES → Hierarchical categories (max 2 levels)
  │           └── NO  → Flat categories (default)
  │
  └── NO → Cross-cutting topics/themes?
            │
            ├── YES → TAGS (always flat)
            │
            └── NO → Fixed set < 5 options?
                      ├── YES → Enum field (string with options.list)
                      └── NO  → TAGS
```

| Dimension   | Categories                            | Tags                                  |
| ----------- | ------------------------------------- | ------------------------------------- |
| Purpose     | Primary classification — "what type?" | Secondary annotation — "what topics?" |
| Cardinality | Few (5–20)                            | Many (20–200+)                        |
| Structure   | Can be hierarchical (max 2 levels)    | Always flat                           |
| Assignment  | Usually 1–3 per document              | 1–10 per document                     |
| URL route   | Usually has a listing page            | May or may not                        |

---

## Anti-Patterns

| Anti-Pattern                                                | Correct Pattern                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------- |
| Implementing schema without a TypeScript type sketch        | Schema-first workflow: sketch → review → implement                  |
| Free-text category field (plain `string`)                   | Reference to `category` document type                               |
| 3+ levels of category hierarchy                             | Max 2 levels                                                        |
| Separate taxonomy types for shared classifications          | Single shared reference target type                                 |
| `array of string` for classifications                       | Reference to document type (referential integrity + reverse lookup) |
| Deep self-referencing in GROQ (related → related → related) | Limit to 1 level of depth                                           |
