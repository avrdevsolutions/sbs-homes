---
name: motion-setup
description: >-
  Motion (Framer Motion) v12+ React setup — LazyMotion provider with domMax
  features and strict mode, import strategy (motion/react for hooks/utilities,
  motion/react-m for m.* namespace, motion/react-client for RSC), feature bundle
  decision (domAnimation vs domMax), async feature loading, m.* namespace vs
  motion.* explained, motion.create() for wrapping custom components (module-
  scope rule), useAnimate imperative API (scoped selectors, sequential/parallel/
  navigate-after, mini variant, usePresence composition), utilities
  (useMotionValue, useTransform, useMotionTemplate), Next.js integration (use
  client boundary, server/client split, next/dynamic ssr:false, SSR initial
  state). Use when setting up Motion in a Next.js project, configuring
  LazyMotion, wrapping custom components for animation, writing imperative
  animation sequences with useAnimate, or using MotionValues for performance-
  sensitive animations.
---

# Motion — Setup & Imperative API

**Compiled from**: ADR-0030 §1 (Setup & Installation), §9 (Imperative API), §10 (Utilities), §12 (Next.js Integration)
**Last synced**: 2026-04-04

---

## Installation

```bash
pnpm add motion
```

## Import Strategy

```tsx
// Hooks, utilities, LazyMotion, AnimatePresence, Reorder, LayoutGroup
import { LazyMotion, domMax, AnimatePresence, useReducedMotion, useAnimate } from 'motion/react'

// Tree-shakable namespace — use inside LazyMotion
import * as m from 'motion/react-m'

// RSC-compatible re-exports (Server Components only)
import * as motion from 'motion/react-client'
```

## LazyMotion Provider

`motion.*` (~34 kB) pre-bundles all features. `m.*` (4.6 kB base) loads no features — they are injected at runtime by `LazyMotion`.

```tsx
// app/layout.tsx (or a dedicated client wrapper)
'use client'

import { LazyMotion, domMax } from 'motion/react'

export const MotionProvider = ({ children }: { children: React.ReactNode }) => (
  <LazyMotion features={domMax} strict>
    {children}
  </LazyMotion>
)
```

`strict` mode throws a runtime error when a `motion.*` component renders inside `LazyMotion`, enforcing `m.*` and preventing 34 kB accidental full-bundle imports.

## Feature Bundle Decision

| Bundle         | Includes                                             | Added size | Use when                                                    |
| -------------- | ---------------------------------------------------- | ---------- | ----------------------------------------------------------- |
| `domAnimation` | Animations, variants, exit, hover/tap/focus gestures | +15 kB     | No layout animations or drag                                |
| `domMax`       | Everything + pan/drag + layout animations            | +25 kB     | **Default** — use when layout animations or drag are needed |

## Async Feature Loading

```tsx
// features.ts
import { domMax } from 'motion/react'
export default domMax

// layout.tsx
const loadFeatures = () => import('./features').then(res => res.default)

<LazyMotion features={loadFeatures} strict>
  {children}
</LazyMotion>
```

Use synchronous `features={domMax}` when animations must work on first render. Use async loading for below-the-fold or secondary animated content.

## `motion.create()` — Animating Custom Components

Wraps a third-party or custom React component to accept Motion props. The component must forward its `ref`.

```tsx
import { motion } from 'motion/react'

// ✅ Module scope — created once
const MotionCard = motion.create(Card)

// React 19 — ref via props
const Card = (props: CardProps) => <div ref={props.ref} {...props} />

// React 18 — forwardRef required
const Card = React.forwardRef<HTMLDivElement, CardProps>((props, ref) => (
  <div ref={ref} {...props} />
))
```

Declaring `motion.create()` inside a component body creates a new component type every render, breaking React reconciliation and all animations.

## `useAnimate` — Imperative API

```tsx
const [scope, animate] = useAnimate()

// Selectors are scoped to scope.current — won't match elements outside it
const runSequence = async () => {
  await animate('.step-1', { opacity: 0, y: -20 }, { duration: 0.3 })
  await animate('.step-2', { scale: [0, 1.2, 1], opacity: 1 }, { type: 'spring', stiffness: 300 })
  await animate('.step-3', { opacity: 1, y: 0 }, { duration: 0.4 })
}

return (
  <div ref={scope}>
    <div className='step-1'>...</div>
    <div className='step-2' style={{ opacity: 0 }}>
      ✓
    </div>
    <div className='step-3' style={{ opacity: 0 }}>
      Submitted!
    </div>
    <button onClick={runSequence}>Submit</button>
  </div>
)
```

**Parallel animations:**

```tsx
await Promise.all([
  animate('.left', { x: -100, opacity: 0 }, { duration: 0.3 }),
  animate('.right', { x: 100, opacity: 0 }, { duration: 0.3 }),
])
```

**Navigate after animation:**

```tsx
await animate('.form', { opacity: 0, y: -20 }, { duration: 0.3 })
router.push('/success')
```

Animations are cancelled automatically on component unmount.

**Mini variant** (2.3 kB, WAAPI-only, no springs):

```tsx
import { useAnimate } from 'motion/react-mini'
```

**Composing with `usePresence` for manual exit control:**

```tsx
const [isPresent, safeToRemove] = usePresence()
const [scope, animate] = useAnimate()

useEffect(() => {
  if (!isPresent) {
    const exit = async () => {
      await animate('li', { opacity: 0, x: -100 })
      await animate(scope.current, { opacity: 0 })
      safeToRemove()
    }
    exit()
  }
}, [isPresent])
```

## MotionValue Utilities

MotionValues update outside React's render cycle — no re-renders triggered. Always bind via `style={}`, not `className`.

```tsx
import { useMotionValue, useTransform, useMotionTemplate } from 'motion/react'

const x = useMotionValue(0)

// Derive opacity and scale from x (0–200 range)
const opacity = useTransform(x, [0, 200], [1, 0])
const scale = useTransform(x, [0, 200], [1, 0.8])

// Dynamic CSS value
const blur = useMotionValue(0)
const filter = useMotionTemplate`blur(${blur}px)`

return <m.div style={{ x, opacity, scale, filter }} />
```

## Next.js Client Boundary

Every component using `m.*`, `AnimatePresence`, `useAnimate`, or any Motion hook requires `'use client'`.

## Server/Client Split Pattern

```tsx
// page.tsx — Server Component handles data fetching
const Page = async () => {
  const data = await fetchData()
  return <AnimatedSection items={data.items} />
}

// animated-section.tsx — Client Component owns animation
;('use client')
import * as m from 'motion/react-m'

const AnimatedSection = ({ items }: Props) => (
  <m.div variants={containerVariants} initial='hidden' animate='visible'>
    {items.map((item) => (
      <m.div key={item.id} variants={itemVariants}>
        <Card item={item} />
      </m.div>
    ))}
  </m.div>
)
```

## Dynamic Import for Heavy Sections

```tsx
import dynamic from 'next/dynamic'

const HeroSection = dynamic(() => import('@/components/features/landing-page/hero-section'), {
  ssr: false,
})
```

## SSR Compatibility

`m` components are SSR-compatible — `initial` state renders server-side. Set `initial={false}` to render `animate` state server-side (no flash of initial state on hydration).
