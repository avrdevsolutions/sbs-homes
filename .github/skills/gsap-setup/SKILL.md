---
name: gsap-setup
description: >-
  GSAP 3 React integration — packages (gsap + @gsap/react), plugin registration pattern,
  useGSAP() hook full API (scope, dependencies, revertOnUpdate), contextSafe() for event
  handlers and timeouts, ref vs scoped-selector targeting decision table, core tween API
  (to/from/fromTo/set), timeline API (position parameter, labels, defaults, nesting),
  easing guide, Next.js 'use client' + next/dynamic ssr:false integration, cleanup rules.
  Use when setting up GSAP in a React/Next.js component for the first time, writing a
  useGSAP callback, adding event-handler animations, or choosing between ref and selector targeting.
---

# GSAP — React Setup & Core API

**Compiled from**: ADR-0003 §1–5, §11–12 (Setup, useGSAP, Refs, Core API, Timelines, Next.js Integration, Cleanup)
**Last synced**: 2026-04-04

---

## Installation

```bash
pnpm add gsap @gsap/react
```

| Package              | Purpose                                             | Size        |
| -------------------- | --------------------------------------------------- | ----------- |
| `gsap`               | Core engine — tweens, timelines, easing, utilities  | ~30 kB gzip |
| `@gsap/react`        | `useGSAP()` hook — scoped cleanup, strict mode safe | ~2 kB gzip  |
| `gsap/ScrollTrigger` | Scroll-driven animation — bundled inside `gsap`     | ~12 kB gzip |

All GSAP plugins (SplitText, MorphSVG, ScrollSmoother, etc.) are **free** since the Webflow acquisition. Custom license — not MIT. See gsap.com/standard-license.

## Plugin Registration

Register once at module scope in every `'use client'` component that uses GSAP:

```tsx
'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)
```

Registration is idempotent — calling multiple times is safe. Runs once when the module is first imported.

---

## useGSAP() Hook — MUST Use Instead of useEffect

GSAP manipulates the DOM directly. `useGSAP()` from `@gsap/react` solves three problems:

1. Scopes all animations to a container ref (no document-wide selectors leaking)
2. Auto-reverts all animations on unmount (no manual `.kill()` needed)
3. Handles React Strict Mode double-mount correctly

**Never use raw `useEffect` for GSAP.** Misses scope, context tracking, and strict mode handling.

### API

```tsx
const containerRef = useRef<HTMLDivElement>(null)

// Config object form — preferred
useGSAP(
  () => {
    gsap.to('.card', { x: 100 })
  },
  { scope: containerRef, dependencies: [] },
)

// For event handlers — destructure contextSafe
const { contextSafe } = useGSAP({ scope: containerRef })
```

### Config Options

| Option           | Type              | What it does                                                   |
| ---------------- | ----------------- | -------------------------------------------------------------- |
| `scope`          | `React.RefObject` | Container ref — all string selectors are scoped to descendants |
| `dependencies`   | `any[]`           | Same as `useEffect` deps. Empty = run once on mount            |
| `revertOnUpdate` | `boolean`         | Revert all GSAP objects when any dep changes (default `false`) |

---

## contextSafe() — Required for Event Handlers

Animations created **inside** `useGSAP()` are tracked for cleanup. Animations created **outside** (event handlers, timeouts, callbacks) are **not** — they leak.

```tsx
const { contextSafe } = useGSAP({ scope: containerRef })

// ✅ Tracked — will be cleaned up on unmount
const handleClick = contextSafe(() => {
  gsap.to('.box', { rotation: 180 })
})

// ❌ Leaks on unmount — NOT tracked
const handleClickBad = () => {
  gsap.to('.box', { rotation: 180 })
}
```

Inside the `useGSAP()` callback, `contextSafe` is the second argument:

```tsx
useGSAP(
  (context, contextSafe) => {
    const onClick = contextSafe(() => {
      gsap.to('.box', { rotation: 180 })
    })
    document.querySelector('.trigger')?.addEventListener('click', onClick)
    return () => document.querySelector('.trigger')?.removeEventListener('click', onClick)
  },
  { scope: containerRef },
)
```

---

## Ref vs Scoped Selector

| Scenario                                | Pattern                                           |
| --------------------------------------- | ------------------------------------------------- |
| Single specific element                 | `useRef` — no ambiguity                           |
| Multiple elements of same type          | Scoped selector (`.card`) — cleaner than N refs   |
| Mixed elements in orchestrated timeline | Scoped selectors for groups, refs for individuals |
| Element outside the container           | `useRef` — scope won't find it                    |

```tsx
const cardRef = useRef<HTMLDivElement>(null)

useGSAP(
  () => {
    gsap.to(cardRef.current, { opacity: 0 }) // specific element via ref
    gsap.to('.card', { y: 20 }) // all .card descendants of scope
    gsap.to([ref1.current, ref2.current], { x: 50 }) // array of refs — works natively
  },
  { scope: containerRef },
)
```

---

## Core Tween API

| Method                                  | What it does                            |
| --------------------------------------- | --------------------------------------- |
| `gsap.to(target, vars)`                 | Animate from current → specified values |
| `gsap.from(target, vars)`               | Animate from specified → current values |
| `gsap.fromTo(target, fromVars, toVars)` | Explicit start and end                  |
| `gsap.set(target, vars)`                | Instant set — no animation              |

**Key tween properties:** `duration`, `ease`, `delay`, `stagger`, `onComplete`, `onUpdate`, `overwrite: 'auto'`

---

## Easing

For scroll-scrubbed animations: **always `ease: 'none'`** — the scroll position is the timing function.

For enter/exit animations:

- `.out` — fast start, decelerate (default, best for entrances)
- `.in` — slow start, accelerate (best for exits)
- `.inOut` — slow→fast→slow (best for state transitions)

| Ease             | Character                                       |
| ---------------- | ----------------------------------------------- |
| `'none'`         | Linear — use for all scrubbed scroll animations |
| `'power1/2/3/4'` | Gentle → aggressive acceleration                |
| `'sine'`         | Sinusoidal — gentle, organic                    |
| `'expo'`         | Very sharp curve                                |
| `'back'`         | Overshoots then settles                         |
| `'elastic'`      | Spring-like wobble                              |

---

## Timeline API

```tsx
const tl = gsap.timeline({
  defaults: { duration: 0.5, ease: 'power2.out' },
})

tl.to('.title', { y: 0, opacity: 1 })
  .to('.sub', { y: 0, opacity: 1 }, '-=0.3') // overlap 0.3s
  .to('.cards', { y: 0, opacity: 1 }, '+=0.1') // gap 0.1s
```

### Position Parameter

| Value          | Meaning                                   |
| -------------- | ----------------------------------------- |
| `1`            | Absolute — at 1 second into timeline      |
| `'-=0.3'`      | 0.3s before previous tween ends (overlap) |
| `'+=0.1'`      | 0.1s after previous tween ends (gap)      |
| `'label'`      | At a named label                          |
| `'label+=0.5'` | 0.5s after a named label                  |
| `'<'`          | At the start of the previous tween        |

Use labels instead of magic numbers:

```tsx
tl.addLabel('reveal', 1.5)
  .to('.title', { opacity: 1 }, 'reveal')
  .to('.sub', { opacity: 1 }, 'reveal+=0.2')
```

Nest timelines for modular scenes: `masterTl.add(heroTl).add(cardsTl, '-=0.3')`

---

## Next.js Integration

```tsx
// Heavy scroll scene — reduce initial bundle, skip SSR execution
const HeroScrollScene = dynamic(() => import('@/components/features/hero/HeroScrollScene'), {
  ssr: false,
})
```

- MUST add `'use client'` to every component using GSAP
- SHOULD wrap heavy scroll scenes in `next/dynamic` with `ssr: false`
- `gsap.registerPlugin()` at module scope runs on first client-side import — correct timing

### ScrollTrigger.refresh()

Call after layout-changing async events:

- ✅ After web fonts finish loading
- ✅ After images with unknown dimensions load
- ✅ After dynamic content (CMS data) renders
- ✅ After route transitions that change layout
- ❌ Never on every render — it's expensive
- ❌ Never inside `onUpdate` callbacks — creates infinite loops

---

## Cleanup

`useGSAP()` handles automatic cleanup on unmount — no manual `.kill()` needed for animations inside the callback. For anything outside, use `contextSafe()`.

| Scenario                      | Solution                         |
| ----------------------------- | -------------------------------- |
| Animation in event handler    | Wrap handler in `contextSafe()`  |
| Animation in `setTimeout`     | Wrap callback in `contextSafe()` |
| Kill a specific timeline      | `tl.kill()` on stored reference  |
| Kill a specific ScrollTrigger | `st.kill()` on stored reference  |
