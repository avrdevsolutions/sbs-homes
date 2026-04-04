---
name: motion-presence-patterns
description: >-
  Motion lifecycle interaction pattern implementations — modal/drawer/dialog
  enter-exit (backdrop + content variants, direction variants for drawer/bottom-
  sheet/center-modal, mode selection, common mistakes table), tab/step content
  swap (mode="wait" requirement, key-triggered cycle, container height with
  layout), list item add/remove (mode="popLayout", height 0→auto, sibling
  reflow, memo for performance), expand/collapse accordion (layout on parent +
  AnimatePresence on content, LayoutGroup for multiple accordions), page
  transitions in Next.js App Router (template.tsx vs layout.tsx decision,
  key={pathname}, opacity-only pattern, streaming caveats). Every technique
  includes reduced motion handling. Use when building animated modals, drawers,
  bottom sheets, tabbed interfaces, step wizards, dynamic lists, FAQ accordion
  sections, or page transition animations in Next.js.
---

# Motion — Presence & Lifecycle Interaction Patterns

**Compiled from**: ADR-0030 §13 (Modal/Drawer), §14 (Tab Swap), §15 (List Add/Remove), §16 (Accordion), §20 (Page Transitions)
**Last synced**: 2026-04-04

---

## Modal / Drawer / Dialog Enter & Exit

**Use for:** Modals, dialogs, drawers (left/right/bottom), bottom sheets, overlays, toasts, banners.
**Not for:** Static sidebars that are always visible; content that slides between positions without mounting/unmounting.

```tsx
// Module-scope variants
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
        initial="hidden" animate="visible" exit="hidden"
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      <m.div
        key="modal"
        variants={modalVariants}
        initial="hidden" animate="visible" exit="hidden"
        transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.4 }}
      >
        {children}
      </m.div>
    </>
  )}
</AnimatePresence>
```

**Direction variants:**

| Variant           | `initial`                            |
| ----------------- | ------------------------------------ |
| Center modal      | `{ opacity: 0, scale: 0.95, y: 10 }` |
| Drawer from right | `{ opacity: 0, x: '100%' }`          |
| Drawer from left  | `{ opacity: 0, x: '-100%' }`         |
| Bottom sheet      | `{ opacity: 0, y: '100%' }`          |

**Mode selection:**

- `"sync"` (default) — backdrop and content animate simultaneously
- `"wait"` — when only one modal at a time and old must fully exit before new enters

**Reduced motion** — remove spatial transforms, keep fade:

```tsx
const prefersReducedMotion = useReducedMotion()

const modalVariants = prefersReducedMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
  : { hidden: { opacity: 0, scale: 0.95, y: 10 }, visible: { opacity: 1, scale: 1, y: 0 } }
```

**Common mistakes:**

- Missing `key` on backdrop/modal when both are inside `AnimatePresence`
- Exit animation >0.5s — navigation feels frozen, especially on mobile
- Same transition for backdrop and content — use duration-based (0.2s) for backdrop, spring for content

---

## Tab / Step Content Swap

**Use for:** Tabbed interfaces, multi-step forms/wizards, any keyed content changing by user selection.
**Not for:** Tab panels with fixed height where content merely shows/hides (use CSS or `display`).

```tsx
// Module-scope variants
const tabVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

<AnimatePresence mode="wait">
  <m.div
    key={activeTab}
    variants={tabVariants}
    initial="hidden" animate="visible" exit="exit"
    transition={{ duration: 0.2, ease: 'easeOut' }}
  >
    {tabContent[activeTab]}
  </m.div>
</AnimatePresence>
```

`mode="wait"` is critical — without it both old and new content render simultaneously, causing a layout flash. `key={activeTab}` triggers the exit/enter cycle. Exit upward (`y: -10`) + enter from below (`y: 10`) creates a natural "push" direction.

**If content height varies between tabs**, add `layout` to the container:

```tsx
<m.div layout>
  <AnimatePresence mode="wait">
    <m.div key={activeTab} ... />
  </AnimatePresence>
</m.div>
```

**Reduced motion:** Opacity only, no spatial offset, shorter duration:

```tsx
const tabVariants = prefersReducedMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
  : { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } }
```

---

## List Item Add / Remove

**Use for:** Todo lists, task lists, cart items, notification feeds — any dynamic list where items are added/removed.
**Not for:** Static lists that never change; lists with hundreds of items (virtualize instead).

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

`mode="popLayout"` — exiting items are removed from flow immediately, siblings animate to fill the gap via `layout`. The parent should have `position: relative` (or non-static) for correct positioning of exiting elements.

Extract `ItemContent` into a `memo()`-wrapped component to prevent parent re-renders from triggering expensive child re-renders during animation.

**Reduced motion:** Instant add/remove — render items without Motion wrapper:

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

## Expand / Collapse (Accordion)

**Use for:** Accordions, FAQ sections, collapsible panels, "Read more" / "Show less" toggles.
**Not for:** Content that should always be visible; toggles between two fixed-height states.

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

`layout` on parent and header — they animate position when content appears/disappears. `height: 'auto'` — Motion measures actual content height and animates to it.

**Multiple accordions** — wrap in `LayoutGroup` so siblings animate in sync:

```tsx
<LayoutGroup>
  {sections.map((s) => (
    <AccordionSection key={s.id} {...s} />
  ))}
</LayoutGroup>
```

**One-at-a-time:** Track `openId` state; only one section expanded. **Independent:** Each section manages its own `isExpanded` state.

**Reduced motion:** Instant expand/collapse — skip the animation entirely.

---

## Page Transitions (Next.js App Router)

**Use for:** Marketing sites, portfolios, product pages where navigation should feel smooth.
**Not for:** Data-heavy dashboards where speed matters more than polish; apps with streaming/suspense boundaries (exit animations conflict with streaming).

```tsx
// app/template.tsx — template remounts on navigation; layout.tsx does not
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

**`template.tsx` vs `layout.tsx`:** `template` remounts on each navigation — required for the exit/enter cycle to trigger. `layout` persists across routes and won't trigger the animation.

Keep transitions short (0.2–0.3s) and opacity-only. Spatial transforms can create layout issues with streaming content.

**Caveats:** App Router streaming can complicate exit animations — if a page streams content after initial render, the exit may fire before content is fully loaded. Keep page transitions simple.

**Reduced motion:** Disable the transition wrapper entirely — instant navigation.
