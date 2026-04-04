---
name: motion-production
description: >-
  Motion production patterns — anti-patterns table (18 entries: don't/why/do-
  instead covering variants in body, long exits, missing mode, layoutId without
  LayoutGroup, cartoonish scale, missing key, index key, looping without gate,
  magic numbers, long page transitions, motion.create in body, CSS width/height,
  hooks in map, wrong AnimatePresence structure, motion.* in LazyMotion, inline
  on layout, missing layoutScroll), MUST/SHOULD/MUST NOT rules reference,
  scope boundary (what Motion handles vs what it does not, cross-engine
  coexistence rules — one engine per DOM element), mobile considerations table
  (FLIP cost, exit delay, spring on low-end, hover on touch, looping battery,
  bundle size mitigations), performance rules table (module-scope, memo, style
  for MotionValues, viewport once, will-change, layoutDependency, transform/
  opacity only), library compatibility (react-spring and react-transition-group
  forbidden, dnd-kit compatible). Use when reviewing animated components for
  production readiness, choosing between Motion/GSAP/CSS, optimizing animation
  performance, or auditing reduced motion compliance.
---

# Motion — Production Patterns

**Compiled from**: ADR-0030 §26 (Mobile), §27 (Performance), §28 (Rules Table), §29 (Anti-Patterns), §30 (Scope Boundary), Library Compatibility
**Last synced**: 2026-04-04

---

## Scope Boundary

### What Motion Handles

- Mount/unmount transitions (`AnimatePresence`)
- Layout animations — FLIP technique (expand, collapse, reorder, shared element)
- Gesture responses (hover, tap, drag, focus)
- Viewport reveals (`whileInView` + variants + stagger)
- Imperative animation sequences (`useAnimate`)
- Page transitions in Next.js (`template.tsx`)
- Looping / ambient animations
- Tab / step content swaps
- List item add/remove with sibling reflow
- Drag-to-reorder (`Reorder.Group` / `Reorder.Item`)
- Micro-interactions and button feedback
- Shared element transitions (`layoutId`)

### What Motion Does NOT Handle

| What                                                     | Use instead                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| Scroll-driven pinned sections                            | GSAP ScrollTrigger                                            |
| Scroll-linked choreography across multiple elements      | GSAP ScrollTrigger                                            |
| Horizontal scroll conveyors                              | GSAP ScrollTrigger                                            |
| Video scrubbing tied to scroll position                  | GSAP ScrollTrigger                                            |
| SVG line-draw reveals tied to scroll                     | CSS `animation-timeline: view()`                              |
| Simple single-element scroll effects (opacity/translate) | CSS `animation-timeline: view()` — zero JS, compositor thread |
| Complex multi-phase scroll scenes                        | GSAP ScrollTrigger                                            |

### Cross-Engine Coexistence

Motion and GSAP can coexist at the **section level** — one engine per DOM element. Never mix Motion and GSAP transforms on the same element.

| Layer                                                | Engine                           |
| ---------------------------------------------------- | -------------------------------- |
| Section pinning + scroll timeline                    | GSAP ScrollTrigger               |
| Hover states on interactive cards within the section | Motion gesture props             |
| Mount/unmount overlays                               | Motion AnimatePresence           |
| Simple scroll reveals (no spring needed)             | CSS `animation-timeline: view()` |

---

## Performance Rules

| Rule                                                                     | Why                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Variants at module scope                                                 | Prevents new object creation every render                                |
| `motion.create()` at module scope                                        | Recreating component types breaks React reconciliation and animations    |
| No hooks inside `.map()`                                                 | React rules of hooks — extract a per-item component                      |
| `memo()` on animated list items                                          | Prevents parent re-render from triggering child re-renders mid-animation |
| `style={}` for MotionValues                                              | MotionValues update via animation frame, bypass React render cycle       |
| `viewport={{ once: true }}` on reveals                                   | Stops IntersectionObserver after first trigger                           |
| `will-change: transform` only on heavy animations when motion is enabled | GPU memory is finite — each promoted layer consumes VRAM                 |
| `layoutDependency` on layout-animated elements                           | Reduces layout measurements to only when the dependency value changes    |
| Animate only `transform` and `opacity` for continuous animations         | Compositor thread — no layout/paint trigger                              |
| `next/dynamic` with `ssr: false` for heavy animated sections             | Reduces initial bundle, avoids unnecessary server rendering              |

---

## Mobile Considerations

| Concern                               | Impact                                                                           | Mitigation                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Layout FLIP computes twice per change | Fine for simple expand/collapse, costly with many simultaneous layout animations | Limit simultaneous `layout` elements. Test on mid-range phones             |
| `AnimatePresence` exit delays unmount | Slow exits make navigation feel frozen                                           | Keep exits ≤ 0.3s                                                          |
| Heavy springs on many elements        | Frame rate impact on low-end phones                                              | Limit complex springs. Duration-based for simple fades                     |
| `whileHover` invisible to touch users | Hover-revealed content not accessible to touch                                   | Show by default on mobile or use `whileTap`                                |
| Looping animations run continuously   | Battery drain                                                                    | Gate with `useReducedMotion()`. Consider disabling on low-end devices      |
| Large Motion bundle                   | Adds to initial load                                                             | `LazyMotion` + async loading. `next/dynamic ssr: false` for heavy sections |

---

## MUST / SHOULD / MUST NOT

### MUST

- `'use client'` on every animated component
- `m.*` namespace with `LazyMotion strict` — not `motion.*`
- Variants at module scope
- `motion.create()` at module scope
- `AnimatePresence` explicit `mode` when swapping keyed content
- Gate `repeat: Infinity` with `useReducedMotion()`
- Opacity-only `AnimatePresence` exit/enter under reduced motion
- `transform` and `opacity` only for continuous animations
- Unique, stable `key` on all `AnimatePresence` children

### SHOULD

- `viewport={{ once: true }}` on fire-and-forget reveals
- `memo()` on animated list items
- `next/dynamic ssr: false` for heavy animated sections
- Spring presets instead of ad hoc magic numbers
- Exit animations ≤ 0.3s
- `domMax` when layout animations or drag are needed
- `Reorder.Group` / `Reorder.Item` for drag-to-reorder
- `LayoutGroup` to scope layout animations in complex pages
- `layout="position"` for grid reflows where size should not animate

### MUST NOT

- `motion.*` components inside `LazyMotion` (strict mode blocks this)
- Variants or `motion.create()` inside a component body
- Hooks inside `.map()` iterations
- Animate `width`, `height`, `margin`, `padding` per-frame — use `layout`
- CSS `transition` on `width`/`height` when `layout` covers the case
- Mix Motion and GSAP transforms on the same DOM element
- Array `index` as `key` for `AnimatePresence` children

---

## Anti-Patterns

| ❌ Don't                                               | Why                                                               | ✅ Do instead                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| Variants inside component body                         | Recreated every render, breaks referential stability              | Module-scope constants                                      |
| Long exit animations (>0.5s)                           | Navigation feels frozen, especially on mobile                     | ≤ 0.3s exits                                                |
| `AnimatePresence` without `mode` for sequential swaps  | Both elements render simultaneously — layout flash                | `mode="wait"` for one-at-a-time content                     |
| `layoutId` without `LayoutGroup` in complex pages      | Layout animations leak across components                          | Scope with `LayoutGroup`                                    |
| Spring on everything                                   | Some transitions should be predictable (fades, tab swaps)         | Duration-based for fades, springs for physical interactions |
| `whileHover={{ scale: 1.2 }}`                          | Cartoonish — feels amateurish                                     | Subtle values: `1.02`–`1.05`                                |
| No `key` on `AnimatePresence` children                 | Exit animation never triggers — React can't detect removal        | Unique `key` identifying the instance                       |
| `key={index}` on `AnimatePresence` lists               | Reorder causes wrong element to exit                              | Use `item.id` as key                                        |
| Looping animation without `useReducedMotion()` gate    | Accessibility violation — WCAG 2.3.3                              | Always gate `repeat: Infinity`                              |
| Ad hoc spring configs as magic numbers                 | Inconsistent feel across the app                                  | Named presets (Smooth/Snappy/Bouncy)                        |
| Page transition > 0.3s                                 | Sluggish on mobile, blocks interaction                            | Keep short, opacity-focused                                 |
| `motion.create()` inside component body                | New component type every render, breaks reconciliation            | Module scope                                                |
| CSS `transition` on `width`/`height`                   | Per-frame reflow — very expensive                                 | `layout` prop (FLIP technique)                              |
| Hooks in `.map()`                                      | React rules of hooks violation                                    | Extract per-item component                                  |
| `AnimatePresence` wrapping the conditional             | `AnimatePresence` unmounts with the element, exit never fires     | Conditional **inside** `AnimatePresence`                    |
| `motion.*` components inside `LazyMotion`              | Bypasses tree-shaking, loads full 34 kB                           | `m.*` from `motion/react-m`                                 |
| `display: inline` on layout-animated elements          | Browsers don't apply `transform` to inline elements               | Use `block`, `flex`, or `inline-block`                      |
| Layout in scrollable containers without `layoutScroll` | Scroll offset not accounted for — position calculates incorrectly | Add `layoutScroll` to the scrollable parent                 |

---

## Library Compatibility

| Library                         | Status        | Notes                                                                                |
| ------------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| `motion` (v12+)                 | **Required**  | ~34 kB pre-bundled, 4.6 kB with LazyMotion. Hybrid WAAPI + JS engine for springs     |
| `motion/react-m`                | **Required**  | `m.*` namespace. Part of `motion` package — no separate install                      |
| `Reorder` (from `motion/react`) | Recommended   | Built-in drag-to-reorder. Use for single-list reorder                                |
| dnd-kit                         | Compatible    | Use for cross-column drag, kanban, file drop zones — different domain, not animation |
| react-spring                    | **Forbidden** | Overlapping scope with Motion. One spring engine per project                         |
| react-transition-group          | **Forbidden** | `AnimatePresence` covers this with better API and bundle efficiency                  |
| Any CSS-in-JS animation library | **Forbidden** | Violates the no-CSS-in-JS-runtime constraint (Tailwind only)                         |
