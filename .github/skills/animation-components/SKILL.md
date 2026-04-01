---
name: animation-components
description: >-
  Framer Motion component APIs — MotionInView, MotionSection, MotionBox, useParallax,
  spring presets, reduced motion strategy, transition defaults. Use when implementing
  scroll reveals, parallax, viewport animations, or configuring motion component props.
---

# Animation — Component APIs & Configuration Patterns

**Compiled from**: ADR-0003 §Motion Components, §Reduced Motion Strategy, §Transition Defaults
**Last synced**: 2026-03-21

---

## `MotionSection` — Scroll Container

Creates one `useScroll`, provides `scrollYProgress` to descendants via `MotionSectionContext`. Handles scroll tracking and sticky positioning only — **layout is the consumer's job** via `className`.

```tsx
<MotionSection height='300vh' containerHeight='100vh' className='flex flex-col items-center gap-10'>
  <MotionSectionItem channels={{ opacity: createMotionRange([0, 0.75, 0.95], [1, 1, 0]) }}>
    <Content />
  </MotionSectionItem>
</MotionSection>
```

---

## `MotionSectionItem` — Context Consumer

Reads `scrollYProgress` from the nearest parent `MotionSection`. Accepts any number of animation channels via `channels` prop. Warns in dev if used outside a `MotionSection`. Supports optional spring smoothing via the `smooth` prop.

- **`channels`** — `ChannelMap` — any CSS property → `RangeConfig`
- **`smooth`** — optional `SpringConfig` — smooths the consumed `scrollYProgress` before mapping

---

## `MotionBox` — Self-Contained Scroll Box

Owns its own `useScroll` + `useMotionAnimation`. Can also accept external `scrollYProgress` to be driven by a parent. Accepts FM interaction props (`whileHover`, `variants`, etc.) via `MotionInteractionProps`. Auto-computes `willChange` hint via `buildWillChange()` when channels include transform/opacity.

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

---

## `MotionInView` — Viewport Reveal

Fire-and-forget directional reveal. Automatically falls back to opacity-only under reduced motion.

| Prop           | Type                                            | Description                                  |
| -------------- | ----------------------------------------------- | -------------------------------------------- |
| `direction`    | `'up' \| 'down' \| 'left' \| 'right' \| 'none'` | Direction of movement                        |
| `distance`     | `number`                                        | Pixel distance to travel                     |
| `delay`        | `number`                                        | Seconds before animation starts              |
| `duration`     | `number`                                        | Animation duration in seconds                |
| `ease`         | FM ease                                         | Easing function                              |
| `once`         | `boolean`                                       | Fire once and stay visible (`viewport.once`) |
| `opacityRange` | `[number, number]`                              | Custom start/end opacity                     |
| `scaleRange`   | `[number, number]`                              | Optional scale                               |

```tsx
<MotionInView direction='up' distance={30} delay={0.2} scaleRange={[0.95, 1]} once>
  <Card />
</MotionInView>
```

---

## `useParallax` — One-Liner Parallax

Returns `ref` + `style` for a spring-smoothed parallax effect. Internally handles `useScroll`, `useTransform`, `useSpring`, and reduced-motion checks in a single call.

```tsx
const { ref, style } = useParallax(60)
<m.div ref={ref} style={style}>...</m.div>
```

The argument is the pixel offset range (positive = moves up as you scroll down).

---

## Reduced Motion Strategy

Three distinct layers — not a blanket "check in all components" rule:

| Layer                               | Scope                          | Handling                                                           |
| ----------------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| **Scroll-driven**                   | `useMotionAnimation` consumers | Automatic — hook snaps all channels to "done" values, no animation |
| **Presence** (modals, drawers, nav) | `AnimatePresence` enter/exit   | Opacity-only fallback: zero `y`/`scale` offsets, shorter duration  |
| **Micro-interactions** (hover, tap) | `whileHover`, `whileTap`       | No guard needed — user-initiated, brief, WCAG 2.3.3 compliant      |
| **Looping** (`repeat: Infinity`)    | Ambient pulses, loading        | **MUST gate** with `useMotionEnabled()`                            |

`useMotionEnabled()` is the positive-logic wrapper: `!useReducedMotion()`. Use it for looping guards and `willChange` hints.

---

## SPRING_PRESETS

Centralized spring configs — use these instead of scattered magic numbers:

| Preset                  | Config                                        | Use Case                   |
| ----------------------- | --------------------------------------------- | -------------------------- |
| `SPRING_PRESETS.smooth` | `{ stiffness: 120, damping: 20, mass: 0.35 }` | Scroll smoothing, parallax |
| `SPRING_PRESETS.snappy` | `{ stiffness: 500, damping: 28, mass: 0.4 }`  | Quick interactive feedback |
| `SPRING_PRESETS.bouncy` | `{ stiffness: 300, damping: 15, mass: 0.5 }`  | Playful reveal animations  |

Card flip uses a custom spring: `{ stiffness: 140, damping: 18 }`.

---

## Transition Defaults

| Use Case        | Duration  | Config                                |
| --------------- | --------- | ------------------------------------- |
| Viewport reveal | 0.6s      | `ease: 'easeOut'`                     |
| Nav stagger     | 0.05–0.1s | `ease: 'easeOut'`                     |
| Button micro    | 0.1s      | `ease: 'easeOut'`                     |
| Modal/drawer    | 0.3s      | `ease: 'easeOut'`                     |
| Nav hide/show   | 0.1s      | `ease: 'easeInOut'`                   |
| Looping ambient | 2s        | `ease: 'easeInOut', repeat: Infinity` |
| Smooth spring   | —         | `SPRING_PRESETS.smooth`               |
| Snappy spring   | —         | `SPRING_PRESETS.snappy`               |
| Bouncy spring   | —         | `SPRING_PRESETS.bouncy`               |
