---
name: scroll-driven-animation-setup
description: >-
  CSS Scroll-Driven Animations API setup — `animation-timeline: scroll()` and
  `view()` API surface, `animation-range` keyword system (entry/exit/cover/contain
  with visual timeline diagram), `@keyframes` percentages as scroll progress,
  named scroll/view timelines, `timeline-scope`, `view-timeline-inset`,
  progressive enhancement with `@supports` (default = visible end state, no polyfill),
  reduced motion via `animation: none`, globals.css `@layer utilities` integration,
  Next.js server component compatibility (zero JS, no `'use client'`), engine
  selection decision tree (CSS vs GSAP vs Motion). Use when setting up CSS
  scroll-driven animations for the first time, configuring animation-timeline or
  animation-range, implementing progressive enhancement for scroll effects, or
  choosing which animation engine to use for a scroll-linked effect.
---

# CSS Scroll-Driven Animations — Setup & API

**Compiled from**: ADR-0034 §1–§8, §18 (Engine Setup, API Surface, Integration, Scope Boundary)
**Last synced**: 2026-04-04

---

## What This API Is

CSS `@keyframes` animations driven by scroll position instead of time. Animation progresses as the user scrolls. Runs entirely on the browser's compositor thread — zero JavaScript, zero main-thread cost, zero bundle size. Components stay as server components: no `'use client'`, no hydration, no `next/dynamic`.

Two timeline types:

| Type            | Property                       | Driven By                                                |
| --------------- | ------------------------------ | -------------------------------------------------------- |
| Scroll timeline | `animation-timeline: scroll()` | How far a scroll container has been scrolled (0% → 100%) |
| View timeline   | `animation-timeline: view()`   | An element's visibility within the viewport              |

**Browser support (April 2026):** ~83% global — Chrome 115+, Edge 115+, Safari 26+, Samsung Internet 23+. Firefox requires a flag and is not supported by default.

---

## Progressive Enhancement — The Foundation

The default CSS state is always the final (visible) state. The animation is the journey. In unsupported browsers, the element appears in its final state — content is never hidden.

```css
/* Default state — visible in all browsers */
.reveal-element {
  opacity: 1;
  transform: translateY(0);
}

/* Animation only in supporting browsers */
@supports (animation-timeline: scroll()) {
  .reveal-element {
    animation: reveal linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal-element {
    animation: none;
  }
}
```

**Never** default to `opacity: 0` outside the `@supports` block. Content must be accessible without the animation.

---

## Scroll Timeline — `scroll()`

Ties animation to how far a scroll container has been scrolled.

```css
.element {
  animation: my-animation linear both;
  animation-timeline: scroll(); /* nearest scrollable ancestor */
  /* or: scroll(root) for the page     */
  /* or: scroll(root inline) for horiz */
}
```

| Syntax                | Container                   | Axis             |
| --------------------- | --------------------------- | ---------------- |
| `scroll()`            | Nearest scrollable ancestor | Block (vertical) |
| `scroll(root)`        | Document root               | Block (vertical) |
| `scroll(root inline)` | Document root               | Horizontal       |
| `scroll(self)`        | Element's own scroll        | Block            |

**`@keyframes` percentages = scroll progress**, not time. `0%` = scroll start. `100%` = scroll end.

---

## View Timeline — `view()`

Ties animation to element visibility. This is the most commonly used timeline in the project.

```css
.element {
  animation: fade-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
```

---

## `animation-range` — Critical Property

Controls which phase of element visibility triggers the animation.

```
                ┌──────────────────────────────┐
                │         Scrollport           │
                │                              │
─ ─ ─ ─ ─ ─ ─ ┤ entry 0%  ─ ─ ─ ─ ─ ─ ─ ─ ─│ ← leading edge enters
    ENTRY       │   ↓ element entering ↓       │
─ ─ ─ ─ ─ ─ ─ ┤ entry 100% / contain 0%  ─ ─│ ← fully inside
    CONTAIN     │   fully visible              │
─ ─ ─ ─ ─ ─ ─ ┤ contain 100% / exit 0%   ─ ─│ ← starts leaving
    EXIT        │   ↑ element exiting ↑        │
─ ─ ─ ─ ─ ─ ─ ┤ exit 100% ─ ─ ─ ─ ─ ─ ─ ─ ─│ ← trailing edge leaves
                └──────────────────────────────┘
◄────────── cover 0% ─────── to ─────── cover 100% ──────────────►
```

| Keyword   | Range Meaning                                          |
| --------- | ------------------------------------------------------ |
| `entry`   | Element entering the scrollport                        |
| `exit`    | Element exiting the scrollport                         |
| `cover`   | Full range — first pixel visible to last pixel leaving |
| `contain` | Element fully within scrollport                        |

**Common combinations:**

| Effect              | `animation-range`     |
| ------------------- | --------------------- |
| Fade in on enter    | `entry 0% entry 100%` |
| Longer reveal       | `entry 0% cover 50%`  |
| Full scroll-through | `cover 0% cover 100%` |
| Fade out on exit    | `exit 0% exit 100%`   |

```css
/* Longhand equivalents */
animation-range-start: entry 0%;
animation-range-end: entry 100%;
```

---

## `view-timeline-inset` — Sticky Header Compensation

Adjusts the viewport detection boundaries inward. Compensates for a sticky header obscuring the top of the viewport.

```css
.element {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
  view-timeline-inset: 80px 0px; /* 80px sticky header, 0px bottom */
}
```

---

## Named Timelines and `timeline-scope`

Target a specific scroll container that isn't the nearest ancestor:

```css
.scroll-container {
  scroll-timeline-name: --my-timeline;
  scroll-timeline-axis: block;
}

.animated-child {
  animation: my-effect linear both;
  animation-timeline: --my-timeline;
}
```

When the animated element is not a descendant of the timeline-defining element, use `timeline-scope` on a common ancestor:

```css
.common-ancestor {
  timeline-scope: --my-timeline;
}

.scroll-container {
  scroll-timeline-name: --my-timeline;
}
.element-elsewhere {
  animation-timeline: --my-timeline;
}
```

---

## globals.css Integration Pattern

Tailwind handles the default (final) state. Custom CSS in `globals.css` handles the animation layer. CSS Modules are forbidden — all animation CSS lives in `globals.css` within `@layer utilities`.

**Component (server component — no `'use client'` needed):**

```tsx
const RevealSection = () => (
  <div className='scroll-reveal translate-y-0 opacity-100'>
    <h2>Content visible by default</h2>
  </div>
)
```

**globals.css:**

```css
@layer utilities {
  .scroll-reveal {
    /* base visible state set via Tailwind classNames */
  }

  @supports (animation-timeline: scroll()) {
    .scroll-reveal {
      animation: reveal linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 100%;
    }
  }

  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .scroll-reveal {
      animation: none;
    }
  }
}
```

---

## `@keyframes` Rules

- Percentages = scroll progress, not time. `50%` = scroll reached 50% of the animation range.
- Only `transform` and `opacity` — compositor properties. Animating `width`, `height`, `margin`, `padding` causes layout recalculation per scroll frame.
- `background-color` exception: ≤2 stops on a single element only. Triggers paint, not layout.
- `linear` timing function — keyframe percentages control pacing. `ease` or `ease-in-out` make scroll feel nonlinear.
- Multi-step keyframes create "hold zones" — constant range keeps element in a state while scroll continues.

```css
/* Hold zone example: element fully visible from 40% to 60% scroll */
@keyframes reveal-and-exit {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
  40% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  60% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
}
```

---

## Engine Selection Decision Tree

```
Is the effect a CSS keyframe animation tied to scroll position?
├── YES: Does it need spring physics?
│   ├── YES → Motion (Framer Motion)
│   └── NO: Does it need shared timing across multiple elements?
│       ├── YES → GSAP ScrollTrigger
│       └── NO: Does it need pinning or horizontal scroll?
│           ├── YES → GSAP ScrollTrigger
│           └── NO: Is it a single-element transform/opacity/SVG effect?
│               ├── YES → CSS Scroll-Driven Animations ✓
│               └── NO → Evaluate GSAP (scroll scenes) or Motion (React lifecycle)
└── NO: Is it React lifecycle (mount/unmount/state/gesture)?
    ├── YES → Motion (Framer Motion)
    └── NO → GSAP or standard CSS transitions
```

**CSS handles:** SVG line-draw reveals, viewport entrance reveals, reading progress bars, single-element parallax, ≤2-stop background transitions, approximate CSS-only stagger via `:nth-child`.

**CSS does NOT handle:** spring physics, multi-element choreography, pinned sections, horizontal scroll, video scrubbing, per-word text reveals, 3+ stop color transitions, React state-driven animations, mount/unmount, layout animations (FLIP).
