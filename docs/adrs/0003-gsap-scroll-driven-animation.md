# ADR-0003: GSAP & ScrollTrigger — Scroll-Driven Animation

**Status**: Accepted
**Date**: 2026-04-04
**Supersedes**: N/A

---

## Context

Modern marketing and product sites use scroll-driven animations — pinned sections, scrubbed timelines, horizontal scroll, video scrubbing, text reveals, parallax — to create immersive experiences. These are complex orchestrations that require precise control over timing, sequencing, and scroll position.

CSS Scroll-Driven Animations API handles simple single-element effects that run on the compositor (opacity fades, basic parallax). Framer Motion handles React component lifecycle transitions (mount/unmount, layout, gestures). Neither covers the scroll-driven orchestration space: pinned sections with multi-element choreography, horizontal scroll driven by vertical scroll, video scrubbing, snap points, or multi-phase scroll scenes.

GSAP (GreenSock Animation Platform) with its ScrollTrigger plugin is the industry standard for this class of animation. It directly manipulates the DOM — which conflicts with React's declarative model — so proper integration patterns are critical. Without this ADR, developers mix manual `useEffect` cleanup with GSAP code, forget scoped selectors, omit reduced motion paths, skip mobile fallbacks, and create memory leaks on SPA navigation.

This ADR is the source of truth for GSAP + ScrollTrigger in Next.js/React: setup, API, scroll-driven techniques, and production patterns.

## Decision

**GSAP 3 with ScrollTrigger is the scroll-driven animation engine. All GSAP code in React uses `useGSAP()` from `@gsap/react` with scoped refs. Every scroll scene provides a reduced motion path via `gsap.matchMedia()`. Complex scroll scenes are disabled below `md` breakpoint. GSAP does NOT handle React lifecycle transitions, layout animations, gestures, or simple compositor-eligible scroll effects.**

---

## Rules

| Rule | Level |
|------|-------|
| Use `'use client'` on every component using GSAP | **MUST** |
| Register plugins before use: `gsap.registerPlugin(useGSAP, ScrollTrigger)` | **MUST** |
| Use `useGSAP()` from `@gsap/react` for all GSAP code in React — never raw `useEffect` | **MUST** |
| Provide `scope` ref to `useGSAP()` — never use document-wide selectors | **MUST** |
| Handle reduced motion via `gsap.matchMedia()` — snap to final state, skip ScrollTrigger | **MUST** |
| Animate only `transform` and `opacity` in scroll-driven scenes | **MUST** |
| Clean up dynamically created animations outside `useGSAP` scope with `contextSafe()` | **MUST** |
| Wrap event handlers that create GSAP animations in `contextSafe()` | **MUST** |
| Use `scrub: 1` as default smoothing (adjust per feel) | **SHOULD** |
| Use `markers: true` during development, remove before production | **SHOULD** |
| Use `next/dynamic` with `ssr: false` for heavy scroll scenes | **SHOULD** |
| Disable complex scroll scenes below `md` via `gsap.matchMedia()` | **SHOULD** |
| Use timeline `defaults` for shared transition config | **SHOULD** |
| Use labels in timelines for readable sequencing | **SHOULD** |
| Call `ScrollTrigger.refresh()` after dynamic content loads | **SHOULD** |
| Use GSAP for React state-driven transitions (use Framer Motion) | **MUST NOT** |
| Mix GSAP and Framer Motion transforms on the same DOM element | **MUST NOT** |
| Read layout inside `onUpdate` callbacks (`getBoundingClientRect()` in scroll callbacks = layout thrash) | **MUST NOT** |
| Use `position: fixed` manually for pinning (let ScrollTrigger handle it) | **MUST NOT** |
| Ship `markers: true` to production | **MUST NOT** |

---

## Part 1 — Engine Setup & API

## 1. Setup & Installation

### 1.1 Packages

| Package | Purpose | Size |
|---------|---------|------|
| `gsap` | Core animation engine — tweens, timelines, easing, utility methods | ~30 kB gzipped |
| `@gsap/react` | `useGSAP()` hook — React integration with automatic cleanup | ~2 kB gzipped |

```bash
pnpm add gsap @gsap/react
```

### 1.2 Plugin Registration

Plugins must be registered once before any usage. Registration is idempotent — calling it multiple times is safe.

```tsx
'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)
```

Register at module scope in a `'use client'` component — this runs once when the module is first imported. Alternatively, create a shared client-side setup file that gets imported by all GSAP components.

### 1.3 Licensing

GSAP uses GreenSock's "no charge" standard license. As of 2024, Webflow acquired GreenSock and made **all plugins free** — including SplitText, MorphSVG, ScrollSmoother, and every previously paid "Club GSAP" plugin. Free for all commercial use. The only restriction is you cannot redistribute or resell GSAP itself. This is not MIT/Apache — it's a custom license. See [gsap.com/standard-license](https://gsap.com/standard-license).

---

## 2. React Integration — `useGSAP()`

GSAP manipulates the DOM directly. React owns the DOM. This conflict creates three problems: animations leak on unmount, strict mode double-mounts create duplicate animations, and document-wide selectors break component isolation. The `useGSAP()` hook from `@gsap/react` solves all three.

### 2.1 What `useGSAP()` Does

- Scopes all GSAP animations created inside the callback to a container ref
- Automatically reverts (kills + cleans up) all animations on component unmount
- Handles React strict mode (double-mount in dev) — animations are reverted and re-created correctly
- Implements `useIsomorphicLayoutEffect` internally — safe for SSR
- Replaces the manual `useEffect` + `return () => { ctx.revert() }` pattern entirely

### 2.2 API

```tsx
const containerRef = useRef<HTMLDivElement>(null)

useGSAP(() => {
  // All GSAP code here — automatically scoped and cleaned up
  gsap.to('.card', { x: 100, scrollTrigger: { ... } })
}, { scope: containerRef, dependencies: [] })
```

**Method signatures:**

```tsx
// Config object — preferred, most flexible
useGSAP(callback, { scope, dependencies, revertOnUpdate })

// useEffect-style — less flexible
useGSAP(callback)              // runs once, empty deps
useGSAP(callback, [dep1])      // re-runs when dep changes

// For event handlers — returns contextSafe
const { context, contextSafe } = useGSAP({ scope: containerRef })
```

### 2.3 Configuration Options

| Option | Type | What it does |
|--------|------|-------------|
| `scope` | `React.RefObject` | Container ref — all selector strings are scoped to descendants of this element |
| `dependencies` | `any[]` | Same as `useEffect` deps. Empty array = run once on mount |
| `revertOnUpdate` | `boolean` | If `true`, all GSAP objects are reverted when any dependency changes (not just on unmount). Default: `false` |

### 2.4 `contextSafe()` for Event Handlers

Animations created **inside** the `useGSAP()` callback are automatically tracked for cleanup. Animations created **outside** (event handlers, timeouts, callbacks) are not — they leak.

`contextSafe()` wraps a function so that any GSAP animations created inside it are tracked by the same context:

```tsx
const containerRef = useRef<HTMLDivElement>(null)

const { contextSafe } = useGSAP({ scope: containerRef })

// ✅ Wrapped in contextSafe — animations are tracked and cleaned up
const handleClick = contextSafe(() => {
  gsap.to('.box', { rotation: 180 })
})

// ❌ NOT wrapped — animation leaks on unmount
const handleClickBad = () => {
  gsap.to('.box', { rotation: 180 })
}
```

**Inside `useGSAP()` callback**, `contextSafe` is available as the second argument:

```tsx
useGSAP((context, contextSafe) => {
  const onClick = contextSafe(() => {
    gsap.to('.box', { rotation: 180 })
  })

  document.querySelector('.trigger')?.addEventListener('click', onClick)

  return () => {
    document.querySelector('.trigger')?.removeEventListener('click', onClick)
  }
}, { scope: containerRef })
```

---

## 3. Refs and Targeting

### 3.1 Refs for Specific Elements

```tsx
const heroRef = useRef<HTMLDivElement>(null)

useGSAP(() => {
  gsap.to(heroRef.current, { opacity: 0 })
}, { scope: containerRef })
```

### 3.2 Scoped Selectors for Groups

```tsx
const containerRef = useRef<HTMLDivElement>(null)

useGSAP(() => {
  // Targets all .card descendants of containerRef — not document-wide
  gsap.to('.card', { y: 20 })
}, { scope: containerRef })
```

### 3.3 When to Use Which

| Scenario | Pattern |
|----------|---------|
| Single specific element | `useRef` — precise, no ambiguity |
| Multiple elements of same type | Scoped selector (`.card`) — cleaner than N refs |
| Mixed elements in orchestrated timeline | Scoped selectors for groups, refs for individuals |
| Elements outside the container | `useRef` — scope won't find them |

GSAP handles `NodeList`, arrays, and refs natively — `gsap.to([ref1.current, ref2.current], { ... })` works.

---

## 4. Core GSAP API

### 4.1 Tweens

| Method | What it does |
|--------|-------------|
| `gsap.to(target, vars)` | Animate FROM current state TO specified values |
| `gsap.from(target, vars)` | Animate FROM specified values TO current state |
| `gsap.fromTo(target, fromVars, toVars)` | Explicit start and end values |
| `gsap.set(target, vars)` | Instantly set properties — no animation |

### 4.2 Common Tween Properties

| Property | Type | What it does |
|----------|------|-------------|
| `duration` | `number` | Seconds (default `0.5`) |
| `ease` | `string` | Easing function (default `'power1.out'`) |
| `delay` | `number` | Seconds before animation starts |
| `stagger` | `number \| object` | Offset between multiple targets |
| `onComplete` | `function` | Called when animation finishes |
| `onUpdate` | `function` | Called on every frame |
| `onStart` | `function` | Called when animation begins |
| `overwrite` | `string` | How to handle conflicting tweens — use `'auto'` |
| `force3D` | `boolean` | Force GPU layer promotion (default `true`) |

### 4.3 Easing

GSAP's easing model uses named curves with `.in`, `.out`, `.inOut` suffixes:

| Ease | Character |
|------|-----------|
| `'none'` | Linear — constant speed, no acceleration |
| `'power1'` | Gentle — subtle acceleration/deceleration |
| `'power2'` | Moderate — noticeable curve |
| `'power3'` | Strong — dramatic acceleration |
| `'power4'` | Aggressive — extreme curve |
| `'back'` | Overshoots target, then settles |
| `'elastic'` | Spring-like wobble past target |
| `'bounce'` | Bounces at the end |
| `'expo'` | Exponential — very sharp |
| `'circ'` | Circular curve |
| `'sine'` | Sinusoidal — gentle, organic |

**Suffixes:**
- `.out` (default) — starts fast, decelerates. Best for entrances.
- `.in` — starts slow, accelerates. Best for exits.
- `.inOut` — slow start, fast middle, slow end. Best for state changes.

`'power1.out'` is GSAP's default ease when none is specified.

For scroll-scrubbed animations, use `ease: 'none'` (linear) — the scroll position IS the timing function.

---

## 5. Timelines

Timelines sequence multiple tweens with precise timing control.

### 5.1 Creation

```tsx
const tl = gsap.timeline({
  defaults: { duration: 0.5, ease: 'power2.out' }
})

tl.to('.title', { y: 0, opacity: 1 })
  .to('.subtitle', { y: 0, opacity: 1 }, '-=0.3')  // overlap by 0.3s
  .to('.cards', { y: 0, opacity: 1 }, '+=0.1')      // gap of 0.1s
```

### 5.2 Position Parameter

The third argument to timeline methods controls timing relative to the timeline:

| Position | Meaning |
|----------|---------|
| `1` | Absolute — at 1 second into the timeline |
| `'-=0.3'` | Relative — 0.3 seconds before the previous tween ends (overlap) |
| `'+=0.1'` | Relative — 0.1 seconds after the previous tween ends (gap) |
| `'myLabel'` | At a named label position |
| `'myLabel+=0.5'` | 0.5 seconds after a named label |
| `'<'` | At the start of the previous tween |
| `'<0.5'` | 0.5 seconds after the start of the previous tween |

### 5.3 Labels

```tsx
tl.addLabel('reveal', 1.5)
  .to('.title', { opacity: 1 }, 'reveal')
  .to('.subtitle', { opacity: 1 }, 'reveal+=0.2')
```

Labels create named positions in the timeline. Use them instead of magic numbers for readable sequencing.

### 5.4 Defaults

```tsx
const tl = gsap.timeline({
  defaults: { duration: 0.5, ease: 'power2.out' }
})
```

`defaults` apply to all tweens in the timeline. Individual tweens can override any default.

### 5.5 Nesting

Timelines inside timelines for modular scenes:

```tsx
const heroTl = gsap.timeline()
heroTl.to('.hero-image', { scale: 0.8 })
      .to('.hero-text', { opacity: 1 }, '-=0.2')

const cardsTl = gsap.timeline()
cardsTl.fromTo('.card', { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1 })

const masterTl = gsap.timeline({ scrollTrigger: { ... } })
masterTl.add(heroTl)
        .add(cardsTl, '-=0.3')
```

### 5.6 Playback Control

```tsx
tl.pause()
tl.play()
tl.reverse()
tl.progress(0.5)  // jump to 50%
tl.timeScale(2)   // double speed
```

---

## 6. ScrollTrigger

ScrollTrigger links animations to scroll position. It can toggle playback (play/pause at trigger points) or scrub (map animation progress to scroll progress).

### 6.1 Basic Usage

```tsx
gsap.to('.hero-image', {
  scale: 0.8,
  scrollTrigger: {
    trigger: '.hero-section',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
  }
})
```

### 6.2 Configuration Properties

| Property | Type | What it does |
|----------|------|-------------|
| `trigger` | `string \| Element \| Ref` | Element whose position defines the scroll range |
| `start` | `string` | When animation begins — `'triggerPos viewportPos'` |
| `end` | `string \| number \| function` | When animation ends — same format as start |
| `scrub` | `boolean \| number` | Link animation progress to scroll. `true` = instant, number = smoothing seconds |
| `pin` | `boolean \| string \| Element` | Pin the trigger element in the viewport during the animation range |
| `pinSpacing` | `boolean \| 'margin'` | Add spacing after pinned element (default `true`) |
| `snap` | `number \| array \| object \| 'labels'` | Snap to progress values when scrolling stops |
| `markers` | `boolean \| object` | Show debug markers for start/end positions |
| `toggleActions` | `string` | Actions on enter/leave/enterBack/leaveBack (e.g., `'play pause resume reset'`) |
| `toggleClass` | `string \| object` | Add/remove CSS class when active |
| `onUpdate` | `function` | Callback every scroll frame — receives `self` with `.progress`, `.direction`, `.isActive` |
| `onEnter` | `function` | Scroll moves forward past start |
| `onLeave` | `function` | Scroll moves forward past end |
| `onEnterBack` | `function` | Scroll moves backward past end |
| `onLeaveBack` | `function` | Scroll moves backward past start |
| `onRefresh` | `function` | Called on resize/refresh recalculation |
| `onScrubComplete` | `function` | Called when scrub smoothing finishes catching up |
| `onSnapComplete` | `function` | Called when snap animation completes |
| `once` | `boolean` | Kill the ScrollTrigger after first trigger — one-shot viewport reveals |
| `anticipatePin` | `number` | Pre-apply pin slightly early to avoid flash on fast scroll. `1` is typical |
| `invalidateOnRefresh` | `boolean` | Flush recorded starting values on refresh — useful for responsive |
| `horizontal` | `boolean` | Use horizontal scroll axis instead of vertical |
| `pinReparent` | `boolean` | Reparent pinned element to `<body>` to escape ancestor `transform`/`will-change` containing blocks |

### 6.3 `start` / `end` Position Format

Two-part string: first word = trigger element position, second word = viewport position.

| Example | Meaning |
|---------|---------|
| `'top top'` | Trigger's top hits viewport top |
| `'top 80%'` | Trigger's top hits 80% down the viewport |
| `'center center'` | Trigger's center meets viewport center |
| `'bottom bottom'` | Trigger's bottom hits viewport bottom |
| `'top bottom'` | Trigger's top enters viewport (just entering from below) |
| `'top top+=100'` | Trigger's top hits 100px below viewport top |
| `'+=2000'` | 2000px after the start position (for `end`) |

**Numeric and function values for `end`:**

```tsx
end: '+=2000'              // 2000px scroll distance
end: () => `+=${totalWidth}` // function — recalculates on refresh
```

### 6.4 Standalone ScrollTrigger

ScrollTrigger without an animation — for callbacks only:

```tsx
ScrollTrigger.create({
  trigger: sectionRef.current,
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    console.log('progress:', self.progress.toFixed(3))
  }
})
```

---

## 7. Scrub

Scrub links animation progress directly to scroll position — the foundation of scroll-driven scenes.

### 7.1 Values

| Value | Feel | Use case |
|-------|------|----------|
| `scrub: true` | Exact 1:1 — can feel mechanical | Progress bars, precise indicators |
| `scrub: 0.5` | Responsive — quick catch-up | Most scroll scenes (balanced feel) |
| `scrub: 1` | Smooth — natural momentum | **Default recommendation** |
| `scrub: 2` | Heavy — cinematic inertia | Dramatic/cinematic sections |

### 7.2 Choosing Scrub Values

- **`0.5–1`** for most scroll-driven scenes (balanced feel)
- **`1–2`** for cinematic/dramatic sections where weight matters
- **`true`** only for progress bars, indicators, or video scrubbing where precision matters
- Higher values add perceived inertia — content continues moving briefly after scroll stops

### 7.3 Scrub + Timeline

When scrub is enabled on a timeline's ScrollTrigger, the timeline's total duration maps to the scroll range. Position parameters in the timeline become "at what scroll percentage does this tween happen." Use `ease: 'none'` on individual tweens within a scrubbed timeline — the scroll position is the timing function.

---

## 8. Pin

Pinning locks an element in the viewport while the user scrolls through the animation range.

### 8.1 How It Works

GSAP applies `position: fixed` (or transforms, depending on context) during the pinned range and manages a spacer element to maintain document flow. The scroll distance the element stays pinned = `end - start`.

```tsx
scrollTrigger: {
  trigger: sectionRef.current,
  start: 'top top',    // pin starts when section top hits viewport top
  end: '+=2000',       // stays pinned for 2000px of scroll
  pin: true,           // pin the trigger element
  scrub: 1,            // scrub a timeline during the pinned range
}
```

### 8.2 `pinSpacing`

| Value | Behavior |
|-------|----------|
| `true` (default) | Adds padding below the pinned section equal to the scroll distance — content below is pushed down |
| `false` | No padding — content scrolls underneath the pinned section (overlay effects) |
| `'margin'` | Uses margin instead of padding |

### 8.3 `anticipatePin`

On fast scroll, browsers may paint one frame of unpinned content before the pin takes effect. `anticipatePin: 1` applies the pin slightly early to prevent this flash:

```tsx
scrollTrigger: {
  trigger: sectionRef.current,
  start: 'top top',
  end: '+=2000',
  pin: true,
  anticipatePin: 1,
}
```

### 8.4 Pin Gotchas

- **Don't animate the pinned element itself** — GSAP pre-calculates positions. Animate children inside it instead.
- **Nested pins** — a ScrollTrigger whose trigger is inside a pinned element must set `pinnedContainer` to the outer pinned element so positions are calculated correctly. Nested pinning (pin inside pin) is NOT supported.
- **Ancestor `transform` / `will-change`** — these break `position: fixed` (browser behavior, not GSAP). Use `pinReparent: true` to escape the containing block, or restructure the DOM to avoid the issue.
- **Pin + scrub** is the most common pattern — pin the section, scrub a timeline while pinned.

---

## 9. Snap

Snap points make scroll position jump to specific progress values when the user stops scrolling. Snap only works with `scrub` enabled.

### 9.1 Values

```tsx
snap: 0.25                           // snap to nearest 25% increment
snap: [0, 0.25, 0.5, 0.75, 1]       // snap to specific progress values
snap: 'labels'                       // snap to timeline labels
snap: 'labelsDirectional'            // snap to labels in scroll direction only

// Config object with animation options
snap: {
  snapTo: 0.25,
  duration: { min: 0.2, max: 0.5 },
  delay: 0.1,
  ease: 'power2.inOut'
}
```

### 9.2 Common Patterns

| Pattern | Snap value |
|---------|-----------|
| Panel-based scroll sections | `snap: 1 / (numberOfPanels - 1)` |
| Slide show | `snap: 'labels'` (with labels on each slide) |
| Step-by-step reveals | `snap: [0, 0.33, 0.66, 1]` |

---

## 10. Responsive Animations — `gsap.matchMedia()`

`gsap.matchMedia()` creates animations scoped to media query breakpoints. Animations are automatically created/destroyed when breakpoints change. It also handles `prefers-reduced-motion`.

### 10.1 API

```tsx
useGSAP(() => {
  const mm = gsap.matchMedia()

  mm.add({
    isDesktop: '(min-width: 768px)',
    isMobile: '(max-width: 767px)',
    reduceMotion: '(prefers-reduced-motion: reduce)',
  }, (context) => {
    const { isDesktop, isMobile, reduceMotion } = context.conditions!

    if (reduceMotion) {
      // Snap to final state — no animation, no ScrollTrigger
      gsap.set('.title', { opacity: 1, y: 0 })
      gsap.set('.cards', { opacity: 1, y: 0 })
      return
    }

    if (isDesktop) {
      // Full scroll scene with pinning
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=2500',
          pin: true,
          scrub: 1,
        }
      })
      tl.to('.title', { opacity: 1, y: 0 })
        .to('.cards', { opacity: 1, y: 0, stagger: 0.1 }, '-=0.2')
    }

    if (isMobile) {
      // Simple viewport reveals — no pinning, no horizontal scroll
      gsap.from('.content-block', {
        y: 30,
        opacity: 0,
        stagger: 0.15,
        scrollTrigger: { trigger: '.content-block', start: 'top 85%' }
      })
    }
  })
}, { scope: containerRef })
```

### 10.2 Reduced Motion Strategy

| Context | Behavior |
|---------|----------|
| `prefers-reduced-motion: reduce` | `gsap.set()` to final state. No animation, no ScrollTrigger. Content is visible immediately. |
| Mobile (below `md`) | Simple fade-in on viewport entry. No pinning, no horizontal scroll, no parallax. |
| Desktop | Full scroll scene. |

This is a **MUST** requirement — every GSAP component must handle reduced motion. `gsap.matchMedia()` handles both responsive AND reduced motion in a single API.

---

## 11. Next.js Integration

### 11.1 `'use client'` Directive

Required on every component using GSAP. GSAP manipulates the DOM — this is client-only work. There is no SSR for scroll-driven animations.

### 11.2 `next/dynamic` with `ssr: false`

For heavy scroll scenes, avoid loading GSAP on the server and prevent hydration mismatch:

```tsx
import dynamic from 'next/dynamic'

const HeroScrollScene = dynamic(
  () => import('@/components/features/hero/hero-scroll-scene'),
  { ssr: false }
)
```

This reduces initial bundle size and eliminates server-side execution of client-only code.

### 11.3 Plugin Registration Timing

`gsap.registerPlugin(useGSAP, ScrollTrigger)` must run before any `useGSAP` or ScrollTrigger code. In a `'use client'` component, module-scope registration runs on first import — this is the recommended pattern.

### 11.4 `ScrollTrigger.refresh()`

ScrollTrigger pre-calculates trigger positions on page load. If layout changes after initial render (dynamic content, fonts loading, images loading), positions become stale.

**When to call `ScrollTrigger.refresh()`:**
- After web fonts finish loading
- After images with unknown dimensions load
- After dynamic content (CMS data, API responses) renders
- After route transitions that change layout

**When NOT to call it:**
- On every render — it's expensive
- Inside `onUpdate` callbacks — creates infinite loops
- When layout hasn't actually changed

---

## 12. Cleanup

### 12.1 Why Cleanup Matters in React

SPA navigation doesn't destroy the DOM the way full page loads do. Orphaned ScrollTriggers listen for scroll events on unmounted content. Memory leaks accumulate with route changes.

### 12.2 Automatic Cleanup via `useGSAP()`

All tweens and ScrollTriggers created inside the `useGSAP()` callback are tracked. On component unmount, everything is reverted automatically. No manual `.kill()` calls needed in most cases.

### 12.3 Manual Cleanup (When Needed)

| Scenario | Solution |
|----------|----------|
| Animation created in event handler | Wrap in `contextSafe()` (§2.4) |
| Animation created in `setTimeout` | Wrap in `contextSafe()` |
| Kill a specific timeline | `tl.kill()` |
| Kill a specific ScrollTrigger | `st.kill()` on a stored reference |
| Nuclear option — kill all | `ScrollTrigger.getAll().forEach(st => st.kill())` |

---

## Part 2 — Scroll-Driven Techniques

## 13. Scroll Budget Formula

Before implementing any scroll-driven technique — calculate the section height.

### 13.1 The Formula

```
scrollHeight = numberOfAnimatedPhases × viewportMultiplier × 100vh
```

- **`numberOfAnimatedPhases`** — how many distinct animation steps in the scene. Hero scales down = 1 phase. Text reveals = 1 phase. Cards slide in = 1 phase. Total: 3 phases.
- **`viewportMultiplier`** — scroll distance per phase. Typically `1–1.5`. Higher = more unhurried.

### 13.2 Constraints

| Constraint | Value | Why |
|-----------|-------|-----|
| Minimum per phase | `100vh` | Less feels rushed |
| Maximum total | `~800vh` | Beyond this, users reach for the scrollbar |
| Completion target | Animation completes by 80% scroll | The final 20% should be settling/exit, not dead scroll |

### 13.3 Examples

| Scene | Phases | Multiplier | Result |
|-------|--------|-----------|--------|
| Hero scale-down only | 1 | 1.5 | `150vh` → use `200vh` |
| Hero + text + cards | 3 | 1.5 | `450vh` → use `450–500vh` |
| Full Apple-style section | 5 | 1.2 | `600vh` |

### 13.4 Tuning

- **Animation feels rushed** → increase scroll height
- **Animation finishes early with dead scroll at the end** → section is too tall, reduce scroll height
- **Users skip the section** → cap at 800vh, review if the content justifies the scroll length

---

## 14. Sticky-Pinned Section Anatomy

The foundation technique. A tall outer container provides scroll distance; the trigger element is pinned in the viewport while scroll progress drives animations.

### 14.1 Structure (Conceptual)

```
Outer container (height: Nvh, position: relative)
  └── Inner sticky viewport (position: sticky, top: 0, height: 100vh, overflow: hidden)
       └── Animated content (transforms driven by scroll progress)
```

GSAP's `pin: true` creates this structure automatically — it manages the fixed positioning and spacer elements.

### 14.2 Implementation

```tsx
useGSAP(() => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: sectionRef.current,
      start: 'top top',
      end: '+=3000',   // 3000px of pinned scroll
      pin: true,
      scrub: 1,
      anticipatePin: 1,
    }
  })

  tl.to('.hero-image', { scale: 0.8, opacity: 0.5 })
    .to('.title', { y: 0, opacity: 1 }, '-=0.3')
    .to('.cards', { x: 0, opacity: 1 }, '-=0.2')
}, { scope: containerRef })
```

### 14.3 Common Mistakes

| Mistake | Why it fails | Fix |
|---------|-------------|-----|
| Using `position: fixed` manually | Breaks in nested layouts, conflicts with ScrollTrigger | Let `pin: true` handle it |
| Animating the pinned element itself | ScrollTrigger pre-calculates its position | Animate children inside the pinned element |
| Scroll height too short | Animation feels rushed | Use scroll budget formula (§13) |
| Scroll height too long | Dead scroll at the end | Cap at 800vh, verify animation finishes by 80% |
| Missing `overflow: hidden` on the pinned container | Animated elements overflow visually | GSAP handles this when using `pin`, but if building manually, add `overflow: hidden` |

---

## 15. Horizontal Scroll

Vertical scroll drives horizontal translation — a row of content slides sideways as the user scrolls down.

### 15.1 The Math

```
totalHorizontalDistance = (numberOfPanels × panelWidth) - viewportWidth
scrollHeight = totalHorizontalDistance + viewportHeight
```

### 15.2 Implementation

```tsx
useGSAP(() => {
  const panels = gsap.utils.toArray<HTMLElement>('.panel')
  const totalWidth = panels.length * panelWidth

  gsap.to('.panels-container', {
    x: -(totalWidth - window.innerWidth),
    ease: 'none',
    scrollTrigger: {
      trigger: sectionRef.current,
      start: 'top top',
      end: () => `+=${totalWidth}`,
      pin: true,
      scrub: 1,
      snap: 1 / (panels.length - 1),
      anticipatePin: 1,
      invalidateOnRefresh: true,
    }
  })
}, { scope: containerRef })
```

### 15.3 Key Details

- **`end` as a function** — recalculates on refresh. Important for dynamic content and responsive layouts.
- **`invalidateOnRefresh: true`** — flushes cached starting values when viewport resizes.
- **Panel snapping** — `snap: 1 / (panels.length - 1)` snaps to each panel boundary.
- **Responsive** — recalculate widths on resize; `ScrollTrigger.refresh()` recalculates positions automatically on window resize.
- **Mobile fallback** — standard vertical stack with simple fade-in reveals. No horizontal scroll on mobile — vertical scroll is the native interaction.

---

## 16. Multi-Element Choreography

Multiple elements animate in a coordinated sequence within a single scroll range — the "waterfall stagger" effect.

### 16.1 Implementation

```tsx
useGSAP(() => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: sectionRef.current,
      start: 'top top',
      end: '+=2500',
      pin: true,
      scrub: 1,
    }
  })

  tl.fromTo('.hero',
      { scale: 1 },
      { scale: 0.6, opacity: 0.3 })
    .fromTo('.title',
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1 }, '-=0.3')
    .fromTo('.card',
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1 }, '-=0.2')
}, { scope: containerRef })
```

### 16.2 Key Points

- **Position parameter** is the composition tool — overlap (`-=`), gap (`+=`), labels.
- **`stagger`** on multiple targets creates cascade without separate tweens per element.
- **Vary stagger** values for different element groups — uniform stagger feels mechanical.
- Keep total phase count reasonable — use the scroll budget formula (§13). Too many phases in one scroll range makes each feel rushed.

---

## 17. Video Scrubbing

Video playback controlled by scroll position.

### 17.1 Implementation

```tsx
useGSAP(() => {
  const video = videoRef.current
  if (!video) return

  ScrollTrigger.create({
    trigger: sectionRef.current,
    start: 'top top',
    end: '+=3000',
    pin: true,
    scrub: true,  // scrub: true (not scrub: 1) for video — smoothing adds lag
    onUpdate: (self) => {
      if (!video.duration) return
      const targetTime = self.progress * video.duration
      // Threshold prevents seeking on micro-scrolls
      if (Math.abs(targetTime - video.currentTime) > 0.03) {
        video.currentTime = targetTime
      }
    }
  })
}, { scope: containerRef })
```

### 17.2 Key Details

| Concern | Solution |
|---------|----------|
| Video not loaded | Show poster frame / static image until `loadeddata` event fires |
| Seeking feels choppy | Frame snapping: `Math.round(time * frameRate) / frameRate` |
| Use `scrub: true` for video | Smoothing (`scrub: 1`) adds lag that makes seeking feel disconnected |
| Reduced motion | Show poster image or key frame — no scrubbing |
| Mobile performance | Consider image sequence fallback (series of stills) if video is too heavy |
| Video format | MP4 H.264 for broadest compatibility, short duration (10–30s max) |
| Preloading | `preload="auto"` on the `<video>` element |

---

## 18. Scale-In Hero

A product image or hero element starts zoomed in (close-up) and scales down as the user scrolls, revealing context around it. The "pulling back the camera" effect.

### 18.1 Implementation

```tsx
useGSAP(() => {
  gsap.fromTo('.hero-image',
    { scale: 1.5 },
    {
      scale: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=1500',
        pin: true,
        scrub: 1,
      }
    }
  )
}, { scope: containerRef })
```

### 18.2 Variations

| Variation | How |
|-----------|-----|
| Scale down + translate | Hero shrinks and moves to a card position |
| Scale down + text reveal | Hero pulls back, headline fades in below |
| Scale down + background change | Mood shift as hero recedes — background color transition |

**Scroll budget:** 1 phase → `150–200vh`.

---

## 19. Cross-Fade Panel Sequence

Multiple full-screen panels that fade between each other as the user scrolls. Only one panel visible at a time.

### 19.1 Structure

Panels stacked via `position: absolute` within the pinned container. Each panel fades from `opacity: 0` to `1` then `1` to `0` at different scroll ranges.

### 19.2 Timeline Phases

```
Panel 1 hold → Panel 1 fadeout + Panel 2 fadein → Panel 2 hold →
Panel 2 fadeout + Panel 3 fadein → Panel 3 hold
```

Each panel gets two tweens: fade in and fade out. Position parameter creates the hold zones.

### 19.3 Implementation

```tsx
useGSAP(() => {
  const panels = gsap.utils.toArray<HTMLElement>('.panel')
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: sectionRef.current,
      start: 'top top',
      end: () => `+=${panels.length * 150}vh`,
      pin: true,
      scrub: 1,
    }
  })

  panels.forEach((panel, i) => {
    if (i > 0) {
      tl.fromTo(panel, { opacity: 0 }, { opacity: 1 })
    }
    tl.to({}, { duration: 0.5 }) // hold
    if (i < panels.length - 1) {
      tl.to(panel, { opacity: 0 })
    }
  })
}, { scope: containerRef })
```

### 19.4 Details

- **Scroll budget:** each panel needs entry + hold + exit = ~150vh per panel minimum.
- **Content inside panels** can animate independently (text fades in after panel is visible).
- **Mobile fallback:** vertical stack, each panel in normal document flow with simple fade-in on viewport entry.

---

## 20. Per-Word / Per-Line Text Reveal

Text illuminates word-by-word or line-by-line as the user scrolls.

### 20.1 Implementation

```tsx
useGSAP(() => {
  gsap.fromTo('.word',
    { opacity: 0.15 },
    {
      opacity: 1,
      stagger: 0.05,
      ease: 'none',
      scrollTrigger: {
        trigger: textRef.current,
        start: 'top 80%',
        end: 'bottom 20%',
        scrub: 1,
      }
    }
  )
}, { scope: containerRef })
```

### 20.2 Text Splitting

Split text into spans on mount. Two approaches:

**Manual splitting:**
```tsx
const words = text.split(' ').map((word, i) => (
  <span key={i} className="word inline-block">{word}&nbsp;</span>
))
```

**SplitText plugin** (now free): GSAP's official `SplitText` plugin handles word, character, and line splitting with automatic revert. Preferred for complex splits.

### 20.3 Variations

| Variation | How |
|-----------|-----|
| Opacity reveal | `opacity: 0.15` → `1` (dim to bright) |
| Color transition | `color` from muted token to primary token |
| Per-character | Split by character instead of word, smaller stagger |
| Pinned text reveal | Pin the text container, reveal words as user scrolls through |

### 20.4 Accessibility

Screen readers read the full text regardless — all words are in the DOM, just visually dimmed. The visual effect is decorative; the content is always accessible.

---

## 21. Clip-Path / Mask Reveals

Content revealed through an expanding clip-path tied to scroll.

### 21.1 Implementation

```tsx
useGSAP(() => {
  gsap.fromTo('.reveal-target',
    { clipPath: 'circle(0% at 50% 50%)' },
    {
      clipPath: 'circle(75% at 50% 50%)',
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=2000',
        pin: true,
        scrub: 1,
      }
    }
  )
}, { scope: containerRef })
```

### 21.2 Shapes

| Shape | From | To |
|-------|------|----|
| Circle reveal | `circle(0% at 50% 50%)` | `circle(75% at 50% 50%)` |
| Rectangular reveal | `inset(50%)` | `inset(0%)` |
| Horizontal wipe | `inset(0 100% 0 0)` | `inset(0 0% 0 0)` |

### 21.3 Details

- GSAP interpolates `clipPath` function values — no special handling needed.
- **Performance:** simple shapes (circle, inset) are fine. Complex SVG clip paths may vary on mid-range devices — test.
- **Accessibility:** content behind clip-path is still in the DOM and accessible to screen readers.
- **Reduced motion:** show content fully revealed (no clip).

---

## 22. Number Counter

Numeric values count from start to end tied to scroll.

### 22.1 Implementation

```tsx
useGSAP(() => {
  const counter = { value: 0 }
  const statElement = statRef.current

  gsap.to(counter, {
    value: 1250,
    duration: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: statsRef.current,
      start: 'top 80%',
      end: 'bottom 20%',
      scrub: 1,
    },
    onUpdate: () => {
      if (statElement) {
        statElement.textContent = Math.round(counter.value).toLocaleString()
      }
    }
  })
}, { scope: containerRef })
```

### 22.2 Details

- GSAP tweens arbitrary object properties, not just CSS — `counter.value` is a plain number.
- **Multiple counters:** use `stagger` with an array of proxy objects.
- **Decimal precision:** use `counter.value.toFixed(1)` in `onUpdate`.
- **Suffix/prefix:** append in `onUpdate` — `$${Math.round(counter.value).toLocaleString()}M`.
- **Accessibility:** `aria-label` on the element with the final value — screen readers don't need to hear the counting.
- **Reduced motion:** show the final number immediately via `gsap.set()`.

---

## 23. Multi-Layer Parallax

Multiple elements at different depth levels moving at different rates.

### 23.1 Implementation

```tsx
useGSAP(() => {
  gsap.to('.bg-layer', {
    y: -50,
    scrollTrigger: { trigger: sectionRef.current, scrub: true }
  })
  gsap.to('.mid-layer', {
    y: -120,
    scrollTrigger: { trigger: sectionRef.current, scrub: true }
  })
  gsap.to('.fg-layer', {
    y: -200,
    scrollTrigger: { trigger: sectionRef.current, scrub: true }
  })
}, { scope: containerRef })
```

### 23.2 Depth Ratios

| Layer | Y range | Speed |
|-------|---------|-------|
| Background | Small (`-50`) | Slow — appears far away |
| Midground | Medium (`-120`) | Medium |
| Foreground | Large (`-200`) | Fast — appears close |

### 23.3 Details

- **`scrub: true`** (not smoothed) for parallax — smoothing makes layers feel disconnected from each other.
- **`will-change: transform`** on active layers only — GPU memory is finite.
- **Layer count budget:** ≤8 promoted layers per scene.
- **Mobile:** reduce layer count or disable parallax entirely via `gsap.matchMedia()`.

---

## 24. Background Color Transitions (3+ stops)

Page or section background morphs through multiple colors as the user scrolls.

### 24.1 Implementation

```tsx
useGSAP(() => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: pageRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
    }
  })

  tl.to(sectionRef.current, { backgroundColor: '#1a1a2e', duration: 1 })
    .to(sectionRef.current, { backgroundColor: '#e8e8e8', duration: 1 })
    .to(sectionRef.current, { backgroundColor: '#0a0a0a', duration: 1 })
}, { scope: containerRef })
```

### 24.2 Details

- **WCAG contrast:** ensure text contrast meets AA at every transition point — not just at color stops, but at interpolated mid-values too. Test at 25%, 50%, 75% progress.
- **Reduced motion:** snap to the color matching current scroll position — no animated transition.
- **For ≤2 color stops**, CSS Scroll-Driven Animations API is simpler and runs on the compositor.

---

## 25. Zoom-Through Transition

Element scales up dramatically as if the camera is moving through it.

### 25.1 Implementation

```tsx
useGSAP(() => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: sectionRef.current,
      start: 'top top',
      end: '+=2000',
      pin: true,
      scrub: 1,
    }
  })

  // Current section zooms in and fades
  tl.to('.current-content', { scale: 15, opacity: 0, ease: 'power2.in' })
    // Next section fades in behind
    .fromTo('.next-content',
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1 }, '-=0.5')
}, { scope: containerRef })
```

### 25.2 Details

- Element scales from `1` to a large value (`5`–`20`) while `opacity` fades to `0`.
- Creates the illusion of "flying into" the element.
- Combine with the next section fading in behind — pin the section, timeline: scale up + opacity out on current, then scale down + opacity in on next.
- **Scroll budget:** at least `200vh` for a single zoom-through.

---

## Part 3 — Production Patterns

## 26. Mobile Fallback Patterns

Every technique above needs a mobile fallback.

### 26.1 Principles

| Principle | Reasoning |
|-----------|-----------|
| No pinning on mobile | Pinned sections with scroll-jacking feel bad on touch — users expect native scroll behavior |
| No horizontal scroll on mobile | Vertical scroll is the native interaction on mobile |
| Simplified or no parallax | Performance and battery; parallax adds little value on small screens |
| Video scrubbing → autoplay or poster | Video scrub on mobile drains battery and can feel laggy |

### 26.2 Standard Pattern

```tsx
useGSAP(() => {
  const mm = gsap.matchMedia()

  mm.add('(min-width: 768px)', () => {
    // Full desktop scroll scene — pin, scrub, choreography
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=3000',
        pin: true,
        scrub: 1,
      }
    })
    tl.to('.hero', { scale: 0.8 })
      .to('.title', { y: 0, opacity: 1 }, '-=0.3')
  })

  mm.add('(max-width: 767px)', () => {
    // Simple mobile reveals — no pinning
    gsap.from('.content-block', {
      y: 30,
      opacity: 0,
      stagger: 0.15,
      scrollTrigger: { trigger: '.content-block', start: 'top 85%' }
    })
  })
}, { scope: containerRef })
```

### 26.3 Technique-Specific Fallbacks

| Desktop technique | Mobile fallback |
|------------------|----------------|
| Pinned section + scrubbed timeline | Vertical stack, simple fade-in on viewport entry |
| Horizontal scroll | Vertical stack or swipeable carousel |
| Video scrubbing | Autoplay with `playsinline` or poster image |
| Multi-layer parallax | Reduce to 1–2 layers or disable |
| Cross-fade panels | Vertical stack, each panel in normal flow |
| Text reveal (word-by-word) | Fade in the whole block at once |

---

## 27. Composition Patterns

Most production scroll scenes combine 2–3 techniques within one pinned section.

### 27.1 One ScrollTrigger, One Timeline, Multiple Techniques

```tsx
// Scale-In Hero (§18) + Text Reveal (§20) + Card Choreography (§16)
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: sectionRef.current,
    start: 'top top',
    end: '+=4000',    // 4 phases × 1.3 multiplier × 100vh ≈ 520vh
    pin: true,
    scrub: 1,
  }
})

tl.addLabel('hero')
  .fromTo('.hero-image', { scale: 1.5 }, { scale: 1 })
  .addLabel('text', '-=0.1')
  .fromTo('.word', { opacity: 0.15 }, { opacity: 1, stagger: 0.03 }, 'text')
  .addLabel('cards')
  .fromTo('.card', { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08 }, 'cards')
```

### 27.2 Cross-Engine Composition

GSAP, CSS, and Framer Motion can coexist at the **section level** — one engine per element:

| Layer | Engine |
|-------|--------|
| Section pinning + scroll timeline | GSAP ScrollTrigger |
| SVG line-draw inside the section | CSS animation (triggered by GSAP toggleClass) |
| Hover states on interactive cards | Framer Motion or CSS `:hover` |

**Never** mix GSAP and Framer Motion transforms on the **same DOM element**.

### 27.3 Page Budget

| Guideline | Value |
|-----------|-------|
| Complex scroll-driven scenes per page | 1–2 maximum |
| Rest of the page | Simpler viewport reveals (`once: true` ScrollTriggers or CSS) |
| Scroll fatigue threshold | >3 complex scroll scenes on one page creates scroll fatigue |

---

## 28. Performance

| Rule | Why |
|------|-----|
| `will-change: transform` only on elements with active scroll-driven transforms | GPU memory is finite — each promoted layer consumes VRAM |
| ≤8 elements with active `will-change` per scroll scene | Browsers may drop compositing layers under pressure |
| `force3D: true` on heavy transforms | Forces GPU acceleration (GSAP default — usually no action needed) |
| `overwrite: 'auto'` on tweens | Prevents conflicting tweens from fighting over the same property |
| Never read layout inside `onUpdate` | `getBoundingClientRect()` in a scroll callback = layout thrash every frame |
| Use `scrub` number (not `true`) for smoothing | `scrub: true` amplifies micro-jitter; a number adds smoothing |
| `next/dynamic` with `ssr: false` for heavy scenes | Reduce initial bundle, avoid GSAP executing during SSR |
| Test at 4× CPU throttle in DevTools | Mid-range phones are 4–6× slower than a MacBook |
| Prefer `transform` and `opacity` | These run on the compositor thread — no layout/paint cost |

---

## 29. Anti-Patterns

| ❌ Don't | Why | ✅ Do Instead |
|----------|-----|--------------|
| `useEffect` + manual cleanup for GSAP | Misses strict mode, scope, context tracking | `useGSAP()` from `@gsap/react` |
| Document-wide selectors (`.card`) without scope | Selects elements in other components, breaks isolation | Scoped selectors via `useGSAP({ scope: ref })` |
| GSAP `.to()` on a Framer Motion-animated element | Two engines fighting over the same transform | One engine per element — GSAP for scroll, Motion for lifecycle |
| `scrub: true` on cinematic scenes | Feels mechanical, amplifies micro-jitter | `scrub: 1` or higher for smoothing |
| `pin` with manual `position: fixed` | Breaks in nested layouts, mismanages spacers | Let ScrollTrigger manage pinning via `pin: true` |
| No `gsap.matchMedia()` for responsive/reduced motion | Breaks on mobile, inaccessible for motion-sensitive users | Always provide desktop, mobile, and reduced-motion paths |
| Forgetting `ScrollTrigger.refresh()` after dynamic content | Trigger positions are stale after layout changes | Call after fonts/images/data load |
| `markers: true` in production | Visual debug markers visible to users | `markers: process.env.NODE_ENV === 'development'` |
| Magic numbers in timeline position parameters | Impossible to read or maintain | Use labels and relative positions (`'-=0.3'`) |
| Scroll height too short for the number of phases | Animation feels rushed, phases blur together | Use scroll budget formula (§13) |
| Scroll height > 800vh | Users get frustrated, reach for scrollbar | Cap at 800vh, ensure animation finishes by 80% progress |
| Same stagger on all choreography elements | Feels robotic | Vary stagger for cascade feel |
| No mobile fallback | Pinning + horizontal scroll breaks on touch | `gsap.matchMedia()` with simplified mobile version |
| Testing only on MacBook | Animations may jank on real devices | Throttle CPU 4× in DevTools Performance tab |
| >3 complex scroll scenes per page | Scroll fatigue — users stop engaging | 1–2 hero scenes, rest simple reveals |
| Creating GSAP animations in event handlers without `contextSafe()` | Animations leak — not tracked for cleanup on unmount | Wrap in `contextSafe()` (§2.4) |
| Animating the pinned element itself | ScrollTrigger pre-calculates positions — transforms throw them off | Animate children inside the pinned element |

---

## 30. Scope Boundary

### 30.1 GSAP Handles

- Scroll-driven pinned (sticky) sections with scrubbed timelines
- Horizontal scroll driven by vertical scroll
- Multi-element choreography with precise sequencing and stagger
- Video scrubbing tied to scroll position
- Scroll snap points
- Complex multi-phase scroll scenes
- Multi-layer parallax (3+ layers)
- Per-word/per-line text reveal tied to scroll
- Number counter animations tied to scroll
- Clip-path/mask reveals tied to scroll
- Background color transitions with 3+ stops
- Scale-in hero reveals
- Cross-fade panel sequences
- Zoom-through transitions

### 30.2 GSAP Does NOT Handle

| What | Use instead |
|------|------------|
| React mount/unmount transitions | Framer Motion (`AnimatePresence`) |
| Layout animations / FLIP | Framer Motion (`layoutId`) |
| Gesture responses: hover, tap, drag, focus | Framer Motion or CSS |
| Simple single-element scroll effects (opacity fade, basic translate on scroll) | CSS Scroll-Driven Animations API |
| Component state-driven transitions | Framer Motion |

---

## Library Compatibility

| Library | Status | Purpose | Notes |
|---------|--------|---------|-------|
| `gsap` | `recommended` | Core animation engine — tweens, timelines, easing | ~30 kB. Framework-agnostic. All plugins now free (Webflow acquisition) |
| `@gsap/react` | `recommended` | `useGSAP()` hook for React integration | ~2 kB. Required for all GSAP-in-React usage |
| `gsap/ScrollTrigger` | `recommended` | Scroll-driven animation — pin, scrub, snap, triggers | ~12 kB. Included in `gsap` package |
| `gsap/SplitText` | `compatible` | Text splitting for per-word/per-line reveals | Now free. Install when text reveal effects are needed. Alternative: manual span splitting |
| ScrollSmoother | `compatible` | Smooth scrolling layer on top of ScrollTrigger | Now free. Only install if smooth scrolling is explicitly requested. Increases complexity |
| Lenis / Locomotive Scroll | `forbidden` | Smooth scrolling | ScrollSmoother is the GSAP-native solution if smooth scrolling is needed. External smooth-scroll libraries conflict with ScrollTrigger timing |
| Any CSS-in-JS animation library | `forbidden` | Animations | Violates ADR-0002 (no CSS-in-JS runtime) |

---

## Consequences

**Positive:**
- Every scroll-driven animation technique has a documented implementation pattern with code — agents don't need to guess
- `useGSAP()` eliminates the most common class of GSAP-in-React bugs (cleanup, strict mode, scope)
- `gsap.matchMedia()` provides a single API for responsive behavior AND reduced motion compliance
- Scroll budget formula prevents both too-short (rushed) and too-long (scroll fatigue) sections
- Scope boundary clearly delineates GSAP vs Framer Motion vs CSS responsibilities — no engine overlap
- Anti-patterns table catches the most common production mistakes before they reach code review

**Negative:**
- GSAP is ~42 kB additional bundle size (core + ScrollTrigger) — mitigated by `next/dynamic` with `ssr: false`
- Direct DOM manipulation conflicts with React's model — mitigated by `useGSAP()` but fundamentally a different mental model than declarative React
- Scroll-driven animations are inherently complex to debug — `markers: true` helps during development but is not sufficient for all issues
- Mobile fallback requirement doubles the animation code for every scroll scene
- GSAP's custom license (not MIT/Apache) may require legal review in some organizations
- `SplitText` plugin, while now free, adds complexity for text reveals — manual splitting is sufficient for simple cases

## Related ADRs

- [ADR-0002](./0002-styling.md) — Styling (Tailwind-only, inline `style` allowed for animation values, no CSS-in-JS)
- [ADR-0004](./0004-components.md) — Component Structure (`'use client'` directive, server component default)
- [ADR-0018](./0018-performance-platform.md) — Performance (`next/dynamic` for heavy libraries, `next/image` for images, Core Web Vitals)
- [ADR-0019](./0019-accessibility.md) — Accessibility (WCAG 2.2, reduced motion compliance, `prefers-reduced-motion`)
- [ADR-0027](./0027-interactive-component-implementation.md) — Interactive Components (Framer Motion for lifecycle animations, `useMotionEnabled()`, cross-engine coexistence)
