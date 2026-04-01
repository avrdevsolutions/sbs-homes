---
name: animation-architecture
description: >-
  Motion system setup — LazyMotion config, type system, three-tier scroll architecture,
  file structure under src/lib/motion/. Use when setting up or understanding the motion
  system file structure, MotionProvider, scroll data flow, or ChannelMap type system.
---

# Animation — Architecture Patterns

**Compiled from**: ADR-0003 §Architecture, §LazyMotion Strategy, §Type System, §Consequences (Constraint Summary)
**Last synced**: 2026-03-28

---

## Animation Orchestration

Animation decisions are made through a standalone animation orchestration flow (see `.github/flow-generator/animation/`). The animation skill files compiled from ADR-0003 (`animation-architecture`, `animation-components`, `animation-patterns`, `animation-performance`) are the authoritative knowledge source for execution agents. No agent other than the CTO and Knowledge Sync reads the ADR directly.

---

## File Structure

The entire motion system lives under `src/lib/motion/`. All application code imports from `@/lib/motion` — the single entry point.

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

---

## Three-Tier Scroll Architecture

All scroll-driven animations follow this data flow:

```
Tier 1: Container   → useScroll() produces scrollYProgress: MotionValue<number> [0..1]
Tier 2: Transform   → useMotionAnimation(progress, channels) maps progress to CSS values
Tier 3: Render      → m.div style={{ ...values }} — zero React re-renders
```

Values stay in the MotionValue graph from source to render. **No `useState` in between.** MotionValues are imperative — they do not trigger React re-renders when they change.

---

## LazyMotion Strategy

`MotionProvider` wraps layouts with `LazyMotion features={domAnimation} strict`:

| Option         | Effect                                                                    |
| -------------- | ------------------------------------------------------------------------- |
| `domAnimation` | Loads only needed features (~20kB vs ~60kB full import)                   |
| `strict`       | Throws a runtime error if `motion.*` components are used instead of `m.*` |
| `domMax`       | Switch to this only when drag/pan gestures are needed (+~8kB)             |

The `strict` flag is the enforcement mechanism for the `m.*` namespace rule — it turns a silent wrong choice into an immediate, obvious error.

---

## Type System

Types are composable — each component picks only what it needs:

| Type                     | Purpose                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `RangeConfig`            | Maps `inputRange` (progress 0–1) to `outputRange` (numeric CSS values)                |
| `ChannelMap`             | `Record<string, RangeConfig>` — dynamic animation channels keyed by CSS property name |
| `SpringConfig`           | Spring physics config: stiffness, damping, mass                                       |
| `MotionInteractionProps` | FM interaction props: `whileHover`, `whileTap`, `animate`, `variants`, etc.           |
| `ScrollOffset`           | Scroll offset type (mirrors FM's `ScrollOffset`)                                      |

`ChannelMap` is the key design: any CSS property can be animated without modifying the hook. The channel names become type-safe keys on the object returned by `useMotionAnimation`.

---

## Extensibility — Adding to `src/lib/motion/`

The four shipped components (`MotionSection`, `MotionSectionItem`, `MotionBox`, `MotionInView`) and three hooks (`useMotionAnimation`, `useParallax`, `useMotionEnabled`) are **starting points, not ceilings**. Complex scroll-driven scenes — multi-phase, per-element springs, combined techniques — often need custom hooks, helpers, or components that the shipped ones don't support.

Agents MAY create new files in `src/lib/motion/` when existing ones don't fit. Requirements:

1. Add `'use client'` directive and a `displayName` matching the exported name
2. Add any new shared types to `types.ts`
3. Re-export from `index.ts` — application code always imports from `@/lib/motion`
4. Keep all `motion/react` imports inside `src/lib/motion/` — never in application code

Common reasons to extend: per-channel spring configs that standard components don't expose, scene-specific progress subdivision helpers, composite scroll hooks combining multiple techniques.

---

## Constraint Summary for Planning Agents

For agents that propose animations without implementing them:

- **Continuous animations** (scroll, parallax, reveals) may only move, rotate, scale, or fade elements — no size changes per frame
- **Using `scale` + `translate` to visually simulate dimension/position changes** (e.g., a hero shrinks from full-viewport to card-size) is a **Tier 1** transform pattern — `scale` and `translate` are GPU-composited, not layout dimensions. Do not reach for the `layout` prop in scroll-driven scenes.
- **Discrete state changes** (expand, collapse, reorder) may change element dimensions using layout animations (`layout` prop / `AnimatePresence`)
- All animations must have a **reduced-motion fallback** — no animation should be mandatory for content access
- **Looping/infinite animations** require explicit gating (`useMotionEnabled()`) for accessibility
- Heavy scroll-driven animations should account for **mobile performance** — simplify on small screens (<768px)
- Supported capabilities: viewport reveals, scroll-driven sections, parallax, stagger, presence transitions, micro-interactions, imperative sequences, layout animations, and shared element transitions
