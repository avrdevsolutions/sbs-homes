---
name: motion-presence-layout
description: >-
  Motion AnimatePresence and layout animation APIs — AnimatePresence three modes
  (sync/wait/popLayout with decision table), keyed content swapping, initial=
  {false} for first render, direction-aware transitions via custom +
  usePresenceData(), propagate for nested exits. Layout animations: FLIP
  technique explanation, all layout props (layout/layout="position"/layout=
  "size"/layoutId/layoutDependency/layoutScroll/layoutRoot/layoutAnchor),
  LayoutGroup scoping, pattern routing table (expand/collapse, list add/remove,
  shared element, drag reorder, tab container, grid reflow), scale distortion
  fixes, scrollable and fixed container patterns. Gestures: whileHover/whileTap/
  whileFocus/whileDrag, keyboard accessibility (Enter triggers whileTap), touch
  strategies, propagate for event bubbling. Viewport reveals: whileInView +
  viewport option table, Motion vs CSS decision table. Use when implementing
  AnimatePresence for mount/unmount, layout animations for dimension or position
  changes, shared element transitions with layoutId, gesture-driven animations,
  or viewport-triggered entry reveals.
---

# Motion — AnimatePresence, Layout & Gestures

**Compiled from**: ADR-0030 §5 (AnimatePresence), §6 (Layout Animations), §7 (Viewport Reveals), §8 (Gestures)
**Last synced**: 2026-04-04

---

## AnimatePresence

Enables exit animations. Without it, React removes elements from the DOM instantly — exit animations are impossible.

### Three Modes

| Mode               | Behavior                                                                    | Use case                                          |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------- |
| `"sync"` (default) | Enter and exit animate simultaneously                                       | Overlays, toasts, backdrop + content pairs        |
| `"wait"`           | Old exits fully before new enters                                           | Tab content swap, step wizard, keyed content swap |
| `"popLayout"`      | Exiting element removed from flow immediately, siblings reflow via `layout` | List item removal with smooth sibling settle      |

### Keyed Content Swapping

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

### Structural Rules

```tsx
// ✅ Correct — conditional is inside AnimatePresence
;<AnimatePresence>{isOpen && <m.div key='modal' exit={{ opacity: 0 }} />}</AnimatePresence>

// ❌ Wrong — AnimatePresence unmounts with the element, exit never fires
{
  isOpen && (
    <AnimatePresence>
      <m.div exit={{ opacity: 0 }} />
    </AnimatePresence>
  )
}
```

- `AnimatePresence` must be a **direct parent** of the conditional/keyed element
- Every direct child needs a unique `key` that identifies the instance — **not array index**
- `exit` prop on children defines the exit target

### `initial={false}`

Disables the enter animation when `AnimatePresence` first mounts. Use for slideshows where the first slide should appear without animation:

```tsx
<AnimatePresence initial={false}>
  <m.img key={image.src} initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: -300 }} />
</AnimatePresence>
```

### Direction-Aware Transitions

The `custom` prop on `AnimatePresence` passes data to exiting components (whose props can't be updated after they leave the tree):

```tsx
<AnimatePresence custom={direction}>
  <m.div key={slideId} custom={direction} variants={slideVariants} />
</AnimatePresence>
```

Access the value in the exiting component:

```tsx
import { usePresenceData, useIsPresent } from 'motion/react'

const direction = usePresenceData()
const isPresent = useIsPresent()
```

### Propagate Nested Exits

By default, a nested `AnimatePresence` does NOT fire children's exits when a parent removes the ancestor. Add `propagate`:

```tsx
<AnimatePresence>
  {show && (
    <m.section exit={{ opacity: 0 }}>
      <AnimatePresence propagate>
        {/* WILL fire exit animation when show becomes false */}
        <m.div exit={{ x: -100 }} />
      </AnimatePresence>
    </m.section>
  )}
</AnimatePresence>
```

---

## Layout Animations

### FLIP Technique

Layout animations are performant because Motion uses FLIP:

1. **F**irst — measure layout before the change
2. **L**ast — let React render new layout, measure again
3. **I**nvert — apply `transform` to make the element appear in its original position
4. **P**lay — animate the transform to zero

Two layout calculations total. The animation uses only GPU-composited `transform` — no per-frame reflow.

### API Surface

| Prop                | What it does                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `layout`            | Animate both dimension and position changes                                               |
| `layout="position"` | Animate position only — size changes instantly                                            |
| `layout="size"`     | Animate size only — position changes instantly                                            |
| `layoutId`          | Shared element transition — same `layoutId` on origin and destination morphs between them |
| `layoutDependency`  | Only re-measure layout when this value changes (performance optimization)                 |
| `layoutScroll`      | Mark a scrollable ancestor so Motion accounts for scroll offset                           |
| `layoutRoot`        | Mark a `position: fixed` ancestor so Motion accounts for page scroll                      |
| `layoutAnchor`      | Control anchor point for parent-relative layout calculations `{ x: 0–1, y: 0–1 }`         |

### Pattern Routing Table

| Scenario                             | Pattern                                                |
| ------------------------------------ | ------------------------------------------------------ |
| Expand/collapse (accordion, card)    | `layout` on the expanding element                      |
| List add/remove with sibling reflow  | `layout` on items + `AnimatePresence mode="popLayout"` |
| List item → detail view              | `layoutId` on both states + `AnimatePresence`          |
| Drag-to-reorder settle               | `layout` on sortable items (auto with `Reorder.Item`)  |
| Tab content swap (container resizes) | `layout` on the container                              |
| Grid reflow (position only)          | `layout="position"`                                    |
| Multiple accordions in a list        | `layout` on items + `LayoutGroup` wrapper              |

### `LayoutGroup`

Scopes layout animations to prevent cross-component interference. Also synchronizes layout changes across components that don't re-render at the same time but affect each other's layout.

```tsx
import { LayoutGroup } from 'motion/react'

;<LayoutGroup>
  <Accordion />
  <Accordion />
</LayoutGroup>
```

### Scale Distortion Fixes

`layout` uses `transform: scale()` and can visually distort children:

- **Child elements**: add `layout` to direct children — Motion calculates counter-scales
- **Border radius / box shadow**: MUST be set via `style` prop, not `className`:
  ```tsx
  <m.div layout style={{ borderRadius: 20 }} />
  ```
- **Aspect ratio (images)**: use `layout="position"` — only position animates, size snaps

### Scrollable & Fixed Containers

```tsx
// Scrollable container
<m.div layoutScroll style={{ overflow: 'scroll' }}>
  <m.div layout />
</m.div>

// Fixed container
<m.div layoutRoot style={{ position: 'fixed' }}>
  <m.div layout />
</m.div>
```

---

## Gestures

### Gesture Props

| Prop         | Activates when              | Notes                                                         |
| ------------ | --------------------------- | ------------------------------------------------------------- |
| `whileHover` | Pointer is over element     | Does NOT trigger on touch devices                             |
| `whileTap`   | Primary pointer is pressing | `Enter` key also triggers on focusable elements               |
| `whileFocus` | Element has focus           | Follows `:focus-visible` — keyboard nav only, not mouse click |
| `whileDrag`  | Element is being dragged    | Requires the `drag` prop                                      |

### Accessibility

`Enter` triggers `onTapStart`/`whileTap` on press and `onTap` on release for focusable elements — tap gestures are keyboard-accessible by default.

`whileFocus` follows `:focus-visible` rules — triggers on keyboard navigation, not mouse click.

### Touch Devices

`whileHover` does NOT trigger on touch. Two strategies:

1. Show hover-revealed content by default on mobile (responsive design)
2. Use `whileTap` as a touch equivalent

### Event Propagation

Motion gesture handlers are deferred — use the `propagate` prop to control bubbling:

```tsx
<m.div whileTap={{ scale: 2 }}>
  <m.button whileTap={{ opacity: 0.8 }} propagate={{ tap: false }} />
</m.div>
```

### Reduced Motion

Gesture animations (`whileHover`, `whileTap`, `whileFocus`) are user-initiated and brief — they do **not** require a `useReducedMotion()` guard (WCAG 2.3.3).

---

## Viewport Reveals

`whileInView` triggers when an element enters the viewport using `IntersectionObserver`.

### Viewport Options

| Option   | Type                        | Default  | What it does                                   |
| -------- | --------------------------- | -------- | ---------------------------------------------- |
| `once`   | `boolean`                   | `false`  | Fire-and-forget — animate once, stop observing |
| `root`   | `RefObject`                 | `window` | Custom scroll ancestor                         |
| `margin` | `string`                    | `"0px"`  | Expand/contract the detection area             |
| `amount` | `number \| "some" \| "all"` | `"some"` | How much of element must be visible (0–1)      |

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

### Motion vs CSS Decision Table

| Need                                 | Use                                                           |
| ------------------------------------ | ------------------------------------------------------------- |
| Spring physics on the reveal         | Motion `whileInView`                                          |
| Complex variants with stagger        | Motion `whileInView` + `staggerChildren`                      |
| Simple opacity/translate, no spring  | CSS `animation-timeline: view()` — zero JS, compositor thread |
| Part of a larger scroll-driven scene | GSAP ScrollTrigger                                            |
