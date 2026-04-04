---
name: scroll-driven-animation-techniques
description: >-
  CSS Scroll-Driven Animation technique implementations — SVG line-draw reveals
  with `pathLength="1"` (staggered multi-path, stroke-then-fill, measured JS
  fallback), viewport entrance reveals with directional variants (fade-up/down/left/
  right/scale) and CSS-only stagger via `:nth-child` + offset `animation-range`,
  reading progress bar with `scaleX` + `scroll(root)`, single-element parallax,
  background color/opacity transitions (≤2 stops), SVG annotation overlays with
  sequenced line-draws and label fades, mobile considerations, cross-engine
  composition rules (one engine per DOM element), 12-entry anti-patterns table.
  Use when implementing SVG line-draw animations, building scroll reveal effects,
  creating reading progress indicators, adding parallax to a single element,
  building annotation overlays on imagery, or reviewing CSS scroll animation code
  for production anti-patterns.
---

# CSS Scroll-Driven Animations — Techniques

**Compiled from**: ADR-0034 §9–§17 (Techniques, Production Patterns, Anti-Patterns)
**Last synced**: 2026-04-04

---

## SVG Line-Draw Reveals

An SVG path "draws" itself as it scrolls into view via `stroke-dashoffset` driven by `animation-timeline: view()`.

**When to use:** Architectural/technical illustrations, annotation overlays, decorative dividers, blueprint-style reveals.

**When NOT to use:** SVGs with many paths needing precise inter-path timing → use GSAP. When the draw must synchronize across a shared timeline → use GSAP.

### `pathLength="1"` Technique

Set `pathLength="1"` on the `<path>` element. This normalizes the path's computed length to `1`, so `stroke-dasharray: 1` / `stroke-dashoffset: 1` always work regardless of actual pixel length. **No `getTotalLength()` call, no JavaScript.**

```html
<svg viewBox="0 0 200 200" class="line-draw">
  <path pathLength="1" d="M10,80 C40,10 65,10 95,80 S150,150 180,80" />
</svg>
```

```css
@layer utilities {
  /* Base state — line fully drawn in all browsers */
  .line-draw path {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
    fill: transparent;
  }

  @supports (animation-timeline: scroll()) {
    .line-draw path {
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

### Staggered Multiple Paths

Offset `animation-range` per `:nth-child` for a cascading reveal. Limit to 3–6 paths.

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

### Stroke-Then-Fill

```css
@keyframes draw-and-fill {
  0% {
    stroke-dashoffset: 1;
    fill-opacity: 0;
  }
  70% {
    stroke-dashoffset: 0;
    fill-opacity: 0;
  } /* stroke done, fill held */
  100% {
    stroke-dashoffset: 0;
    fill-opacity: 1;
  }
}
```

### Without `pathLength` (Third-Party SVGs)

When `pathLength="1"` cannot be set, measure with JavaScript on mount. The animation still runs on the compositor.

```tsx
'use client'
import { useEffect, useRef } from 'react'

const MeasuredLineDraw = () => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    svgRef.current?.querySelectorAll('path').forEach((path) => {
      const length = path.getTotalLength()
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

**Accessibility:** SVG line-draw is decorative. Content conveyed by the illustration must be available as text or via `aria-label` / `<title>`. Reduced motion: line appears fully drawn.

---

## Viewport Entrance Reveals

Fade, scale, or translate when an element enters the viewport.

**When to use:** Content blocks, cards, images, text sections appearing on scroll.

**When NOT to use:** Precise stagger with spring physics → use Motion `whileInView` + variants. Coordination across a shared scroll timeline → use GSAP.

### Fade Up (Reference Implementation)

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

### Directional Variants

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

### Range Tuning

| `animation-range`     | Effect                                             |
| --------------------- | -------------------------------------------------- |
| `entry 0% entry 100%` | Completes as element fully enters (default)        |
| `entry 0% entry 80%`  | Completes slightly before fully entered — snappier |
| `entry 0% cover 30%`  | Longer, more gradual reveal                        |
| `cover 0% cover 40%`  | Reveal during first portion of full visibility     |

### CSS-Only Stagger Approximation

For siblings entering the viewport as a group. Limit to 3–6 items. Items far apart vertically break the stagger effect.

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

For precise stagger or dynamic lists, use Motion variants with `staggerChildren`.

**Fire-and-forget behavior:** View timeline reveals reverse when the user scrolls back up (element hides) and replay on next scroll down. This is expected.

**Accessibility:** Content is in the DOM at all times — screen readers are unaffected. Never hide critical content behind `opacity: 0` without the `@supports` gate.

---

## Reading Progress Indicator

A bar that fills proportionally to page scroll progress.

**When to use:** Reading progress on article/long-form pages, section progress indicators.

**When NOT to use:** Progress tied to JS events (loading, upload) → use CSS transitions or Motion.

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
      transform: scaleX(0);
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
      transform: scaleX(1);
    }
  }
}
```

**Key details:** `scroll(root)` for page-level, `scroll(nearest)` for container-level. Use `scaleX` not `width` — `scaleX` runs on the compositor. `transform-origin: left` grows left to right.

If the bar conveys meaningful information (e.g., course reading progress), add `role="progressbar"` and update `aria-valuenow` via minimal JavaScript.

---

## Single-Element Parallax

A single element translating at a different rate than scroll.

**When to use:** Background image drifting slower than content, decorative floating element, hero image depth shift.

**When NOT to use:** Multiple layers at different rates → GSAP multi-layer parallax. Intensity varies by breakpoint → GSAP with `gsap.matchMedia()`.

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

Subtle: `±40px`. Dramatic: `±100px`. Viewport-scoped: `animation-timeline: view()`.

---

## Background Color / Opacity Transitions

Simple two-stop scroll-linked mood transition.

**When to use:** Section background theme shift, overlay darkening, two-tone color transition.

**When NOT to use:** 3+ color stops with precise timing → GSAP. Coordinated with other animated elements in a shared timeline.

```css
@layer utilities {
  .section-transition {
    background-color: rgb(var(--foreground)); /* final state */
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

`background-color` is main-thread (paint), but with 2 stops on a single element, cost is negligible. WCAG AA contrast must be met at both start and end — and at the midpoint.

---

## SVG Annotation Overlays

Callout lines draw to labeled points on imagery.

**When to use:** Product detail callouts, technical diagrams, brochure-style annotation reveals.

**When NOT to use:** Line + label + image need to animate together with precise shared timing → GSAP. Labels need hover/click interaction → add Motion gesture handlers to labels.

```html
<div class="annotation-container relative">
  <img
    src="product.jpg"
    alt="Product with feature callouts — Feature A at top-left, Feature B at center"
  />

  <!-- SVG must be inline for CSS targeting -->
  <svg viewBox="0 0 1200 800" class="annotation-svg absolute inset-0 h-full w-full">
    <path pathLength="1" class="annotation-path" d="M200,400 L400,200" />
    <path pathLength="1" class="annotation-path" d="M800,500 L600,300" />
  </svg>

  <!-- Semantic HTML labels (not SVG <text>) for screen reader compatibility -->
  <div class="annotation-label absolute" style="top: 20%; left: 30%">Feature A</div>
  <div class="annotation-label absolute" style="top: 33%; left: 48%">Feature B</div>
</div>
```

```css
@layer utilities {
  /* Base — all visible */
  .annotation-path {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
    fill: none;
  }
  .annotation-label {
    opacity: 1;
  }

  @supports (animation-timeline: scroll()) {
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

    .annotation-label {
      animation: fade-in linear both;
      animation-timeline: view();
    }
    /* Labels fade after their corresponding lines */
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

**Key details:** SVG must be inline (not `<img src="*.svg">`). SVG `viewBox` matches image dimensions. Labels use percentage positioning for responsiveness. On mobile, consider showing all annotations statically or using a feature list instead.

---

## Mobile Considerations

- CSS scroll-driven animations work on supporting mobile browsers with no touch/momentum scroll issues.
- Viewport reveals (fade/scale) are the safest technique across all devices.
- Heavy SVG line-draws with many paths: consider `display: none` at small breakpoints — the effect is less impactful on small screens.
- Progressive enhancement already handles unsupported mobile browsers — content is visible.
- No touch-specific concerns — unlike JS scroll listeners, CSS scroll-driven animations don't interfere with native scroll momentum.

---

## Composition with Other Engines

**One animation engine per DOM element.** Engines coexist at the section level — parent/child, not same-element.

| Pattern                                               | How                                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| GSAP pins section → CSS animates SVG paths inside     | GSAP controls pinned container, CSS animates child `<path>` with `view()`  |
| Motion handles hover → CSS handles viewport reveal    | Different triggers; CSS on outer element, Motion on a nested overlay child |
| Motion handles mount/unmount → CSS handles parallax   | AnimatePresence on element lifecycle, CSS parallax on a child image        |
| GSAP scroll timeline → CSS progress bar independently | Separate elements, no conflict                                             |

**Rules:**

- `animation-timeline` + GSAP/Motion transforms on the **same element** conflict — both write to `transform`, last write wins.
- Parent can be GSAP/Motion-controlled, child can be CSS-animated. This is the safe pattern.
- No cleanup needed — CSS animations stop when the element leaves the DOM.
- CSS runs on the compositor and does not interfere with GSAP or Motion executing on the main thread.

---

## Anti-Patterns

| Don't                                                          | Why                                                                   | Do Instead                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Default to `opacity: 0` without `@supports`                    | Content invisible in unsupported browsers                             | Default = visible. `opacity: 0` only inside `@supports` keyframes   |
| Use `ease-in-out` on scroll-driven animation                   | Scroll feels nonlinear — animation accelerates while scroll is linear | Use `linear`                                                        |
| Use `scroll()` for viewport entrance reveals                   | Tracks entire page, not element visibility                            | Use `view()` with `animation-range`                                 |
| Animate `width`, `height`, `margin`, `padding`                 | Layout recalculation per scroll frame — jank                          | Use `transform` and `opacity` only                                  |
| Skip `@supports` wrapper                                       | Broken or invisible elements in unsupported browsers                  | Always wrap                                                         |
| Guess `stroke-dasharray` value for SVG                         | Wrong draw length — partial or overflowing draw                       | Use `pathLength="1"` on the `<path>`                                |
| Use for multi-element choreography                             | No shared timeline across elements                                    | Use GSAP ScrollTrigger                                              |
| Add a JavaScript polyfill                                      | Adds JS bundle cost to a zero-JS feature                              | Progressive enhancement — no polyfill                               |
| Animate dozens of elements simultaneously                      | Compositor overhead accumulates on low-end devices                    | Limit to 5–10 simultaneously visible animated elements              |
| Skip reduced motion handling                                   | WCAG 2.3.3 violation                                                  | Add `@media (prefers-reduced-motion: reduce)` → `animation: none`   |
| Use CSS Modules for animation CSS                              | Forbidden — all custom CSS in `globals.css`                           | `globals.css` within `@layer utilities`                             |
| `animation-timeline` on an element GSAP/Motion also transforms | Transform conflict — last write wins                                  | Animate child elements with CSS, let GSAP/Motion control the parent |
