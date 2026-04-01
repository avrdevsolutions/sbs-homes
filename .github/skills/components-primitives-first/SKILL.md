---
name: components-primitives-first
description: >-
  Primitives-first rule — when to use Section, Container, Stack, Typography, Separator,
  Badge instead of raw HTML+Tailwind. Use when building feature or layout components
  and choosing between primitives and raw elements.
---

# Components — Primitives-First Rule

**Compiled from**: ADR-0004 §Primitives-First Rule
**Last synced**: 2026-03-13

> For primitive API details (props, variants, spacing values): see `instructions/ui-usage.instructions.md`.

---

## Rule: Reach for Primitives Before Writing Raw HTML+Tailwind

Feature and layout components MUST use existing UI primitives when a primitive covers the use case.

These are the most common primitive substitutions. For the full inventory, read `src/components/ui/catalog.json`. As new primitives are added, prefer them over raw HTML for their covered use cases.

| Use this primitive               | Instead of                                              | Level      |
| -------------------------------- | ------------------------------------------------------- | ---------- |
| `<Section spacing="lg">`         | `<section className="py-24 ...">`                       | **MUST**   |
| `<Container>`                    | `<div className="mx-auto max-w-7xl px-6 ...">`          | **MUST**   |
| `<Stack gap="md">`               | `<div className="flex flex-col gap-6 ...">`             | **MUST**   |
| `<Typography variant="h1">`      | `<h1 className="text-5xl font-bold ...">`               | **MUST**   |
| `<Typography variant="body-lg">` | `<p className="text-xl text-gray-600 ...">`             | **MUST**   |
| `<Separator>`                    | `<hr>` or `<div className="border-b ...">`              | **SHOULD** |
| `<Badge variant="success">`      | `<span className="rounded px-2 py-1 bg-green-100 ...">` | **SHOULD** |
| Raw `<div>` or `<span>`          | _(allowed when no primitive covers the use case)_       | Allowed    |

---

## ✅ Correct — Primitives-First

```tsx
import { Section, Stack, Typography, Button } from '@/components/ui'

export const Hero = ({ title, subtitle }: HeroProps) => (
  <Section spacing='lg' background='default'>
    <Stack gap='md' align='center'>
      <Typography variant='h1'>{title}</Typography>
      <Typography variant='body-lg'>{subtitle}</Typography>
      <Button>Get Started</Button>
    </Stack>
  </Section>
)
```

## ❌ Incorrect — Raw HTML when primitives exist

```tsx
export const Hero = ({ title, subtitle }: HeroProps) => (
  <section className='py-24'>
    <div className='mx-auto max-w-7xl px-6'>
      <div className='flex flex-col items-center gap-6'>
        <h1 className='text-5xl font-bold'>{title}</h1>
        <p className='text-xl text-gray-600'>{subtitle}</p> {/* gray-600 not a token */}
        <button className='rounded-lg bg-blue-600 px-6 py-3 text-white'>
          {' '}
          {/* blue-600 not a token */}
          Get Started
        </button>
      </div>
    </div>
  </section>
)
```

**Why the ❌ is wrong**:

1. Uses Tailwind default palette (`gray-600`, `blue-600`) — violates the project token rule — only colors from tailwind.config.ts are allowed.
2. Ad-hoc spacing values don't align with the token spacing scale.
3. Design changes (heading style, max-width, color) require find-and-replace across feature files instead of updating the primitive once.

---

## When Raw HTML Is Allowed

Raw `<div>` and `<span>` are appropriate for structural wrappers with no semantic meaning and no primitive equivalent — grid containers, conditional wrappers, absolute-positioned overlays:

```tsx
// ✅ Raw div for a 3-column grid — no Stack/Section equivalent
<div className="grid grid-cols-3 gap-8">
  {items.map((item) => <PricingCard key={item.id} {...item} />)}
</div>

// ✅ Raw span as an absolute overlay — no primitive covers this
<div className="relative">
  <Image src={src} alt={alt} fill />
  <span className="absolute inset-0 bg-black/40" aria-hidden="true" />
</div>
```
