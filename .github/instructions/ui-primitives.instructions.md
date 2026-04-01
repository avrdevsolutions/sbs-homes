---
description: 'UI primitive authoring constraints — architecture rules, ref forwarding scope, variant authoring, inventory. For extending/creating checklists see skill ui-primitives-authoring.'
applyTo: 'src/components/ui/**'
---

# UI Foundation Primitives — Authoring

> Source: ADR-0023. For component tiers and general structure see `components.instructions.md` (ADR-0004).
> For **consumption rules** (how to use primitives in pages/features) see `ui-usage.instructions.md`.
> Universal rules (primitives-first, server-component default, project tokens) are in `copilot-instructions.md`. Named export rules are in `typescript-conventions.instructions.md`.

## Primitive Inventory

All primitives listed in `src/components/ui/catalog.json` are **pre-built** in `src/components/ui/`. Read the catalog for the current inventory. Each primitive has a co-located `manifest.json` with full API surface (variant axes, props, defaults, exports). Customize from mockup — see skill `ui-primitives-customization`.

Base primitives (shipped by default):

1. Typography — polymorphic, semantic heading mapping + body/caption/overline variants
2. Button — `cva` variants, `forwardRef`, loading state
3. Container — max-width constraint + responsive horizontal padding
4. Section — composes Container, spacing + background presets for page sections
5. Stack — flex layout with static `gapMap`, `wrap`, `align`, `justify`
6. Badge — `cva` semantic color variants
7. Separator — horizontal/vertical, decorative vs semantic `role`

Recommended (Card, Input, Skeleton, Avatar, Icon wrapper) — build when first needed.
Optional (Dialog, Dropdown, Tooltip, Tabs, Sheet, Toast, Accordion) — build when needed by a feature or when a recurring Tailwind pattern (3+ classes, 2+ files) justifies extraction.

## Architecture Rules

- **Native HTML props pass-through** — every primitive MUST extend the native HTML props of its root element (via `React.ComponentPropsWithoutRef<T>` or `React.ComponentProps<T>`) and spread `...props` onto the root element. This lets consumers pass `id`, `aria-*`, `data-*`, and any other standard HTML attributes without the primitive needing to declare them explicitly.
- `cn()` for class merging + `className` escape hatch on every primitive.
- `cva` for variant-driven APIs (Button, Badge).
- Barrel `index.ts` per primitive folder + root `ui/index.ts` barrel.

## Ref Forwarding Scope

- **Interactive primitives** (Button, Input, Select, Textarea, Checkbox) — MUST `forwardRef`.
- **Layout primitives** (Typography, Container, Section, Stack, Separator) — exempt. Add `forwardRef` only if a specific need arises.

## Variant Authoring Rules

- Any text pattern recurring 3+ times across mockup sections MUST become a Typography variant.
- Variant values MUST come from the chosen mockup's CSS — not from ADR template defaults.
- Max 12 Typography variants — if exceeded, split into separate components.
- Standard variant coverage: build variants the project will predictably need, not just what the mockup shows.

## Extending or Creating Primitives

See skill `ui-primitives-authoring` for the full checklists (extending existing, creating new, manifest/catalog updates).

## Storybook

- Every primitive MUST have a co-located `*.stories.tsx` — see `storybook.instructions.md`.
- Cover all variants + all interactive states (hover, focus, disabled, loading).
- When extending a primitive (new prop/variant) — update its story file in the same PR.

## Cascade Rule — CRITICAL (Hard Gate)

Any edit to a file in `src/components/ui/{primitive}/` triggers the **Primitive Cascade**. This is a HARD GATE — you cannot report completion until the cascade is verified.

### What Triggers the Cascade

| If you changed…                          | You MUST also update…                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| Variant values (added/removed)           | `manifest.json` → `variantAxes`, `catalog.json` → `axes` (if axis keys changed) |
| Props (added/removed/renamed)            | `manifest.json` → `props`                                                       |
| Defaults                                 | `manifest.json` → `defaults`                                                    |
| Exports                                  | `manifest.json` → `exports`                                                     |
| New tokens used (e.g., color or spacing) | `design-tokens.json` (if the token doesn't already exist)                       |
| Any behavior change                      | `*.stories.tsx` (add or update stories to cover the change)                     |

### Protocol

1. **Before editing**: Read the primitive's `manifest.json`. Note current `variantAxes`, `props`, `defaults`, `exports`.
2. **Edit**: Make the change to the `.tsx` file.
3. **Immediately after**: Update every cascade item from the table above that applies. Do not defer to a later phase.
4. **Verify**: Run the checklist below before moving to the next primitive or reporting completion.

### Verification Checklist

After editing a primitive:

- [ ] `manifest.json` `variantAxes` matches actual cva/record-map variants in source
- [ ] `manifest.json` `props` matches actual component props
- [ ] `manifest.json` `exports` matches actual barrel exports
- [ ] `catalog.json` `axes` array matches `manifest.json` `variantAxes` keys
- [ ] `design-tokens.json` has all tokens referenced by the primitive (no arbitrary Tailwind values)
- [ ] `*.stories.tsx` covers all variant combinations

### Why This Matters

Manifests are the source of truth for downstream agents. Stale metadata causes:

- Builder using non-existent variants or passing wrong props
- Documentation drift between manifest and source
- Quality gate failures in later pipeline phases

The cascade is not optional. The unit of work is **file + cascade**, not file alone.

Enforced by the **G-Cascade** quality gate in foundation and builder workflows.

## Mockup-Driven Customization

See skill `ui-primitives-customization` for the full process.
The mockup drives **visual values** — not what gets built. All primitives in `catalog.json` stay unconditionally.
