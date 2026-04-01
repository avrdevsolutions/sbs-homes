# ADR-0003: Animation (Framer Motion)

**Status**: Accepted
**Date**: 2026-03-21

---

## Context

Animation is a core part of the user experience. Framer Motion v12 is included in the project by default, with a pre-built motion system that provides scroll-driven sections, viewport reveals, micro-interactions, presence transitions, and imperative animation patterns.

The motion system lives entirely in source code (`src/lib/motion/`). This ADR documents the architectural decisions, rules, and usage patterns — not the implementation. Read the source files for API details and JSDoc.

## Decision

**Framer Motion v12 is a default dependency.** The project ships with:

- `src/lib/motion/` — Core module: provider, types, context, helpers, central re-export
- `src/lib/motion/hooks/` — `useMotionAnimation`, `useMotionEnabled`, `useParallax`
- `src/lib/motion/components/` — Four reusable components: `MotionInView`, `MotionSection`, `MotionSectionItem`, `MotionBox`

All application code imports from `@/lib/motion` — never from `motion/react` directly.

### Extensibility

The four shipped components and three hooks are **starting points, not ceilings**. Complex scroll-driven scenes (multi-phase, per-element springs, combined techniques) often need custom hooks, helpers, or components. Agents MAY create new files in `src/lib/motion/` provided they:

1. Follow existing conventions (`'use client'`, `displayName`, typed exports)
2. Add types to `types.ts` when defining new shared types
3. Re-export from `index.ts`
4. Keep `motion/react` imports inside `src/lib/motion/` — application code still imports only from `@/lib/motion`

---

## Architecture

### Animation Orchestration

Animation decisions are made through a standalone animation orchestration flow (see `.github/flow-generator/animation/`). The animation skill files compiled from this ADR (`animation-architecture`, `animation-components`, `animation-patterns`, `animation-performance`) are the authoritative knowledge source for execution agents. No agent other than the CTO and Knowledge Sync reads this ADR directly.

### File Structure

```
src/lib/motion/
  index.ts                  # Central re-export — single import point for the entire project
  MotionProvider.tsx         # LazyMotion + domAnimation + strict + MotionConfig
  MotionSectionContext.ts    # React Context for sharing scrollYProgress
  types.ts                  # ChannelMap, RangeConfig, SpringConfig, MotionInteractionProps
  helpers.ts                # createMotionRange(), SPRING_PRESETS, buildWillChange()
  hooks/
    useMotionAnimation.ts   # Dynamic channel-based scroll animation (imperative MotionValues)
    useMotionEnabled.ts     # !useReducedMotion() — positive logic
    useParallax.ts          # One-liner parallax effect with spring smoothing
  components/
    MotionInView.tsx         # Viewport reveal (whileInView, directional, scale, fire-and-forget)
    MotionSection.tsx        # Scroll container — provides scrollYProgress via context
    MotionSectionItem.tsx    # Context consumer — reads scrollYProgress from parent MotionSection
    MotionBox.tsx            # Self-contained scroll box — owns its own useScroll
```

### Three-Tier Scroll Architecture

All scroll-driven animations follow this data flow:

```
Tier 1: Container   → useScroll() produces scrollYProgress: MotionValue<number> [0..1]
Tier 2: Transform   → useMotionAnimation(progress, channels) maps progress to CSS values
Tier 3: Render      → m.div style={{ ...values }} — zero React re-renders
```

Values stay in the MotionValue graph from source to render. No `useState` in between.

### LazyMotion Strategy

`MotionProvider` wraps layouts with `LazyMotion features={domAnimation} strict`:
- **`domAnimation`** loads only needed features (~20kB vs ~60kB full import)
- **`strict`** throws a runtime error if `motion.*` components are used instead of `m.*`
- Switch to `domMax` only when drag/pan gestures are needed (+~8kB)

### Type System

Types are composable — each component picks only what it needs:

| Type | Purpose |
|------|---------|
| `RangeConfig` | Maps `inputRange` (progress) to `outputRange` (numeric CSS values) |
| `ChannelMap` | `Record<string, RangeConfig>` — dynamic animation channels keyed by CSS property |
| `SpringConfig` | Spring physics config: stiffness, damping, mass |
| `MotionInteractionProps` | FM interaction props: whileHover, whileTap, animate, variants, etc. |
| `ScrollOffset` | Scroll offset type (mirrors FM's ScrollOffset) |

---

## Rules

| Rule | Level |
|------|-------|
| Import from `@/lib/motion`, never `motion/react` directly | **MUST** |
| Use `'use client'` on every animated component | **MUST** |
| Follow the three-layer reduced-motion strategy (§Reduced Motion) | **MUST** |
| **Tier 1 (continuous — scroll, parallax, reveals, looping):** animate only `transform` and `opacity` | **MUST** |
| **Tier 1:** Don't animate `width`, `height`, `margin`, `padding` per-frame | **MUST NOT** |
| **Tier 1:** Using `scale` + `translate` to visually simulate dimension/position changes (hero shrinks, card repositions) is Tier 1 — not Tier 2 | clarification |
| **Tier 2 (discrete — expand/collapse, reorder, mount/unmount, tab switch):** use FM `layout` prop or `AnimatePresence` for dimension changes | **SHOULD** |
| **Tier 2:** Don't use CSS transitions on `width`/`height` directly — bypasses FLIP, causes per-frame reflow | **MUST NOT** |
| Use `m` namespace — `strict` mode enforces this at runtime | **MUST** |
| Declare `variants` at module scope, never inside a component body | **MUST** |
| Keep MotionValues in the FM graph — no `useState` from scroll position | **MUST** |
| Apply MotionValues via `style={}`, not `className` | **MUST** |
| Declare `m.create()` calls at module scope | **MUST** |
| Guard `console.warn` with `process.env.NODE_ENV !== 'production'` | **MUST** |
| Gate `repeat: Infinity` looping animations with `useMotionEnabled()` | **MUST** |
| Use `AnimatePresence mode='wait'` when swapping keyed content | **MUST** |
| Use opacity-only AnimatePresence exits under `useReducedMotion()` | **MUST** |
| Set `displayName` matching the exported component name | **MUST** |
| Don't add animations not requested in the issue | **MUST NOT** |
| Don't use `motion.*` — use `m.*` | **MUST NOT** |
| Don't call hooks inside `.map()` — extract per-item components | **MUST NOT** violate |
| Don't import `motion/react` outside `src/lib/motion/` | **MUST NOT** |
| Use `next/dynamic` with `ssr: false` for heavy animated sections | **SHOULD** |
| Disable complex scroll animations on mobile (<768px) | **SHOULD** |
| Use `viewport={{ once: true }}` on fire-and-forget reveals | **SHOULD** |
| Use `useSpring` to smooth scroll-linked values | **SHOULD** |
| Use `memo()` on scroll-animated list items | **SHOULD** |
| Set `willChange: 'transform, opacity'` on heavy parallax (motion-enabled only) | **SHOULD** |
| Prefer `component={m.div}` over nesting `<m.div>` inside wrappers | **SHOULD** |

---

## Motion Components

See the source files for full API. Brief descriptions:

### `MotionSection` — Scroll Container

Creates one `useScroll`, provides `scrollYProgress` to descendants via `MotionSectionContext`. Handles scroll tracking and sticky positioning only — **layout is the consumer's job** via `className`.

```tsx
<MotionSection height="300vh" containerHeight="100vh" className="flex flex-col items-center gap-10">
  <MotionSectionItem channels={{ opacity: createMotionRange([0, 0.75, 0.95], [1, 1, 0]) }}>
    <Content />
  </MotionSectionItem>
</MotionSection>
```

### `MotionSectionItem` — Context Consumer

Reads `scrollYProgress` from the nearest parent `MotionSection`. Accepts any number of animation channels via `channels` prop. Warns in dev if used outside a `MotionSection`. Supports optional spring smoothing via `smooth` prop.

### `MotionBox` — Self-Contained Scroll Box

Owns its own `useScroll` + `useMotionAnimation`. Can also accept external `scrollYProgress` to be driven by a parent. Accepts any number of animation channels via `channels` + FM interaction props (`whileHover`, `variants`, etc.). Auto-computes `willChange` hint when channels include transform/opacity properties.

```tsx
<MotionBox
  offset={['start end', 'end start']}
  channels={{
    opacity: createMotionRange([0, 0.5], [0, 1]),
    y: createMotionRange([0, 1], [50, -50]),
    rotate: createMotionRange([0, 1], [0, 15]),
  }}
  smooth={SPRING_PRESETS.smooth}
>
  <Content />
</MotionBox>
```

### `MotionInView` — Viewport Reveal

Fire-and-forget directional reveal. Supports direction (`up`/`down`/`left`/`right`/`none`), distance, delay, duration, ease, `once`, opacity range, and scale range. Automatically falls back to opacity-only under reduced motion.

```tsx
<MotionInView direction="up" distance={30} delay={0.2} scaleRange={[0.95, 1]} once>
  <Card />
</MotionInView>
```

### `useParallax` — One-Liner Parallax

Returns `ref` + `style` for a spring-smoothed parallax effect. Handles `useScroll`, `useTransform`, `useSpring`, and reduced-motion in one call.

```tsx
const { ref, style } = useParallax(60)
<m.div ref={ref} style={style}>...</m.div>
```

---

## Reduced Motion Strategy

Three layers — not a blanket "check in ALL components" rule.

| Layer | Scope | Handling |
|-------|-------|----------|
| **Scroll-driven** | `useMotionAnimation` consumers | Automatic — hook snaps all channels to "done" values, no animation |
| **Presence** (modals, drawers, nav) | `AnimatePresence` enter/exit | Opacity-only fallback: zero `y`/`scale` offsets, shorter duration |
| **Micro-interactions** (hover, tap) | `whileHover`, `whileTap` | No guard needed — user-initiated, brief, WCAG 2.3.3 compliant |
| **Looping** (`repeat: Infinity`) | Ambient pulses, loading | **MUST gate** with `useMotionEnabled()` |

---

## Patterns

### Context-Based Scroll

`MotionSection` → `MotionSectionItem`. Parent owns `useScroll`, children read via context. Best for sections with multiple animated children.

### Prop-Drilled Scroll

One `useScroll`, progress passed as prop to siblings. Useful when you don't want context overhead:

```tsx
const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
<TextPanel scrollYProgress={scrollYProgress} />
<ImagePanel scrollYProgress={scrollYProgress} />
```

### Stagger Children

Parent declares `staggerChildren` in variants; children inherit variant keys:

```tsx
const list = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

<m.ul variants={list} initial="hidden" animate="show">
  {items.map(i => <m.li key={i.id} variants={item} />)}
</m.ul>
```

### Imperative Sequential (`useAnimate`)

```tsx
const [scope, animate] = useAnimate()
await animate('#logo', { opacity: 0 })
await animate(scope.current, { minHeight: '100vh' }, { type: 'spring', stiffness: 130 })
```

### Imperative Parallel

```tsx
await Promise.all([
  animate(scope.current, { flexGrow: 4 }, { duration: 0.4 }),
  animate('#overlay', { opacity: 0.4 }),
])
```

### Navigate After Animation

```tsx
await animate(scope.current, { minWidth: '100%' }, { duration: 0.5 })
router.push(redirectPath)
```

### Deferred Start (`useAnimation`)

Prevent flicker by deferring animation start with `setTimeout`:

```tsx
const controls = useAnimation()
useEffect(() => {
  const t = setTimeout(() => controls.start({ opacity: 0.5, transition: { duration: 2 } }))
  return () => clearTimeout(t)
}, [controls])
```

### `m.create()` for Third-Party Components

Declare at module scope — never inside the component body:

```tsx
const MotionIconButton = m.create(IconButton)
```

### `component={m.div}` on Wrappers

Avoids extra DOM node:

```tsx
<Box component={m.div} style={{ opacity }} className="w-full">{children}</Box>
```

### Layout Animation

Framer Motion's `layout` prop uses the FLIP technique (First, Last, Invert, Play): the browser computes layout at the start state and end state, then FM inverts the difference and plays an animation using GPU-composited `transform`. This means only two layout calculations (before and after), not per-frame reflow.

**`layout` prop — automatic dimension/position animation:**

```tsx
// Element smoothly animates between size states via FLIP
const [isExpanded, setIsExpanded] = useState(false)

<m.div
  layout
  onClick={() => setIsExpanded(!isExpanded)}
  className={isExpanded ? 'w-[300px] h-[200px]' : 'w-[100px] h-[100px]'}
/>
```

**`layout="position"` — animate position only, instant size change:**

```tsx
<m.div layout="position">
  Size changes instantly, position animates smoothly
</m.div>
```

**`layoutId` — shared element transitions:**

Two components with the same `layoutId` automatically animate between each other. Wrap with `LayoutGroup` to scope animations:

```tsx
import { LayoutGroup, AnimatePresence } from 'motion/react'
// Note: LayoutGroup and AnimatePresence are imported in @/lib/motion and re-exported

<LayoutGroup>
  {items.map((item) => (
    <m.div key={item.id} layoutId={item.id} onClick={() => setSelected(item.id)}>
      <m.h2 layoutId={`title-${item.id}`}>{item.title}</m.h2>
    </m.div>
  ))}

  <AnimatePresence>
    {selected && (
      <m.div layoutId={selected} className="expanded-card">
        <m.h2 layoutId={`title-${selected}`}>{selectedItem.title}</m.h2>
        <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          Expanded content
        </m.p>
      </m.div>
    )}
  </AnimatePresence>
</LayoutGroup>
```

**`AnimatePresence mode="popLayout"` — sibling reflow on exit:**

```tsx
<AnimatePresence mode="popLayout">
  {items.map((item) => (
    <m.div
      key={item.id}
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      {item.content}
    </m.div>
  ))}
</AnimatePresence>
```

**When to use which:**

| Pattern | Use |
|---------|-----|
| Expand/collapse (accordion, card reveal) | `layout` on the expanding element |
| List item add/remove with sibling reflow | `layout` on items + `AnimatePresence mode="popLayout"` |
| List item → detail view (shared element) | `layoutId` on both states + `AnimatePresence` |
| Reorder (drag-and-drop settle) | `layout` on sortable items |
| Tab content swap (same container, different size) | `layout` on the container |
| Position change only (grid reflow) | `layout="position"` |

**Deprecated API note:** `layoutDependency` was removed in FM v6+. The `layout` prop detects changes automatically on re-render — no dependency prop needed.

### AnimatePresence Modes

- Default mode: enter/exit can overlap (overlays)
- `mode='wait'`: old exits fully before new enters (tab content, list swaps)
- `mode='popLayout'`: exiting elements are removed from document flow immediately, siblings animate to fill the space via `layout` prop

### `useMotionTemplate` for Dynamic CSS

```tsx
const heightCalc = useMotionTemplate`calc(100vh - ${smoothTopPx}px)`
<m.div style={{ height: heightCalc }} />
```

### Video Scrubbing

Chain `useTransform` for deadzone → raw time → frame-snapped time, then `useMotionValueEvent` for throttled `video.currentTime` writes. See Definee's `useVideoLoader` pattern.

### 3D Flip Card

`rotateY` + `preserve-3d` + `perspective: 1000` + `onUpdate` to track the 90° mid-flip point for face swapping. Spring: `{ stiffness: 140, damping: 18 }`.

### Per-Word Reveal

Extract a `WordSpan` child component (for hook rules). Each word gets `useTransform(progress, [start, end], [dimOpacity, 1])`. Smooth the source progress with `useSpring`.

---

## Variant Naming Convention

| State | Key |
|-------|-----|
| Before animation | `hidden` or `initial` |
| After animation | `visible` or `show` |
| Exit animation | `exit` |

---

## Transition Defaults

| Use Case | Duration | Config |
|----------|----------|--------|
| Viewport reveal | 0.6s | `ease: 'easeOut'` |
| Nav stagger | 0.05–0.1s | `ease: 'easeOut'` |
| Button micro | 0.1s | `ease: 'easeOut'` |
| Modal/drawer | 0.3s | `ease: 'easeOut'` |
| Nav hide/show | 0.1s | `ease: 'easeInOut'` |
| Smooth spring | — | `SPRING_PRESETS.smooth` = `{ stiffness: 120, damping: 20, mass: 0.35 }` |
| Snappy spring | — | `SPRING_PRESETS.snappy` = `{ stiffness: 500, damping: 28, mass: 0.4 }` |
| Bouncy spring | — | `SPRING_PRESETS.bouncy` = `{ stiffness: 300, damping: 15, mass: 0.5 }` |
| Card flip spring | — | `{ stiffness: 140, damping: 18 }` |
| Looping ambient | 2s | `ease: 'easeInOut', repeat: Infinity` |

---

## Performance

1. `LazyMotion` + `domAnimation` — ~20kB vs ~60kB full bundle
2. `strict` mode — runtime guard against `motion.*` usage
3. `style={}` for MotionValues — animation frame updates, not React renders
4. No `useState` from scroll — values stay in the FM graph
5. `useSpring` / `smooth` option for smoothing scroll-linked values
6. `memo()` on scroll-animated list items
7. Extract per-item components for hooks in `.map()` iterations
8. Frame throttling for video scrubbing (`lastFrameRef` guard)
9. `m.create()` at module scope — one wrapper creation, not per-render
10. `component={m.div}` — avoids extra DOM node
11. Auto `willChange` via `buildWillChange()` — only when motion-enabled, only for composited properties
12. `useMotionAnimation` creates imperative `motionValue()` instances — only allocated channels consume resources
13. `transform()` utility for interpolation — FM's native multi-stop interpolator, no custom math
14. `SPRING_PRESETS` centralizes spring configs — no scattered magic numbers
15. `layout` prop uses FLIP technique — only two layout calculations (before + after state), not per-frame reflow. The actual animation runs on GPU-composited `transform`.
16. `layout="position"` skips size interpolation entirely — useful when only position needs to animate
17. `layoutId` shared element transitions compute layout diff once per transition, not per frame
18. `LayoutGroup` scopes layout animations to prevent cross-component interference — use when multiple independent layout animation regions exist on the same page

---

## Anti-Patterns

| Don't | Why | Do Instead |
|-------|-----|------------|
| Variants inside component body | New object every render | Module-scope `const variants = {}` |
| `@ts-ignore` on `style` for wrapped components | Loses type safety | `m.create(Component)` |
| `console.warn` without dev guard | Runs in production | `process.env.NODE_ENV !== 'production'` |
| `displayName` ≠ export name | Confusing DevTools | Match them |
| No reduced-motion guard on looping | A11y violation | `useMotionEnabled()` gate |
| Hardcoded channel names in hook | Closed for extension | Dynamic `ChannelMap` — any CSS property |
| Scattered spring config magic numbers | Inconsistent, unmaintainable | `SPRING_PRESETS.smooth` / `.snappy` / `.bouncy` |
| Manual `willChange` on every scroll component | Easy to forget, wrong under reduced motion | `buildWillChange(channels, motionEnabled)` |
| Layout hardcoded in motion infrastructure | Couples animation to design | `className` for consumer layout |
| CSS `transition` on `width`/`height`/`max-height` | Per-frame reflow on main thread — jank on mid-range devices | FM `layout` prop — FLIP bridges two layout snapshots via GPU transform |
| Using deprecated `layoutDependency` prop | Removed in FM v6+ — does nothing | Remove it — `layout` detects changes automatically on re-render |

---

## Rationale

Framer Motion is included by default because animation is a first-class concern:

1. **Declarative API** — `initial`/`animate`/`exit` is simpler than imperative alternatives
2. **React integration** — `AnimatePresence`, layout animations, gesture handlers work with React's model
3. **Built-in accessibility** — `useReducedMotion()` makes compliance straightforward
4. **Production-proven** — battle-tested patterns from the Definee production codebase
5. **Bundle-conscious** — `LazyMotion` + `domAnimation` + `strict` mode keeps cost to ~20kB

### Why not opt-in?

Every project using this starter needs animation. Making it opt-in added ceremony (install, scaffold, wire provider) without benefit. The pre-built motion system with `LazyMotion` keeps the bundle small enough to justify default inclusion.

## Options Considered

| Option | Why Chosen / Why Not |
|--------|---------------------|
| **Framer Motion** | ✅ Best DX, a11y hooks, React-native, production-proven |
| CSS transitions | ❌ No scroll orchestration, no exit animations |
| GSAP | ❌ Not React-idiomatic, commercial license |
| React Spring | ❌ Smaller community, less documentation |
| Web Animations API | ❌ No declarative React integration |

---

## Consequences

**Positive:**
- Motion system is ready to use out of the box — no scaffolding needed
- `LazyMotion` + `strict` keeps bundle lean and prevents accidental bloat
- Dynamic `ChannelMap` means any CSS property can be animated without modifying the hook
- Built-in spring smoothing (`smooth` option) eliminates the most common manual step
- Auto `willChange` via `buildWillChange()` handles GPU compositing hints correctly
- `useParallax` reduces the most common animation pattern to a single line
- `SPRING_PRESETS` centralizes spring configs from ADR transition defaults
- `useMotionAnimation` returns type-safe keys matching the input channels
- Reduced-motion fallback is automatic for all scroll-driven animations
- Four components + three hooks cover 90%+ of animation patterns with zero boilerplate
- Anti-pattern documentation prevents known production mistakes

**Negative:**
- ~20kB added to every route that uses animation — mitigated by `next/dynamic`
- Animated components must be Client Components — mitigated by isolating animation to leaf components
- Developers must understand which reduced-motion layer applies — mitigated by clear documentation
- `MotionBox` always creates a local `useScroll` — mitigated by FM's lazy observer (no perf cost when unused)

---

## Constraint Summary for Non-Technical Consumers

Agents or roles that propose animations without implementing them should be aware of these constraints:

- **Continuous animations** (scroll, parallax, reveals) may only move, rotate, scale, or fade elements — no size changes per frame
- **Discrete state changes** (expand, collapse, reorder) may change element dimensions using layout animations
- All animations must have a **reduced-motion fallback** — no animation should be mandatory for content access
- **Looping/infinite animations** require explicit gating for accessibility
- Heavy scroll-driven animations should account for **mobile performance** — simpler on small screens
- The motion system supports: viewport reveals, scroll-driven sections, parallax, stagger, presence transitions, micro-interactions, imperative sequences, layout animations, and shared element transitions

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture
- [ADR-0002](./0002-styling.md) — Styling (Tailwind `transition-*` for simple animations)
- [ADR-0004](./0004-components.md) — Components (animated = Client Component)
- [ADR-0019](./0019-accessibility.md) — Accessibility (`prefers-reduced-motion`)
- [ADR-0023](./0023-ui-foundation-primitives.md) — UI Primitives (motion components use project primitives)




