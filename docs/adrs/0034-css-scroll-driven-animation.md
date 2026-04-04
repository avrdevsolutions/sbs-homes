# ADR-0034: CSS Scroll-Driven Animations

**Status**: Accepted
**Date**: 2026-04-04
**Supersedes**: N/A

---

## Context

The project uses three animation engines, each owning a distinct scope:

| Engine                           | Scope                                                                                                            | ADR          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| GSAP + ScrollTrigger             | Scroll-driven orchestration — pinned sections, horizontal scroll, scrubbed timelines, multi-element choreography | ADR-0003     |
| Motion (Framer Motion)           | React lifecycle — mount/unmount, layout, gestures, stagger, imperative sequences                                 | ADR-0030     |
| **CSS Scroll-Driven Animations** | **Simple scroll-linked effects — single-element reveals, SVG line-draws, progress bars, basic parallax**         | **This ADR** |

The CSS Scroll-Driven Animations API (`animation-timeline: scroll()` and `animation-timeline: view()`) drives `@keyframes` animations from scroll position instead of time. The animation progresses as the user scrolls, not over a duration. It runs entirely on the browser's compositor thread — zero JavaScript, zero main-thread cost, zero bundle size, no hydration, no `'use client'` directive needed.

This is the lightest-weight scroll animation option. If an effect can be expressed as a CSS keyframe animation tied to scroll position — and doesn't need spring physics, shared timelines, pinning, or runtime JS logic — it belongs here.

Without this ADR, developers reach for Motion `whileInView` or GSAP for effects that could run at zero JS cost on the compositor, or implement CSS scroll animations without progressive enhancement and break in unsupported browsers.

## Decision

**CSS Scroll-Driven Animations API is the compositor-thread scroll animation engine. All scroll-linked CSS animations use `@supports (animation-timeline: scroll())` for progressive enhancement with the default CSS state as the visible end state. Reduced motion handled via `@media (prefers-reduced-motion: reduce)` → `animation: none`. CSS animations go in `globals.css` within `@layer utilities`. No JavaScript, no `'use client'`, no client bundle cost. CSS Scroll-Driven Animations do NOT handle multi-element choreography, spring physics, pinned sections, or runtime JS logic — those belong to GSAP (ADR-0003) or Motion (ADR-0030).**

---

## Rules

| Rule                                                                                               | Level        |
| -------------------------------------------------------------------------------------------------- | ------------ |
| Use `@supports (animation-timeline: scroll())` for all scroll-driven CSS animations                | **MUST**     |
| Default CSS state must be the final (visible) state of the animation                               | **MUST**     |
| Handle reduced motion: `@media (prefers-reduced-motion: reduce)` → `animation: none`               | **MUST**     |
| Animate only `transform` and `opacity` (compositor-friendly properties)                            | **MUST**     |
| Use `linear` timing function on scroll-driven animations                                           | **MUST**     |
| Use `both` fill mode on scroll-driven animations                                                   | **MUST**     |
| Place scroll-driven animation CSS in `globals.css` within `@layer utilities`                       | **MUST**     |
| Use `pathLength="1"` on SVG `<path>` elements for line-draw animations                             | **SHOULD**   |
| Use `animation-range` to scope view timeline triggers                                              | **SHOULD**   |
| Prefer `view()` over `scroll()` for element-level reveals                                          | **SHOULD**   |
| Use Tailwind for the default (final) state; custom CSS for the animation layer                     | **SHOULD**   |
| Use CSS easing (`ease`, `ease-in-out`) on scroll-driven animations — scroll position IS the timing | **MUST NOT** |
| Use for multi-element choreography with shared timing                                              | **MUST NOT** |
| Use for spring physics (use Motion per ADR-0030)                                                   | **MUST NOT** |
| Use for pinned/sticky scroll sections (use GSAP per ADR-0003)                                      | **MUST NOT** |
| Gate content behind the animation (content must be visible without it)                             | **MUST NOT** |
| Mix with JS scroll listeners on the same element                                                   | **MUST NOT** |
| Use CSS Modules (`.module.css`) for animation CSS (per ADR-0002)                                   | **MUST NOT** |

---

## Part 1 — Engine Setup & API

## 1. What This API Is

The CSS Scroll-Driven Animations API drives CSS `@keyframes` animations from scroll position instead of time. The animation progresses as the user scrolls, not over a duration. Pure CSS, compositor thread, no JavaScript, no jank from main-thread execution.

Two types of scroll timeline:

| Type                | Property                       | Driven By                                                                                    |
| ------------------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| **Scroll timeline** | `animation-timeline: scroll()` | How far a scroll container has been scrolled (0% at start, 100% at end)                      |
| **View timeline**   | `animation-timeline: view()`   | An element's visibility within a scroll container (entering, crossing, leaving the viewport) |

**This is the only animation engine in the project with zero JavaScript and zero main-thread cost.**

---

## 2. Browser Support

| Browser          | Support     | Notes                                                                  |
| ---------------- | ----------- | ---------------------------------------------------------------------- |
| Chrome           | 115+        | Full support                                                           |
| Edge             | 115+        | Full support (Chromium)                                                |
| Safari           | 26+         | Full support (added in Safari 26)                                      |
| Firefox          | Behind flag | `layout.css.scroll-driven-animations.enabled` — not enabled by default |
| Safari on iOS    | 26+         | Full support                                                           |
| Samsung Internet | 23+         | Full support                                                           |

**Global support:** ~83% (April 2026).

**Implication:** This API is **progressive enhancement**. The animation is a visual bonus, not a content gate. Content must be fully accessible and visible without the animation running. In unsupported browsers, the element appears in its final (visible) state — the user sees no animation, but no content is hidden.

---

## 3. Progressive Enhancement Strategy

The foundation of every CSS scroll-driven animation in this project: **default CSS = final state, animation = the journey to get there.**

### 3.1 Feature Detection with `@supports`

```css
/* Default state — no animation, element visible in final state */
.reveal-element {
  opacity: 1;
  transform: translateY(0);
}

/* Animation only if the API is supported */
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
```

### 3.2 How It Works

1. **Base CSS** defines the visible, accessible end state (`opacity: 1`, `transform: translateY(0)`).
2. **`@supports` block** adds the animation only in browsers that support `animation-timeline`.
3. **`@keyframes`** define where the element _starts_ (e.g., `opacity: 0`). Scroll progress brings it to the default CSS state.
4. **Unsupported browsers** see the base CSS — the element is visible, content is accessible.

### 3.3 Principles

- `@supports (animation-timeline: scroll())` is the feature detection query — always wrap scroll-driven animations.
- Default CSS = final state, animation = the journey to get there.
- No JavaScript polyfill — treat as progressive enhancement. Polyfills add JS to a zero-JS feature, defeating the purpose.
- Fallback is "the element is visible" — not a degraded or alternative animation.

---

## 4. Scroll Timeline — `animation-timeline: scroll()`

Ties animation progress to the scroll position of a scroll container. `0%` of the `@keyframes` maps to scroll start, `100%` maps to scroll end.

### 4.1 Syntax

```css
.element {
  animation: my-animation linear both;
  animation-timeline: scroll();
}
```

### 4.2 `scroll()` Function Parameters

| Syntax                | Scroll Container                               | Axis             |
| --------------------- | ---------------------------------------------- | ---------------- |
| `scroll()`            | Nearest scrollable ancestor                    | Block (vertical) |
| `scroll(root)`        | Document root scroller                         | Block (vertical) |
| `scroll(nearest)`     | Nearest scrollable ancestor (explicit default) | Block (vertical) |
| `scroll(self)`        | The element's own scroll                       | Block (vertical) |
| `scroll(root block)`  | Document root scroller                         | Vertical         |
| `scroll(root inline)` | Document root scroller                         | Horizontal       |

### 4.3 Key Details

- **`@keyframes` percentages map to scroll progress**, not time. `0%` = scroll start. `100%` = scroll end.
- **`linear` timing function** — scroll position IS the timing. Using `ease` or `ease-in-out` makes scroll feel nonlinear and disconnected from user input.
- **`both` fill mode** — animation applies styles at both the start and end of the scroll range.

### 4.4 Named Scroll Timelines

For targeting a specific scroll container that isn't the nearest ancestor:

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

- `scroll-timeline-name` — custom identifier (must start with `--`).
- `scroll-timeline-axis` — `block` (vertical) or `inline` (horizontal).
- Use when animating an element based on a _different_ scroll container's progress.
- Named view timelines (`view-timeline-name`) follow the same pattern for view-based triggers.

### 4.5 `timeline-scope`

When the animated element is not a descendant of the scroll container that defines the named timeline, use `timeline-scope` on a common ancestor to make the timeline name visible across the DOM tree:

```css
.common-ancestor {
  timeline-scope: --my-timeline;
}

.scroll-container {
  scroll-timeline-name: --my-timeline;
}

.animated-element-elsewhere {
  animation-timeline: --my-timeline;
}
```

---

## 5. View Timeline — `animation-timeline: view()`

Ties animation progress to an element's visibility within the viewport (or scroll container). This is the most commonly used part of the API.

### 5.1 Syntax

```css
.element {
  animation: fade-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
```

### 5.2 `view()` Function Parameters

| Syntax         | Axis                        |
| -------------- | --------------------------- |
| `view()`       | Block (vertical) — default  |
| `view(block)`  | Vertical (explicit default) |
| `view(inline)` | Horizontal                  |

### 5.3 `animation-range` — The Critical Property

Controls **which part** of the element's visibility triggers the animation. Without `animation-range`, the animation runs across the entire visibility range (from the first pixel entering to the last pixel leaving).

#### Range Keywords

Each keyword describes a phase of the element's journey through the scrollport:

```
                    ┌─────────────────────────────┐
                    │         Scrollport           │
                    │         (viewport)           │
                    │                              │
  ─ ─ ─ ─ ─ ─ ─ ─ ┤ entry 0% ─ ─ ─ ─ ─ ─ ─ ─ ─ │ ← element's leading edge
                    │                              │     enters scrollport
      ENTRY         │   ↓ element entering ↓       │
                    │                              │
  ─ ─ ─ ─ ─ ─ ─ ─ ┤ entry 100% / contain 0%  ─ ─│ ← element fully inside
                    │                              │
      CONTAIN       │   element fully visible      │
                    │                              │
  ─ ─ ─ ─ ─ ─ ─ ─ ┤ contain 100% / exit 0%   ─ ─│ ← element starts leaving
                    │                              │
      EXIT          │   ↑ element exiting ↑        │
                    │                              │
  ─ ─ ─ ─ ─ ─ ─ ─ ┤ exit 100% ─ ─ ─ ─ ─ ─ ─ ─ ─│ ← element's trailing edge
                    │                              │     leaves scrollport
                    └─────────────────────────────┘

  ◄──────────────── cover 0% ─────── to ─────── cover 100% ──────────────►
  (first pixel visible)                          (last pixel leaving)
```

| Keyword          | Range Meaning                                                                         |
| ---------------- | ------------------------------------------------------------------------------------- |
| `entry`          | Element is entering the scrollport — from leading edge enters to trailing edge enters |
| `exit`           | Element is exiting the scrollport — from leading edge exits to trailing edge exits    |
| `cover`          | Full range — from first visible pixel to last visible pixel leaving                   |
| `contain`        | Element is fully contained within the scrollport                                      |
| `entry-crossing` | Element's leading edge crosses the scrollport entry boundary                          |
| `exit-crossing`  | Element's trailing edge crosses the scrollport exit boundary                          |

#### Range Percentages

Each keyword spans 0% to 100% of its phase:

- `entry 0%` — the very start of the element entering.
- `entry 100%` — the element has fully entered (equivalent to `contain 0%`).
- `cover 0%` — first pixel visible.
- `cover 50%` — halfway through the full visibility range.
- `cover 100%` — last pixel about to leave.

#### Combining Start and End

```css
/* Animation runs from start of entry to halfway through cover */
animation-range: entry 0% cover 50%;
```

#### Common Range Combinations

| Effect                                  | `animation-range`     | Description                                         |
| --------------------------------------- | --------------------- | --------------------------------------------------- |
| Fade in on enter                        | `entry 0% entry 100%` | Complete as element fully enters viewport           |
| Fade in during first half of visibility | `entry 0% cover 50%`  | Longer reveal, completes mid-viewport               |
| Full scroll-through                     | `cover 0% cover 100%` | Animates across entire visibility                   |
| Fade out on exit                        | `exit 0% exit 100%`   | Animates as element leaves viewport                 |
| Enter and exit                          | `cover 0% cover 100%` | Combined with multi-step keyframes (hold in middle) |

#### Longhand Properties

```css
/* Shorthand */
animation-range: entry 0% entry 100%;

/* Equivalent longhand */
animation-range-start: entry 0%;
animation-range-end: entry 100%;
```

### 5.4 `view-timeline-inset`

Adjusts the viewport detection boundaries inward. Useful when a sticky header or footer obscures part of the viewport.

```css
.element {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
  /* Shrink the detection zone: 80px from the top (e.g., sticky header height),
     0px from the bottom */
  view-timeline-inset: 80px 0px;
}
```

| Syntax                          | Meaning                                      |
| ------------------------------- | -------------------------------------------- |
| `view-timeline-inset: 80px`     | 80px inward from both edges                  |
| `view-timeline-inset: 80px 0px` | 80px from start (top), 0px from end (bottom) |
| `view-timeline-inset: auto`     | Default — no inset                           |

---

## 6. `@keyframes` for Scroll-Driven Animations

Standard CSS `@keyframes` syntax — but percentages map to scroll/view progress, not time.

### 6.1 Basic

```css
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 6.2 Multi-Step with Hold Zones

Percentages control pacing. A constant range (40%–60% in this example) creates a "hold" where the element stays fully visible while scroll continues.

```css
@keyframes reveal-sequence {
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

### 6.3 Key Details

- **Percentages = scroll progress**, not time. `50%` means "when scroll has reached 50% of the animation range."
- **Multi-step keyframes** create hold zones — element stays in a state while scroll continues through that percentage range.
- **Only `transform` and `opacity`** for scroll-driven animations — these run on the compositor thread. Animating `width`, `height`, `margin`, `padding`, `background-color` triggers layout or paint per frame.
- **`background-color`** is an exception for simple 2-stop transitions — it triggers paint, not layout, and the cost is negligible for a single element with 2 stops. Do not animate `background-color` across multiple elements or with 3+ stops.
- **`linear` timing function** — let keyframe percentages control pacing, not CSS easing. The user's scroll input is already the "easing."

---

## 7. Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .any-scroll-animated-element {
    animation: none;
  }
}
```

- `animation: none` removes the scroll-driven animation entirely.
- Because the default CSS state is the final (visible) state (per §3), the element is fully visible and accessible.
- Place the `@media` query inside or after the `@supports` block — both work. Placing it after is clearest.
- No JavaScript needed — pure CSS reduced motion handling.

---

## 8. Integration with Tailwind CSS and `globals.css`

### 8.1 Where Tailwind Works

- Setting the default (final) state: `opacity-100`, `translate-y-0`, etc.
- Container sizing, positioning, and all non-animation styling.

### 8.2 Where Custom CSS Is Needed

- `animation-timeline` — no Tailwind utility.
- `animation-range` — no Tailwind utility.
- `@keyframes` definitions.
- `stroke-dasharray`, `stroke-dashoffset` for SVG line-draws.

### 8.3 Integration Pattern

Tailwind handles the base styling. Custom CSS in `globals.css` handles the animation layer.

**Component (server component — no `'use client'` needed):**

```tsx
const RevealSection = () => (
  <div className='scroll-reveal translate-y-0 opacity-100'>
    <h2>Content visible by default</h2>
  </div>
)
```

**`globals.css`:**

```css
@layer utilities {
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

### 8.4 Why `globals.css` and Not CSS Modules

CSS Modules (`.module.css`) are forbidden per ADR-0002. All custom CSS for scroll-driven animations lives in `globals.css` within `@layer utilities`. This keeps animation CSS centralized and discoverable.

### 8.5 Next.js Integration

- **No `'use client'` needed** — pure CSS. Components using scroll-driven animations can be server components.
- **No hydration concerns** — no JavaScript to hydrate.
- **No `next/dynamic` needed** — no client-side bundle impact.
- **No build configuration** — CSS scroll-driven animations are standard CSS, handled by PostCSS/Tailwind toolchain.
- This is the only animation engine with zero JavaScript cost.

---

## Part 2 — Techniques

## 9. SVG Line-Draw Reveals

An SVG path "draws" itself as it scrolls into view. `stroke-dashoffset` animated from `1` to `0`, driven by `animation-timeline: view()`.

### 9.1 When to Use

- Architectural or technical illustrations that should feel hand-drawn.
- Annotation overlays on product imagery.
- Decorative borders or dividers that draw on scroll.
- Blueprint or schematic-style reveals.

### 9.2 When NOT to Use

- Complex SVGs with hundreds of paths — each needs its own animation, compositor overhead accumulates.
- SVGs that need fill before stroke completes with precise inter-path timing — use GSAP (ADR-0003) for sequenced multi-path orchestration.
- When the draw must synchronize with other elements in a shared scroll timeline — use GSAP.

### 9.3 The `pathLength="1"` Technique

Set `pathLength="1"` on the SVG `<path>` element. This normalizes the path's computed length to `1`, so `stroke-dasharray: 1` and `stroke-dashoffset: 1` always work regardless of the path's actual pixel length. **No `getTotalLength()` call needed. No JavaScript.**

```html
<svg viewBox="0 0 200 200" class="line-draw">
  <path pathLength="1" d="M10,80 C40,10 65,10 95,80 S150,150 180,80" />
</svg>
```

### 9.4 Implementation

```css
@layer utilities {
  /* Base state — line fully drawn (for unsupported browsers) */
  .line-draw path {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
    fill: transparent;
  }

  @supports (animation-timeline: scroll()) {
    .line-draw path {
      stroke-dashoffset: 0; /* final state remains drawn */
      animation: draw-line linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 50%;
    }
  }

  @keyframes draw-line {
    from {
      stroke-dashoffset: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .line-draw path {
      animation: none;
      stroke-dashoffset: 0;
    }
  }
}
```

### 9.5 Without `pathLength`

If `pathLength="1"` cannot be set on the SVG (e.g., third-party SVG, CMS-delivered), measure the path length with JavaScript on mount and set CSS custom properties. The animation itself is still pure CSS.

```tsx
'use client'

import { useEffect, useRef } from 'react'

const MeasuredLineDraw = () => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const paths = svgRef.current?.querySelectorAll('path')
    paths?.forEach((path) => {
      const length = path.getTotalLength()
      path.style.setProperty('--path-length', String(length))
      path.style.strokeDasharray = String(length)
      path.style.strokeDashoffset = String(length)
    })
  }, [])

  return (
    <svg ref={svgRef} className='line-draw-measured'>
      ...
    </svg>
  )
}
```

```css
@supports (animation-timeline: scroll()) {
  .line-draw-measured path {
    animation: draw-measured linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 50%;
  }
}

@keyframes draw-measured {
  to {
    stroke-dashoffset: 0;
  }
}
```

This is the only CSS scroll-driven animation pattern that may require a small amount of setup JavaScript. The animation itself runs entirely on the compositor. Prefer `pathLength="1"` for true zero-JS.

### 9.6 Staggered Multiple Paths

Stagger multiple paths by offsetting their `animation-range` using `:nth-child`:

```css
@supports (animation-timeline: scroll()) {
  .line-draw path:nth-child(1) {
    animation-range: entry 0% cover 30%;
  }
  .line-draw path:nth-child(2) {
    animation-range: entry 20% cover 50%;
  }
  .line-draw path:nth-child(3) {
    animation-range: entry 40% cover 70%;
  }
}
```

Each path starts drawing at a different scroll position, creating a cascading reveal effect. Limited to small numbers of paths (3–6). For dozens of paths with precise orchestration, use GSAP (ADR-0003).

### 9.7 Stroke-Then-Fill

Draw the stroke, then fade in the fill:

```css
@keyframes draw-and-fill {
  0% {
    stroke-dashoffset: 1;
    fill-opacity: 0;
  }
  70% {
    stroke-dashoffset: 0;
    fill-opacity: 0;
  }
  100% {
    stroke-dashoffset: 0;
    fill-opacity: 1;
  }
}
```

The hold zone at 70% (stroke complete, fill still `0`) creates the visual sequence: line draws, then fill appears.

### 9.8 Variations

| Variation          | How                                                              |
| ------------------ | ---------------------------------------------------------------- |
| Partial draw       | Animate to `stroke-dashoffset` > 0 (e.g., `0.3`) to stop partway |
| Reverse draw       | `animation-direction: reverse` to "undraw" on scroll             |
| Draw speed control | Adjust `animation-range` — wider range = slower perceived draw   |

### 9.9 Accessibility

- SVG line-draw is decorative — the visual draw effect adds no semantic meaning.
- Content conveyed by the SVG should be in text form elsewhere, or the SVG should have an `aria-label` or `<title>`.
- Reduced motion: line appears fully drawn (no animation).

---

## 10. Viewport Entrance Reveals

Simple fade, scale, or translate when an element enters the viewport.

### 10.1 When to Use

- Content blocks fading in on scroll.
- Cards, images, text sections entering with subtle motion.
- Any "appear on scroll" effect without spring physics or precise stagger timing.

### 10.2 When NOT to Use

- Precise stagger across siblings with spring physics — use Motion `whileInView` + variants (ADR-0030).
- Coordination with other elements in a shared scroll timeline — use GSAP (ADR-0003).
- When the reveal needs to respond to React state — use Motion.

### 10.3 Fade Up

```css
@layer utilities {
  .reveal-up {
    opacity: 1;
    transform: translateY(0);
  }

  @supports (animation-timeline: scroll()) {
    .reveal-up {
      animation: reveal-up linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 100%;
    }
  }

  @keyframes reveal-up {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .reveal-up {
      animation: none;
    }
  }
}
```

### 10.4 Directional Variants

```css
@keyframes reveal-down {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
}

@keyframes reveal-left {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
}

@keyframes reveal-right {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
}

@keyframes reveal-scale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
}

@keyframes reveal-scale-up {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
}
```

### 10.5 Range Tuning

| `animation-range`     | Effect                                                   |
| --------------------- | -------------------------------------------------------- |
| `entry 0% entry 100%` | Completes as element fully enters viewport (default)     |
| `entry 0% entry 80%`  | Completes slightly before fully entered — feels snappier |
| `entry 0% cover 30%`  | Completes later — longer, more gradual reveal            |
| `cover 0% cover 40%`  | Reveal during first portion of full visibility           |

### 10.6 Fire-and-Forget Behavior

View timeline reveals are inherently fire-and-forget when using `entry` range — the animation completes when the element enters, and the element stays in its final state. If the user scrolls back up and the element leaves the viewport, the animation reverses (element becomes invisible again), and re-plays on the next scroll down. This is the expected behavior for view timeline reveals.

### 10.7 CSS-Only Stagger Approximation

Approximate stagger across sibling elements by offsetting `animation-range` with `:nth-child`:

```css
@supports (animation-timeline: scroll()) {
  .stagger-item {
    animation: reveal-up linear both;
    animation-timeline: view();
  }

  .stagger-item:nth-child(1) {
    animation-range: entry 0% entry 80%;
  }
  .stagger-item:nth-child(2) {
    animation-range: entry 10% entry 90%;
  }
  .stagger-item:nth-child(3) {
    animation-range: entry 20% entry 100%;
  }
  .stagger-item:nth-child(4) {
    animation-range: entry 30% cover 10%;
  }
}
```

**Limitations:**

- Works only when items enter the viewport as a group (siblings in the same scroll region).
- Limited to small numbers (3–6 items).
- Items far apart vertically each trigger `view()` independently — stagger effect breaks.
- For precise stagger timing or dynamic lists, use Motion variants with `staggerChildren` (ADR-0030).

### 10.8 Accessibility

- Reveals are decorative motion — content is in the DOM and accessible to screen readers regardless of animation state.
- Reduced motion: element appears in final state immediately, no animation.
- Never hide critical content behind `opacity: 0` without the `@supports` gate — unsupported browsers would see nothing.

---

## 11. Progress Indicators

A bar, line, or shape that fills proportionally to scroll progress.

### 11.1 When to Use

- Reading progress on article or long-form pages.
- Section progress within a long page section.
- Scroll position indicator in navigation.

### 11.2 When NOT to Use

- Progress indicator that must respond to JS events (loading progress, upload) — use CSS transitions or Motion.
- Progress synchronized with other animated elements — use GSAP.

### 11.3 Horizontal Reading Progress Bar

```css
@layer utilities {
  .reading-progress {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: rgb(var(--foreground));
    transform-origin: left;
    transform: scaleX(1);
    z-index: 50;
  }

  @supports (animation-timeline: scroll()) {
    .reading-progress {
      transform: scaleX(0); /* start collapsed — only in supported browsers */
      animation: fill-bar linear both;
      animation-timeline: scroll(root);
    }
  }

  @keyframes fill-bar {
    to {
      transform: scaleX(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .reading-progress {
      animation: none;
      transform: scaleX(1); /* snap to full — or hide entirely */
    }
  }
}
```

### 11.4 Key Details

- `scroll(root)` for page-level progress, `scroll(nearest)` for container-level.
- `scaleX` instead of `width` — `scaleX` runs on the compositor, `width` triggers layout per frame.
- `transform-origin: left` — bar grows from left to right.

### 11.5 Variations

| Variation         | Implementation                                                      |
| ----------------- | ------------------------------------------------------------------- |
| Vertical progress | `scaleY` with `transform-origin: bottom`                            |
| Circular progress | SVG `<circle>` with `stroke-dashoffset` driven by `scroll(root)`    |
| Section-scoped    | Named scroll timeline on specific container                         |
| Gradient fill     | Animate `background-position` or use `scaleX` on a gradient element |

### 11.6 Accessibility

- Progress bar is decorative — it conveys scroll position visually. Screen readers have their own scroll indication.
- If the progress bar conveys meaningful information (e.g., reading progress for a course), add `role="progressbar"` and update `aria-valuenow` via minimal JavaScript.
- Reduced motion: show the bar at full width (or hide it).

---

## 12. Single-Element Parallax

A single element translating at a different rate than scroll, creating a subtle depth effect.

### 12.1 When to Use

- Background image drifting slower than content.
- Decorative element floating alongside content.
- Single hero image with a subtle depth shift.

### 12.2 When NOT to Use

- Multiple layers at different parallax rates — use GSAP (ADR-0003) with multi-layer parallax.
- Parallax intensity computed from JS state or responsive breakpoints — use GSAP with `gsap.matchMedia()`.

### 12.3 Implementation

```css
@layer utilities {
  @supports (animation-timeline: scroll()) {
    .parallax-slow {
      animation: parallax-shift linear both;
      animation-timeline: scroll();
    }
  }

  @keyframes parallax-shift {
    from {
      transform: translateY(-40px);
    }
    to {
      transform: translateY(40px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .parallax-slow {
      animation: none;
    }
  }
}
```

### 12.4 Variations

| Variation       | How                                                                       |
| --------------- | ------------------------------------------------------------------------- |
| Subtle          | `±40px` translation range                                                 |
| Dramatic        | `±100px` translation range                                                |
| Viewport-scoped | `animation-timeline: view()` — parallax only while element is in viewport |
| Depth fade      | Combine `translateY` with opacity: dim as element moves away              |

### 12.5 Accessibility

- Parallax is purely decorative. Content is fully accessible at any scroll position.
- Reduced motion: no parallax, element stays in place.

---

## 13. Background Color / Opacity Transitions

Simple background or opacity shift — two stops maximum. Scroll-linked mood transitions.

### 13.1 When to Use

- Section background theme transition on scroll.
- Overlay darkening as content scrolls under a header.
- Two-tone color shift between sections.

### 13.2 When NOT to Use

- 3+ color stops with precise timing — use GSAP (ADR-0003).
- Color coordinating with other animated elements in a shared timeline.

### 13.3 Implementation

```css
@layer utilities {
  .section-transition {
    background-color: rgb(var(--foreground));
  }

  @supports (animation-timeline: scroll()) {
    .section-transition {
      animation: bg-shift linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 50%;
    }
  }

  @keyframes bg-shift {
    from {
      background-color: rgb(var(--background));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .section-transition {
      animation: none;
    }
  }
}
```

### 13.4 Key Details

- **`background-color` is main thread** (paint, not compositor) — but with 2 stops on a single element, the cost is negligible.
- Opacity on overlays: animate from `opacity: 0` to `opacity: 0.7` tied to `scroll()` for a lens-darkening effect.
- **WCAG AA contrast** must be met at both the start and end color states — and at every intermediate state. Test the midpoint.
- Reduced motion: snap to final color, no animated transition.

---

## 14. SVG Annotation Overlays

Combining SVG line-draw with positioned labels — callout lines draw to labeled points on imagery.

### 14.1 When to Use

- Product detail pages with feature callouts.
- Technical diagrams with labeled components.
- Brochure-style annotation reveals on imagery.

### 14.2 When NOT to Use

- Complex multi-step choreography where line, label, AND image must animate together — use GSAP.
- Annotations that need to respond to hover or click — add Motion gesture handlers (ADR-0030) to the labels.

### 14.3 Structure

```html
<div class="annotation-container relative">
  <img src="product.jpg" alt="Product overview" class="w-full" />

  <!-- SVG overlay — viewBox matches image aspect ratio -->
  <svg viewBox="0 0 1200 800" class="annotation-svg absolute inset-0 h-full w-full">
    <path pathLength="1" class="annotation-path" d="M200,400 L400,200" />
    <path pathLength="1" class="annotation-path" d="M800,500 L600,300" />
  </svg>

  <!-- HTML labels positioned over the SVG endpoints -->
  <div class="annotation-label absolute" style="top: 20%; left: 30%">Feature A</div>
  <div class="annotation-label absolute" style="top: 33%; left: 48%">Feature B</div>
</div>
```

### 14.4 Implementation

```css
@layer utilities {
  /* Base — annotations visible (unsupported browsers) */
  .annotation-path {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
    fill: none;
  }

  .annotation-label {
    opacity: 1;
  }

  @supports (animation-timeline: scroll()) {
    /* Lines draw first */
    .annotation-path {
      animation: draw-line linear both;
      animation-timeline: view();
    }

    .annotation-path:nth-child(1) {
      animation-range: entry 0% cover 30%;
    }
    .annotation-path:nth-child(2) {
      animation-range: entry 20% cover 50%;
    }

    /* Labels fade in after their lines */
    .annotation-label {
      animation: fade-in linear both;
      animation-timeline: view();
    }

    .annotation-label:nth-child(1) {
      animation-range: cover 25% cover 45%;
    }
    .annotation-label:nth-child(2) {
      animation-range: cover 45% cover 65%;
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .annotation-path,
    .annotation-label {
      animation: none;
    }
  }
}
```

### 14.5 Key Details

- **SVG must be inline** for CSS targeting — `<img src="diagram.svg">` won't work.
- **SVG `viewBox`** matches the image dimensions. SVG positioned with `position: absolute; inset: 0` scales with the image.
- **Responsive:** SVG scales proportionally with the container. Labels use percentage positioning.
- **Sequencing** via offset `animation-range` — lines draw before their labels appear.
- **Mobile:** On small screens, consider showing all annotations statically (no animation, all visible) or using a simplified feature list instead of spatial annotations.

### 14.6 Accessibility

- Annotation labels should be semantic HTML (not SVG `<text>`) for screen reader compatibility.
- The image should have descriptive `alt` text that conveys the product features, not just "product photo."
- All labeled features should be available as text content — annotations are the visual layer, not the only way to access the information.
- Reduced motion: all lines drawn, all labels visible.

---

## Part 3 — Production Patterns

## 15. Mobile Considerations

- CSS scroll-driven animations **work on supporting mobile browsers** — no touch or momentum scroll issues. The browser handles the scroll-to-animation-progress mapping.
- **Viewport reveals** (§10) work well on mobile — the safest technique across all devices.
- **Heavy SVG line-draws** with many paths: consider hiding decorative paths on mobile via `display: none` at small breakpoints. The line-draw effect is less impactful on small screens.
- **Progressive enhancement** already handles unsupported mobile browsers — content is visible, animation is a bonus.
- **No touch-specific concerns** — unlike GSAP ScrollTrigger or JS-based scroll listeners, CSS scroll-driven animations don't interfere with native scroll momentum or rubber-banding.

---

## 16. Composition with Other Engines

One animation engine per DOM element. Engines coexist at the **section level** — parent/child, not sibling-on-same-element.

### 16.1 Common Composition Patterns

| Pattern                                                              | How                                                                                                                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GSAP pins section → CSS handles SVG line-draws inside                | GSAP controls the pinned container, CSS animates child `<path>` elements with `view()`                                                                                               |
| GSAP drives scroll timeline → CSS handles progress bar independently | Both respond to scroll, but on separate elements — no conflict                                                                                                                       |
| Motion handles hover states → CSS handles viewport entrance reveal   | Motion on pointer interaction, CSS on scroll visibility — different triggers, same element is safe only if CSS handles the initial reveal and Motion handles hover on a nested child |
| Motion handles mount/unmount → CSS handles scroll parallax           | AnimatePresence on the element lifecycle, CSS parallax on a child image                                                                                                              |

### 16.2 Rules

- CSS runs on the compositor — it doesn't interfere with GSAP or Motion executing on the main thread.
- **Do not** put `animation-timeline` on an element GSAP is also transforming — both write to `transform`, last write wins.
- **Do not** put `animation-timeline` on an element Motion is also animating — same conflict.
- Parent can be GSAP/Motion-controlled, child can be CSS-animated. This is the safe pattern.
- No cleanup needed — CSS animations are tied to the element lifecycle. When the element leaves the DOM, the animation stops.

---

## 17. Anti-Patterns

| Don't                                                                 | Why                                                                                          | Do Instead                                                                              |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Default to `opacity: 0` without `@supports` gate                      | Element invisible in unsupported browsers — content is gated behind animation                | Default = visible (`opacity: 1`). Animation starts from `opacity: 0` inside `@supports` |
| Use `ease-in-out` on scroll-driven animation                          | Scroll feels nonlinear — user moves scrollbar linearly but animation accelerates/decelerates | Use `linear` — scroll position IS the timing                                            |
| Use `scroll()` for viewport entrance reveals                          | Tracks entire page scroll range, not element visibility                                      | Use `view()` with `animation-range` for element-level reveals                           |
| Animate `width`, `height`, `margin`, `padding`                        | Layout recalculation per scroll frame — jank                                                 | Use `transform` and `opacity` only                                                      |
| Skip `@supports` wrapper                                              | Broken or invisible elements in unsupported browsers                                         | Always wrap scroll-driven animations in `@supports (animation-timeline: scroll())`      |
| Guess `stroke-dasharray` value for SVG                                | Wrong draw length — path draws partially or overflows                                        | Use `pathLength="1"` on the `<path>` element                                            |
| Use for multi-element choreography                                    | No shared scroll timeline across elements — each animates independently                      | Use GSAP ScrollTrigger (ADR-0003) for choreographed scroll scenes                       |
| Add a JavaScript polyfill                                             | Adds JS bundle cost to a zero-JS feature — defeats the purpose                               | Progressive enhancement — no polyfill                                                   |
| Animate dozens of elements simultaneously                             | Compositor overhead accumulates — frame drops on low-end devices                             | Limit to meaningful reveals — 5–10 simultaneously visible animated elements max         |
| Skip reduced motion handling                                          | WCAG 2.3.3 violation — some users experience nausea or disorientation from motion            | Add `@media (prefers-reduced-motion: reduce)` → `animation: none`                       |
| Use CSS Modules (`.module.css`) for animation CSS                     | Forbidden per ADR-0002                                                                       | Use `globals.css` within `@layer utilities`                                             |
| Put `animation-timeline` on an element GSAP or Motion also transforms | Transform conflict — last write wins, animation breaks                                       | Animate child elements with CSS, let GSAP/Motion control the parent                     |

---

## 18. Scope Boundary

### 18.1 CSS Scroll-Driven Animations Handle

- SVG line-draw reveals (`stroke-dashoffset` driven by `view()`)
- SVG annotation overlays with sequenced line-draws and label fades
- Reading progress indicators (`scaleX` driven by `scroll(root)`)
- Viewport entrance reveals (fade, scale, translate on `view()`)
- Single-element parallax (translate driven by `scroll()` or `view()`)
- Background color/opacity transitions (≤2 stops)
- CSS-only approximate stagger (`:nth-child` + offset `animation-range`)
- Any single-element scroll-linked CSS `@keyframes` effect

### 18.2 CSS Scroll-Driven Animations Do NOT Handle

| What                                               | Use Instead                                                     |
| -------------------------------------------------- | --------------------------------------------------------------- |
| Spring physics                                     | Motion (ADR-0030) — springs compute on main thread              |
| Multi-element choreography with shared timing      | GSAP ScrollTrigger (ADR-0003) — shared timeline                 |
| Pinned/sticky scroll sections                      | GSAP ScrollTrigger (ADR-0003) — `pin: true`                     |
| Horizontal scroll driven by vertical scroll        | GSAP ScrollTrigger (ADR-0003)                                   |
| Video scrubbing tied to scroll                     | GSAP ScrollTrigger (ADR-0003)                                   |
| Runtime conditional animation logic                | GSAP or Motion with JS logic                                    |
| Dynamic JS-computed animation ranges               | GSAP with `gsap.matchMedia()` or JS                             |
| Per-word/per-line text reveal with stagger         | GSAP (ADR-0003) §20 — requires text splitting + precise stagger |
| Multi-layer parallax (3+ layers)                   | GSAP (ADR-0003) — shared scrubbed timeline                      |
| 3+ stop background transitions with precise timing | GSAP (ADR-0003) — timeline with multiple color tweens           |
| React state-driven animations                      | Motion (ADR-0030) — `animate` prop responds to state            |
| Mount/unmount transitions                          | Motion (ADR-0030) — `AnimatePresence`                           |
| Layout animations / FLIP                           | Motion (ADR-0030) — `layout` prop                               |

### 18.3 Decision Tree: Which Engine?

```
Is the effect a CSS keyframe animation tied to scroll position?
├── YES: Does it need spring physics?
│   ├── YES → Motion (ADR-0030)
│   └── NO: Does it need shared timing across multiple elements?
│       ├── YES → GSAP ScrollTrigger (ADR-0003)
│       └── NO: Does it need pinning or horizontal scroll?
│           ├── YES → GSAP ScrollTrigger (ADR-0003)
│           └── NO: Is it a single-element transform/opacity/SVG effect?
│               ├── YES → CSS Scroll-Driven Animations (this ADR)
│               └── NO → Evaluate: GSAP for scroll scenes, Motion for React lifecycle
└── NO: Is it React lifecycle (mount/unmount/state/gesture)?
    ├── YES → Motion (ADR-0030)
    └── NO → GSAP or standard CSS transitions
```

---

## Consequences

**Positive:**

- Every CSS scroll-driven animation technique has a documented implementation pattern — agents produce consistent zero-JS animations.
- Progressive enhancement strategy ensures content is never gated behind browser support.
- Zero JavaScript, zero main-thread cost, zero bundle size — the lightest animation path available.
- Scope boundary clearly delineates CSS (compositor-eligible) vs GSAP (scroll-driven orchestration) vs Motion (React lifecycle) — no engine overlap.
- Server components can use scroll-driven animations — no `'use client'` boundary needed.
- Anti-patterns table catches the most common production mistakes before code review.
- `pathLength="1"` technique eliminates the need for JavaScript measurement in SVG line-draw animations.

**Negative:**

- ~83% browser support means ~17% of users see no animation — acceptable for progressive enhancement, not for critical UI behavior.
- Firefox does not support the API by default — users must enable a flag. Firefox users see static content.
- No spring physics — effects are limited to linear scroll-mapped CSS keyframes. Spring-like motion requires Motion.
- No shared timeline across elements — each element's `view()` timeline is independent, limiting multi-element coordination.
- All animation CSS centralised in `globals.css` — can grow large if many scroll-driven animations are used. Organize with CSS comments.
- `animation-range` is conceptually complex — the entry/exit/cover/contain model requires understanding the physical relationship between element and viewport.
- Stagger approximation with `:nth-child` is fragile — only works for small groups entering together.

## Related ADRs

- [ADR-0002](./0002-styling.md) — Styling (Tailwind-only, `globals.css` for custom CSS, no CSS Modules, no CSS-in-JS)
- [ADR-0003](./0003-gsap-scroll-driven-animation.md) — GSAP & ScrollTrigger (scroll-driven orchestration engine, scope boundary delineation)
- [ADR-0004](./0004-components.md) — Component Structure (server component default — CSS animations don't require `'use client'`)
- [ADR-0018](./0018-performance-platform.md) — Performance (compositor-thread animations, Core Web Vitals)
- [ADR-0019](./0019-accessibility.md) — Accessibility (WCAG 2.2, reduced motion compliance, `prefers-reduced-motion`)
- [ADR-0030](./0030-motion-react-animation.md) — Motion (React lifecycle and interaction engine, scope boundary delineation)
