# ADR-0028: Shared Component Tier

**Status**: Accepted
**Date**: 2026-03-24

---

## Context

ADR-0004 defines a tiered component system with `ui/`, `features/`, and `layout/`. This works when every component is used by exactly one feature. In practice, when a project grows to multiple pages, composites built for one feature (e.g., a product card in `features/landing-page/products/`) are needed by another feature (e.g., `features/about-page/team/`). The existing rules offered no legitimate place for these reusable composites:

- **`ui/`** is reserved for design-system primitives (per ADR-0023) — promoting a composed card there violates the primitives-only boundary.
- **`features/`** forbids cross-feature imports — cross-feature coupling creates a dependency web that makes features hard to move, rename, or delete independently.
- **Duplication** (copy-pasting the component into each feature) violates DRY and causes design drift.

### Industry Alignment

This pattern is well-established in production codebases:

- **Bulletproof React** (the canonical React architecture reference) uses `src/components` for shared components separate from `src/features`, with ESLint rules forbidding cross-feature imports and enforcing unidirectional flow: `shared → features → app`.
- **Vercel, Stripe, Linear** all separate design-system primitives (Button, Input) from composed patterns (DataCard, MetricDisplay) that are reused across features. The composed patterns live in a shared layer between primitives and features.

The universal principle: **when a feature-local component is needed by 2+ features, promote it to a shared layer — never duplicate it, never allow cross-feature imports.**

## Decision

**Add a `shared/` tier at `src/components/shared/` between `ui/` and `features/`.** ADR-0004's tier table and import diagram have been updated to reflect this. All existing ADR-0004 rules (splitting triggers, export rules, props patterns, composition patterns, accessibility, server/client boundaries) apply to `shared/` components the same way they apply to `features/` components.

This ADR covers only what is unique to the `shared/` tier: what belongs there (vs `ui/` or `features/`), folder structure, promotion workflow, and shared-specific anti-patterns.

---

## Shared-Tier Rules

| Rule                                                                                                    | Level        |
| ------------------------------------------------------------------------------------------------------- | ------------ |
| `shared/` components MUST import from `ui/` barrel only — never from `features/`, `layout/`, or `app/`  | **MUST**     |
| `shared/` does NOT use `catalog.json` or `manifest.json` — those are `ui/`-tier concerns (per ADR-0023) | **MUST NOT** |
| A component SHOULD only be promoted to `shared/` when used by 2+ features                               | **SHOULD**   |
| `shared/` components SHOULD receive content through typed props — no hardcoded strings                  | **SHOULD**   |
| `shared/` components SHOULD use generic prop names (e.g., `title` not `productTitle`)                   | **SHOULD**   |

All other rules (named exports, barrel exports, Server Component default, primitives-first, project tokens, splitting triggers, sub-component privacy) are inherited from ADR-0004 — they are not repeated here.

---

## What Belongs in `shared/`

Mid-level composed components built from `ui/` primitives that represent a **recurring content pattern** used across 2+ features. They know about a visual pattern (e.g., "a card with image, title, and description") but are not tied to a specific feature's page or data shape.

**Typical examples (illustrative, not exhaustive)**:

- Content cards (image + text + optional CTA)
- Stat display blocks (number + label + optional trend)
- Testimonial cards (quote + author + avatar)
- Media objects (image/icon + text stack)
- Feature list items (icon + heading + description)
- Price display units (amount + currency + period)

**Rule of thumb**: If 2+ features need the same visual pattern, and it's composed from `ui/` primitives rather than being a primitive itself, it belongs in `shared/`.

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
    → NO: Is it page-private (used in only one page)?
      → YES: app/<route>/_components/
      → NO: Re-evaluate — it likely fits features/ or shared/
  → YES ↓

Is it a composition of ui/ primitives representing a
recurring visual pattern (not a domain-specific section)?
  → YES: shared/
  → NO: Refactor — extract the shared visual pattern into
         shared/, keep the domain-specific wrapper in features/
```

---

## Shared vs UI: The Boundary

The distinction between `ui/` and `shared/` is a common point of confusion:

| Question                                                      | `ui/`               | `shared/`                      |
| ------------------------------------------------------------- | ------------------- | ------------------------------ |
| Encodes design tokens (spacing, colors, typography scale)?    | Yes                 | Uses them via `ui/` primitives |
| Has knowledge of content patterns (cards, stats, quotes)?     | No                  | Yes                            |
| Appears in a design system documentation site?                | Yes                 | No                             |
| Uses `catalog.json` / `manifest.json` for inventory tracking? | Yes                 | No                             |
| Composed from other `ui/` primitives?                         | Rarely (leaf nodes) | Always                         |

**A practical test**: If you can use the component without knowing what content it will display (it's about _structure and style_, not _content pattern_), it's a `ui/` primitive. If it represents a _specific content arrangement_ (image + title + description in a card layout), it's `shared/`.

---

## Folder Structure

`shared/` follows the same folder conventions as `features/` (per ADR-0004), **without** the page-name grouping level. Shared components are grouped by pattern type, not by page — that's what makes them shared.

### Simple Shared Component

```
shared/
  content-card/
    ContentCard.tsx          # Main component — flat, no deps
    index.ts                 # Barrel: exports ContentCard only
```

### Multi-Component Shared Composition

```
shared/
  testimonial-card/
    index.tsx                # TestimonialCard (main, composes sub-components)
    index.ts                 # Barrel: exports TestimonialCard only
    TestimonialCardQuote.tsx # Simple sub-component — flat file
    TestimonialCardAuthor.tsx# Simple sub-component — flat file
```

### Complex Shared Component (sub-components with deps)

```
shared/
  stat-block/
    index.tsx                # StatBlock (main component)
    index.ts                 # Barrel: exports StatBlock only
    types.ts                 # Types used by StatBlock and its children
    StatValue.tsx            # Simple sub-component — flat file
    StatTrend/               # Complex sub-component — graduated
      index.tsx              # The component
      useCountUp.ts          # Hook for this component only
```

No `components/` or `hooks/` sub-folders. Sub-components are siblings of the main component. Complex ones graduate to folders.

### Barrel Export Pattern

```tsx
// ✅ shared/content-card/index.ts — only main component is public
export { ContentCard } from './ContentCard'

// ✅ When the component has types that consumers need:
export { ContentCard } from './ContentCard'
export type { ContentCardProps } from './types'

// ❌ Never export sub-components
export { ContentCardImage } from './ContentCardImage'
```

### Top-Level Barrel (Optional)

If the project accumulates multiple shared components, a top-level barrel keeps imports clean:

```tsx
// ✅ shared/index.ts — optional top-level barrel
export { ContentCard } from './content-card'
export { TestimonialCard } from './testimonial-card'
export { StatBlock } from './stat-block'
```

```tsx
// ✅ Consumer: clean import from barrel
import { ContentCard, StatBlock } from '@/components/shared'

// ✅ Also valid: import from individual component barrel
import { ContentCard } from '@/components/shared/content-card'
```

---

## Promotion: Moving a Component to `shared/`

### When to Promote

A component SHOULD be promoted from `features/` to `shared/` when:

1. **A second feature needs it** — the component is currently in one feature folder and another feature needs the same visual pattern.
2. **The component has no feature-domain coupling** — it represents a visual pattern (a card layout, a stat display), not a feature-specific orchestration (a checkout flow, a user profile header).
3. **The component can accept its content via props** — it doesn't hardcode feature-specific data or import feature-specific modules.

### When NOT to Promote

- **One feature uses it** — keep it in `features/`. Premature promotion adds indirection without benefit.
- **It's a design-system primitive** — promote to `ui/` instead, following ADR-0023's primitive authoring process.
- **It contains feature-specific logic** — extract the visual pattern into `shared/`, keep the logic in `features/`.
- **It imports from `features/`** — a `shared/` component must only import from `ui/`. If it depends on feature code, it's not truly shared.

### Promotion Checklist

When promoting a component from `features/` to `shared/`:

1. **Verify the trigger**: Confirm 2+ features need this component (or will imminently).
2. **Audit imports**: The component must only import from `@/components/ui` (and standard libraries). Remove any feature-specific imports.
3. **Generalize props**: Replace feature-specific prop names with generic ones. For example, rename `productTitle` to `title`, `productImage` to `image`.
4. **Create the `shared/` folder**: `src/components/shared/<component-name>/` with the component file(s) and `index.ts` barrel.
5. **Move the component**: Move files from the old feature location to the new shared location.
6. **Update imports in the original feature**: Change from the old feature path to `@/components/shared/<component-name>`.
7. **Add imports in the new feature**: Import from `@/components/shared/<component-name>`.
8. **Remove the old feature location**: Delete the now-empty folder from `features/`.
9. **Update the top-level barrel** (if one exists): Add the export to `shared/index.ts`.
10. **Verify**: Run the build (`pnpm build`) to catch any broken imports.

**Graduated folder note:** If the promoted component is a graduated folder (has `index.tsx` + co-located deps), move the entire folder to `shared/`. Import paths in consumers update from `@/components/features/.../ComponentName` to `@/components/shared/component-name`.

### Promotion Example

Before — a `ProductCard` lives in `features/landing-page/products/` and `features/shop-page/catalog/` needs the same card layout:

```
# Step 1: Identify the shared visual pattern
# ProductCard renders: image + title + price + CTA button
# This is a generic "content card" — not product-specific

# Step 2: Create shared component with generalized props
shared/
  content-card/
    ContentCard.tsx     # image + title + subtitle + optional action
    index.ts

# Step 3: Update both features to use the shared component
features/landing-page/products/Products.tsx
  → import { ContentCard } from '@/components/shared/content-card'

features/shop-page/catalog/Catalog.tsx
  → import { ContentCard } from '@/components/shared/content-card'

# Step 4: Remove the old ProductCard from features/landing-page/products/
# (if it was a separate sub-component file)
```

---

## Anti-Patterns

These anti-patterns are specific to the `shared/` tier. General component anti-patterns are in ADR-0004.

| Anti-Pattern                                                              | Why It's Wrong                                                                 | Correct Approach                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Promoting a component to `shared/` when only 1 feature uses it            | Premature abstraction — adds indirection without benefit                       | Keep in `features/` until a second feature needs it               |
| Putting composed content patterns (cards, stat blocks) in `ui/`           | `ui/` is for design-system primitives, not content compositions (per ADR-0023) | Put reusable composites in `shared/`                              |
| Creating `shared/` components that import from `features/`                | Violates the import direction — `shared/` sits below `features/`               | Shared components import from `ui/` only                          |
| Duplicating a component across features instead of promoting to `shared/` | Design drift — copies diverge over time, bugs must be fixed in multiple places | Promote to `shared/` and import from there                        |
| Adding `catalog.json` or `manifest.json` to `shared/`                     | Those are `ui/`-tier inventory mechanisms (per ADR-0023)                       | `shared/` uses barrel exports only — no catalog or manifest files |
| Putting everything in `shared/` proactively ("might need it later")       | YAGNI — speculative sharing bloats the shared layer                            | Start in `features/`, promote when 2+ features actually need it   |
| Creating `shared/` components with feature-specific prop names            | Reduces reusability — couples the component to one feature's vocabulary        | Use generic prop names (e.g., `title` not `productTitle`)         |

---

## Cross-References

- **ADR-0004** (Component Structure & Tiers) — tier table and import boundaries updated to include `shared/`. All ADR-0004 rules apply to `shared/` the same way they apply to `features/`.
- **ADR-0023** (UI Foundation Primitives) — defines what belongs in `ui/` and the primitive authoring process. `shared/` components are explicitly NOT primitives.
- **ADR-0002** (Styling) — `shared/` components must use project tokens only, same as all other tiers.
