---
description: 'Framer Motion animation constraints — imports, animatable properties, reduced motion, scroll values, presence. Scoped to motion system and component files.'
applyTo: 'src/lib/motion/**/*.{ts,tsx}, src/components/**/*.{ts,tsx}'
---

# Animation Constraints

## Imports & Namespace

- MUST import from `@/lib/motion` — never from `motion/react` directly
- MUST NOT import `motion/react` outside `src/lib/motion/`
- MUST use `m.*` namespace; `strict` mode enforces this at runtime
- MUST NOT use `motion.*` components anywhere

## Component Setup

- MUST add `'use client'` on every animated component
- MUST set `displayName` matching the exported component name
- MUST declare `variants` at module scope — never inside a component body
- MUST declare `m.create()` calls at module scope

## MotionValues & Scroll

- MUST keep MotionValues in the FM graph — no `useState` from scroll position
- MUST apply MotionValues via `style={}`, not `className`
- MUST use `useSpring` to smooth scroll-linked values — raw scroll feels mechanical (see skill `scroll-scene-foundations` §3 for preset selection)
- SHOULD use `memo()` on scroll-animated list items
- MUST NOT call hooks inside `.map()` — extract per-item components
- Inline `style={}` with computed viewport-dependent values (vw, vh, computed transforms, scroll-scene heights) is the expected pattern for scroll-driven animations — this is not "arbitrary Tailwind values" (that rule applies to className bracket syntax only)
- `useState` for one-time layout measurement (viewport dimensions, card sizes on mount/resize) is allowed — the "no useState from scroll" rule means: do not derive React state from scroll position on every frame

## Animatable Properties

- **Tier 1 (continuous — scroll, parallax, reveals, looping):** MUST animate only `transform` and `opacity` (GPU-composited)
- **Tier 1:** MUST NOT animate `width`, `height`, `margin`, or `padding` per-frame (triggers layout/paint)
- **Tier 1:** Using `scale` + `translate` to visually simulate dimension/position changes (e.g. hero shrinks from full-viewport to card-size) is a Tier 1 transform pattern — not a Tier 2 dimension change. Do not reach for `layout` prop in scroll-driven scenes.
- **Tier 2 (discrete — expand/collapse, reorder, mount/unmount, tab switch):** SHOULD use FM `layout` prop or `AnimatePresence` for dimension changes
- **Tier 2:** MUST NOT use CSS `transition` on `width`, `height`, or `max-height` — bypasses FLIP, causes per-frame reflow
- MUST NOT use deprecated `layoutDependency` prop — removed in FM v6+; `layout` detects changes automatically on re-render

## Reduced Motion

- MUST follow the three-layer reduced-motion strategy — see skill `animation-components`
- MUST gate `repeat: Infinity` looping animations with `useMotionEnabled()`
- MUST use opacity-only AnimatePresence exits under `useReducedMotion()`

## Presence

- MUST use `AnimatePresence mode='wait'` when swapping keyed content

## Performance

- SHOULD use `next/dynamic` with `ssr: false` for heavy animated sections
- SHOULD disable complex scroll animations on mobile (<768px)
- SHOULD use `viewport={{ once: true }}` on fire-and-forget reveals
- SHOULD prefer `component={m.div}` over nesting `<m.div>` inside wrappers
- SHOULD set `willChange: 'transform, opacity'` on heavy parallax (motion-enabled only)

## Extending `src/lib/motion/`

- MAY create new hooks, helpers, or components inside `src/lib/motion/` when existing ones don't fit the scene
- New files MUST re-export from `@/lib/motion/index.ts` and follow existing conventions
- The existing components (`MotionSection`, `MotionSectionItem`, `MotionBox`, `MotionInView`) are starting points, not ceilings — complex scenes often need custom scroll plumbing

## Safeguards

- MUST guard `console.warn` with `process.env.NODE_ENV !== 'production'`
- MUST NOT add animations not requested in the issue
