---
name: ui-primitives-authoring
description: >-
  UI primitive authoring workflows — extending existing primitives (add prop/variant,
  update story, sync manifest), creating new primitives (promotion trigger, tier check,
  folder structure, barrel exports, catalog updates). Use when adding a new primitive
  component, extending a primitive with new variants or props, or updating primitive
  manifest/catalog files.
---

# UI Primitives — Authoring Workflows

**Compiled from**: ADR-0023 §Extending, §Creating (constraints also in `ui-primitives.instructions.md`)
**Last synced**: 2026-03-21

---

## Extending an Existing Primitive

When adding a new prop or variant to an existing primitive:

1. **Add to the type** — extend the props type (or `cva` variants object for variant-driven components).
2. **Implement** — wire the prop into the component JSX/logic. Keep the `className` escape hatch working.
3. **Update the story** — add stories covering the new prop/variant. New variant → individual story + update `AllVariants`/`AllSizes` render stories.
4. **Update the barrel** — if you added a new named export (e.g., a variants function), re-export from `index.ts`.
5. **Update the manifest** — update `manifest.json` in the primitive's folder with any new variant values, props, or exports. If a new variant axis was added, also update `src/components/ui/catalog.json`.
6. **Sync design tokens** — if you added new tokens to `tailwind.config.ts` (e.g., a new color, spacing value, or font), update `src/components/ui/design-tokens.json` to reflect the addition.
7. **Sync tailwind-merge** — if you added or renamed custom `fontSize` keys in `tailwind.config.ts`, update `extendTailwindMerge` in `src/lib/utils.ts` to register them in the `font-size` class group. Without this, `cn()` silently strips custom `text-*` font-size utilities when merged with color classes. See skill `styling-tokens` for the full pattern.
8. **Never remove** an existing prop without checking all consumers first.

---

## Creating a New Primitive

### Promotion Trigger

If the same Tailwind pattern (3+ classes) appears in 3+ files, extract it into a primitive.

### Tier Check

- **Recommended** (Card, Input, Skeleton, Avatar, Icon wrapper) — build when first needed.
- **Optional** (Dialog, Dropdown, Tooltip, Tabs, Sheet, Toast, Accordion) — prefer shadcn/ui (Radix-based).

### Checklist

1. Create `src/components/ui/<name>/<Name>.tsx` — follow architecture rules in `ui-primitives.instructions.md`.
2. Create `src/components/ui/<name>/index.ts` — barrel export.
3. Re-export from `src/components/ui/index.ts`.
4. Create `src/components/ui/<name>/<Name>.stories.tsx` — see `storybook.instructions.md`.
5. If interactive (buttons, inputs, selects) — `forwardRef` + focus ring.
6. Accept `className` prop — merge with `cn()`.
7. Use project tokens only — no default Tailwind palette.
8. **Create the manifest** — create `manifest.json` in the new primitive's folder following the schema in existing `manifest.json` files.
9. **Update the catalog** — add the new primitive to `src/components/ui/catalog.json`.
10. **Sync design tokens** — if you added new tokens to `tailwind.config.ts`, update `src/components/ui/design-tokens.json`.
11. **Sync tailwind-merge** — if you added custom `fontSize` keys to `tailwind.config.ts`, register them in `extendTailwindMerge` in `src/lib/utils.ts`. See skill `styling-tokens`.

---

## Storybook Requirements for Primitives

- Every primitive MUST have a co-located `*.stories.tsx` file.
- Cover all variants + all interactive states (hover, focus, disabled, loading).
- When extending a primitive (new prop/variant) — update its story file in the same PR.
- See `storybook.instructions.md` for meta configuration and title conventions.

---

## Related Skills

- `ui-primitives-customization` — mockup-driven customization (Typography variant discovery, Button/Badge cva updates)
- `components-tiers` — component tier system and import boundaries
- `components-props` — props typing, composition patterns, ref forwarding
