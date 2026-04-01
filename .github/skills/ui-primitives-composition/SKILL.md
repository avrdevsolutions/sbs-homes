---
name: ui-primitives-composition
description: >-
  Primitive composition patterns — Section+Container+Stack page rhythm, spacing tiers,
  fullBleed, Button link composition with buttonVariants(), dark/overlay section patterns,
  anti-patterns. Use when building page sections, composing layout with primitives,
  styling dark backgrounds, or creating CTA links.
---

# UI Primitives — Composition Patterns

**Compiled from**: ADR-0023 §Container, §Stack, §Section Spacing, §Button Link Composition
**Last synced**: 2026-03-11

---

> The primitives exist in `src/components/ui/`. Read their source for API details. This file covers **how to compose them** when building pages and features.

## Page Section Pattern

Every page section uses the `<Section>` primitive, which composes `<Container>` internally:

```tsx
<Section spacing='standard'>
  <Stack gap='6'>
    <Typography variant='h2'>Section Title</Typography>
    {/* section content */}
  </Stack>
</Section>
```

- `<Section>` owns the `<section>` element, vertical padding (via `spacing`), background (via `background`), and wraps children in `<Container>`
- `<Stack>` owns spacing between children
- Use `fullBleed` when content manages its own width (no Container wrapper)

**Never** put vertical padding on Container. **Never** use raw `<section>` + `<Container>` nesting — use `<Section>` instead.

---

## Section Spacing Rhythm

| Context          | `spacing` prop |
| ---------------- | -------------- |
| Hero             | `hero`         |
| Standard section | `standard`     |
| Compact section  | `compact`      |
| No padding       | `none`         |

Use nested `<Stack>` with purpose-specific gap values. Do NOT mix Stack gap with manual margin utilities (`mt-*`, `mb-*`).

---

## Full Page Example

```tsx
import { Section, Stack, Typography } from '@/components/ui'

function Page() {
  return (
    <Stack as='main' gap='0'>
      <Section spacing='hero' containerPadding='wide'>
        <Stack gap='6' align='center'>
          <Typography variant='h1'>Welcome</Typography>
          <Typography variant='body'>Intro paragraph…</Typography>
        </Stack>
      </Section>

      <Section spacing='standard'>
        <Stack gap='8'>
          <Typography variant='h2'>Features</Typography>
          {/* Feature cards */}
        </Stack>
      </Section>
    </Stack>
  )
}
```

---

## Stack — Why Static Maps Matter

Tailwind JIT scans source for complete class strings. Interpolated templates like `` `gap-${gap}` `` produce dynamic strings that Tailwind cannot detect at build time — the class is silently missing.

Stack's `gapMap`, `alignMap`, and `justifyMap` are static objects mapping props to full class strings. **Never** replace them with template-literal interpolation.

### Responsive Direction

Stack has no `responsiveDirection` prop. Use `className` override:

```tsx
<Stack direction='col' gap='4' className='md:flex-row'>
  {/* Vertical on mobile, horizontal on md+ */}
</Stack>
```

---

## Button — Link Composition

Button has no `as` prop. For link-styled navigation, use `buttonVariants()` on Next.js `Link`:

```tsx
import Link from 'next/link'
import { buttonVariants } from '@/components/ui'
;<Link href='/about' className={buttonVariants({ variant: 'outline', size: 'md' })}>
  About Us
</Link>
```

For text-only CTAs and navigation links with no box model, use the `inline` size:

```tsx
import Link from 'next/link'
import { buttonVariants } from '@/components/ui'

// Inline text CTA — no height, no padding
<Link href='/collection' className={buttonVariants({ variant: 'link', size: 'inline' })}>
  Explore Collection →
</Link>

// Or with Button directly
<Button variant='link' size='inline'>View Details</Button>
<Button variant='ghost' size='inline'>Learn More</Button>
```

---

## Anti-Patterns

```tsx
// ❌ Raw heading with ad-hoc Tailwind
<h1 className="text-4xl font-bold">Title</h1>
// ✅ Typography primitive
<Typography variant="h1">Title</Typography>

// ❌ Skipping heading levels
<Typography variant="h1">Page</Typography>
<Typography variant="h3">Section</Typography>  // skipped h2!
// ✅ Correct hierarchy (use as prop if visual differs from semantic)
<Typography variant="h1">Page</Typography>
<Typography variant="h2">Section</Typography>

// ❌ Ad-hoc max-width instead of Container
<div className="mx-auto max-w-7xl px-6">{/* content */}</div>
// ✅ Container primitive
<Container>{/* content */}</Container>

// ❌ Mixed spacing: Stack gap + manual margins
<Stack gap="6">
  <Heading />
  <div className="mt-12">Footer</div>
</Stack>
// ✅ Nested Stacks with appropriate gaps
<Stack gap="6">
  <Heading />
</Stack>

// ❌ Dynamic gap interpolation
<div className={`gap-${size}`}>...</div>
// ✅ Stack with static gapMap
<Stack gap="6">...</Stack>

// ❌ Ad-hoc section with manual padding
<section className="py-16"><Container>...</Container></section>
// ✅ Section primitive
<Section spacing="standard">...</Section>

// ❌ Container with vertical padding
<Container className="py-16">...</Container>
// ✅ Section owns vertical padding
<Section spacing="standard">...</Section>
```

---

## Dark & Overlay Section Patterns

### Color Inheritance Principle

Typography defines structure only (size, weight, tracking, line-height, text-transform) — **no color in `variantStyles`**. Text color comes from the parent section via CSS inheritance. Only muted or accent text needs an explicit `className` override.

This means the same `<Typography variant="h2">` works on any background — light, dark, image overlay, brand-colored — without any variant changes.

### Dark Section

```tsx
<Section spacing='standard' background='inverse' className='text-white'>
  <Stack gap='6'>
    <Typography variant='overline' className='text-white/70'>
      Newsletter
    </Typography>
    <Typography variant='h2'>Stay Connected</Typography>
    <Typography variant='body' className='text-white/80'>
      Subscribe to our updates.
    </Typography>
    <Separator variant='inverse' />
  </Stack>
</Section>
```

- `background='inverse'` sets the dark background + text color context
- Typography inherits — no overrides needed for full-opacity text
- Muted text uses explicit `className` for reduced opacity
- Separator uses `variant='inverse'` for light-on-dark dividers

### Image Overlay Section

```tsx
<Section spacing='hero' fullBleed>
  <div className='relative'>
    <img className='absolute inset-0 h-full w-full object-cover' src='...' alt='...' />
    <div className='absolute inset-0 bg-gradient-to-t from-black/80 to-black/20' />
    <Container className='relative z-10 py-20 text-white lg:py-32'>
      <Stack gap='6'>
        <Typography variant='overline' className='text-white/70'>
          Gallery
        </Typography>
        <Typography variant='h1'>Hero Title</Typography>
        <Typography variant='body' className='text-white/80'>
          Supporting text.
        </Typography>
      </Stack>
    </Container>
  </div>
</Section>
```

- `fullBleed` skips the internal Container so the image fills edge to edge
- Manual Container inside with `relative z-10` to sit above the overlay
- Same Typography variants — structure unchanged, only color context differs

### Colored Background Section

```tsx
<Section spacing='compact' background='primary'>
  <Stack direction='row' gap='4' align='center' justify='between'>
    <Typography variant='body'>Ready to visit?</Typography>
    <Button variant='outline' className='border-white text-white hover:bg-white/10'>
      Book Now
    </Button>
  </Stack>
</Section>
```

- `background='primary'` sets brand-colored background with white text context
- Button `outline` variant overrides border/text to white via `className`
- `spacing='compact'` for CTA banners
