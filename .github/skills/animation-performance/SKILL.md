---
name: animation-performance
description: >-
  Framer Motion performance rules and anti-patterns — LazyMotion budget, willChange,
  memo, frame throttling. Use when optimizing animation bundle size, reviewing before
  shipping, or debugging layout thrash and jank.
---

# Animation — Performance Patterns

**Compiled from**: ADR-0003 §Performance, §Anti-Patterns
**Last synced**: 2026-03-26

---

## 18 Performance Rules

1. **`LazyMotion` + `domAnimation`** — ~20kB vs ~60kB for the full import. Always use `domAnimation` unless drag/pan is needed (`domMax` = +~8kB).
2. **`strict` mode** — runtime guard against `motion.*` usage; catches regressions immediately.
3. **`style={}` for MotionValues** — updates happen in the animation frame loop without triggering React renders.
4. **No `useState` from scroll** — values stay in the FM graph; extracting to state causes re-renders on every scroll frame.
5. **`useSpring` / `smooth` option** — smoothing scroll-linked values reduces jank without extra renders.
6. **`memo()` on scroll-animated list items** — prevents parent re-renders from cascading into list items.
7. **Extract per-item components for `.map()` iterations** — required for hook rules; also reduces reconciliation scope.
8. **Frame throttling for video scrubbing** — use a `lastFrameRef` guard to skip duplicate `video.currentTime` writes.
9. **`m.create()` at module scope** — one wrapper creation total; calling inside a component creates a new component type every render.
10. **`component={m.div}`** — avoids an extra DOM node vs. nesting `<m.div>` inside a wrapper.
11. **Auto `willChange` via `buildWillChange()`** — applies `willChange` only when motion is enabled and only for composited properties; never apply `willChange` unconditionally.
12. **`useMotionAnimation` allocates only declared channels** — unused channels consume no resources.
13. **`transform()` utility for interpolation** — FM's native multi-stop interpolator; no custom math needed.
14. **`SPRING_PRESETS` centralizes spring configs** — eliminates scattered magic numbers that drift from the canonical transition defaults.
15. **`layout` prop uses FLIP** — only two layout calculations (before + after state); the actual animation runs on GPU-composited `transform`, not per-frame reflow.
16. **`layout="position"`** skips size interpolation entirely — use when only the element's position needs to animate, not its size.
17. **`layoutId` shared element transitions** compute the layout diff once per transition, not per frame.
18. **`LayoutGroup`** scopes layout animations to a subtree — prevents unrelated layout-animated elements on the same page from interfering with each other.

---

## Anti-Patterns

| Don't                                          | Why                                                              | Do Instead                                      |
| ---------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| `variants` inside component body               | New object reference every render — breaks FM's change detection | Module-scope `const variants = {}`              |
| `@ts-ignore` on `style` for wrapped components | Loses type safety                                                | `m.create(Component)`                           |
| `console.warn` without dev guard               | Runs in production builds                                        | `process.env.NODE_ENV !== 'production'` guard   |
| `displayName` ≠ export name                    | Confusing in React DevTools                                      | Match `displayName` to the exported name        |
| No reduced-motion guard on `repeat: Infinity`  | Accessibility violation (WCAG 2.3.3)                             | `useMotionEnabled()` gate                       |
| Hardcoded channel names in hook                | Closed for extension, brittle                                    | Dynamic `ChannelMap` — any CSS property as key  |
| Scattered spring config magic numbers          | Inconsistent behavior, hard to update                            | `SPRING_PRESETS.smooth` / `.snappy` / `.bouncy` |
| Manual `willChange` on every scroll component  | Easy to forget; wrong under reduced motion                       | `buildWillChange(channels, motionEnabled)`      |
| Layout hardcoded in motion infrastructure      | Couples animation to design, prevents reuse                      | `className` on consumer for all layout concerns |
| `useScroll` / hooks inside `.map()`            | Violates Rules of Hooks                                          | Extract a named per-item component              |
| `motion.*` components in app code              | Bypasses `LazyMotion` lazy loading; `strict` throws              | `m.*` namespace only                            |
| Heavy animated sections with SSR               | Hydration mismatch, blocks server render                         | `next/dynamic` with `ssr: false`                |
| CSS `transition` on `width`/`height`/`max-height` | Per-frame reflow on the main thread — jank on mid-range devices | FM `layout` prop — FLIP bridges two layout snapshots via GPU transform |
| Using deprecated `layoutDependency` prop        | Removed in FM v6+ — does nothing                                 | Remove it — `layout` detects changes automatically on re-render |
