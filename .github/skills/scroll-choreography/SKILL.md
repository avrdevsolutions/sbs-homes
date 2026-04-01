---
name: scroll-choreography
description: >-
  Scroll-driven multi-element choreography and anti-patterns — phase staggering,
  waterfall cascades, createChoreoChannels helper, varying spring mass for cascade feel,
  and comprehensive anti-pattern catalog. Use when orchestrating multiple animated
  elements in a single scroll scene, creating staggered enter/hold/exit cascades, or
  reviewing scroll animation code for common mistakes.
---

# Scroll-Driven Scenes — Choreography & Anti-Patterns

**Compiled from**: ADR-0030 §13 Multi-Element Choreography, §18 Anti-Patterns
**Last synced**: 2026-03-28

---

## 1. Multi-Element Choreography

Orchestrating multiple animated elements within a single scroll range — the "timeline within a timeline" pattern. This is how Apple coordinates text, image, badge, and background animations to enter and exit in a composed sequence.

### The principle

A single `scrollYProgress` (0→1) is the master clock. Each element maps different sub-ranges to its own animation. The key is **phase staggering**: elements don't all animate at once — they enter, hold, and exit at slightly offset ranges.

### Phase pattern

```
Progress: 0 ──── 0.2 ──── 0.4 ──── 0.6 ──── 0.8 ──── 1.0
                  │         │         │         │
Background: [═══ fade in ══════════ hold ══════════ fade out ═══]
Headline:         [═══ enter ═══][═════ hold ═════][═ exit ═]
Body text:           [══ enter ══][═══ hold ═══][═ exit ═]
CTA badge:              [═ enter ═][══ hold ══][exit]
Product img:   [═══════════════ slow scale ═══════════════════]
```

Each element starts slightly after the previous one — creating a "waterfall" cascade.

### Implementation

```tsx
// Phase offsets — all elements share one scrollYProgress
const CHOREO = {
  bg: { fadeIn: [0.0, 0.1], hold: [0.1, 0.85], fadeOut: [0.85, 1.0] },
  headline: { enter: [0.1, 0.2], hold: [0.2, 0.7], exit: [0.7, 0.8] },
  body: { enter: [0.15, 0.25], hold: [0.25, 0.65], exit: [0.65, 0.75] },
  badge: { enter: [0.2, 0.3], hold: [0.3, 0.6], exit: [0.6, 0.7] },
  image: { scaleRange: [0.0, 1.0] },
}

const headlineChannels = {
  opacity: createMotionRange(
    [
      CHOREO.headline.enter[0],
      CHOREO.headline.enter[1],
      CHOREO.headline.exit[0],
      CHOREO.headline.exit[1],
    ],
    [0, 1, 1, 0],
  ),
  y: createMotionRange(
    [
      CHOREO.headline.enter[0],
      CHOREO.headline.enter[1],
      CHOREO.headline.exit[0],
      CHOREO.headline.exit[1],
    ],
    [30, 0, 0, -30],
  ),
}

const bodyChannels = {
  opacity: createMotionRange(
    [CHOREO.body.enter[0], CHOREO.body.enter[1], CHOREO.body.exit[0], CHOREO.body.exit[1]],
    [0, 1, 1, 0],
  ),
  y: createMotionRange(
    [CHOREO.body.enter[0], CHOREO.body.enter[1], CHOREO.body.exit[0], CHOREO.body.exit[1]],
    [20, 0, 0, -20],
  ),
}
```

### Helper: createChoreoChannels

Generate enter/hold/exit channels without manual math:

```tsx
type Phase = {
  enter: [number, number]
  hold: [number, number]
  exit: [number, number]
}

const createChoreoChannels = (phase: Phase, { yDistance = 25 }: { yDistance?: number } = {}) => ({
  opacity: createMotionRange(
    [phase.enter[0], phase.enter[1], phase.exit[0], phase.exit[1]],
    [0, 1, 1, 0],
  ),
  y: createMotionRange(
    [phase.enter[0], phase.enter[1], phase.exit[0], phase.exit[1]],
    [yDistance, 0, 0, -yDistance],
  ),
})
```

### Varying spring mass for cascade feel

Don't use the same spring config for all elements. Vary mass slightly so the first element is lighter (responds faster) and later elements trail:

```tsx
// Headline: lighter, responds first
<MotionSectionItem channels={headlineChannels} smooth={{ stiffness: 120, damping: 20, mass: 0.3 }}>

// Body: standard weight
<MotionSectionItem channels={bodyChannels} smooth={{ stiffness: 120, damping: 20, mass: 0.35 }}>

// Badge: heavier, trails behind
<MotionSectionItem channels={badgeChannels} smooth={{ stiffness: 120, damping: 20, mass: 0.45 }}>
```

---

## 2. Anti-Patterns

> **Cross-reference**: Performance budgets and full anti-jank checklist → skill `scroll-scene-foundations` §5.

| Don't                                             | Why                                                     | Do Instead                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Raw unsmoothed `scrollYProgress` → transform      | Mechanical "1:1" feel, no weight or momentum            | Always apply `useSpring` or the `smooth` prop                                                |
| Scroll height too short for content count         | Animation feels rushed, elements flash by               | Use the scroll budget formula — minimum 100vh per animated item                              |
| Scroll height too long                            | User endures empty scrolling, reaches for scroll bar    | Cap at 800vh, reduce if animation finishes before 80% progress                               |
| `position: fixed` instead of `sticky`             | Breaks in nested layouts, ignores parent scroll context | `position: sticky; top: 0` (MotionSection does this)                                         |
| Animating `width`, `height`, `margin` with scroll | Triggers layout recalculation every frame — 60fps jank  | Only `transform` + `opacity` — GPU-composited properties only                                |
| No mobile fallback                                | Scroll hijacking on touch, GPU thermal throttling       | Always provide simplified mobile layout                                                      |
| No reduced motion fallback                        | Accessibility violation, WCAG 2.3.3                     | Check `useMotionEnabled()`; collapse to static layout under `prefers-reduced-motion: reduce` |
| `useState` to read scroll position                | React re-renders on every scroll frame — kills perf     | Keep values in MotionValue graph                                                             |
| Multiple `useScroll` on same target               | Duplicate IntersectionObservers — wasted work           | Use context (MotionSection) or prop-drill one `scrollYProgress`                              |
| `willChange: transform` on all elements           | GPU memory exhaustion — browser may drop layers         | Only on elements with active scroll transforms, only when motion enabled                     |
| Spring smoothing on a progress bar                | Progress bars should feel precise, not laggy            | Use `snappy` preset or no smoothing                                                          |
| Video scrubbing without preload                   | Seeking shows black/frozen frames                       | `preload="auto"` and load on mount; poster until ready                                       |
| Clip-path from 0% to 100% without easing          | Linear expansion looks robotic                          | Use spring smoothing — expansion should decelerate                                           |
| Same spring config for all choreographed elements | Everything moves in lockstep — no cascade feel          | Vary mass: first lighter (faster), last heavier (trails)                                     |
| Testing only at 60fps on MacBook Pro              | Mid-range Android is 4–6× slower                        | Throttle CPU 4× in DevTools, test every scroll scene                                         |
