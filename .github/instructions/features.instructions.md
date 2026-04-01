---
description: 'Feature component rules — folder structure, import boundaries, props/content pattern, styling constraints, and splitting triggers.'
applyTo: 'src/components/features/**'
---

# Feature Component Rules

> Source: ADR-0004 (component tiers). Features tier: uses `ui/`, never imports from `layout/`.
> Universal rules (primitives-first, server-component default, project tokens) are in `copilot-instructions.md`. Named export rules are in `typescript-conventions.instructions.md`.

## Folder Structure

Feature sections are **grouped by page** under a page-level folder:

```
src/components/features/<page-name>/<section-name>/
├── <SectionName>.tsx
└── index.ts
```

- `<page-name>` is kebab-case and matches the page (e.g., `landing-page`, `about-page`).
- A section folder MUST NOT live directly under `features/` — it must be nested under its page folder.
- All sections for a given page live under the same page folder.

## Shared Feature Domains

When 2+ pages share the **same section architecture** — identical sections whose only differences are content, IDs, and prop values — the feature folder is named for the **domain pattern**, not a specific page.

```
src/components/features/<domain-name>/<section-name>/
├── <SectionName>.tsx      ← accepts content + pageSlug via props
└── index.ts
```

- `<domain-name>` describes the shared pattern (e.g., `product-page` serves both `/windows` and `/doors`).
- Each page route imports the same section components and passes its own content object and `pageSlug` string.
- Components use `pageSlug` to derive `id` and `aria-labelledby` attributes (e.g., ``id={`${pageSlug}-benefits-title`}``).
- Shared content **types** live in `src/dictionaries/<domain-name>.ts`. Page-specific content **values** live in `src/dictionaries/<page-name>.ts` and import the shared types.

**Decision rule — this is not a judgment call:**

| Condition                                                              | Action                                                                        |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Sections differ only by content, IDs, and props                        | Shared feature domain — extract immediately                                   |
| Sections differ structurally (different JSX, different sub-components) | Separate page-scoped feature folders                                          |
| One page has extra sections the other doesn't                          | Shared domain for the common sections; page-scoped folder for the unique ones |

**When to convert**: If a page-scoped feature folder already exists and a second page needs the same sections, refactor the existing folder into a shared feature domain and update all consumers. Do not duplicate.

## Import Boundaries

- MUST import primitives from `@/components/ui` barrel only.
- MAY import from `@/components/shared` barrel.
- MUST NOT import from `@/components/layout`.
- MUST NOT import from other `@/components/features/*` folders — when 2+ features need the same component, promote it to `shared/`.
- MAY import from sibling files within the same feature folder.

## Server Components (Feature-Specific)

- NO React hooks (`useState`, `useEffect`, `useRef`, etc.).
- NO event handlers (`onClick`, `onChange`, etc.).
- When the UX Integrator adds interactivity later, only the interactive part should be extracted to a client component.

## Props & Content

- MUST receive content through typed props — no hardcoded strings in JSX.
- Content interfaces live in `src/dictionaries/<page>.ts` (or `src/dictionaries/<domain>.ts` for shared feature domains).
- For shared feature domains, components MUST accept a `pageSlug` prop to derive unique IDs and aria attributes. Never hardcode page-specific identifiers.
- Images use `next/image` with explicit `width`/`height` or `fill`. Always include `alt`.

## Barrel Exports

- Each folder MUST have an `index.ts` barrel exporting only the main component.
- Sub-components are siblings in the same folder, not exported from the barrel.

## Styling

- No arbitrary Tailwind bracket values in className (e.g., `w-[28vw]`, `text-[2.75rem]`) — use named tokens from `tailwind.config.ts`.
- No template-literal className interpolation (e.g., `gap-${size}`) — use static class strings.
- Inline `style={}` for MotionValues, viewport-dependent dimensions (vw/vh), and scroll-scene heights is the correct pattern — not a violation of these rules.

## Splitting

Extract a sub-component when: JSX exceeds ~120 lines, a list item pattern repeats, or a region has a distinct purpose.
