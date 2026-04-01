---
name: components-tiers
description: >-
  Component tier system (ui/shared/features/layout), import boundaries, folder structure,
  splitting triggers, multi-component composition folders, tier placement decision tree,
  documentation requirements. Use when deciding where to place a component, structuring
  feature folders, promoting a component to shared/, or verifying import direction.
---

# Components — Tier Structure & Folder Patterns

**Compiled from**: ADR-0004 §Tier System, §Component Splitting Triggers, §Folder Structure, §Anti-Patterns; ADR-0028 §Shared-Tier Rules, §Tier Placement Decision Tree
**Last synced**: 2026-03-26

---

## Tier System

| Tier            | Location               | Purpose                                                          | May Import From               |
| --------------- | ---------------------- | ---------------------------------------------------------------- | ----------------------------- |
| **1: UI**       | `components/ui/`       | Design-system primitives (Button, Typography, Container, Stack)  | Nothing from `components/`    |
| **2: Shared**   | `components/shared/`   | Reusable composites across features (content cards, stat blocks) | `ui/` only                    |
| **3: Features** | `components/features/` | Feature-specific sections (Hero, PricingCard, TeamGrid)          | `ui/`, `shared/`              |
| **4: Layout**   | `components/layout/`   | App-wide chrome (Header, Footer, Sidebar, Nav)                   | `ui/`, `shared/`, `features/` |
| **Page**        | `app/*/_components/`   | Page-private (not reusable)                                      | All tiers                     |

**Import direction** — higher tiers import lower tiers, never upward:

```
app/* → layout/ → features/ → shared/ → ui/
                                         ↑ Never import upward
```

**Critical cross-feature rule**: `features/` MUST NOT import from other `features/`. When 2+ features need the same component, promote it to `shared/`. A clearly generic component (content via props, no domain coupling) MAY be created directly in `shared/` even with only 1 consumer.

---

## Shared Tier

`components/shared/` holds reusable composed components that are used by 2+ features and are NOT design-system primitives.

### What Belongs in `shared/`

Mid-level composites built from `ui/` primitives that represent a recurring content pattern, not tied to any specific feature or page:

- Content cards (image + text + optional CTA)
- Stat display blocks (number + label + optional trend)
- Testimonial cards (quote + author + avatar)
- Media objects (image/icon + text stack)
- Feature list items (icon + heading + description)
- Price display units (amount + currency + period)

### Shared Tier Rules

| Rule                                                                                        | Level        |
| ------------------------------------------------------------------------------------------- | ------------ |
| `shared/` MUST import from `ui/` barrel only — never from `features/`, `layout/`, or `app/` | **MUST**     |
| `shared/` does NOT use `catalog.json` or `manifest.json` — those are `ui/` tier concerns    | **MUST NOT** |
| Promote to `shared/` when used by 2+ features                                               | **SHOULD**   |
| `shared/` components SHOULD receive content through typed props — no hardcoded strings      | **SHOULD**   |
| `shared/` components SHOULD use generic prop names (e.g., `title` not `productTitle`)       | **SHOULD**   |

All other ADR-0004 rules (named exports, barrel exports, Server Component default, primitives-first, project tokens, splitting triggers, sub-component privacy) apply to `shared/` components identically to `features/`.

---

## Tier Placement Decision Tree

```
Is this a low-level primitive that encodes design tokens
and has no business/content knowledge?
  → YES: ui/
  → NO ↓

Is this component used by 2+ features?
  → NO: Does it belong to a specific feature page section?
    → YES: features/<page-name>/<section-name>/
    → NO: Is it page-private (only one page uses it)?
      → YES: app/<route>/_components/
      → NO: Re-evaluate — likely fits features/ or shared/
  → YES ↓

Is it a simple composition of ui/ primitives representing a
recurring visual pattern (card, stat block, media object)?
  → YES: shared/
  → NO ↓

Is it a full page section or multi-component composition
(has hooks, scroll logic, animation, complex sub-components)?
  → YES: Can differences across pages be handled via props
    (content, IDs, classNames)?
    → YES: Shared feature domain — features/<domain-name>/
    → NO: Separate page-scoped feature folders
  → NO: Re-evaluate whether 2+ feature usage is real
```

---

## Layout Tier vs Next.js `layout.tsx` — They Are Different

| `src/app/layout.tsx`                                | `src/components/layout/Header.tsx`        |
| --------------------------------------------------- | ----------------------------------------- |
| Next.js special file (routing, metadata, providers) | Reusable layout component (visual chrome) |
| `export default function` declaration               | Arrow function export                     |
| Orchestrates `components/layout/`                   | Consumed by `app/layout.tsx`              |

`layout.tsx` **imports from** `components/layout/`. They collaborate — not competing:

```tsx
// src/app/layout.tsx — Next.js special file
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"en'>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

---

## Layout vs Page Chrome — Decision Tree

```
Is this chrome (header, footer, nav, sidebar) shared across multiple routes?
  → YES: Put it in layout.tsx (root or route group layout)
  → NO: Is it specific to only ONE page?
    → YES: Put it in page.tsx or _components/
    → NO: It's shared — put it in layout.tsx
```

**Why**: `error.tsx` and `not-found.tsx` render within the layout — if Navbar/Footer live in `layout.tsx`, they appear on error and 404 pages without duplication.

```tsx
// ✅ Correct — shared chrome in layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"en'>
      <body>
        <SkipNav />
        <Navbar />
        <main id='main-content'>{children}</main>
        <Footer />
      </body>
    </html>
  )
}

// src/app/page.tsx — only page-specific content
export default function HomePage() {
  return (
    <>
      <Hero />
      <Collections />
      <Services />
    </>
  )
}

// ❌ Wrong — chrome duplicated in page.tsx
export default function HomePage() {
  return (
    <>
      <Navbar /> {/* Should be in layout.tsx */}
      <main>
        <Hero />
      </main>
      <Footer /> {/* Should be in layout.tsx */}
    </>
  )
}
```

---

## One Component Per File

Every `.tsx` file exports exactly ONE React component. No secondary component functions in the same file.

**What stays in the same file (not separate components):**

- `cva()` definitions, variant maps, style objects at module scope
- Type definitions used only by that component
- Constants (animation variants, config objects, static maps)

**What MUST be a separate file:**

- Any function that returns JSX and is used in another component's render
- Any wrapper (animation wrapper, client boundary, layout helper)
- Any per-item component extracted from a `.map()` iteration

**Ownership rule:** Helpers, hooks, and types live inside the folder of the component that uses them — never in shared `components/`, `hooks/`, or `utils/` sub-folders. A dependency is owned by its consumer.

**Extraction exception:** When a helper, hook, or type is used by 2+ component folders, extract it to the appropriate shared location: hooks to `src/hooks/`, utilities to `src/lib/`, types to a shared types file. Co-location applies to single-consumer dependencies only.

---

## Component Splitting Triggers

A new sibling component file MUST be created when ANY of these is true:

1. A function returns JSX and is used in another component's render — it is its own component
2. A `.map()` iteration item needs its own hooks — extract into a named per-item component file
3. A visual region serves a different purpose from its parent (e.g., animated wrapper vs content layout)
4. JSX is duplicated across multiple places — extract to a shared sibling
5. A section of the component needs `'use client'` but the parent is a server component

**Split by responsibility, not by line count.** Line count is not a trigger.

---

## Folder Structure — Simple Component

```
ui/button/
  Button.tsx
  Button.stories.tsx       # When Storybook opted in
  index.ts
```

---

## Folder Structure — Feature Section (Flat + Graduated Sub-Components)

```
features/landing-page/hero/
  index.tsx                          # HeroSection (main component)
  index.ts                           # Barrel: exports only HeroSection
  heroContent.ts                     # Content contract/types
  HeroBackground.tsx                 # Simple sub-component — flat file
  HeroCta.tsx                        # Simple sub-component — flat file
  HeroContentSequence/               # Complex sub-component — graduated
    index.tsx                        # The component
    heroContentSequence.utils.ts     # Helpers for this component only
    useHeroContentAnimation.ts       # Hook for this component only
```

### Folder Graduation

A sub-component starts as a flat `.tsx` file. The moment it needs a helper, hook, utils, or types file, it graduates to a folder:

- **Before**: `HeroBackground.tsx` (flat file, no deps)
- **After**: `HeroBackground/index.tsx` + `useHeroParallax.ts` (graduated, has a hook)

The import path (`./HeroBackground`) doesn't change — it resolves to the folder's `index.tsx`.

---

## Folder Structure — Multi-Component Feature (Contained Composition)

When a feature component is composed of multiple sub-components that together form a single unit, all parts MUST live in their own folder under the feature domain. The folder contains every piece of the composition and exports a clean public API via barrel.

```
features/landing-page/
  hero/
    index.tsx                    # HeroSection (main component)
    index.ts                     # Barrel: exports only HeroSection
    heroContent.ts               # Content contract/types
    HeroBackground.tsx           # Simple sub-component — flat file
    HeroCta.tsx                  # Simple sub-component — flat file
    HeroContentSequence/         # Complex sub-component — graduated
      index.tsx                  # The component
      heroContentSequence.utils.ts
      useHeroContentAnimation.ts
  testimonials/
    index.tsx                    # TestimonialsSection (main)
    index.ts                     # Barrel
    testimonialsContent.ts
    TestimonialCard.tsx          # Simple sub-component
    TestimonialAvatar.tsx        # Simple sub-component
    TestimonialsCarousel/        # Complex — has its own hook
      index.tsx                  # Carousel interaction ('use client')
      useTestimonialAutoplay.ts  # Hook — co-located, NOT shared
```

**Rules:**

| Rule                                                                                                                                | Level    |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Every sub-component MUST be a separate file (flat `.tsx` or folder with `index.tsx`) — never a second function in the parent's file | **MUST** |
| Each composition lives in its own kebab-case folder                                                                                 | **MUST** |
| Sub-components are siblings of the main component                                                                                   | **MUST** |
| Only the main component is exported from `index.ts`                                                                                 | **MUST** |
| Sub-components are private — consumers never import them directly                                                                   | **MUST** |
| No `components/`, `hooks/`, or `utils/` sub-folders — sub-components with deps graduate to folders (see Folder Graduation)          | **MUST** |

```tsx
// ✅ features/landing-page/hero/index.ts — only main component is public
export { HeroSection } from './index'

// ✅ Consumer imports the composition as a single unit
import { HeroSection } from '@/components/features/landing-page/hero'

// ❌ Never import sub-components directly
import { HeroBackground } from '@/components/features/landing-page/hero/HeroBackground'
```

---

## Documentation Requirements

| Tier                   | Requirement                                                                | Level      |
| ---------------------- | -------------------------------------------------------------------------- | ---------- |
| `ui/`                  | JSDoc on non-obvious props                                                 | **MUST**   |
| `ui/`                  | Storybook story (when Storybook opted in) covering all variants and states | **MUST**   |
| `features/`, `layout/` | JSDoc on the main exported component explaining its purpose                | **SHOULD** |
| `features/`, `layout/` | Co-located test file (`*.test.tsx`) for complex logic                      | **SHOULD** |

```tsx
type TooltipProps = {
  /** Content shown inside the tooltip */
  content: string
  /** Which side of the trigger to position the tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Delay before showing (ms) */
  delayMs?: number
  children: React.ReactNode
}
```

---

## Anti-Patterns

| ❌ Anti-Pattern                                                            | ✅ Correct                                                                                  |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `ui/` imports from `features/` or `shared/`                                | Import flows downward — `ui/` imports nothing from `components/`                            |
| `features/A/` imports from `features/B/`                                   | Promote the shared component to `shared/` and import from there                             |
| Putting a reusable composite (card, stat block) in `ui/`                   | `ui/` is for primitives only; composites used across features go in `shared/`               |
| Raw `<section className="py-24">` in feature component                     | `<Section spacing="lg">` — use Section primitive instead of raw HTML with manual padding    |
| Sub-components for the same composition scattered across folders           | All parts go in one kebab-case composition folder                                           |
| `export { PricingCardHeader }` from composition barrel                     | Only `PricingCard` is exported; sub-components stay private                                 |
| `import { ProfileBio } from '.../user-profile/components/ProfileBio'`      | Import from barrel: `@/components/features/user-profile`                                    |
| Hooks inside `.map()`                                                      | Extract list item to its own component                                                      |
| One file with data-fetching + layout + interactivity                       | Split by responsibility                                                                     |
| Heavy mobile/desktop branching in one file                                 | Separate `MobileView.tsx` / `DesktopView.tsx`                                               |
| Skeletons in a separate distant folder                                     | Co-locate skeleton with its data component                                                  |
| Multiple React components defined in the same `.tsx` file                  | One component per file — extract additional components to their own sibling files           |
| `components/`, `hooks/`, or `utils/` sub-folders inside a component folder | Sub-components with deps graduate to a named folder (`SubComp/index.tsx` + co-located deps) |
| Splitting a component because the file is getting long                     | Split by responsibility, not line count — line count alone is never a trigger               |
