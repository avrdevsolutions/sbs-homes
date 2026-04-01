---
name: components-shared
description: >-
  Shared component tier — shared/ folder structure (simple/multi/complex), shared vs ui/
  boundary decision table, barrel export patterns including top-level barrel, promotion
  workflow (when to promote, when not to, 10-step checklist, promotion example),
  shared-specific anti-patterns. Use when creating a shared component, deciding whether
  a component belongs in shared/ vs ui/, promoting a component from features/ to shared/,
  or auditing imports in an existing shared component.
---

# Components — Shared Tier

**Compiled from**: ADR-0028 §Shared vs UI, §Folder Structure, §Promotion, §Anti-Patterns
**Last synced**: 2026-03-26

> This skill covers `shared/` tier specifics — folder structure, promotion workflow,
> and shared vs ui/ boundary. It does not cover the full tier placement decision tree
> or general splitting/barrel rules that apply equally across all tiers.

---

## Shared vs UI — The Boundary

This is the most common source of confusion. Use this table to decide:

| Question                                                      | `ui/`               | `shared/`                      |
| ------------------------------------------------------------- | ------------------- | ------------------------------ |
| Encodes design tokens (spacing, colors, typography scale)?    | Yes                 | Uses them via `ui/` primitives |
| Has knowledge of content patterns (cards, stats, quotes)?     | No                  | Yes                            |
| Appears in a design system documentation site?                | Yes                 | No                             |
| Uses `catalog.json` / `manifest.json` for inventory tracking? | Yes                 | No                             |
| Composed from other `ui/` primitives?                         | Rarely (leaf nodes) | Always                         |

**Practical test**: If you can use the component without knowing what content it will display — it's about _structure and style_, not _content pattern_ — it belongs in `ui/`. If it represents a _specific content arrangement_ (image + title + description in a card layout), it belongs in `shared/`.

---

## Folder Structure

`shared/` follows the same conventions as `features/`, **without** the page-name grouping level. Shared components are grouped by pattern type — that's what makes them shared.

### Simple Shared Component

```
shared/
  content-card/
    ContentCard.tsx          # Main component
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

---

## Barrel Export Patterns

```tsx
// ✅ shared/content-card/index.ts — only main component is public
export { ContentCard } from './ContentCard'

// ✅ When consumers also need the prop types:
export { ContentCard } from './ContentCard'
export type { ContentCardProps } from './types'

// ❌ Never export sub-components
export { ContentCardImage } from './ContentCardImage'
```

### Optional Top-Level Barrel

When multiple shared components accumulate, add a top-level barrel for clean imports:

```tsx
// shared/index.ts — optional, add once there are 3+ shared components
export { ContentCard } from './content-card'
export { TestimonialCard } from './testimonial-card'
export { StatBlock } from './stat-block'
```

```tsx
// ✅ Consumer — import from top-level barrel
import { ContentCard, StatBlock } from '@/components/shared'

// ✅ Also valid — import from individual component barrel
import { ContentCard } from '@/components/shared/content-card'
```

---

## Promotion: Moving a Component to `shared/`

### When to Promote

Promote a component from `features/` to `shared/` when **any** of these is true:

1. **A second feature needs it** — another feature needs the same visual pattern.
2. **It's clearly generic** — it accepts content via props, has no domain coupling, and uses generic prop names. A component that is obviously reusable MAY be created directly in `shared/` even if only 1 feature uses it today.
3. **No feature-domain coupling** — it represents a visual pattern (card layout, stat display), not a feature-specific orchestration (checkout flow, user profile header).
4. **Content via props** — it can accept all its content through typed props; nothing is hardcoded.

### When NOT to Promote

- **It's a design-system primitive** — promote to `ui/` instead, following the primitive authoring process.
- **It contains feature-specific logic** — extract the visual pattern into `shared/`, keep the logic in `features/`.
- **It imports from `features/`** — a `shared/` component must only import from `ui/`. If it depends on feature code, it cannot be promoted without first removing that dependency.

### 10-Step Promotion Checklist

1. **Verify the trigger**: Confirm 2+ features need this component (or will imminently).
2. **Audit imports**: The component must only import from `@/components/ui` (and standard libraries). Remove any feature-specific imports.
3. **Generalize props**: Replace feature-specific prop names with generic ones (e.g., `productTitle` → `title`, `productImage` → `image`).
4. **Create the `shared/` folder**: `src/components/shared/<component-name>/` with the component file(s) and `index.ts` barrel.
5. **Move the component**: Copy files from the old feature location to the new shared location.
6. **Update imports in the original feature**: Change from the old feature path to `@/components/shared/<component-name>`.
7. **Add imports in the new feature**: Import from `@/components/shared/<component-name>`.
8. **Remove the old feature location**: Delete the now-empty folder from `features/`.
9. **Update the top-level barrel** (if one exists): Add the export to `shared/index.ts`.
10. **Verify**: Run `pnpm build` to catch any broken imports.

**Graduated folder note:** If the promoted component is a graduated folder (has `index.tsx` + co-located deps), move the entire folder to `shared/`. Import paths in consumers update from `@/components/features/.../ComponentName` to `@/components/shared/component-name`.

### Promotion Example

Before: a `ProductCard` lives in `features/landing-page/products/` and `features/shop-page/catalog/` needs the same card layout.

```
# The pattern: image + title + price + CTA button — generic enough to share

# 1. Create shared component with generalized props
src/components/shared/
  content-card/
    ContentCard.tsx   # props: image, title, subtitle?, action?: ReactNode
    index.ts

# 2. Update both features to import from shared
# features/landing-page/products/Products.tsx
import { ContentCard } from '@/components/shared/content-card'

# features/shop-page/catalog/Catalog.tsx
import { ContentCard } from '@/components/shared/content-card'

# 3. Delete old feature location and update top-level barrel if it exists
```

---

## Anti-Patterns

These are specific to `shared/`. General component anti-patterns (splitting triggers, barrel rules, etc.) follow from the same rules as `features/`.

| ❌ Anti-Pattern                                                                                                         | ✅ Correct                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Promoting when only 1 feature uses the component and it has domain-specific props                                       | Keep in `features/` until it can be made generic, or generalize and promote                                                                                                                        |
| Putting composed content patterns (cards, stat blocks) in `ui/`                                                         | `ui/` is for primitives; composites used across features go in `shared/`                                                                                                                           |
| `shared/` components importing from `features/`                                                                         | `shared/` imports from `ui/` only — audit and remove any feature imports                                                                                                                           |
| Duplicating a **simple composite** across features instead of promoting to `shared/`                                    | Promote to `shared/` and import from there in both features                                                                                                                                        |
| Promoting **complex section-level composites** (scroll scenes, multi-component sections with hooks/motion) to `shared/` | Use a shared feature domain under `features/<domain-name>/` instead — `shared/` is for simple composites built from `ui/` primitives only. See `features.instructions.md` → Shared Feature Domains |
| Adding `catalog.json` or `manifest.json` to `shared/`                                                                   | `shared/` uses barrel exports only — no catalog or manifest files                                                                                                                                  |
| Speculatively putting domain-coupled components in `shared/` without genericizing                                       | Generalize props first, then promote — or keep in `features/` if domain coupling can't be removed                                                                                                  |
| Feature-specific prop names on shared components (`productTitle`, `userId`)                                             | Use generic prop names (`title`, `id`) to preserve reusability                                                                                                                                     |

### `shared/` vs Shared Feature Domain — Boundary

| Characteristic   | `shared/` tier                                               | Shared feature domain (`features/<domain>/`)                           |
| ---------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Complexity       | Simple composites of `ui/` primitives                        | Full page sections with sub-components, hooks, scroll logic, animation |
| Imports          | `ui/` only                                                   | `ui/`, `shared/`, standard libraries, `framer-motion`                  |
| Examples         | Content cards, stat blocks, testimonial cards, media objects | BenefitsSection, GalleryScrollScene, ProductTypesSection               |
| Parameterization | Generic props (`title`, `image`, `action`)                   | Content object + `pageSlug` for IDs/aria                               |
| Folder structure | `shared/<component-name>/`                                   | `features/<domain-name>/<section-name>/`                               |
