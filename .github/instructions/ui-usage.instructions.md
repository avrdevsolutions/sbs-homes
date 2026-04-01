---
description: 'How to consume UI primitives in pages, features, and layout. See catalog.json for the current primitive inventory.'
applyTo: 'src/components/**'
---

# UI Primitive Usage Rules

> How to **consume** primitives from `@/components/ui` in pages, features, and layout.
> For **authoring** primitives see `ui-primitives.instructions.md`.

## Import

Always import primitives from the barrel: `import { ... } from '@/components/ui'`. See `src/components/ui/catalog.json` for available primitives.

## Typography

- All headings MUST use `<Typography>` — never raw `<h1 className="...">`.
- Heading hierarchy must not skip levels (h1 → h2 → h3, no h1 → h3).
- Use `as` prop when visual variant differs from semantic level: `<Typography variant="h2" as="h3">`.
- Body copy uses `variant="body"` (default) or `variant="body-sm"`.

## Layout

- Every page section MUST use `<Section>` — it composes `<Container>` internally with consistent spacing and background.
- Use `<Section spacing="standard">` for standard sections, `spacing="hero"` for heroes, `spacing="compact"` for banners.
- Use `background` prop for surface colors — `'default'`, `'alt'`, `'primary'`, `'inverse'`.
- Use `fullBleed` prop when content manages its own width (e.g., edge-to-edge images).
- For direct Container usage without section semantics: `<Container>` is still available.
- Default Container padding: `px-4 sm:px-6 lg:px-8` (customize per mockup).
- Use `<Stack>` for flex layouts — never duplicating `flex flex-col gap-*` by hand.
- Stack gap MUST use the `gap` prop — never dynamic `gap-${gap}` string interpolation.
- Stack responsive direction: use `className="md:flex-row"` override, not a responsive prop.

## Button

- Button heights match Input heights per size: `sm`=h-8, `md`=h-10, `lg`=h-12 (ADR-0012).
- Icon-only buttons MUST have `aria-label`.
- Loading state MUST set `disabled` + `aria-busy` (handled internally — just pass `loading`).
- Style `<Link>` as a button: `import { buttonVariants } from '@/components/ui'` then `<Link className={buttonVariants({ variant: 'primary' })}>`.

## Badge

- Use semantic variants (`success`, `warning`, `error`) for status indicators — not arbitrary color classes.

## Separator

- Use `decorative` (default) for visual dividers. Use `decorative={false}` only when the separator conveys a meaningful content boundary.

## General

- Pass `className` for one-off overrides — never duplicate a primitive's base styles.
