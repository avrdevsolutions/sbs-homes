# Phase 2 — Execution

> Loaded by `@feo-ui-builder` during Phase 2. Builds content contracts, feature components, layout components, and assembles the page.

## Prerequisites

- `ui-builder.brief.md` exists with `approved: true`
- `ui-foundation.manifest.json` has `status: "completed"`

## Manifest Initialization

Before Step 0, create `.github/flow-generator/FE/specs/ui-builder.manifest.json` with base schema fields (`$schema: "feo-manifest-v1"`, `agent: "ui-builder"`, `created_at`, `updated_at`, `status: "in-progress"`, `approved: false`, `approved_at: null`, `change_rounds: []`), `last_completed_step: null`, `content_contracts`, and `layout_contracts`. Populate `sections` and `layout_components` arrays from the approved brief.

## Code Style — Mandatory

These rules apply to **every file** written during execution. They are enforced by ESLint and must be followed exactly. Full reference: `instructions/typescript-conventions.instructions.md`.

- **Arrow function expressions only** — never use `function` declarations. Components: `export const MyComponent = ({ title }: Props) => (…)`. Helpers: `const handleClick = () => { … }`.
- **Inline `type` keyword** — write `import { type FC, useState } from 'react'`, never `import type { FC } from 'react'`.
- **Import order** (blank line between each group): `react` → `next/*` → external packages → `@/*` internal aliases → parent `../` → sibling `./` → type-only.
- **`const` only** — use `let` only when reassignment is required. Never `var`.
- **No `console.log`** — only `console.warn` and `console.error`.
- **JSX** — no unnecessary curly braces (`prop="value"` not `prop={"value"}`). Self-close empty elements (`<Component />` not `<Component></Component>`).
- **Tailwind** — never combine contradicting utilities. Use `cn()` for conditional merges.
- **Named exports only** — `export default` is reserved for Next.js special files (`page.tsx`, `layout.tsx`, `error.tsx`, etc.).

## Step 0 — Content Contracts

Create TWO contract files, split by scope.

### Step 0a — Layout Content (`src/dictionaries/layout.ts`)

**Skip this step** if `src/dictionaries/layout.ts` already exists (e.g., second page build — layout content is shared).

- Define one interface per layout component: e.g., `NavigationContent`, `FooterContent` — fields match what the brief specifies.
- Export a `const navigationContent` and `const footerContent` (or a combined `layoutContent` object) with all text and image URLs extracted from the mockup — exact copy, original language.
- Import from `src/dictionaries/common.ts` only if shared types apply.
- Types-only imports at the top; the content const(s) at the bottom.

### Step 0b — Page Content (`src/dictionaries/<page-name>.ts`)

Create `src/dictionaries/<page-name>.ts` (page name from the brief frontmatter).

- Define one interface per discovered **feature section** (NOT layout components): `<SectionName>Content` — fields match what the brief specifies (heading, body, images, CTAs, etc.)
- Define a top-level `<PageName>Content` interface composing all **page-specific** section interfaces.
- Export a `const <pageName>Content: <PageName>Content` with all text and image URLs extracted from the mockup — exact copy, original language.
- Import from `src/dictionaries/common.ts` only if shared types apply.
- Types-only imports at the top; the content const at the bottom.
- Images: store the external URL as-is. Use `{ src: string; alt: string; width: number; height: number }` shape.

### After Step 0

Update manifest: `last_completed_step: "contracts"`, append both files to `files_modified`.

## Step 1–N — Feature Sections

Build each discovered section **in page order** (top to bottom as they appear in the mockup). For each section:

### Folder Structure

Feature sections are grouped under a **page-level folder** (name from the brief frontmatter, kebab-case — e.g., `landing-page`):

```
src/components/features/<page-name>/<section-name>/
├── <SectionName>.tsx
└── index.ts
```

All sections for a given page live under `features/<page-name>/`. A section folder must **never** be placed directly under `features/`.

### Component Rules

- **Server Component** — no `'use client'`, no hooks, no event handlers.
- **Props-driven** — receive a typed `<SectionName>Content` prop. Import the interface from the content contracts file.
- **Primitives-first** — use primitives from `src/components/ui/catalog.json`. Refer to the brief and `mockup_mapping` for which primitives and variants to use. Raw HTML only when no primitive covers the use case.
- **Layout from mockup** — reproduce the mockup faithfully:
  - Read `mockup_mapping` from `ui-foundation.manifest.json` for direct class→primitive translation
  - Match grid/flex layout exactly (column ratios, gap values, nesting structure)
  - Match responsive breakpoints from the mockup's `@media` queries
  - Use the mapping table: mockup `.type-*` class → Typography `variant` prop
  - Use the mapping table: mockup `.btn-*` class → Button `variant` + `size` props
  - Use the mapping table: mockup section class → Section `spacing` + `background` props
  - Apply color inheritance: section sets text color context, children inherit — don't add explicit color classes on every element
  - Match the mockup's spacing rhythm (section padding tiers, internal gaps between elements)
  - Preserve all text content exactly as written in the mockup (language, punctuation, capitalization)
- **Images** — use `next/image` from `next/image`. Set `width`/`height` from the content contract, or use `fill` with a sized parent. Always include `alt`.
- **Heading hierarchy** — follow the hierarchy plan from the brief. Use Typography's `variant` for visual style and `as` for semantic level when they differ.
- **Arrow functions + named exports** — per TypeScript conventions.
- **Barrel export** — `index.ts` re-exports only the main component.

### Sub-Component Extraction

If a section's JSX exceeds ~120 lines or has a repeated item pattern (e.g., a grid of cards), extract sub-components as siblings in the same folder. Only export the main component from `index.ts`.

### Skeleton Detection — run after building each server component

After the server component file is written, check `interactivity_hints` for this section. Apply the decision tree:

**→ Create a skeleton client component** when hints suggest behaviors such as:

| Hint pattern                                     | Skeleton to create                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| Nav with 5+ links, mobile hamburger, drawer      | `MobileMenu.tsx` — wraps nav links, integrator adds Sheet/Dialog + toggle        |
| Any form section (contact, signup, search, etc.) | `<Name>Form.tsx` — wraps form fields, integrator adds RHF + submit state + toast |
| Grid of 6+ items with carousel or swipe hint     | `<Name>Carousel.tsx` — wraps item list, integrator adds Embla + controls + ARIA  |
| Accordion, FAQ, expandable items                 | `<Name>Accordion.tsx` — wraps item list, integrator adds Radix Accordion + state |
| Pricing toggle, plan switcher, view toggle       | `<Name>Toggle.tsx` — wraps content variants, integrator adds toggle state        |

**→ No skeleton (CSS-only or no client boundary needed)** when hints describe:

- Smooth scroll to anchor (`scroll-behavior: smooth` handles this)
- Hover states and focus styles (CSS handles this)
- Static content with no runtime state change

**→ Defer to integrator (do not create a skeleton)** when hints are ambiguous or describe a one-liner `onClick` case — for example, a single CTA that scrolls to a section. The integrator creates a new boundary in those cases.

**Skeleton file rules:**

- Same folder as the server parent component
- Filename: `<ComponentName>.tsx` (descriptive name from the hint, e.g., `ContactForm.tsx`, `MobileMenu.tsx`)
- Contains: `'use client'` directive, typed props interface (always `children: React.ReactNode` at minimum), pass-through render, `// TODO: UX Integrator —` comment describing the interaction
- Never contains: hooks, state, event handlers, Radix imports, or external library imports
- Server parent imports and renders the skeleton — children are the static server-rendered content

**Manifest update after skeleton creation:**

For each skeleton created, append an entry to `client_skeletons` in the section's manifest entry:

```json
{
  "component": "<SkeletonName>",
  "file": "src/components/features/<page-name>/<section-name>/<SkeletonName>.tsx",
  "purpose": "<description matching the interactivity_hint>",
  "status": "skeleton"
}
```

If no skeleton was created for this section, set `"client_skeletons": []`.

### After Each Section

Update manifest: `last_completed_step: "section:<name>"`, append all files (server component + any skeleton) to `files_modified`.

## Step N+1 — Layout Components

Build layout components discovered from the mockup (typically `header` and `footer`).

**Skip this step** if the layout components already exist in `src/components/layout/` (e.g., second page build — layout components are shared). Verify by checking the folders; if they exist with `.tsx` and `index.ts`, skip to Step N+2.

### Folder Structure

```
src/components/layout/<name>/
├── <Name>.tsx
└── index.ts
```

### Rules

- Same rules as feature sections: server-only, primitives-first, props-driven.
- Layout components receive typed props from `src/dictionaries/layout.ts` (NOT from the page content file).
- Layout components MAY import from `@/components/ui` and `@/components/features`.
- **Header/Nav**: render all nav links statically. Do not add hamburger toggle or mobile menu behavior — that's for the UX Integrator. Render the full navigation visible.
- **Footer**: render all content visible. Use Stack, Typography, Separator.

### After Layout

Update manifest: `last_completed_step: "layout"`, append files to `files_modified`.

## Step N+2 — Page Assembly & Layout Wiring

Two files are updated in this step:

### `src/app/layout.tsx` — Layout Wiring

**Skip this sub-step** if layout components are already wired in `layout.tsx` (e.g., second page build).

1. Import Navigation and Footer from `@/components/layout/` barrels.
2. Import layout content from `@/dictionaries/layout`.
3. Render Navigation above `{children}` and Footer below.
4. Wrap `{children}` in `<main>` for semantic HTML.
5. Use `export default` (Next.js layout convention).

### `src/app/<route>/page.tsx` — Page Sections

Resolve the page file path from `page_entry` in the manifest (set during Route Detection in the agent file):

- Root route (`/`) → `src/app/page.tsx`
- Other routes (e.g., `/about`) → `src/app/about/page.tsx` (create directory if needed)

1. Import all **feature sections** from their barrels (NOT layout components — those are in `layout.tsx`).
2. Import the page content object from `src/dictionaries/<page-name>.ts`.
3. Compose the page: feature sections in page order.
4. Pass the relevant content slice to each section as props.
5. Use `export default` (Next.js page convention).

### After Assembly

Update manifest: `last_completed_step: "page"`, append the page file path (from `page_entry`) and `src/app/layout.tsx` (if modified) to `files_modified`.

## Proceed to Phase 3

After page assembly, load `.github/skills/feo-ui-builder-workflow/quality-gates.patterns.md` and run gates.
