# Path B: Mockup + Existing Design System (Scenario B)

> Chosen mockup exists + tokens already customized (no placeholder comment). A design system already exists — the new mockup drives updates to it.

## Step 1 — Read Everything

1. Read the existing customized tokens from `tailwind.config.ts` and `globals.css`.
2. Read `src/components/ui/design-tokens.json` for the structured token inventory.
3. Read `src/components/ui/catalog.json` for an overview of all primitives. Read individual `manifest.json` files (e.g., `src/components/ui/button/manifest.json`) for primitives where the mockup clearly changes their styling. Read actual `.tsx` source files only when you need exact class strings for diff analysis.
4. Read `.github/flow-generator/FE/specs/mock-designer.manifest.json` → `chosen.file` → read the HTML mockup.
5. Extract the mockup's design values using the same analysis processes referenced in `path-a-fresh-mockup.patterns.md` §Step 2.

## Step 2 — Compare & Decide

Compare the existing design system against the new mockup. For every token and primitive, determine the action:

- **Update** — the mockup defines a different value (new color, different font, changed variant style). Update to match the mockup.
- **Add** — the mockup introduces something new that doesn't exist yet (new color token, new Typography variant, entirely new primitive like Card or Input). Add it.
- **Keep** — the existing value isn't contradicted by the mockup. Leave it as-is.
- **Remove** — a token or variant exists in the current design system but the new mockup clearly doesn't use it and it served no general purpose. Flag for removal.

The mockup is the source of truth for visual direction. The existing design system is the base you're updating — don't throw it away, build on it.

## Step 3 — Write the Update Brief

Write a `ui-foundation.brief.md` using the same template as Path A, but structured as a diff:

```yaml
---
approved: false
source_mockup: <filename from chosen.file>
strategy: update-from-mockup
---
```

For each token/primitive, use clear labels: `[UPDATE]`, `[ADD]`, `[KEEP]`, `[REMOVE]`. Only detail items that change or are new — don't repeat unchanged items except as a one-line `[KEEP] ...` note for completeness.

If the mockup introduces new primitives beyond the existing set, include them with the same detail as Path A.

## Gate Protocol

After writing the brief, follow the common gate protocol defined in `SKILL.md` §Common Gate Protocol. On approval, proceed to Phase 2 — load `skills/feo-ui-foundation-workflow/execution.patterns.md`.
