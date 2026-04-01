# Phase 1 — Analysis & Brief

> Loaded by `@feo-ui-builder` during Phase 1. Produces `ui-builder.brief.md` with discovered sections and per-section build plans.

## Inputs

Read these files before analysis (in this order):

1. `.github/flow-generator/FE/specs/ui-foundation.manifest.json` — get `source_mockup` path, confirm `status: "completed"`
2. `public/_mockups/<source_mockup>` — the full mockup HTML (your **single source of truth** for structure, content, layout, and sections)
3. `src/components/ui/catalog.json` — primitives overview (names, patterns, axes)
4. `src/components/ui/design-tokens.json` — token reference (colors, fonts, spacing, custom tokens)
5. Per-primitive `manifest.json` files — read each primitive's manifest for detailed API (variant values, props, defaults)
6. `ui-foundation.manifest.json` → `mockup_mapping` — direct translation dictionary: mockup CSS classes → primitive variant/size/prop values. Use as the primary reference when mapping mockup `.type-*`, `.btn-*`, section, separator, and container classes to primitive props.

Do NOT read upstream briefs (`orchestrator.design.brief.md`, `ui-foundation.brief.md`). The mockup contains everything you need — including HTML comments that describe section intent.

### Existing Component Scan (Second Page Build)

Before section discovery, check if this is a second (or later) page build by checking whether `src/components/features/` already contains feature folders.

If existing features are found:

1. Read `src/components/shared/index.ts` (if `shared/` exists) to catalog available shared composites.
2. Read barrel exports from each existing feature folder in `src/components/features/`.
3. Read `contracts/*.ts` for existing content type shapes.
4. Keep this inventory in memory — use it during section analysis to identify reusable sub-components.

If no existing features — skip this step (first page build).

## Section Discovery

Parse the mockup HTML to discover all sections. Do NOT assume or hardcode any section names.

### Step 1 — Identify Regions

Scan the mockup for top-level semantic elements:

- `<header>` → layout component (nav/header)
- `<section>` or `<section class="...">` → feature section
- `<footer>` → layout component (footer)
- Major `<div>` elements that act as page-level containers

For each region, check the `data-layout` attribute to classify its role:

| Attribute              | Role               | Route to                                      | Content contract             |
| ---------------------- | ------------------ | --------------------------------------------- | ---------------------------- |
| `data-layout="global"` | `layout-component` | `src/components/layout/{Name}/`               | `src/dictionaries/layout.ts`      |
| (none)                 | `feature-section`  | `src/components/features/{page-name}/{Name}/` | `src/dictionaries/{page-name}.ts` |

**Fallback** (backward compatibility): `<header>` and `<footer>` elements without `data-layout` are still classified as `layout-component`.

For each region, record:

- **Source identifier**: CSS class name, `id`, or BEM block name (e.g., `.hero`, `.about`, `#gallery`)
- **Role**: `layout-component` (when `data-layout="global"` present, or `<header>`/`<footer>` fallback) or `feature-section`

### Step 2 — Extract Section Details

For each discovered feature section, extract:

| Property                | How to extract                                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**                | Derive from CSS class/id. Use short kebab-case (e.g., `hero`, `about`, `gallery-grid`)                                                                            |
| **Heading hierarchy**   | What heading levels appear? Which is the primary heading?                                                                                                         |
| **Layout pattern**      | Grid (column ratios, gap)? Flex (direction, alignment)? Asymmetric? Full-bleed?                                                                                   |
| **Responsive behavior** | Read `@media` queries that affect this section. Note breakpoints and what changes.                                                                                |
| **Text content**        | All headings, paragraphs, labels, CTAs. Preserve language/copy exactly.                                                                                           |
| **Images**              | `src` URL, inferred aspect ratio from CSS (e.g., `aspect-ratio: 3/4`), contextual `alt` text                                                                      |
| **Links/CTAs**          | Button text, any `href` values                                                                                                                                    |
| **Primitive mapping**   | Which UI primitives fit: `Section` (wrapper), `Typography` (text), `Stack` (flex), `Button` (CTAs), `Separator` (dividers), `Container` (width), `Badge` (labels) |
| **Background**          | Which `Section` background variant applies? (`default`, `alt`, `cream`, `charcoal`)                                                                               |
| **Spacing**             | Which `Section` spacing variant applies? (`compact`, `standard`, `hero`)                                                                                          |
| **Interactivity hints** | What behavior a UX agent would need to add (scroll targets, toggles, filtering, carousels, lightboxes). Be specific.                                              |

For layout components (header, footer), extract the same details but note their layout-tier role.

### Step 3 — Determine Content Contracts

From all discovered sections, determine:

- **Page name**: derive from the mockup title, `<title>` tag, or primary heading (kebab-case for the file name)
- **Content language**: detect from the mockup's text content
- **Per-section interfaces**: list the typed fields each section needs (heading text, body text, image URLs, CTA labels, etc.)

Split content contracts into two files by scope:

- **`src/dictionaries/layout.ts`** — interfaces and content for layout components (e.g., `NavigationContent`, `FooterContent`). Shared across all pages.
- **`src/dictionaries/{page-name}.ts`** — interfaces and content for page-specific feature sections (e.g., `HeroContent`, `AboutContent`).

Both files import shared types from `src/dictionaries/common.ts` when applicable.

### Step 4 — Determine Heading Hierarchy

Map all headings across the full page to ensure:

- Exactly one `h1` (typically in the first/hero section)
- No skipped levels (h1 → h2 → h3, never h1 → h3)
- Document the hierarchy plan in the brief

## Brief Writing

Write the brief to `.github/flow-generator/FE/specs/ui-builder.brief.md`.

### Brief Format

```markdown
---
approved: false
source_mockup: <filename>
page_name: <kebab-case>
page_entry: src/app/<route>/page.tsx
content_contracts: src/dictionaries/<page-name>.ts
layout_contracts: src/dictionaries/layout.ts
---

# Page Builder Brief

## Discovery Summary

- **Source mockup**: `<filename>`
- **Sections discovered**: <count> feature sections + <count> layout components
- **Content language**: <language>
- **Heading hierarchy**: h1 in <section>, h2 in <sections...>, h3 in <sections...>

## Content Contracts

### Layout Contract — `src/dictionaries/layout.ts`

For layout components (navigation, footer):

#### NavigationContent

- `brand`: { src: string; alt: string }
- `links`: { label: string; href: string }[]
- `cta`: { label: string; href: string }
- ...

#### FooterContent

- `copyright`: string
- `links`: { label: string; href: string }[]
- ...

(Exact fields depend on what the mockup contains.)

### Page Contract — `src/dictionaries/<page-name>.ts`

For page-specific feature sections:

#### <SectionName>Content

- `heading`: string
- `body`: string
- `image`: { src: string; alt: string; width: number; height: number }
- ...

(Repeat for each discovered feature section)

#### <PageName>Content

- Top-level interface composing all page-specific section content interfaces

## Sections

### 1. <section-name>

- **Component**: `<SectionName>` in `src/components/features/<section-name>/`
- **Purpose**: <inferred from mockup content and HTML comments>
- **Layout**: <grid/flex pattern, column ratios, responsive changes>
- **Primitives**: Section(<spacing>, <background>), Typography(<variants>), Stack(<direction>, <gap>), ...
- **Responsive**: <breakpoint notes>
- **Images**: <count> images — <aspect ratios>, <sources>
- **Interactivity hints**: <what UX agent should add>
- **Mockup reference**: `.<css-class>` — <brief structural note from mockup>

(Repeat for each discovered section)

## Layout Components

### <component-name>

- **Component**: `<ComponentName>` in `src/components/layout/<name>/`
- **Structure**: <nav links, logo, social links, etc.>
- **Primitives**: <which primitives>
- **Content contract**: `src/dictionaries/layout.ts` → `<ComponentName>Content`
- **Interactivity hints**: <mobile nav toggle, scroll behavior, etc.>

(Repeat for each discovered layout component)

## Build Order

1. Layout content files (`src/dictionaries/layout.ts`) — skip if file already exists
2. Page content files (`src/dictionaries/<page-name>.ts`)
3. Shared component promotions (if any sub-components need to move to `shared/`) — see agent file for promotion rules
4. Feature sections (in page order): <list> — note which sections reuse shared components
5. Layout components: <list> — skip if already exist
6. Page assembly (`src/app/<route>/page.tsx`) + layout wiring (`src/app/layout.tsx`)
```

### Brief Rules

- **Be specific about layouts** — column ratios, gap values, breakpoint behavior. Reference mockup CSS classes where helpful (e.g., "`.about__grid` uses a 7/5 column split on desktop").
- **Be specific about primitives** — state which variant/prop values to use, not just the component name.
- **Map every text element** to a Typography variant. Don't leave ambiguity about which variant a heading or body text uses.
- **List all images** with their source URLs and inferred aspect ratios.
- **Write concrete interactivity hints** — not vague ("could be interactive") but specific ("CTA scrolls to visit section", "nav links need mobile hamburger toggle").
- **Preserve all mockup content** exactly — copy text, image URLs, link labels in the original language.

## Approval Gate

After writing the brief:

1. Tell the user: **"Page builder brief written with [N] sections discovered."**
2. Present a summary: list each discovered section name, its component name, and key layout pattern.
3. Use `askQuestions`: **Approve page builder brief** / **Request changes** (free-form).
4. If approved: set `approved: true` in frontmatter, proceed to Phase 2.
5. If changes: revise, re-ask. Loop until approved.

**Never proceed to Phase 2 without explicit user approval.**
