---
description: 'Component tier system, import boundaries, folder organization, splitting triggers, barrel exports, and accessibility rules.'
applyTo: 'src/components/**'
---

# Component Structure Constraints

> Source: ADR-0004. Patterns, examples, and decision trees → skills `components-tiers`, `components-props`, `components-primitives-first`, `components-boundaries`.
> Universal rules (primitives-first, server-component default, project tokens) are in `copilot-instructions.md`. Named export rules are in `typescript-conventions.instructions.md`.

## One Component Per File — CRITICAL

Every `.tsx` file exports exactly ONE React component. No secondary component functions in the same file.

If a component needs a child/helper component:

1. Create a new sibling file or folder in the same parent directory
2. **Simple sub-component** (no helpers, hooks, or extra types) → flat `.tsx` file (e.g., `HeroCta.tsx`)
3. **Complex sub-component** (has helpers, hooks, utils, or types) → folder with `index.tsx` + co-located deps (e.g., `HeroContentSequence/index.tsx` + `useHeroContentAnimation.ts`)
4. Only the main section component is exported from the section's `index.ts` barrel
5. Sub-component imports stay relative — parent imports child from `./ChildName`

**Folder graduation rule:** A sub-component starts as a flat file. The moment it needs a helper, hook, utils, or types file — it becomes a folder with `index.tsx` + deps as siblings.

**Ownership rule:** Helpers, hooks, and types live inside the folder of the component that uses them. No `components/`, `hooks/`, or `utils/` sub-folders inside component directories.

**Extraction exception:** When a helper, hook, or type is used by 2+ component folders, extract it to the appropriate shared location: hooks to `src/hooks/`, utilities to `src/lib/`, types to a shared types file. Co-location applies to single-consumer dependencies only.

## Tier System & Import Boundaries

- `ui/` MUST NOT import from `shared/`, `features/`, or `layout/`.
- `shared/` MUST import from `ui/` only. MUST NOT import from `features/`, `layout/`, or `app/`.
- `features/` MAY import from `ui/` and `shared/`. MUST NOT import from `layout/` or other `features/`.
- `layout/` MAY import from `ui/`, `shared/`, and `features/`.
- `app/*/_components/` MAY import from all tiers.
- When a **simple composite** (card, stat block, media object) is needed by 2+ features, promote it to `shared/` — never cross-import between features.
- When **full page sections** (multi-component compositions with hooks, scroll logic, animation) are needed by 2+ pages, use a **shared feature domain** folder under `features/` — see `features.instructions.md` → Shared Feature Domains. Do not promote complex section-level composites to `shared/`.
- A clearly generic component (content via props, no domain coupling) MAY be created directly in `shared/` without waiting for a second consumer.

## Feature Folder Organization

- Feature sections are **grouped by page**: `features/<page-name>/<section-name>/`. A section folder MUST NOT sit directly under `features/`.
- `<page-name>` is kebab-case matching the page and should never reference the app name (e.g., GOOD: `landing-page`, `about-page` BAD: `galeriile-radulescu-landing-page`, `galeriile-radulescu-about-page`).
- **Shared feature domains**: When 2+ pages share identical section architecture (same sections, content varies via props), the folder is named for the domain pattern instead of a specific page (e.g., `product-page/` serves `/windows` and `/doors`). See `features.instructions.md` → Shared Feature Domains.

## Multi-Component Feature Folders

- Every sub-component MUST be a separate file (flat `.tsx` or folder with `index.tsx`) — never a second function in the parent's file.
- A composition (multiple sub-components forming one unit) MUST live in its own kebab-case folder under the feature domain.
- Only the main component MUST be exported from `index.ts`.
- Sub-components MUST NOT be exported from the barrel — consumers never import them directly.
- Sub-components are siblings of the main component.
- No `components/`, `hooks/`, or `utils/` sub-folders. Sub-components with deps graduate to folders.

## Barrel Exports

- Each component folder MUST have an `index.ts` barrel exporting the public API only.
- MUST import from barrels, not from internal file paths.

## Client Boundary

- `'use client'` is required only for: event handlers, browser APIs, `useState`/`useEffect`, context providers, animations.
- SHOULD extract only the interactive part to minimize the client boundary size.
- Client-interactive extractions MUST have `'use client'` on line 1. Name the file for what the component does (e.g., `PricingToggle.tsx`), not for its rendering mode.
- Props crossing the server/client boundary MUST be serializable — no functions, class instances, Date objects (use ISO strings), Map, Set, or Symbol.

## Component Splitting Triggers

A new sibling component file MUST be created when ANY of these is true:

- A function returns JSX and is used in another component's render
- A `.map()` iteration item needs its own hooks — extract into a named per-item component
- A visual region serves a different purpose from its parent (e.g., animated wrapper vs content layout)
- JSX is duplicated across multiple places — extract to a shared sibling
- A section needs `'use client'` but the parent is a server component

Split by responsibility, not by line count.

## Library Import Boundaries

- Radix UI components MUST be imported from `@/components/ui/*` barrels — never from `@radix-ui/*` directly in feature or layout code.
- Focus traps for dialogs, sheets, and overlays MUST rely on Radix's built-in (Dialog, AlertDialog, Sheet) — never implement a manual focus trap for overlay components.

## Icon Usage

When a mockup or design shows an arrow, icon, or symbol, use a component from the project's icon library — never a text character, emoji, or HTML entity.

1. Read `src/components/ui/design-tokens.json` → `icons.library` for the configured package (e.g., `lucide-react`).
2. Import the appropriate icon component from that library.
3. If `design-tokens.json` has no `icons` field, default to `lucide-react`.

### Correct

```tsx
import { ArrowLeft, Menu, Check } from 'lucide-react'

<Button><ArrowLeft className="size-4" /> Back</Button>
<button aria-label="Open menu"><Menu className="size-6" /></button>
```

### Incorrect

```tsx
// ❌ Text characters, emoji, or HTML entities for icons
<Button>← Back</Button>
<Button>→ Continue</Button>
<span>✓ Complete</span>
<button>≡</button>
<Button>➡️ Next</Button>
<Button>&rarr; Next</Button>
```

### Sizing

Use Tailwind's `size-*` utility (sets both width and height):

- Inline with text: `className="size-4"` (16 px)
- Button icon: `className="size-5"` (20 px)
- Standalone / nav: `className="size-6"` (24 px)

### Accessibility

- Decorative icons next to visible text need no extra attributes.
- Icon-only buttons MUST have `aria-label`.

## Accessibility

- UI tier (`ui/`): MUST be keyboard navigable, have ARIA attributes, focus-visible styles, ≥4.5:1 contrast, and forward `ref`.
- Features tier: SHOULD use semantic HTML; MUST not skip heading levels; MUST connect form labels to inputs.
