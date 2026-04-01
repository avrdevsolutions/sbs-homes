---
name: sanity-cms-image-portable-text
description: >-
  Sanity image CDN and Portable Text schema — image CDN URL transform parameters (w, h, fit, auto,
  q, rect with examples), auto=format rule for WebP/AVIF delivery, editor hotspot and crop behavior,
  responsive image URL generation for srcset at multiple widths, next.config.js remotePatterns
  configuration for cdn.sanity.io, image schema anti-patterns table. Portable Text data format
  (JSON AST structure returned by GROQ — blocks, spans with marks, inline images), what "no HTML
  or CSS" means for rendering portability, portable-text.ts schema with block styles (normal/h2/h3/
  h4/blockquote), mark decorators (strong/em/code), annotations (link with href + openInNewTab,
  internalLink referencing documents), inline image members. Block types and marks reference table.
  Use when defining image fields in Sanity schemas, building Sanity CDN image URLs, configuring
  Next.js for Sanity image domains, writing the Sanity portable-text object schema, or understanding
  Sanity Portable Text output.
---

# Sanity CMS — Image CDN & Portable Text

**Compiled from**: ADR-0031 §Parts 8, 9
**Last synced**: 2026-03-31

---

## Image CDN

Sanity's Content Lake includes an image CDN with on-the-fly transforms. Editors upload originals; consumers request optimized versions via URL parameters.

Base URL format: `https://cdn.sanity.io/images/{projectId}/{dataset}/{imageId}.{ext}`

### URL Transform Parameters

| Parameter | Example | Purpose |
|---|---|---|
| `w` | `?w=800` | Width in pixels |
| `h` | `?h=600` | Height in pixels |
| `fit` | `?fit=crop` | Fit mode: `clip`, `crop`, `fill`, `fillmax`, `max`, `scale`, `min` |
| `auto` | `?auto=format` | Serve WebP/AVIF where supported (30–50% smaller than JPEG) |
| `q` | `?q=80` | Quality (1–100) |
| `rect` | `?rect=0,0,500,500` | Manual crop coordinates (x, y, width, height) |

**Always append `auto=format`** — serves modern formats automatically. **Always set `w`** — prevents serving multi-megabyte originals.

### Hotspot & Crop

Editors define a focal point (hotspot) and crop region in Studio. The `@sanity/image-url` builder respects these when building URLs with `fit=crop`, ensuring the most important part of the image is preserved across different aspect ratios.

### Responsive Image URLs (for `srcset`)

Generate URLs at multiple widths. The consuming layer combines these into `srcset`:

```
https://cdn.sanity.io/images/.../image.jpg?w=400&auto=format
https://cdn.sanity.io/images/.../image.jpg?w=800&auto=format
https://cdn.sanity.io/images/.../image.jpg?w=1200&auto=format
```

### `next.config.js` Remote Pattern

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
    ],
  },
}

module.exports = nextConfig
```

### Image Anti-Patterns

| Anti-Pattern | Correct Pattern |
|---|---|
| Missing `?auto=format` | Always append `auto=format` — otherwise serves original JPEG/PNG |
| No width constraint (`w`) | Always set `?w=` — prevents serving 6000×4000 originals |
| Missing `alt` sub-field on image fields in schema | Always include `alt` with `validation: (rule) => rule.required()` |
| Hardcoded CDN URLs in content | Use `@sanity/image-url` builder from asset references |

---

## Portable Text Format

Portable Text is Sanity's rich text format — a **JSON AST** (Abstract Syntax Tree), not HTML. GROQ returns it as an array of typed block objects.

**There is no HTML or CSS in Portable Text.** The consuming application decides how each block type, style, and mark renders. This makes it portable: the same content object can render on web, email, and mobile with entirely different styles.

### Example GROQ Output

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

### Block Types & Marks Reference

| Block Type | Purpose | Styles Available |
|---|---|---|
| `block` | Text paragraphs, headings, quotes | `normal`, `h2`, `h3`, `h4`, `blockquote` |
| `image` | Inline images embedded in rich text | N/A |

| Mark Type | Value | Purpose |
|---|---|---|
| Decorator | `strong` | Bold text |
| Decorator | `em` | Italic text |
| Decorator | `code` | Inline code |
| Annotation | `link` | External URL — carries `href` and `openInNewTab` fields |
| Annotation | `internalLink` | Reference to another Sanity document |

### `portable-text.ts` Schema Definition

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

> The consumption layer renders Portable Text with `@portabletext/react`, mapping each block type and mark to React components using the project's Typography primitives. The schema definition here (in `src/sanity/schemas/`) only controls what the Studio editor sees — the rendering mapping is a separate concern in the data-access layer.
