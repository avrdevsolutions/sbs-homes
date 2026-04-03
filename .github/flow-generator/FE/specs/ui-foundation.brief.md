---
approved: true
source_mockup: landing-page-mockup-r3-v2.html
---

# Foundation Brief

## Color Tokens

### Scaled Colors (full 50-950)

Primary (amber-orange, from mockup brand accent `--color-primary` / `--color-primary-dark`):

- 50: #FFF6ED
- 100: #FEEBD7
- 200: #FDD4AE
- 300: #FAB77A
- 400: #F59345
- 500: #E67F1D
- 600: #D4740E
- 700: #B5620B
- 800: #8F4E0C
- 900: #72410E
- 950: #3D2007

Secondary (warm neutral scale derived from mockup surfaces/background progression):

- 50: #FBFAF8
- 100: #F5F3F0
- 200: #EDEBE8
- 300: #E0DCD6
- 400: #C8C3BC
- 500: #AAA49C
- 600: #8B847C
- 700: #6F6962
- 800: #524D47
- 900: #35322F
- 950: #1C1C1E

Semantic sets will remain project semantic scales (success/warning/error/info) but remapped away from Tailwind default palette names in implementation.

### Flat Colors (single value)

- surface-dark: #1C1C1E
- surface-darker: #141416
- surface-warm: #F0EDE9
- annotation: #D4453A
- tone-earth-600: #8B7355
- tone-amber-500: #D4A843
- tone-steel-600: #556B7A
- tone-steel-500: #6E8B9E
- tone-stone-600: #7A7A7A
- tone-stone-700: #5A5A5A
- tone-sage-500: #8BA8A0
- tone-tan-500: #B5956E
- tone-porcelain-200: #E8E4DF
- tone-charcoal-700: #444444
- border-light-rgb: 255 255 255
- border-dark-rgb: 28 28 30
- white: #FFFFFF

### Reusable Technical Accent Palette

The mockup uses a dedicated technical accent palette (not only the brand accent). These colors are required tokens and will be implemented with neutral color-family names so badges, separators, and future data-visual elements can reuse them across contexts.

- tone-amber-brand-600: #D4740E
- tone-red-annotation-600: #D4453A
- tone-earth-600: #8B7355
- tone-amber-500: #D4A843
- tone-steel-600: #556B7A
- tone-steel-500: #6E8B9E
- tone-stone-600: #7A7A7A
- tone-stone-700: #5A5A5A
- tone-sage-500: #8BA8A0
- tone-tan-500: #B5956E
- tone-porcelain-200: #E8E4DF
- tone-charcoal-700: #444444

### CSS Custom Properties

Dynamic app shell:

- background: 38 18% 95% (from #F5F3F0)
- foreground: 240 3% 11% (from #1C1C1E)

Additional glass and structural properties to add in globals:

- glass-light: 245 243 240 / 0.45
- glass-dark: 20 20 22 / 0.50
- glass-border-light: 255 255 255 / 0.30
- glass-border-dark: 255 255 255 / 0.06
- border-strong: 28 28 30 / 0.10
- border-inverse: 255 255 255 / 0.10

## Font Tokens

| Token name | Font family     | CSS variable      | Fallback stack | Usage                                    |
| ---------- | --------------- | ----------------- | -------------- | ---------------------------------------- |
| display    | Instrument Sans | --font-display    | sans-serif     | Headings, labels, nav numbers            |
| body       | DM Sans         | --font-body       | sans-serif     | Paragraphs and utility text              |
| mono       | Geist Mono      | --font-geist-mono | monospace      | Existing utility/technical text fallback |

### next/font Registration

- Add Instrument Sans and DM Sans via next/font/google in src/app/layout.tsx.
- Keep Geist Mono for mono token continuity.
- Apply font variable classes on html or body.
- Update metadata placeholders while touching layout.

## Typography Variants

| Variant        | Font         | Size                         | Weight | Tracking        | Line-height | Transform | Default element |
| -------------- | ------------ | ---------------------------- | ------ | --------------- | ----------- | --------- | --------------- |
| h1             | font-display | 2.25rem / 3.25rem / 4.25rem  | 400    | 0.16em / 0.18em | 1.05        | uppercase | h1              |
| h2             | font-display | 1.25rem / 1.5rem / 1.75rem   | 400    | 0.1em           | 1.2         | uppercase | h2              |
| h3             | font-display | 1rem                         | 500    | 0.08em          | 1.3         | uppercase | h3              |
| h4             | font-display | 0.8125rem                    | 600    | 0.04em          | 1.4         | uppercase | h4              |
| body           | font-body    | 1rem                         | 400    | normal          | 1.75        | none      | p               |
| body-sm        | font-body    | 0.8125rem                    | 400    | normal          | 1.6         | none      | p               |
| caption        | font-display | 0.625rem                     | 600    | 0.08em          | 1.4         | uppercase | span            |
| overline       | font-display | 0.5625rem                    | 500    | 0.28em          | 1           | uppercase | span            |
| section-number | font-display | 5rem / 7rem / 9rem / 10.5rem | 400    | -0.01em         | 0.9         | none      | span            |

Notes:

- Keep color out of Typography variant maps; color comes from context classes.
- Register all custom font-size token keys in src/lib/utils.ts tailwind-merge extension.

## Primitives - Per-Component Plan

### Typography

- Extend variant axis with section-number.
- Retune all existing variants to match mockup typographic system.
- Keep polymorphic behavior.
- Update stories to show all variants and responsive examples.

### Button

- Retheme core variants to tokenized editorial system.
- Align primary and ghost styles to mockup (.btn-primary, .btn-ghost).
- Keep standard coverage: primary, secondary, outline, ghost, danger, link.
- Validate loading and focus-visible states against new tokens.

### Badge

- Retheme badge variants to fit warm-neutral system and dark-surface contexts.
- Keep semantic variants and outline.

### Container

- Add/adjust width and padding maps to support mockup rhythm:
  - standard max width ~74rem
  - narrow usage ~46rem via existing size axis mapping
  - responsive horizontal paddings (1.25rem, 2.5rem, 3.5rem)

### Section

- Extend spacing axis with spacious and compact to match section-standard/section-spacious/section-compact.
- Extend background axis with warm, warm-alt, dark, dark-deeper.
- Preserve fullBleed support.

### Stack

- Keep API; only retune class maps if needed for rhythm consistency.
- No axis expansion expected unless implementation reveals a recurring spacing gap not covered by current map.

### Separator

- Keep orientation/thickness/variant axes.
- Add or remap variant values to include subtle, inverse, and accent line treatments matching divider styles.

### Additional Primitives

- No new primitive required in this pass; chosen mockup can be satisfied by existing inventory.

## Design Tokens Manifest Plan

Update src/components/ui/design-tokens.json with:

- New scaled primary and secondary definitions.
- Flat colors list (surface-dark, surface-darker, surface-warm, annotation, white).
- Dynamic background/foreground values mapped to globals.
- Font tokens for display/body plus retained mono.
- Add icons config if missing:
  - library: lucide-react
  - defaultSize: 20
  - strokeWidth: 1.75

## Summary of Changes

- tailwind.config.ts: replace placeholder palette with Glass Spine token system, add custom fontSize/letterSpacing/spacing/shadows as named tokens.
- src/app/globals.css: define root and dark CSS variables for background, foreground, glass, border, and section surfaces.
- src/app/layout.tsx: register Instrument Sans + DM Sans via next/font/google and apply font variables.
- src/lib/utils.ts: sync extendTailwindMerge with all custom text-\* fontSize tokens.
- src/components/ui/design-tokens.json: update token inventory and add icons config.
- src/components/ui/catalog.json: update axes if any primitive axis keys change.
- src/components/ui/typography/Typography.tsx + manifest + story: new variant map values and section-number variant.
- src/components/ui/button/Button.tsx + manifest + story: variant class retheme.
- src/components/ui/badge/Badge.tsx + manifest + story: variant class retheme.
- src/components/ui/container/Container.tsx + manifest + story: width/padding map tuning.
- src/components/ui/section/Section.tsx + manifest + story: spacing/background axis updates.
- src/components/ui/stack/Stack.tsx + manifest + story: only if map tuning is needed.
- src/components/ui/separator/Separator.tsx + manifest + story: divider variant remap.
- src/components/ui/index.ts: export verification only if no API name changes.
