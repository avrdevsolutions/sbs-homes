---
name: motion-core-api
description: >-
  Motion declarative API — initial/animate/exit state model, variants (module-
  scope declaration required, parent/child propagation, staggerChildren +
  delayChildren, staggerDirection, dynamic custom variants), spring presets
  table (Smooth/Snappy/Bouncy with stiffness/damping/mass configs and use
  cases), duration recommendations table by use case, per-property transition
  syntax, layout animation transitions. Reduced motion strategy table per
  animation type: presence → opacity-only fallback, gestures → no guard
  needed (WCAG 2.3.3), looping → full gate required, viewport reveals → snap
  to final state, layout → optional instant snap, stagger → remove delay.
  Use when writing animated components with variants, choosing spring vs
  duration-based transitions, configuring stagger animations, or deciding how
  to handle prefers-reduced-motion for each animation type.
---

# Motion — Core Declarative API & Transitions

**Compiled from**: ADR-0030 §2 (Core API), §3 (Transitions), §4 (Variants), §11 (Reduced Motion)
**Last synced**: 2026-04-04

---

## The State Model

Motion's mental model: **declare states, Motion interpolates between them.**

```
initial → animate → exit
```

| Prop      | When it applies                                              |
| --------- | ------------------------------------------------------------ |
| `initial` | Starting state on mount — or `false` to skip mount animation |
| `animate` | Target state — on mount and whenever prop values change      |
| `exit`    | Target state before unmount (requires `AnimatePresence`)     |

```tsx
<m.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
/>
```

## Variants

Named animation states declared as plain objects. **MUST be at module scope** — declaring inside a component body creates new objects every render, breaking referential stability and potentially causing unnecessary re-animations.

```tsx
// ✅ Module scope — created once
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
  exit: { opacity: 0, y: -20 },
}

// Inside component
<m.div variants={cardVariants} initial="hidden" animate="visible" exit="exit" />
```

**Naming convention:** `hidden`/`initial` → before animation; `visible`/`show` → after; `exit` → leaving.

## Parent/Child Variant Propagation

When a parent has `animate="visible"`, all children with matching `variants` keys automatically animate to that state — no need to pass `animate` to children.

```tsx
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
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

<m.div variants={containerVariants} initial="hidden" animate="visible">
  {items.map(item => (
    <m.div key={item.id} variants={itemVariants}>
      <Card item={item} />
    </m.div>
  ))}
</m.div>
```

## Stagger Properties

Defined in the **parent's** transition:

| Property           | What it does                                         |
| ------------------ | ---------------------------------------------------- |
| `staggerChildren`  | Delay (seconds) between each child's animation start |
| `delayChildren`    | Delay before the first child starts                  |
| `staggerDirection` | `1` = forward order (default), `-1` = reverse        |

## Dynamic Variants

Variants can be functions accepting a `custom` value:

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

## Transitions

### Spring Presets

| Name   | Config                                                        | Use case                                           |
| ------ | ------------------------------------------------------------- | -------------------------------------------------- |
| Smooth | `{ type: 'spring', stiffness: 120, damping: 20, mass: 0.35 }` | General purpose, layout animations, scroll reveals |
| Snappy | `{ type: 'spring', stiffness: 500, damping: 28, mass: 0.4 }`  | Button feedback, modal enter, quick responses      |
| Bouncy | `{ type: 'spring', stiffness: 300, damping: 15, mass: 0.5 }`  | Playful, toggle switches, attention-grabbing       |

Use named presets — not ad hoc magic numbers — for a consistent feel across the app.

### Duration Recommendations

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

### Per-Property Transitions

Different properties can have different transitions on the same element:

```tsx
<m.div
  animate={{ opacity: 1, y: 0 }}
  transition={{
    opacity: { duration: 0.3, ease: 'easeOut' },
    y: { type: 'spring', stiffness: 300, damping: 24 },
  }}
/>
```

Layout animations can have their own transition key:

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

## Reduced Motion Strategy

Use `useReducedMotion()` from `motion/react`. Returns `true` when `prefers-reduced-motion: reduce` is active.

| Animation type                           | Reduced motion handling                                                |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| Presence (modal, drawer, nav enter/exit) | Opacity-only — remove `y`, `scale`, `rotate` offsets; shorter duration |
| Tab / step content swap                  | Opacity-only or instant swap                                           |
| Micro-interactions (hover, tap, focus)   | **No guard needed** — user-initiated, brief (WCAG 2.3.3)               |
| Looping (`repeat: Infinity`)             | **Must gate entirely** — render a static alternative when true         |
| Viewport reveals                         | Snap to final state (`initial={false}`) or opacity-only                |
| Layout animations                        | Let run — uses `transform`, no reflow. Optional: instant snap          |
| Stagger sequences                        | Remove stagger delay, show all items immediately                       |
| Shared element transitions               | Instant position swap, fade non-shared content                         |
| Page transitions                         | Instant navigation — disable transition wrapper                        |
| Imperative sequences                     | Skip sequence, set final state instantly                               |
| Drag-to-reorder                          | Snap to position, no drag animation                                    |

### Implementation Pattern

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

For looping animations — gate entirely:

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
