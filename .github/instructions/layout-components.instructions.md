---
description: 'Layout component rules — import boundaries, barrel exports, and styling constraints for the layout tier.'
applyTo: 'src/components/layout/**'
---

# Layout Component Rules

> Source: ADR-0004 (component tiers). Layout tier: may import from `ui/` and `features/`.
> Universal rules (primitives-first, server-component default, project tokens) are in `copilot-instructions.md`. Named export rules are in `typescript-conventions.instructions.md`.

## Import Boundaries

- MAY import from `@/components/ui`, `@/components/shared`, and `@/components/features`.
- MUST NOT import from other layout components (no circular deps).

## Client Boundary (Layout-Specific)

- Interactive parts (mobile nav toggle, dropdowns) are added by the UX Integrator agent, not the UI Builder.

## Barrel Exports

- Each folder MUST have an `index.ts` barrel exporting only the main component.

## Styling

- No arbitrary Tailwind values.
