---
name: animation-patterns
description: >-
  Framer Motion usage patterns — context-based scroll, stagger, AnimatePresence,
  imperative animation, video scrubbing, per-word reveal, 3D flip. Use when implementing
  specific animation behaviors or choosing between scroll orchestration approaches.
---

# Animation — Usage Patterns

**Compiled from**: ADR-0003 §Patterns, §Variant Naming Convention, §AnimatePresence Modes
**Last synced**: 2026-03-26

---

## Context-Based Scroll

`MotionSection` → `MotionSectionItem`. Parent owns `useScroll`; children read `scrollYProgress` via context. Best for sections with multiple animated children that share the same scroll source.

```tsx
<MotionSection height='300vh' containerHeight='100vh' className='flex flex-col items-center gap-10'>
  <MotionSectionItem channels={{ opacity: createMotionRange([0, 0.75, 0.95], [1, 1, 0]) }}>
    <Content />
  </MotionSectionItem>
</MotionSection>
```

---

## Prop-Drilled Scroll

One `useScroll`, progress passed as a prop to siblings. Useful when you don't want context overhead and have a small, flat set of consumers.

```tsx
const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
<TextPanel scrollYProgress={scrollYProgress} />
<ImagePanel scrollYProgress={scrollYProgress} />
```

---

## Stagger Children

Parent declares `staggerChildren` in variants; children inherit the same variant keys. Both `list` and `item` variants must be declared at **module scope**.

```tsx
const list = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

<m.ul variants={list} initial="hidden" animate="show">
  {items.map(i => <m.li key={i.id} variants={item} />)}
</m.ul>
```

---

## Imperative Sequential (`useAnimate`)

Use when animations must happen in a strict order. `await` each call before the next.

```tsx
const [scope, animate] = useAnimate()
await animate('#logo', { opacity: 0 })
await animate(scope.current, { minHeight: '100vh' }, { type: 'spring', stiffness: 130 })
```

---

## Imperative Parallel

Use when multiple animations must happen at exactly the same time.

```tsx
await Promise.all([
  animate(scope.current, { flexGrow: 4 }, { duration: 0.4 }),
  animate('#overlay', { opacity: 0.4 }),
])
```

---

## Navigate After Animation

Await the animation to completion, then trigger navigation. No `setTimeout` guessing.

```tsx
await animate(scope.current, { minWidth: '100%' }, { duration: 0.5 })
router.push(redirectPath)
```

---

## Deferred Start (`useAnimation`)

Prevent flicker on mount by deferring animation start with `setTimeout`. Always clean up the timer.

```tsx
const controls = useAnimation()
useEffect(() => {
  const t = setTimeout(() => controls.start({ opacity: 0.5, transition: { duration: 2 } }))
  return () => clearTimeout(t)
}, [controls])
```

---

## `m.create()` for Third-Party Components

Wraps a non-motion component so it accepts FM props. **Declare at module scope** — never inside the component body (one wrapper creation total, not per-render).

```tsx
const MotionIconButton = m.create(IconButton)
```

---

## `component={m.div}` on Wrappers

When a wrapper component accepts a `component` prop (e.g., MUI `Box`), use this pattern to avoid an extra DOM node.

```tsx
<Box component={m.div} style={{ opacity }} className='w-full'>
  {children}
</Box>
```

---

## Layout Animation

Framer Motion's `layout` prop uses the FLIP technique (First, Last, Invert, Play): the browser computes layout at start and end states, FM inverts the difference, then plays the animation using GPU-composited `transform`. Only two layout calculations (before and after) — not per-frame reflow.

**`layout` — automatic dimension/position animation:**

```tsx
const [isExpanded, setIsExpanded] = useState(false)

<m.div
  layout
  onClick={() => setIsExpanded(!isExpanded)}
  className={isExpanded ? 'w-[300px] h-[200px]' : 'w-[100px] h-[100px]'}
/>
```

**`layout="position"` — animate position only, instant size change:**

```tsx
<m.div layout='position'>
  {/* Size changes instantly; position animates smoothly */}
</m.div>
```

**`layoutId` + `LayoutGroup` — shared element transitions:**

Two components with the same `layoutId` automatically animate between each other. Wrap with `LayoutGroup` to scope animations to a subtree (prevents interference from unrelated layout-animated elements on the same page).

```tsx
import { LayoutGroup, AnimatePresence } from '@/lib/motion'

<LayoutGroup>
  {items.map((item) => (
    <m.div key={item.id} layoutId={item.id} onClick={() => setSelected(item.id)}>
      <m.h2 layoutId={`title-${item.id}`}>{item.title}</m.h2>
    </m.div>
  ))}

  <AnimatePresence>
    {selected && (
      <m.div layoutId={selected} className='expanded-card'>
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

Exiting elements are removed from document flow immediately; siblings animate to fill the space via the `layout` prop.

```tsx
<AnimatePresence mode='popLayout'>
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

**Decision table — which layout animation pattern to use:**

| Scenario | Pattern |
| --- | --- |
| Expand/collapse (accordion, card reveal) | `layout` on the expanding element |
| List item add/remove with sibling reflow | `layout` on items + `AnimatePresence mode="popLayout"` |
| List item → detail view (shared element) | `layoutId` on both states + `AnimatePresence` |
| Reorder (drag-and-drop settle) | `layout` on sortable items |
| Tab content swap (same container, different size) | `layout` on the container |
| Position change only (grid reflow) | `layout="position"` |

**Deprecated API:** `layoutDependency` was removed in FM v6+. The `layout` prop detects changes automatically on re-render — remove it if present.

---

## AnimatePresence Modes

Choose the mode based on whether old and new content can overlap:

| Mode | Behavior | Use Case |
| --- | --- | --- |
| _(default)_ | Enter and exit can overlap | Overlays, tooltips |
| `mode='wait'` | Old exits fully before new enters | Tab content, list swaps, keyed page transitions |
| `mode='popLayout'` | Exiting element removed from flow immediately; siblings animate to fill the space via `layout` prop | List with add/remove, sortable items |

```tsx
<AnimatePresence mode='wait'>
  <m.div key={activeTab} initial='hidden' animate='visible' exit='exit'>
    <TabContent />
  </m.div>
</AnimatePresence>
```

---

## `useMotionTemplate` for Dynamic CSS

Build dynamic CSS string values that update as MotionValues change — stays in the FM graph, no re-renders.

```tsx
const heightCalc = useMotionTemplate`calc(100vh - ${smoothTopPx}px)`
<m.div style={{ height: heightCalc }} />
```

---

## Video Scrubbing

Chain `useTransform` for deadzone → raw time → frame-snapped time, then `useMotionValueEvent` for throttled `video.currentTime` writes. Use a `lastFrameRef` guard to skip duplicate frame writes.

---

## 3D Flip Card

Use `rotateY` + CSS `preserve-3d` + `perspective: 1000` on the container. Track the 90° mid-flip point via `onUpdate` to swap the visible face. Spring: `{ stiffness: 140, damping: 18 }`.

---

## Per-Word Reveal

Extract a `WordSpan` child component (hooks cannot be called inside `.map()`). Each word receives `useTransform(progress, [start, end], [dimOpacity, 1])`. Smooth the source progress with `useSpring` before passing it down.

---

## Variant Naming Convention

Use consistent keys across all variants:

| State            | Key                   |
| ---------------- | --------------------- |
| Before animation | `hidden` or `initial` |
| After animation  | `visible` or `show`   |
| Exit animation   | `exit`                |
