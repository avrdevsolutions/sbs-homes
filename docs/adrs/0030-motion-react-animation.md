# ADR-0030: Motion (Framer Motion) — React Lifecycle & Interaction Animation

**Status**: Accepted
**Date**: 2026-04-04
**Supersedes**: N/A

---

## Context

React applications need animation beyond what CSS alone provides — mount/unmount transitions, layout animations, shared element morphs, gesture responses, stagger sequences, imperative multi-step animations, and page transitions. These are lifecycle-coupled animations that must integrate with React's rendering model: they depend on component state, respond to prop changes, and clean up when components unmount.

CSS handles compositor-thread simple effects well (transitions, keyframes, `animation-timeline: view()`). GSAP handles scroll-driven orchestration (pinned sections, scrubbed timelines, horizontal scroll — see ADR-0003). But neither is designed for React's declarative state-driven paradigm. CSS can't animate mount/unmount (elements don't exist in the DOM before mount or after unmount). GSAP manipulates the DOM imperatively, conflicting with React's ownership model and requiring careful cleanup.

Motion (previously Framer Motion, v12+) is purpose-built for this space. Its declarative API maps directly to React's state model — declare start/end states, Motion handles interpolation. Its hybrid engine runs animations natively via the Web Animations API (WAAPI) and ScrollTimeline for 120fps performance, then seamlessly falls back to JavaScript when those APIs can't deliver (spring physics, interruptible keyframes, gesture tracking). It includes layout animation (FLIP technique with scale distortion correction), `AnimatePresence` for exit animations, gesture recognizers, and tree-shakable bundle optimization.

Without this ADR, developers use inconsistent animation approaches, miss exit animations entirely, create janky layout transitions with CSS `width`/`height` animations, forget reduced motion compliance, and don't optimize bundle size.

## Decision

**Motion (v12+, package `motion`) is the React lifecycle and interaction animation engine. All imports from `motion/react`. Bundle optimized via `LazyMotion` with `domMax` feature set and `m.*` namespace in strict mode. Every animated component is a `'use client'` component. Reduced motion handled per technique: opacity-only for presence, no guard for user-initiated gestures, full gate for looping animations. Motion does NOT handle scroll-driven pinned sections (GSAP) or simple compositor-eligible scroll effects (CSS).**

---

## Rules

| Rule                                                                                                   | Level        |
| ------------------------------------------------------------------------------------------------------ | ------------ |
| Use `'use client'` on every component that uses Motion                                                 | **MUST**     |
| Import from `motion/react` (components, hooks, utilities) and `motion/react-m` (`m.*` namespace)       | **MUST**     |
| Use `m.*` namespace with `LazyMotion strict` — not `motion.*`                                          | **MUST**     |
| Declare variants at module scope — never inside a component body                                       | **MUST**     |
| Declare `motion.create()` at module scope — never inside a component body                              | **MUST**     |
| Use `AnimatePresence` with explicit `mode` when swapping keyed content                                 | **MUST**     |
| Gate `repeat: Infinity` looping animations with `useReducedMotion()`                                   | **MUST**     |
| Provide opacity-only fallback for `AnimatePresence` exits under reduced motion                         | **MUST**     |
| Animate only `transform` and `opacity` for continuous animations                                       | **MUST**     |
| Use `viewport={{ once: true }}` on fire-and-forget reveals                                             | **SHOULD**   |
| Use `memo()` on animated list items                                                                    | **SHOULD**   |
| Use `next/dynamic` with `ssr: false` for heavy animated sections                                       | **SHOULD**   |
| Use spring presets (§3) instead of magic numbers                                                       | **SHOULD**   |
| Keep exit animations ≤ 0.3s                                                                            | **SHOULD**   |
| Use `Reorder.Group` / `Reorder.Item` for drag-to-reorder — not manual drag                             | **SHOULD**   |
| Use `domMax` over `domAnimation` when layout animations or drag are needed                             | **SHOULD**   |
| Use `motion.*` components (bypasses `LazyMotion` tree-shaking)                                         | **MUST NOT** |
| Declare variants inside component body (recreated every render)                                        | **MUST NOT** |
| Call hooks inside `.map()` iterations                                                                  | **MUST NOT** |
| Animate `width`, `height`, `margin`, `padding` per-frame directly (use `layout` for dimension changes) | **MUST NOT** |
| Use CSS `transition` on `width`/`height` when `layout` prop handles the case                           | **MUST NOT** |
| Mix GSAP and Motion transforms on the same DOM element (per ADR-0003)                                  | **MUST NOT** |

---

## Part 1 — Engine Setup & API

## 1. Setup & Installation

### 1.1 Package

| Package  | Purpose                                                                                         | Size                                                      |
| -------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `motion` | Animation engine — `motion`/`m` components, AnimatePresence, layout, gestures, hooks, utilities | ~34 kB pre-bundled, reducible to 4.6 kB with `LazyMotion` |

```bash
pnpm add motion
```

### 1.2 Import Strategy

```tsx
// Standard — components, hooks, utilities, feature bundles
import {
  LazyMotion,
  domMax,
  AnimatePresence,
  LayoutGroup,
  useReducedMotion,
  useAnimate,
} from 'motion/react'

// Tree-shakable m.* namespace
import * as m from 'motion/react-m'

// React Server Components (Next.js) — re-exports for RSC compatibility
import * as motion from 'motion/react-client'
```

### 1.3 LazyMotion Provider

The `motion` component (~34 kB) comes pre-bundled with all features. The `m` component (4.6 kB) loads no features — they're injected at runtime via `LazyMotion`. This is how you tree-shake Motion.

```tsx
// app/layout.tsx (or a client wrapper)
'use client'

import { LazyMotion, domMax } from 'motion/react'

const MotionProvider = ({ children }: { children: React.ReactNode }) => (
  <LazyMotion features={domMax} strict>
    {children}
  </LazyMotion>
)
```

**`strict` mode** — when enabled, rendering a `motion.*` component inside `LazyMotion` throws a runtime error. This enforces use of the `m.*` namespace and prevents accidentally importing the full pre-bundled `motion` component, which would negate the bundle savings.

### 1.4 Feature Bundles

| Bundle         | What it includes                                                     | Added size |
| -------------- | -------------------------------------------------------------------- | ---------- |
| `domAnimation` | Animations, variants, exit animations, tap/hover/focus gestures      | +15 kB     |
| `domMax`       | Everything in `domAnimation` + pan/drag gestures + layout animations | +25 kB     |

**Decision**: Use `domMax` as the default feature bundle. Layout animations (`layout`, `layoutId`) are core to many interaction patterns in this ADR. Projects that only need presence/gesture animations and never use `layout` or drag can downgrade to `domAnimation`.

### 1.5 Async Feature Loading

For maximum performance, features can be lazy-loaded after the initial render:

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

Async loading means animations won't fire until the feature bundle resolves. Use synchronous loading (`features={domMax}`) if animations must work on first render. Use async loading for below-the-fold or secondary animated content.

### 1.6 The `m.*` Namespace

`m` is a drop-in replacement for `motion` — `m.div`, `m.span`, `m.section` etc. The only difference: `m` components don't bundle their own features. They rely on `LazyMotion` to provide features at runtime.

```tsx
import * as m from 'motion/react-m'

// ✅ Works inside LazyMotion
<m.div animate={{ opacity: 1 }} />

// ❌ motion.div bundles ~34 kB regardless of LazyMotion
<motion.div animate={{ opacity: 1 }} />
```

All code examples in this ADR use the `m.*` namespace.

---

## 2. Core Declarative API

### 2.1 Motion-Enabled Elements

`m.div`, `m.span`, `m.section`, `m.button`, `m.img`, `m.ul`, `m.li`, `m.svg`, `m.circle`, `m.path` — every HTML and SVG element has an `m.*` counterpart.

```tsx
<m.div className='card' />
```

Behaves identically to a regular element but accepts animation props: `animate`, `initial`, `exit`, `whileHover`, `whileTap`, `whileFocus`, `whileDrag`, `whileInView`, `layout`, `layoutId`, `transition`, `variants`, `style` (with MotionValue support and independent transforms).

### 2.2 The State Model

Motion's mental model: **declare states, Motion handles interpolation.** You don't write imperative timeline commands. You describe where the element should be in each state, and Motion figures out how to get there.

```
initial → animate → exit
```

| Prop      | When it applies                                                        |
| --------- | ---------------------------------------------------------------------- |
| `initial` | Starting state on mount (or `false` to skip mount animation)           |
| `animate` | Target state to animate to — on mount and whenever values change       |
| `exit`    | Target state to animate to before unmount (requires `AnimatePresence`) |

```tsx
<m.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
/>
```

### 2.3 Variants

Named animation states defined as objects. Declared at **module scope** to prevent re-creation every render.

```tsx
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

// Inside component
<m.div variants={cardVariants} initial="hidden" animate="visible" exit="exit" />
```

**Naming convention:**

| State            | Key                   |
| ---------------- | --------------------- |
| Before animation | `hidden` or `initial` |
| After animation  | `visible` or `show`   |
| Exit animation   | `exit`                |

---

## 3. Transitions

Transitions define **how** to get between states. Motion supports two models: spring-based (physical) and duration-based (timed).

### 3.1 Spring-Based

Springs simulate physical motion — they overshoot, settle, and feel natural. Default for physical properties (`x`, `y`, `scale`, `rotate`).

**Parameters:**

- `stiffness` — spring tension (higher = snappier)
- `damping` — friction (higher = less oscillation)
- `mass` — inertia (higher = heavier, slower)

### 3.2 Duration-Based

Predictable timing with easing curves. Default for visual properties (`opacity`, `backgroundColor`).

**Parameters:**

- `duration` — time in seconds
- `ease` — easing function (`'easeOut'`, `'easeIn'`, `'easeInOut'`, `'linear'`, or cubic bezier array)

### 3.3 Spring Presets

| Name   | Config                                                        | Use case                                           |
| ------ | ------------------------------------------------------------- | -------------------------------------------------- |
| Smooth | `{ type: 'spring', stiffness: 120, damping: 20, mass: 0.35 }` | General purpose, layout animations, scroll reveals |
| Snappy | `{ type: 'spring', stiffness: 500, damping: 28, mass: 0.4 }`  | Quick responses, button feedback, modal enter      |
| Bouncy | `{ type: 'spring', stiffness: 300, damping: 15, mass: 0.5 }`  | Playful, attention-grabbing, toggle switches       |

### 3.4 Duration Recommendations

| Use case             | Duration  | Easing        |
| -------------------- | --------- | ------------- |
| Viewport reveal      | 0.6s      | `'easeOut'`   |
| Nav stagger per item | 0.05–0.1s | `'easeOut'`   |
| Button / micro       | 0.1s      | `'easeOut'`   |
| Modal / drawer       | 0.3s      | `'easeOut'`   |
| Nav hide/show        | 0.1s      | `'easeInOut'` |
| Tab content swap     | 0.2s      | `'easeOut'`   |
| Exit animation       | ≤ 0.3s    | `'easeIn'`    |
| Page transition      | 0.2–0.3s  | `'easeOut'`   |

### 3.5 Per-Property Transitions

Different properties can have different transitions:

```tsx
<m.div
  animate={{ opacity: 1, y: 0 }}
  transition={{
    opacity: { duration: 0.3, ease: 'easeOut' },
    y: { type: 'spring', stiffness: 300, damping: 24 },
  }}
/>
```

Layout animations can have their own transition:

```tsx
<m.div
  layout
  animate={{ opacity: 0.5 }}
  transition={{
    ease: 'linear',
    layout: { duration: 0.3 },
  }}
/>
```

---

## 4. Variants

### 4.1 Module-Scope Declaration

Variants are plain objects. Declaring them inside a component body creates new objects every render, breaking referential equality and potentially causing unnecessary re-animations.

```tsx
// ✅ Module scope — created once
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
}

const MyComponent = () => <m.div variants={fadeUp} initial='hidden' animate='visible' />
```

### 4.2 Parent/Child Variant Propagation

When a parent has `animate="visible"`, all children with `variants` containing a `visible` key automatically animate to that state. No need to pass `animate` to children.

```tsx
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
}

const FeatureGrid = ({ items }: { items: Item[] }) => (
  <m.div variants={containerVariants} initial='hidden' animate='visible'>
    {items.map((item) => (
      <m.div key={item.id} variants={itemVariants}>
        <Card item={item} />
      </m.div>
    ))}
  </m.div>
)
```

### 4.3 `staggerChildren` and `delayChildren`

Defined in the **parent's** transition. Controls cascading timing for child animations.

| Property           | What it does                                         |
| ------------------ | ---------------------------------------------------- |
| `staggerChildren`  | Delay (seconds) between each child's animation start |
| `delayChildren`    | Delay before the first child starts                  |
| `staggerDirection` | `1` = forward order (default), `-1` = reverse        |

### 4.4 Dynamic Variants

Variants can be functions that accept a `custom` value:

```tsx
const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1 },
  }),
}

<m.li custom={index} variants={itemVariants} />
```

---

## 5. AnimatePresence

`AnimatePresence` enables exit animations. Without it, React removes elements from the DOM instantly — no animation is possible. `AnimatePresence` keeps exiting elements in the DOM until their `exit` animation completes.

### 5.1 Three Modes

| Mode               | Behavior                                                                         | Use case                                                  |
| ------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `"sync"` (default) | Enter and exit animate simultaneously                                            | Overlays, toasts, notifications, backdrop + content pairs |
| `"wait"`           | Old exits fully before new enters                                                | Tab content swap, step wizard, keyed content swap         |
| `"popLayout"`      | Exiting element removed from flow immediately, siblings reflow via `layout` prop | List item removal with smooth sibling settle              |

### 5.2 Keyed Content Swapping

Changing a child's `key` triggers the exit/enter cycle:

```tsx
<AnimatePresence mode='wait'>
  <m.div
    key={activeTab}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
  >
    {tabContent[activeTab]}
  </m.div>
</AnimatePresence>
```

### 5.3 Rules

- `AnimatePresence` must be a **direct parent** of the conditional/keyed element
- The conditional must be **inside** `AnimatePresence`, not wrapping it
- Every direct child needs a unique `key` that identifies the instance (not array index)
- `exit` prop on children defines the exit target

```tsx
// ✅ Correct — conditional is inside AnimatePresence
;<AnimatePresence>{isOpen && <m.div key='modal' exit={{ opacity: 0 }} />}</AnimatePresence>

// ❌ Wrong — AnimatePresence unmounts with the element
{
  isOpen && (
    <AnimatePresence>
      <m.div exit={{ opacity: 0 }} />
    </AnimatePresence>
  )
}
```

### 5.4 `initial={false}`

Disables the enter animation when `AnimatePresence` first mounts. Useful for slideshows where the first slide should appear without animation.

```tsx
<AnimatePresence initial={false}>
  <m.img key={image.src} initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: -300 }} />
</AnimatePresence>
```

### 5.5 Direction-Aware Transitions with `custom`

The `custom` prop on `AnimatePresence` passes data to exiting components (whose props can't be updated since they're removed from the React tree):

```tsx
<AnimatePresence custom={direction}>
  <m.div key={slideId} custom={direction} variants={slideVariants} />
</AnimatePresence>
```

Children can access this via `usePresenceData()`:

```tsx
import { usePresenceData, useIsPresent } from 'motion/react'

const direction = usePresenceData()
const isPresent = useIsPresent()
```

### 5.6 Propagate Exit Animations

By default, a nested `AnimatePresence` does NOT fire its children's exit animations when a parent `AnimatePresence` removes the ancestor. Set `propagate` to change this:

```tsx
<AnimatePresence>
  {show && (
    <m.section exit={{ opacity: 0 }}>
      <AnimatePresence propagate>
        {/* These children WILL fire exit animations when show becomes false */}
        <m.div exit={{ x: -100 }} />
      </AnimatePresence>
    </m.section>
  )}
</AnimatePresence>
```

---

## 6. Layout Animations

### 6.1 FLIP Technique

Layout animations are performant because Motion uses the FLIP technique:

1. **F**irst — measure element's layout before the change
2. **L**ast — let React render the new layout, measure again
3. **I**nvert — apply a CSS `transform` that makes the element appear to be in its original position
4. **P**lay — animate the transform to zero, element smoothly transitions to new position

**Two layout calculations total**, not per-frame reflow. The animation itself uses only GPU-composited `transform` — no `width`/`height` per-frame recalculation.

### 6.2 API Surface

| Prop                | What it does                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `layout`            | Animate both dimension and position changes                                                |
| `layout="position"` | Animate position only — size changes instantly                                             |
| `layout="size"`     | Animate size only — position changes instantly                                             |
| `layoutId`          | Shared element transition — two components with same `layoutId` animate between each other |
| `layoutDependency`  | Only re-measure layout when this value changes (performance optimization)                  |
| `layoutScroll`      | Mark a scrollable ancestor so Motion accounts for scroll offset                            |
| `layoutRoot`        | Mark a `position: fixed` ancestor so Motion accounts for page scroll                       |
| `layoutAnchor`      | Control the anchor point for parent-relative layout calculations (`{ x: 0-1, y: 0-1 }`)    |

### 6.3 `LayoutGroup`

Scopes layout animations to prevent cross-component interference. Also synchronizes layout changes across multiple components that don't re-render at the same time but affect each other's layout.

```tsx
import { LayoutGroup } from 'motion/react'

;<LayoutGroup>
  <Accordion />
  <Accordion />
</LayoutGroup>
```

When layout changes are detected in any grouped `m` component, layout animations trigger across all of them.

### 6.4 Pattern Routing Table

| Scenario                             | Pattern                                                |
| ------------------------------------ | ------------------------------------------------------ |
| Expand/collapse (accordion, card)    | `layout` on the expanding element                      |
| List add/remove with sibling reflow  | `layout` on items + `AnimatePresence mode="popLayout"` |
| List item → detail view              | `layoutId` on both states + `AnimatePresence`          |
| Drag-to-reorder settle               | `layout` on sortable items (handled by `Reorder.Item`) |
| Tab content swap (container resizes) | `layout` on the container                              |
| Grid reflow (position only)          | `layout="position"`                                    |
| Multiple accordions in a list        | `layout` on items + `LayoutGroup` wrapper              |

### 6.5 Fixing Scale Distortion

Because `layout` animations use `transform: scale()`, they can visually distort children. Fixes:

- **Child elements**: Add `layout` to direct children — Motion calculates counter-scales
- **Border radius / box shadow**: Must be set via `style` prop (not className) for Motion to correct:

```tsx
<m.div layout style={{ borderRadius: 20 }} />
```

- **Aspect ratio changes** (images): Use `layout="position"` to only animate position, letting size snap

### 6.6 Layout Animations in Scrollable Containers

```tsx
<m.div layoutScroll style={{ overflow: 'scroll' }}>
  <m.div layout />
</m.div>
```

### 6.7 Layout Animations in Fixed Containers

```tsx
<m.div layoutRoot style={{ position: 'fixed' }}>
  <m.div layout />
</m.div>
```

---

## 7. Viewport Reveals

`whileInView` triggers an animation when an element enters the viewport. Uses `IntersectionObserver` under the hood.

### 7.1 API

| Prop              | Options                               |
| ----------------- | ------------------------------------- |
| `whileInView`     | Animation target or variant label     |
| `viewport`        | `{ once, root, margin, amount }`      |
| `onViewportEnter` | Callback when element enters viewport |
| `onViewportLeave` | Callback when element leaves viewport |

**Viewport options:**

| Option   | Type                        | Default  | What it does                                      |
| -------- | --------------------------- | -------- | ------------------------------------------------- |
| `once`   | `boolean`                   | `false`  | Fire-and-forget — animate once, stop observing    |
| `root`   | `RefObject`                 | `window` | Custom scroll ancestor for intersection detection |
| `margin` | `string`                    | `"0px"`  | Expand/contract viewport detection area           |
| `amount` | `number \| "some" \| "all"` | `"some"` | How much of element must be visible (0–1)         |

### 7.2 Simple Reveal

```tsx
<m.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3 }}
  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
>
  <ContentBlock />
</m.div>
```

### 7.3 When to Use Motion vs CSS for Viewport Reveals

| Need                                    | Use                                                            |
| --------------------------------------- | -------------------------------------------------------------- |
| Spring physics on the reveal            | Motion `whileInView`                                           |
| Complex variants with stagger           | Motion `whileInView` + `staggerChildren`                       |
| Simple opacity/translate with no spring | CSS `animation-timeline: view()` — zero JS, runs on compositor |
| Part of a larger scroll-driven scene    | GSAP ScrollTrigger (ADR-0003)                                  |

---

## 8. Gestures

Motion extends React's event system with gesture recognizers that work reliably across pointer, touch, and keyboard.

### 8.1 Gesture Props

| Prop         | When it activates                          |
| ------------ | ------------------------------------------ |
| `whileHover` | Pointer is over the element                |
| `whileTap`   | Primary pointer is pressing the element    |
| `whileDrag`  | Element is being dragged                   |
| `whileFocus` | Element has focus (`:focus-visible` rules) |

Each prop accepts an animation target object or a variant label. Multiple gestures combine on the same element.

### 8.2 Accessibility

- **Tap gestures are keyboard-accessible**: `Enter` triggers `onTapStart`/`whileTap` on press, `onTap` on release. If focus leaves, `onTapCancel` fires.
- **Focus gesture** follows `:focus-visible` rules — triggers on keyboard navigation, not mouse click.

### 8.3 Reduced Motion

Gesture animations (hover, tap, focus) are **user-initiated and brief**. Per WCAG 2.3.3, they do **not** require a reduced motion guard. They respond directly to user action and stop when the action stops.

### 8.4 Touch Devices

`whileHover` does **not** trigger on touch devices. Two strategies:

1. Show hover-revealed content by default on mobile (responsive design)
2. Use `whileTap` as a touch equivalent

### 8.5 Event Propagation

Motion gesture handlers are deferred — `e.stopPropagation()` doesn't work in time from handlers like `onTapStart`. Use the `propagate` prop instead:

```tsx
<m.div whileTap={{ scale: 2 }}>
  <m.button whileTap={{ opacity: 0.8 }} propagate={{ tap: false }} />
</m.div>
```

---

## 9. Imperative API

### 9.1 `useAnimate`

Returns `[scope, animate]`. The `scope` ref scopes all selectors to descendants of the ref element. The `animate` function returns a promise, enabling sequential and parallel patterns.

```tsx
import { useAnimate } from 'motion/react'

const [scope, animate] = useAnimate()
```

**Scoped selectors** — `animate("li", ...)` targets only `li` descendants of the scoped element, not all `li` on the page.

**Automatic cleanup** — when the component calling `useAnimate` unmounts, all animations started with its `animate` function are cleaned up.

### 9.2 Sequential Animations

```tsx
const runSequence = async () => {
  await animate('.step-1', { opacity: 0, y: -20 }, { duration: 0.3 })
  await animate('.step-2', { scale: [0, 1.2, 1], opacity: 1 }, { type: 'spring', stiffness: 300 })
  await animate('.step-3', { opacity: 1, y: 0 }, { duration: 0.4 })
}
```

### 9.3 Parallel Animations

```tsx
const runParallel = async () => {
  await Promise.all([
    animate('.left', { x: -100, opacity: 0 }, { duration: 0.3 }),
    animate('.right', { x: 100, opacity: 0 }, { duration: 0.3 }),
  ])
}
```

### 9.4 Navigate After Animation

```tsx
const handleSubmit = async () => {
  await animate('.form', { opacity: 0, y: -20 }, { duration: 0.3 })
  router.push('/success')
}
```

### 9.5 `useAnimate` Mini

For minimal bundle size (2.3 kB), import from `motion/react-mini`. This version exclusively uses WAAPI — no spring physics, no MotionValue animation, no independent transforms. Sufficient for simple opacity/transform sequences.

```tsx
import { useAnimate } from 'motion/react-mini'
```

### 9.6 Combining with Presence

`useAnimate` composes with `usePresence` for manual exit animation control:

```tsx
import { useAnimate, usePresence } from 'motion/react'

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

---

## 10. Utilities

### 10.1 `motion.create(Component)`

Wraps a third-party or custom React component to make it animatable. The component must forward its `ref` to the underlying DOM element.

```tsx
import { motion } from 'motion/react'

// Module scope — created once
const MotionCard = motion.create(Card)

// React 19 — no forwardRef needed (ref passed via props)
const Card = (props: CardProps) => <div ref={props.ref} {...props} />

// React 18 — use forwardRef
const Card = React.forwardRef<HTMLDivElement, CardProps>((props, ref) => (
  <div ref={ref} {...props} />
))
```

**MUST** be declared at module scope. Declaring inside a component body creates a new component type every render, breaking React reconciliation and all animations.

### 10.2 `useMotionValue`

Creates a MotionValue manually. MotionValues update outside React's render cycle — they don't cause re-renders. Useful for imperative control and performance-sensitive animations.

```tsx
import { useMotionValue } from 'motion/react'

const x = useMotionValue(0)

// Update without re-render
x.set(100)

return <m.div style={{ x }} />
```

### 10.3 `useTransform`

Derives one MotionValue from another with a mapping function. Chain for multi-step transforms.

```tsx
import { useMotionValue, useTransform } from 'motion/react'

const x = useMotionValue(0)
const opacity = useTransform(x, [0, 200], [1, 0])
const scale = useTransform(x, [0, 200], [1, 0.8])

return <m.div style={{ x, opacity, scale }} />
```

### 10.4 `useMotionTemplate`

Template literal for dynamic CSS values with MotionValues:

```tsx
import { useMotionValue, useMotionTemplate } from 'motion/react'

const blur = useMotionValue(0)
const filter = useMotionTemplate`blur(${blur}px)`

return <m.div style={{ filter }} />
```

---

## 11. Reduced Motion

### 11.1 `useReducedMotion()`

Returns `true` when the user has `prefers-reduced-motion: reduce` enabled.

```tsx
import { useReducedMotion } from 'motion/react'

const prefersReducedMotion = useReducedMotion()
```

### 11.2 Strategy Per Animation Type

| Animation type                           | Reduced motion handling                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| Presence (modal, drawer, nav enter/exit) | Opacity-only fallback — remove `y`, `scale`, `rotate` offsets, shorter duration  |
| Tab / step content swap                  | Opacity-only or instant swap                                                     |
| Micro-interactions (hover, tap, focus)   | **No guard needed** — user-initiated, brief, per WCAG 2.3.3                      |
| Looping (`repeat: Infinity`)             | **Must gate entirely** — check `useReducedMotion()`, do not render the animation |
| Viewport reveals                         | Snap to final state (set `initial={false}`) or opacity-only reveal               |
| Layout animations                        | Let them run — FLIP uses `transform`, not reflow. Optional: instant snap         |
| Stagger sequences                        | Remove stagger delay, show all items immediately                                 |
| Shared element transitions               | Instant position swap, fade non-shared content                                   |
| Page transitions                         | Instant navigation                                                               |
| Imperative sequences                     | Skip sequence, set final state instantly                                         |
| Drag-to-reorder                          | Snap to position, no drag animation                                              |

### 11.3 Implementation Pattern

```tsx
const prefersReducedMotion = useReducedMotion()

const fadeUpVariants = {
  hidden: { opacity: 0, ...(prefersReducedMotion ? {} : { y: 20 }) },
  visible: {
    opacity: 1,
    y: 0,
    transition: prefersReducedMotion
      ? { duration: 0.15 }
      : { type: 'spring', stiffness: 300, damping: 24 },
  },
}
```

For looping animations, gate the entire animation:

```tsx
const prefersReducedMotion = useReducedMotion()

if (prefersReducedMotion) return <div className='static-indicator' />

return (
  <m.div
    animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
    transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
  />
)
```

---

## 12. Next.js Integration

### 12.1 Client Boundary

Motion components are client-side only. Every component that uses `m.*`, `AnimatePresence`, `useAnimate`, `useReducedMotion`, or any Motion hook requires `'use client'`.

### 12.2 Server/Client Split Pattern

Keep data fetching in a Server Component. Wrap the animated presentational layer in a Client Component:

```tsx
// page.tsx — Server Component
const Page = async () => {
  const data = await fetchData()
  return <AnimatedSection items={data.items} />
}

// animated-section.tsx — Client Component
;('use client')
import * as m from 'motion/react-m'

const AnimatedSection = ({ items }: { items: Item[] }) => (
  <m.div variants={containerVariants} initial='hidden' animate='visible'>
    {items.map((item) => (
      <m.div key={item.id} variants={itemVariants}>
        <Card item={item} />
      </m.div>
    ))}
  </m.div>
)
```

### 12.3 Dynamic Import for Heavy Sections

Use `next/dynamic` with `ssr: false` for pages with many Motion animations. This avoids hydration mismatch and reduces the initial bundle.

```tsx
import dynamic from 'next/dynamic'

const HeavyAnimatedSection = dynamic(
  () => import('@/components/features/landing-page/hero-section'),
  { ssr: false },
)
```

### 12.4 Server-Side Rendering Compatibility

`m` components are compatible with SSR. The initial state (from `initial` prop or inline `style`) is reflected in the server-generated output. Animations start on the client after hydration.

Setting `initial={false}` renders the `animate` state on the server — no flash of the initial state.

---

## Part 2 — Interaction Techniques

Every technique follows the pattern: **when to use → when NOT to use → implementation → variations → reduced motion → common mistakes.**

## 13. Modal / Drawer / Dialog Enter & Exit

Content that mounts and unmounts with animated transitions.

**When to use:**

- Modals, dialogs, drawers, sidebars, bottom sheets
- Any overlay that appears/disappears based on state
- Toast notifications, alerts, banners

**When NOT to use:**

- Static sidebars that are always visible
- Content that slides between positions without mounting/unmounting (use layout animation)

### 13.1 Implementation — Modal with Backdrop

```tsx
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 },
}

<AnimatePresence mode="sync">
  {isOpen && (
    <>
      <m.div
        key="backdrop"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      <m.div
        key="modal"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.4 }}
      >
        {children}
      </m.div>
    </>
  )}
</AnimatePresence>
```

### 13.2 Variations

| Variant           | `initial`                            |
| ----------------- | ------------------------------------ |
| Drawer from right | `{ opacity: 0, x: '100%' }`          |
| Drawer from left  | `{ opacity: 0, x: '-100%' }`         |
| Bottom sheet      | `{ opacity: 0, y: '100%' }`          |
| Center modal      | `{ opacity: 0, scale: 0.95, y: 10 }` |

### 13.3 Mode Selection

- **`"sync"`** (default) — when backdrop and content should animate simultaneously
- **`"wait"`** — when only one modal can be open at a time and the old one should fully exit before the new enters

### 13.4 Reduced Motion

Remove spatial transforms, keep fade:

```tsx
const prefersReducedMotion = useReducedMotion()

const modalVariants = prefersReducedMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
  : { hidden: { opacity: 0, scale: 0.95, y: 10 }, visible: { opacity: 1, scale: 1, y: 0 } }
```

### 13.5 Common Mistakes

- Missing `key` on backdrop/modal when both are inside `AnimatePresence`
- Long exit animation (>0.5s) — navigation feels frozen
- Not separating backdrop transition (duration-based) from content transition (spring)

---

## 14. Tab / Step Content Swap

Content that swaps in place when the user changes tabs, steps, or views.

**When to use:**

- Tabbed interfaces
- Multi-step forms / wizards
- Any keyed content that changes based on user selection

**When NOT to use:**

- Tab panels with fixed height where content merely shows/hides (use CSS or `display`)

### 14.1 Implementation

```tsx
const tabVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

<AnimatePresence mode="wait">
  <m.div
    key={activeTab}
    variants={tabVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    transition={{ duration: 0.2, ease: 'easeOut' }}
  >
    {tabContent[activeTab]}
  </m.div>
</AnimatePresence>
```

### 14.2 Key Details

- `mode="wait"` is critical — without it, both old and new render simultaneously, causing layout flash
- `key={activeTab}` triggers the exit/enter cycle
- Exit upward (`y: -10`), enter from below (`y: 10`) creates a natural "push" direction
- Can reverse direction based on which tab is selected (use `custom` prop)

### 14.3 Container Height Animation

If content height varies between tabs, add `layout` to the container:

```tsx
<m.div layout>
  <AnimatePresence mode="wait">
    <m.div key={activeTab} ... />
  </AnimatePresence>
</m.div>
```

### 14.4 Reduced Motion

Opacity only, no spatial offset, shorter duration:

```tsx
const tabVariants = prefersReducedMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
  : { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } }
```

---

## 15. List Item Add / Remove

Items animating in and out of a list with siblings smoothly reflowing.

**When to use:**

- Todo lists, task lists, notification feeds
- Shopping cart items
- Any dynamic list where items are added/removed

**When NOT to use:**

- Static lists that never change
- Lists with hundreds of items (virtualize instead)

### 15.1 Implementation

```tsx
<AnimatePresence mode='popLayout'>
  {items.map((item) => (
    <m.div
      key={item.id}
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
    >
      <ItemContent item={item} />
    </m.div>
  ))}
</AnimatePresence>
```

### 15.2 Key Details

- `mode="popLayout"` — exiting items are removed from flow immediately, siblings animate to fill the gap via `layout`
- `layout` on each item enables FLIP reflow for siblings
- `height: 0` → `height: 'auto'` for smooth space opening/closing
- When using `popLayout`, the parent should have `position: relative` (or non-static) for correct positioning of exiting elements

### 15.3 Performance

Extract `ItemContent` into a `memo()`-wrapped component to prevent parent re-renders from triggering expensive child re-renders during animation.

### 15.4 Reduced Motion

Instant add/remove — no animation:

```tsx
if (prefersReducedMotion) {
  return items.map((item) => (
    <div key={item.id}>
      <ItemContent item={item} />
    </div>
  ))
}
```

---

## 16. Expand / Collapse (Accordion)

Content sections that expand and collapse with smooth height animation.

**When to use:**

- Accordions, FAQ sections
- Collapsible panels, details sections
- "Read more" / "Show less" toggles

**When NOT to use:**

- Content that should always be visible
- Toggles between two fixed-height states (use layout animation without AnimatePresence)

### 16.1 Implementation

```tsx
const [isExpanded, setIsExpanded] = useState(false)

<m.div layout onClick={() => setIsExpanded(!isExpanded)}>
  <m.div layout className="flex items-center justify-between">
    <h3>{title}</h3>
    <ChevronIcon />
  </m.div>

  <AnimatePresence>
    {isExpanded && (
      <m.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {content}
      </m.div>
    )}
  </AnimatePresence>
</m.div>
```

### 16.2 Key Details

- `layout` on parent and header — they animate position when content appears/disappears
- `height: 'auto'` — Motion measures the actual height and animates to it
- Spring transition for natural feel

### 16.3 Multiple Accordions

- **One-at-a-time**: Track `openId` state, only one section expanded
- **Independent**: Each section manages its own `isExpanded` state
- **Group with LayoutGroup**: Wrap multiple accordions in `LayoutGroup` so they animate in sync when one expands and pushes siblings

### 16.4 Reduced Motion

Instant expand/collapse — skip animation.

---

## 17. Shared Element Transitions

An element visually morphs from one position/size to another as user navigates between views.

**When to use:**

- List item → detail view (card expands to full page)
- Thumbnail → lightbox
- Grid → single item focus
- Tab underline indicator

**When NOT to use:**

- Cross-page route transitions in Next.js App Router (complex with streaming/suspense — keep simple)
- When the source and destination are on different scroll positions (use a simpler crossfade)

### 17.1 Implementation

```tsx
import { LayoutGroup, AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'

;<LayoutGroup>
  {items.map((item) => (
    <m.div key={item.id} layoutId={item.id} onClick={() => setSelected(item.id)}>
      <m.img layoutId={`img-${item.id}`} src={item.thumb} />
      <m.h3 layoutId={`title-${item.id}`}>{item.title}</m.h3>
    </m.div>
  ))}

  <AnimatePresence>
    {selected && (
      <m.div layoutId={selected} className='detail-view'>
        <m.img layoutId={`img-${selected}`} src={selectedItem.image} />
        <m.h3 layoutId={`title-${selected}`}>{selectedItem.title}</m.h3>
        <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {selectedItem.description}
        </m.p>
      </m.div>
    )}
  </AnimatePresence>
</LayoutGroup>
```

### 17.2 Key Details

- `layoutId` — same string on origin and destination. Motion computes layout diff and animates via FLIP.
- Multiple `layoutId`s per item — image AND title each morph independently
- `LayoutGroup` — scopes layout animations to prevent interference with other layout animations on the page
- Non-shared content (like the description) uses regular `initial`/`animate`/`exit`
- Performance: layout diff computed once per transition, not per frame
- If the original component remains on the page, they automatically crossfade

### 17.3 Reduced Motion

Instant position swap, fade content.

---

## 18. Drag-to-Reorder

Items that can be dragged to reorder with siblings animating to make space.

**When to use:**

- Sortable lists (priorities, playlists, settings)
- Kanban card reordering within a column

**When NOT to use:**

- Cross-column kanban (use dnd-kit per ADR-0027)
- File drop zones (not reorder — use native drag events or dnd-kit)

### 18.1 Implementation

```tsx
import { Reorder } from 'motion/react'

;<Reorder.Group axis='y' values={items} onReorder={setItems}>
  {items.map((item) => (
    <Reorder.Item key={item.id} value={item}>
      {item.content}
    </Reorder.Item>
  ))}
</Reorder.Group>
```

### 18.2 Key Details

- `Reorder.Group` + `Reorder.Item` — Motion's built-in reorder components
- `axis` — `"y"` for vertical, `"x"` for horizontal
- `values` + `onReorder` — controlled state pattern
- Items automatically animate layout changes when reorder occurs

### 18.3 Custom Drag Handle

```tsx
import { useDragControls, Reorder } from 'motion/react'

const Item = ({ item }: { item: Item }) => {
  const controls = useDragControls()

  return (
    <Reorder.Item value={item} dragListener={false} dragControls={controls}>
      <GripIcon onPointerDown={(e) => controls.start(e)} />
      <span>{item.content}</span>
    </Reorder.Item>
  )
}
```

### 18.4 Drag Constraints

```tsx
<Reorder.Item dragConstraints={{ top: 0, bottom: 0 }} />
```

### 18.5 Reduced Motion

Instant reorder, no drag animation. Consider providing keyboard alternative (move up/down buttons) for WCAG 2.5.7 compliance (per ADR-0019).

---

## 19. Viewport Stagger Reveals

A group of elements that animate in with staggered timing when they enter the viewport.

**When to use:**

- Feature grids, card grids
- Icon rows, logo grids
- Step-by-step process sections
- Any group that should cascade in on scroll

**When NOT to use:**

- Single elements (use §25)
- Scroll-linked choreography (use GSAP per ADR-0003)

### 19.1 Implementation

```tsx
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
}

<m.div
  variants={containerVariants}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.2 }}
>
  {items.map((item) => (
    <m.div key={item.id} variants={itemVariants}>
      <Card item={item} />
    </m.div>
  ))}
</m.div>
```

### 19.2 Key Details

- Parent `whileInView` triggers variant cascade — children automatically animate to `visible`
- `staggerChildren: 0.08` — 80ms between each child
- `viewport={{ once: true }}` — fire once, stop observing
- `viewport={{ amount: 0.2 }}` — trigger when 20% of the container is visible
- Variants at module scope

### 19.3 Reduced Motion

All items visible immediately — no stagger, no animation:

```tsx
if (prefersReducedMotion) {
  return items.map((item) => (
    <div key={item.id}>
      <Card item={item} />
    </div>
  ))
}
```

---

## 20. Page Transitions (Next.js)

Animated transitions between routes.

**When to use:**

- Marketing sites, portfolios, product pages where navigation should feel smooth

**When NOT to use:**

- Data-heavy dashboard apps where speed matters more than polish
- Apps with streaming/suspense boundaries (exit animations conflict with streaming)

### 20.1 Implementation with App Router

```tsx
// app/template.tsx
'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { usePathname } from 'next/navigation'

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()

  return (
    <AnimatePresence mode='wait'>
      <m.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  )
}

export default PageTransition
```

### 20.2 Key Details

- **`template.tsx` vs `layout.tsx`** — `template` remounts on navigation, `layout` doesn't. Page transitions need the remount to trigger exit/enter.
- `key={pathname}` triggers the exit/enter cycle
- Keep transitions short (0.2–0.3s) — long transitions feel sluggish on mobile
- Opacity-only transitions are safest — spatial transforms can create layout issues with streaming

### 20.3 Caveats

- App Router streaming and Suspense can complicate exit animations. If the page streams content after the initial render, the exit animation may fire before content is fully loaded.
- Keep page transitions **simple** — opacity or simple fade. Complex choreography at the page level conflicts with React's async rendering model.

### 20.4 Reduced Motion

Instant navigation — disable the transition wrapper.

---

## 21. Hover Compositions

Multi-property hover effects combining scale, shadow, color, and child element reveals.

**When to use:**

- Cards with hover reveal of actions or details
- Navigation items, portfolio thumbnails, product cards

**When NOT to use:**

- Touch-only interfaces (hover doesn't exist)
- Content that must always be accessible (don't hide behind hover)

### 21.1 Implementation — Card with Hover Reveal

```tsx
const cardVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { type: 'spring', stiffness: 400, damping: 25 } },
}

const overlayVariants = {
  rest: { opacity: 0 },
  hover: { opacity: 1, transition: { duration: 0.2 } },
}

<m.div variants={cardVariants} initial="rest" whileHover="hover">
  <img src={item.image} alt={item.title} />
  <m.div variants={overlayVariants} className="absolute inset-0 bg-black/40">
    <ActionButtons />
  </m.div>
</m.div>
```

### 21.2 Key Details

- Parent `whileHover` propagates variant to children — overlay appears when card is hovered
- Combining `whileHover` + `whileTap`: `whileTap={{ scale: 0.98 }}` for press feedback
- Subtle values: `scale: 1.02` not `1.1` — avoid cartoonish effects
- Touch devices: show hover content by default on mobile or use `whileTap`

### 21.3 Reduced Motion

No guard needed — user-initiated gesture.

---

## 22. Button / Interactive Micro-Feedback

Small, fast animations confirming user interaction.

**When to use:**

- Buttons, toggles, checkboxes, radio buttons
- Icon transitions (hamburger → close, play → pause)
- Any interactive element that benefits from tactile feedback

**When NOT to use:**

- Non-interactive elements
- Animations that persist after the gesture ends (that's a state transition, not micro-feedback)

### 22.1 Implementation

```tsx
<m.button
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.4 }}
>
  Submit
</m.button>
```

### 22.2 Variations

**Toggle switch** — `layout` prop on the knob as state changes position:

```tsx
<div className='toggle-track' onClick={toggle}>
  <m.div
    layout
    className='toggle-knob'
    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
  />
</div>
```

**Icon morph** — `AnimatePresence mode="wait"` to cross-fade between icon states:

```tsx
<AnimatePresence mode='wait'>
  <m.span
    key={isOpen ? 'close' : 'menu'}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    {isOpen ? <CloseIcon /> : <MenuIcon />}
  </m.span>
</AnimatePresence>
```

**Focus ring** — `whileFocus` for keyboard navigation visual feedback:

```tsx
<m.button whileFocus={{ boxShadow: '0 0 0 3px var(--ring-color)' }}>Action</m.button>
```

### 22.3 Reduced Motion

No guard needed — user-initiated, brief.

---

## 23. Looping / Ambient Animations

Continuous animations that run indefinitely.

**When to use:**

- Loading states (spinners, skeletons)
- Attention indicators (pulsing dot, breathing glow)
- Ambient decorative motion

**When NOT to use:**

- Any context where the animation conveys critical information (animations must not be the only way to convey info)
- On low-end devices with many other animations

### 23.1 Implementation — Pulse

```tsx
const prefersReducedMotion = useReducedMotion()

if (prefersReducedMotion) return <div className="static-indicator" />

<m.div
  animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
  transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
/>
```

### 23.2 Repeat Options

| Option                  | What it does                                 |
| ----------------------- | -------------------------------------------- |
| `repeat: Infinity`      | Loop forever                                 |
| `repeat: 3`             | Loop 3 additional times after the first play |
| `repeatType: 'loop'`    | Restart from beginning (default)             |
| `repeatType: 'reverse'` | Ping-pong back and forth                     |
| `repeatType: 'mirror'`  | Same as reverse                              |
| `repeatDelay: 0.5`      | Pause between iterations                     |

### 23.3 Common Patterns

**Loading spinner:**

```tsx
<m.div animate={{ rotate: 360 }} transition={{ duration: 1, ease: 'linear', repeat: Infinity }} />
```

**Floating effect:**

```tsx
<m.div
  animate={{ y: [0, -10, 0] }}
  transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
/>
```

### 23.4 Reduced Motion

**MUST gate entirely.** Looping animations require an explicit `useReducedMotion()` check. Render a static alternative when reduced motion is preferred.

---

## 24. Imperative Animation Sequences

Multi-step animations triggered by user action — not scroll, not mount.

**When to use:**

- Onboarding flows triggered by button click
- Success/celebration animations after form submission
- Reveal sequences triggered by interaction

**When NOT to use:**

- Scroll-driven sequences (use GSAP per ADR-0003)
- Mount animations (use declarative `initial`/`animate`)

### 24.1 Implementation

```tsx
const [scope, animate] = useAnimate()

const runSequence = async () => {
  await animate('.form', { opacity: 0, y: -20 }, { duration: 0.3 })
  await animate(
    '.success-icon',
    { scale: [0, 1.2, 1], opacity: 1 },
    { type: 'spring', stiffness: 300 },
  )
  await animate('.success-message', { opacity: 1, y: 0 }, { duration: 0.4 })
}

;<div ref={scope}>
  <div className='form'>...</div>
  <div className='success-icon' style={{ opacity: 0 }}>
    ✓
  </div>
  <div className='success-message' style={{ opacity: 0, transform: 'translateY(10px)' }}>
    Submitted!
  </div>
  <button onClick={runSequence}>Submit</button>
</div>
```

### 24.2 Patterns

**Sequential**: `await animate(...)` chain — each step waits for the previous.

**Parallel**: `Promise.all([animate(...), animate(...)])` — simultaneous animations.

**Mixed**: Parallel group then sequential follow-up:

```tsx
await Promise.all([
  animate('.left', { x: -50, opacity: 0 }, { duration: 0.2 }),
  animate('.right', { x: 50, opacity: 0 }, { duration: 0.2 }),
])
await animate('.center', { scale: 1, opacity: 1 }, { type: 'spring', stiffness: 300 })
```

**Navigate after**: `await animate(...)` then `router.push()`.

### 24.3 Reduced Motion

Skip the sequence, set final state instantly.

---

## 25. Simple Viewport Reveals (Single Element)

Single element fade/scale triggered by viewport entry. Not scroll-driven — fires once on enter.

**When to use:**

- Individual content blocks animating in on scroll
- When spring physics on the reveal are needed
- When precise variant control is needed

**When NOT to use:**

- When spring physics aren't needed — CSS `animation-timeline: view()` runs on compositor at zero JS cost
- When reveals are part of a larger scroll-driven scene — use GSAP (ADR-0003)

### 25.1 Implementation

```tsx
<m.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3 }}
  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
>
  <ContentBlock />
</m.div>
```

### 25.2 Key Details

| Comparison  | Motion `whileInView`     | CSS `animation-timeline: view()` |
| ----------- | ------------------------ | -------------------------------- |
| Thread      | Main thread (JS)         | Compositor thread                |
| Physics     | Spring physics available | CSS easing only                  |
| Bundle cost | Included in domAnimation | Zero JS                          |
| Stagger     | Yes (via variants)       | Manual with `animation-delay`    |

### 25.3 Reduced Motion

Snap to final state — set `initial={false}` or render without Motion wrapper.

---

## Part 3 — Production Patterns

## 26. Mobile Considerations

Motion animations are lifecycle-based, so they generally work on mobile. But mobile has constraints.

| Concern                                       | Impact                                                                          | Mitigation                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Layout animations compute layout twice (FLIP) | Fine for simple expand/collapse. Heavy with many simultaneous layout animations | Limit simultaneous `layout` elements. Test on mid-range phones                    |
| `AnimatePresence` exit delays unmount         | If exit is slow, navigation feels sluggish                                      | Keep exits ≤ 0.3s                                                                 |
| Spring physics compute on main thread         | Heavy springs on many elements impact frame rate on low-end phones              | Limit complex springs. Use duration-based for simple fades                        |
| `whileHover` doesn't trigger on touch         | Hover-revealed content invisible to touch users                                 | Show by default on mobile or use `whileTap`                                       |
| Looping animations run continuously           | Battery drain on mobile                                                         | Gate with reduced motion. Consider disabling on low-end devices                   |
| Large Motion bundle                           | Adds to initial load                                                            | `LazyMotion` + async loading. `next/dynamic` with `ssr: false` for heavy sections |

---

## 27. Performance

| Rule                                                                        | Why                                                                   |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Module-scope variants                                                       | Prevents new object creation every render                             |
| Module-scope `motion.create()` calls                                        | Same — recreating component types breaks reconciliation               |
| No hooks inside `.map()`                                                    | React rules of hooks. Extract per-item component                      |
| `memo()` on animated list items                                             | Prevents parent re-render from updating children mid-animation        |
| `style={}` for MotionValues, not `className`                                | MotionValues update via animation frame, bypass React render cycle    |
| `viewport={{ once: true }}` on reveals                                      | Stop IntersectionObserver after first trigger                         |
| `will-change: transform` only on heavy animations, only when motion enabled | GPU memory is finite — each promoted layer consumes VRAM              |
| `layoutDependency` prop on layout elements                                  | Reduces layout measurements to only when the dependency value changes |
| Animate only `transform` and `opacity`                                      | These properties run on the compositor — no layout/paint cost         |
| `next/dynamic` with `ssr: false` for heavy sections                         | Reduce initial bundle, avoid unnecessary server rendering             |

---

## 28. Rules Table

### MUST

- Use `'use client'` on every animated component
- Use `m.*` namespace with `LazyMotion strict` — not `motion.*`
- Declare variants at module scope
- Declare `motion.create()` at module scope
- Use `AnimatePresence` with explicit `mode` when swapping keyed content
- Gate `repeat: Infinity` looping animations with `useReducedMotion()` check
- Provide opacity-only `AnimatePresence` exit/enter under reduced motion
- Animate only `transform` and `opacity` for continuous animations
- Ensure exiting `AnimatePresence` children have unique, stable `key` props

### SHOULD

- Use `viewport={{ once: true }}` on fire-and-forget reveals
- Use `memo()` on animated list items
- Use `next/dynamic` with `ssr: false` for heavy animated sections
- Use spring presets (§3) instead of ad hoc magic numbers
- Keep exit animations ≤ 0.3s
- Use `domMax` for projects that need layout animations or drag
- Use `Reorder.Group` / `Reorder.Item` for drag-to-reorder
- Use `LayoutGroup` to scope layout animations in complex pages
- Use `layout="position"` for grid reflows where size shouldn't animate

### MUST NOT

- Use `motion.*` components inside `LazyMotion` (blocked by strict mode)
- Declare variants or `motion.create()` inside component body
- Call hooks inside `.map()` iterations
- Animate `width`, `height`, `margin`, `padding` per-frame (use `layout` for dimension changes)
- Apply CSS `transition` to `width`/`height` when `layout` handles the case
- Mix GSAP and Motion transforms on the same DOM element (per ADR-0003)
- Use array `index` as `key` for `AnimatePresence` children

---

## 29. Anti-Patterns

| ❌ Don't                                                             | Why                                                            | ✅ Do Instead                                               |
| -------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| Variants inside component body                                       | Recreated every render, breaks referential stability           | Module-scope constants                                      |
| Long exit animations (>0.5s)                                         | Navigation feels frozen, especially on mobile                  | ≤ 0.3s exits                                                |
| `AnimatePresence` without `mode` for sequential swaps                | Both elements render simultaneously — layout flash             | `mode="wait"` for one-at-a-time content                     |
| `layoutId` without `LayoutGroup` in complex pages                    | Layout animations leak across components, causing interference | Scope with `LayoutGroup`                                    |
| Spring on everything                                                 | Some transitions should be predictable (fades, tab swaps)      | Duration-based for fades, springs for physical interactions |
| `whileHover={{ scale: 1.2 }}`                                        | Cartoonish — feels amateurish                                  | Subtle values: `1.02`–`1.05`                                |
| No `key` on `AnimatePresence` children                               | Exit animation never triggers — React can't detect removal     | Unique `key` that identifies the instance                   |
| `key={index}` on `AnimatePresence` lists                             | Reorder causes wrong element to exit                           | Use `item.id` as key                                        |
| Looping animation without `useReducedMotion()` gate                  | Accessibility violation — WCAG 2.3.3                           | Always gate `repeat: Infinity`                              |
| Ad hoc spring configs as magic numbers                               | Inconsistent feel across the app                               | Named presets (§3)                                          |
| Page transition > 0.3s                                               | Sluggish on mobile, blocks interaction                         | Keep short, opacity-focused                                 |
| `motion.create()` inside component body                              | New component type every render, breaks React reconciliation   | Module scope                                                |
| CSS `transition` on `width`/`height`                                 | Per-frame reflow — very expensive                              | `layout` prop (FLIP technique)                              |
| Hooks in `.map()`                                                    | React rules of hooks violation                                 | Extract per-item component                                  |
| Wrapping `AnimatePresence` inside the conditional                    | `AnimatePresence` unmounts with the element, exit never fires  | Conditional **inside** `AnimatePresence`                    |
| `motion.*` components inside `LazyMotion`                            | Bypasses tree-shaking, loads full 34 kB bundle                 | `m.*` from `motion/react-m`                                 |
| `display: inline` on layout-animated elements                        | Browsers don't apply `transform` to inline elements            | Use `block`, `flex`, or `inline-block`                      |
| Animating layout inside scrollable containers without `layoutScroll` | Scroll offset not accounted for — position is wrong            | Add `layoutScroll` to the scrollable parent                 |

---

## 30. Scope Boundary

### 30.1 Motion Handles

- Mount/unmount transitions (`AnimatePresence`)
- Layout animations — FLIP technique (expand, collapse, reorder, shared element)
- Gesture responses (hover, tap, drag, focus)
- Viewport reveals (`whileInView` + variants)
- Stagger sequences on enter
- Imperative animation sequences (`useAnimate`)
- Page transitions in Next.js
- Looping/ambient animations
- Tab/step content swaps
- List item add/remove with sibling reflow
- Drag-to-reorder (`Reorder.Group` / `Reorder.Item`)
- Micro-interactions and button feedback
- Shared element transitions (`layoutId`)

### 30.2 Motion Does NOT Handle

| What                                                                 | Use Instead                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------- |
| Scroll-driven pinned sections                                        | GSAP ScrollTrigger (ADR-0003)                                 |
| Scroll-linked choreography across multiple elements                  | GSAP ScrollTrigger (ADR-0003)                                 |
| Horizontal scroll conveyors                                          | GSAP ScrollTrigger (ADR-0003)                                 |
| Video scrubbing tied to scroll                                       | GSAP ScrollTrigger (ADR-0003)                                 |
| SVG line-draw reveals tied to scroll                                 | CSS Scroll-Driven Animations API                              |
| Simple single-element scroll effects (opacity fade, basic translate) | CSS `animation-timeline: view()` — zero JS, compositor thread |
| Complex multi-phase scroll scenes                                    | GSAP ScrollTrigger (ADR-0003)                                 |

### 30.3 Cross-Engine Coexistence

Motion and GSAP can coexist at the **section level** — one engine per element (per ADR-0003 §27.2):

| Layer                                                | Engine                           |
| ---------------------------------------------------- | -------------------------------- |
| Section pinning + scroll timeline                    | GSAP ScrollTrigger               |
| Hover states on interactive cards within the section | Motion gesture props             |
| Mount/unmount overlays                               | Motion AnimatePresence           |
| Simple scroll reveals (no spring needed)             | CSS `animation-timeline: view()` |

**Never** mix Motion and GSAP transforms on the **same DOM element**.

---

## Library Compatibility

| Library                         | Status        | Purpose                                          | Notes                                                                                             |
| ------------------------------- | ------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `motion`                        | `recommended` | React lifecycle and interaction animation engine | ~34 kB pre-bundled, 4.6 kB with LazyMotion. Hybrid engine: WAAPI + JS fallback for springs. v12+  |
| `motion/react-m`                | `recommended` | Tree-shakable `m.*` namespace                    | Required with `LazyMotion strict`. No independent install — part of `motion` package              |
| `Reorder` (from `motion/react`) | `recommended` | Drag-to-reorder lists                            | Built-in Motion component. Simpler than dnd-kit for single-list reorder                           |
| dnd-kit                         | `compatible`  | Cross-column drag, kanban, file drop zones       | Use when Motion's `Reorder` is insufficient (per ADR-0027). Different domain — DnD, not animation |
| react-spring                    | `forbidden`   | Spring animations                                | Overlapping scope with Motion. One spring engine per project                                      |
| react-transition-group          | `forbidden`   | Mount/unmount transitions                        | `AnimatePresence` covers this with better API and bundle efficiency                               |
| Any CSS-in-JS animation library | `forbidden`   | Animations                                       | Violates ADR-0002 (no CSS-in-JS runtime)                                                          |

---

## Consequences

**Positive:**

- Every React lifecycle animation technique has a documented implementation pattern with code — agents produce consistent animated components
- `LazyMotion` with `m.*` namespace and strict mode ensures tree-shaking is enforced — no accidental 34 kB imports
- Scope boundary clearly delineates Motion (React lifecycle) vs GSAP (scroll-driven) vs CSS (compositor-eligible) — no engine overlap
- Spring presets ensure consistent animation feel across the application
- Reduced motion strategy is explicit per animation type — presence gets opacity-only, gestures get no guard, looping gets full gate
- Layout animations (FLIP) enable smooth dimension changes without per-frame reflow — something CSS transitions cannot do efficiently
- `AnimatePresence` mode table prevents the most common exit animation mistake (missing `mode="wait"`)
- Anti-patterns table catches the 18 most common production mistakes before code review

**Negative:**

- Motion adds ~25 kB to the client bundle (with `domMax` via `LazyMotion`) — mitigated by async loading and `next/dynamic`
- All animations run on the client — `'use client'` boundary required, limiting where animated components can live in the component tree
- Spring physics compute on the main thread — heavy use on many elements simultaneously can impact frame rate on low-end devices
- Layout animations use `transform: scale()` which can distort children — requires `layout` prop on children for correction, adding complexity
- `AnimatePresence` exit animations delay unmount — exits must be kept short (≤ 0.3s) or navigation feels sluggish
- Page transitions with App Router conflict with streaming/Suspense — must be kept simple (opacity only)

## Related ADRs

- [ADR-0002](./0002-styling.md) — Styling (Tailwind-only, inline `style` allowed for animation values, no CSS-in-JS)
- [ADR-0003](./0003-gsap-scroll-driven-animation.md) — GSAP & ScrollTrigger (scroll-driven animation engine, scope boundary delineation)
- [ADR-0004](./0004-components.md) — Component Structure (`'use client'` directive, server component default)
- [ADR-0018](./0018-performance-platform.md) — Performance (`next/dynamic` for heavy libraries, Core Web Vitals)
- [ADR-0019](./0019-accessibility.md) — Accessibility (WCAG 2.2, reduced motion compliance, `prefers-reduced-motion`)
- [ADR-0027](./0027-interactive-component-implementation.md) — Interactive Components (cross-engine coexistence, `useMotionEnabled()` project wrapper)
