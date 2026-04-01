# Path A: Fresh Mockup (Scenario A)

> Chosen mockup exists + placeholder tokens still present. First-run path — no previous design system.

This phase is **read-only analysis + brief writing**. You do NOT edit any source files yet.

## Step 1 — Read the Chosen Mockup

1. Read `.github/flow-generator/FE/specs/mock-designer.manifest.json` and find the `chosen.file` key.
2. Read the chosen mockup HTML file from `public/_mockups/`.
3. Read the current state of these files for comparison:
   - `tailwind.config.ts` — current token structure
   - `src/app/globals.css` — current CSS custom properties
   - `src/app/layout.tsx` — current font registration
   - `src/components/ui/design-tokens.json` — structured token inventory (colors, fonts, custom tokens)
   - `src/components/ui/catalog.json` — overview of all primitives (names, patterns, variant axes)
   - For primitives where the brief will need a detailed per-component plan, read the specific `manifest.json` (e.g., `src/components/ui/button/manifest.json`). Do NOT read primitive `.tsx` source files during Phase 1 — the manifests provide the API surface needed for brief writing.

## Step 2 — Analyze the Mockup

Extract design values from the mockup's CSS following the processes in:

- skill `styling-tokens` §Step 1 — color extraction, flat vs scaled decision tree, HSL conversion
- skill `ui-primitives-customization` §Mockup-Driven Customization — what the mockup drives vs doesn't, variant discovery from recurring patterns
- skill `ui-primitives-customization` §Typography Variant Discovery — scan, group, map, translate text styles to variants

In particular, extract: `:root` CSS custom properties, `.type-*` typography classes, `.btn-*` button patterns, section backgrounds, border/separator patterns, container widths, spacing rhythm, and Google Fonts used (`@import` or `<link>` tags).

## Step 3 — Write the Foundation Brief

Write the brief to: **`.github/flow-generator/FE/specs/ui-foundation.brief.md`**

```markdown
---
approved: false
source_mockup: <filename from chosen.file>
---

# Foundation Brief

## Color Tokens

### Scaled Colors (full 50–950)

[Colors that need hover/active/focus states — primary, secondary, etc. Include the extracted hex values for each stop.]

### Flat Colors (single value)

[Surface/background colors used as-is — cream, charcoal, surface-warm, etc. Include the hex value.]

### CSS Custom Properties

[Colors that use `hsl(var(--...))` for light/dark switching — background, foreground. Include HSL component values.]

## Font Tokens

| Token name | Font family | CSS variable   | Fallback stack | Usage     |
| ---------- | ----------- | -------------- | -------------- | --------- |
| display    | [font name] | --font-display | serif          | Headings  |
| body       | [font name] | --font-body    | sans-serif     | Body text |

### next/font Registration

[Which fonts to import from `next/font/google`, variable names, subsets]

## Typography Variants

| Variant | Font         | Size | Weight | Tracking | Line-height | Transform | Default element |
| ------- | ------------ | ---- | ------ | -------- | ----------- | --------- | --------------- |
| h1      | font-display | ...  | ...    | ...      | ...         | none      | h1              |
| [etc.]  |              |      |        |          |             |           |                 |

[Note any custom variants beyond h1–h4, body, body-sm, caption, overline — e.g., display, eyebrow, lead]

## Primitives — Per-Component Plan

For each primitive listed in `src/components/ui/catalog.json`, describe:

- Which variants/props change and to what values
- Any new variants being added
- Keep standard variant coverage even if mockup shows fewer

If the mockup reveals a need for additional primitives beyond the catalog (e.g., Card, Input, Dialog), include those here too.

[Per-primitive sections here — one heading per primitive that has changes]

## Summary of Changes

[Bullet list of every file that will be modified and what changes]
```

## Gate Protocol

After writing the brief, follow the common gate protocol defined in `SKILL.md` §Common Gate Protocol. On approval, proceed to Phase 2 — load `skills/feo-ui-foundation-workflow/execution.patterns.md`.
