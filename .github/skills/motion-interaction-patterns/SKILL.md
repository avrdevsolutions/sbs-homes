---
name: motion-interaction-patterns
description: >-
  Motion interaction and layout pattern implementations — shared element
  transitions (layoutId morphing, multiple layoutId per item, LayoutGroup
  scoping, non-shared content fade), drag-to-reorder (Reorder.Group/Reorder.
  Item, axis, custom drag handle with useDragControls, use vs dnd-kit decision),
  viewport stagger reveals (containerVariants with staggerChildren + whileInView,
  once + amount, reduced motion), hover card compositions (parent whileHover
  propagating to child overlays, subtle scale values 1.02-1.05, touch strategy),
  button/interactive micro-feedback (whileHover + whileTap spring, toggle switch
  layout animation, icon morph AnimatePresence, whileFocus ring), looping/
  ambient animations (pulse/spinner/float patterns, repeat options table,
  useReducedMotion gate required), imperative animation sequences (sequential
  await, parallel Promise.all, mixed, navigate-after), simple viewport reveals
  (single element whileInView, Motion vs CSS comparison). Use when building card
  hover reveals, sortable lists, stagger grid sections, animated buttons or
  toggles, loading indicators, or multi-step success celebration sequences.
---

# Motion — Layout & Gesture Interaction Patterns

**Compiled from**: ADR-0030 §17 (Shared Element), §18 (Drag-to-Reorder), §19 (Viewport Stagger), §21 (Hover), §22 (Micro-Feedback), §23 (Looping/Ambient), §24 (Imperative Sequences), §25 (Simple Viewport Reveals)
**Last synced**: 2026-04-04

---

## Shared Element Transitions

An element visually morphs from one position/size to another as the user navigates between views.

**Use for:** List item → detail view, thumbnail → lightbox, grid → single focus, tab underline indicator.
**Not for:** Cross-page route transitions in Next.js App Router (complex with streaming/suspense boundaries).

```tsx
<LayoutGroup>
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
        {/* Non-shared content fades in normally */}
        <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {selectedItem.description}
        </m.p>
      </m.div>
    )}
  </AnimatePresence>
</LayoutGroup>
```

Multiple `layoutId`s per item (image + title) morph independently. `LayoutGroup` scopes layout animations to prevent interference with other page elements. If the original component stays on-page during the transition, they automatically crossfade.

**Reduced motion:** Instant position swap, fade non-shared content.

---

## Drag-to-Reorder

**Use for:** Sortable lists (priorities, playlists, settings), kanban card reordering within a single column.
**Not for:** Cross-column kanban (use dnd-kit for that case); file drop zones (use native drag events or dnd-kit).

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

**Custom drag handle:**

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

`axis="y"` for vertical, `axis="x"` for horizontal. `values` + `onReorder` is the controlled state pattern — `setItems` receives the new sorted array.

**Reduced motion:** Instant reorder, no drag animation. Provide keyboard move-up/move-down buttons for WCAG 2.5.7 compliance (dragging alternative required for accessibility).

---

## Viewport Stagger Reveals

**Use for:** Feature grids, card grids, icon rows, logo grids, step-by-step process sections — any group that should cascade in on scroll.
**Not for:** Single elements (see Simple Viewport Reveals below); scroll-linked choreography tied to scroll position (use GSAP).

```tsx
// Module-scope variants
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

<m.div
  variants={containerVariants}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.2 }}
>
  {items.map(item => (
    <m.div key={item.id} variants={itemVariants}>
      <Card item={item} />
    </m.div>
  ))}
</m.div>
```

Parent `whileInView` triggers variant propagation — children animate to `visible` automatically. `viewport={{ once: true }}` stops observing after the first trigger. `amount: 0.2` triggers when 20% of the container is visible.

**Reduced motion:** All items visible immediately — no stagger, no animation:

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

## Hover Compositions

**Use for:** Cards with hover reveal of actions or details, portfolio thumbnails, product cards, navigation items.
**Not for:** Touch-only interfaces (hover doesn't exist); content that must always be accessible (don't hide behind hover only).

```tsx
// Module-scope variants
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

Parent `whileHover` propagates to children with matching variant keys — overlay appears when parent is hovered. Keep scale values subtle (`1.02`–`1.05`) — `1.1`+ feels cartoonish. Combine with `whileTap={{ scale: 0.98 }}` for press feedback.

**Touch devices:** Show hover-revealed content by default on mobile, or use `whileTap` as equivalent.

**Reduced motion:** No guard needed — user-initiated gesture.

---

## Button / Interactive Micro-Feedback

**Use for:** Buttons, toggles, checkboxes, radio buttons, icon transitions, any interactive element needing tactile feedback.
**Not for:** Non-interactive elements; animations that persist after the gesture ends.

**Primary feedback:**

```tsx
<m.button
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.4 }}
>
  Submit
</m.button>
```

**Toggle switch** — `layout` on the knob as state changes position:

```tsx
<div className='toggle-track' onClick={toggle}>
  <m.div
    layout
    className='toggle-knob'
    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
  />
</div>
```

**Icon morph** — crossfade between icon states:

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

**Focus ring:**

```tsx
<m.button whileFocus={{ boxShadow: '0 0 0 3px var(--ring-color)' }}>Action</m.button>
```

**Reduced motion:** No guard needed — user-initiated, brief.

---

## Looping / Ambient Animations

**Use for:** Loading states (spinners), attention indicators (pulsing dot), ambient decorative motion.
**Not for:** Conveying critical information — animations must not be the only indicator.

```tsx
const prefersReducedMotion = useReducedMotion()

// MUST gate entirely — do not render looping animation under reduced motion
if (prefersReducedMotion) return <div className="static-indicator" />

<m.div
  animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
  transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
/>
```

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

| Repeat option           | What it does                                           |
| ----------------------- | ------------------------------------------------------ |
| `repeat: Infinity`      | Loop forever — **MUST gate with `useReducedMotion()`** |
| `repeat: 3`             | Loop 3 additional times after the first play           |
| `repeatType: 'loop'`    | Restart from beginning (default)                       |
| `repeatType: 'reverse'` | Ping-pong back and forth                               |
| `repeatDelay: 0.5`      | Pause between iterations                               |

---

## Imperative Animation Sequences

**Use for:** Onboarding flows triggered by a button click, success/celebration sequences after form submission, interaction-triggered reveals.
**Not for:** Scroll-driven sequences (use GSAP ScrollTrigger); mount animations (use declarative `initial`/`animate`).

```tsx
const [scope, animate] = useAnimate()

const handleSubmit = async () => {
  await animate('.form', { opacity: 0, y: -20 }, { duration: 0.3 })
  await animate(
    '.success-icon',
    { scale: [0, 1.2, 1], opacity: 1 },
    { type: 'spring', stiffness: 300 },
  )
  await animate('.success-message', { opacity: 1, y: 0 }, { duration: 0.4 })
}

return (
  <div ref={scope}>
    <div className='form'>...</div>
    <div className='success-icon' style={{ opacity: 0 }}>
      ✓
    </div>
    <div className='success-message' style={{ opacity: 0, transform: 'translateY(10px)' }}>
      Submitted!
    </div>
    <button onClick={handleSubmit}>Submit</button>
  </div>
)
```

**Parallel:**

```tsx
await Promise.all([
  animate('.left', { x: -50, opacity: 0 }, { duration: 0.2 }),
  animate('.right', { x: 50, opacity: 0 }, { duration: 0.2 }),
])
await animate('.center', { scale: 1, opacity: 1 }, { type: 'spring', stiffness: 300 })
```

**Navigate after:**

```tsx
await animate('.form', { opacity: 0, y: -20 }, { duration: 0.3 })
router.push('/success')
```

**Reduced motion:** Skip sequence entirely, set final state instantly.

---

## Simple Viewport Reveals (Single Element)

**Use for:** Individual content blocks animating in on scroll when spring physics are needed.
**Not for:** When spring physics aren't needed — prefer CSS `animation-timeline: view()` (compositor thread, zero JS cost).

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

|                | Motion `whileInView`     | CSS `animation-timeline: view()`      |
| -------------- | ------------------------ | ------------------------------------- |
| Thread         | Main thread (JS)         | Compositor thread                     |
| Spring physics | Yes                      | No — CSS easing only                  |
| Bundle cost    | Included in domAnimation | Zero JS                               |
| Stagger        | Yes (via variants)       | Manual with `animation-delay`         |
| When to use    | Spring physics needed    | Simple opacity/translate — prefer CSS |

**Reduced motion:** Set `initial={false}` to render final state, or render without Motion wrapper.
