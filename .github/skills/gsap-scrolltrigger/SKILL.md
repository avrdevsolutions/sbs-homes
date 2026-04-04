---
name: gsap-scrolltrigger
description: >-
  GSAP ScrollTrigger configuration — full property table, start/end position format,
  standalone ScrollTrigger (callback-only pattern), scrub values decision table (true vs
  0.5/1/2), pin behavior (how it works, pinSpacing, anticipatePin, pin gotchas), snap
  patterns (value/array/labels), responsive breakpoints and prefers-reduced-motion via
  gsap.matchMedia(), ScrollTrigger.refresh() rules. Use when configuring a ScrollTrigger
  animation, setting up pinned sections, adding scrub or snap behavior, handling reduced
  motion compliance, or debugging trigger positions.
---

# GSAP — ScrollTrigger Configuration

**Compiled from**: ADR-0003 §6–10 (ScrollTrigger, Scrub, Pin, Snap, gsap.matchMedia)
**Last synced**: 2026-04-04

---

## ScrollTrigger — Basic Setup

```tsx
gsap.to('.hero-image', {
  scale: 0.8,
  scrollTrigger: {
    trigger: '.hero-section',
    start: 'top top',
    end: 'bottom top',
    scrub: 1,
  },
})
```

---

## Configuration Properties

| Property              | Type                                    | What it does                                                                     |
| --------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| `trigger`             | `string \| Element \| Ref`              | Element whose position defines the scroll range                                  |
| `start`               | `string`                                | When animation begins — `'triggerPos viewportPos'`                               |
| `end`                 | `string \| number \| function`          | When animation ends — same format as start                                       |
| `scrub`               | `boolean \| number`                     | Link animation progress to scroll. `true` = instant, number = smoothing seconds  |
| `pin`                 | `boolean \| string \| Element`          | Pin the trigger element in viewport during animation range                       |
| `pinSpacing`          | `boolean \| 'margin'`                   | Add spacing after pinned element (default `true`)                                |
| `snap`                | `number \| array \| object \| 'labels'` | Snap to progress values when scrolling stops                                     |
| `markers`             | `boolean \| object`                     | Show debug markers during development — MUST remove before production            |
| `toggleActions`       | `string`                                | `'enter leave enterBack leaveBack'` actions (e.g., `'play pause resume reset'`)  |
| `toggleClass`         | `string \| object`                      | Add/remove CSS class when active                                                 |
| `once`                | `boolean`                               | Kill after first trigger — for one-shot viewport reveals                         |
| `anticipatePin`       | `number`                                | Use `1` to prevent flash on fast scroll to pinned sections                       |
| `invalidateOnRefresh` | `boolean`                               | Flush cached start values on resize — required for dynamic content               |
| `pinReparent`         | `boolean`                               | Reparent pinned element to `<body>` to escape ancestor `transform`/`will-change` |
| `pinnedContainer`     | `Element`                               | Set when trigger is inside another pinned section — correct position calc        |

**Callbacks:** `onUpdate`, `onEnter`, `onLeave`, `onEnterBack`, `onLeaveBack`, `onRefresh`, `onScrubComplete`, `onSnapComplete`

---

## start / end Position Format

Two-part string: `'triggerPosition viewportPosition'`

| Example           | Meaning                                         |
| ----------------- | ----------------------------------------------- |
| `'top top'`       | Trigger's top reaches viewport top              |
| `'top 80%'`       | Trigger's top reaches 80% down the viewport     |
| `'center center'` | Centers meet                                    |
| `'bottom bottom'` | Trigger's bottom reaches viewport bottom        |
| `'top bottom'`    | Trigger's top enters from below (just entering) |
| `'top top+=100'`  | Trigger's top reaches 100px below viewport top  |
| `'+=2000'`        | 2000px after the start position (for `end`)     |

Function form for `end` — recalculates on refresh:

```tsx
end: () => `+=${totalWidth}`
```

---

## Standalone ScrollTrigger (Callbacks Only)

When you need scroll position data without animating:

```tsx
ScrollTrigger.create({
  trigger: sectionRef.current,
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    // self.progress (0–1), self.direction (1 or -1), self.isActive
    console.log('progress:', self.progress.toFixed(3))
  },
})
```

---

## Scrub Values

Scrub maps animation progress 1:1 to scroll progress.

| Value         | Feel                        | Use case                                               |
| ------------- | --------------------------- | ------------------------------------------------------ |
| `scrub: true` | Exact 1:1 — mechanical      | Progress bars, video scrubbing where precision matters |
| `scrub: 0.5`  | Responsive — quick catch-up | Fast, light scenes                                     |
| `scrub: 1`    | Smooth — natural momentum   | **Default recommendation for most scenes**             |
| `scrub: 2`    | Heavy — cinematic inertia   | Dramatic/cinematic sections                            |

With scrub enabled on a timeline's ScrollTrigger: use `ease: 'none'` on individual tweens inside the timeline — the scroll position IS the timing function.

---

## Pin

Pins (locks) an element in the viewport while the user scrolls through the animation range. GSAP applies `position: fixed` internally and manages spacer elements — **never apply `position: fixed` manually**.

```tsx
scrollTrigger: {
  trigger: sectionRef.current,
  start: 'top top',
  end: '+=2000',       // stays pinned for 2000px of scroll
  pin: true,
  scrub: 1,
  anticipatePin: 1,    // prevents flash on fast scroll
}
```

### pinSpacing

| Value            | Behavior                                                  |
| ---------------- | --------------------------------------------------------- |
| `true` (default) | Adds padding below — content below is pushed down         |
| `false`          | No padding — content scrolls underneath (overlay effects) |
| `'margin'`       | Uses margin instead of padding                            |

### Pin Gotchas

- **Do not animate the pinned element itself** — GSAP pre-calculates its position. Animate children inside it.
- **Nested pins** — if trigger is inside a pinned section, set `pinnedContainer` to the outer pinned element. Nested pinning (pin inside pin) is NOT supported.
- **Ancestor `transform`/`will-change`** — breaks `position: fixed`. Use `pinReparent: true` or restructure the DOM.

---

## Snap

Snap points make scroll jump to specific progress values when scrolling stops. Requires `scrub` to be enabled.

```tsx
snap: 0.25                            // nearest 25% increment
snap: [0, 0.25, 0.5, 0.75, 1]        // specific progress values
snap: 'labels'                        // snap to timeline labels
snap: 'labelsDirectional'             // labels in scroll direction only

// With animation config
snap: {
  snapTo: 0.25,
  duration: { min: 0.2, max: 0.5 },
  delay: 0.1,
  ease: 'power2.inOut'
}
```

| Pattern                     | Snap value                              |
| --------------------------- | --------------------------------------- |
| Panel-based scroll sections | `snap: 1 / (numberOfPanels - 1)`        |
| Slideshow                   | `snap: 'labels'` with a label per slide |
| Step-by-step reveals        | `snap: [0, 0.33, 0.66, 1]`              |

---

## gsap.matchMedia() — Responsive + Reduced Motion

Single API for breakpoint-scoped animations AND reduced motion compliance. Animations are automatically created/destroyed when breakpoints change.

```tsx
useGSAP(
  () => {
    const mm = gsap.matchMedia()

    mm.add(
      {
        isDesktop: '(min-width: 768px)',
        isMobile: '(max-width: 767px)',
        reduceMotion: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const { isDesktop, isMobile, reduceMotion } = context.conditions!

        if (reduceMotion) {
          // MUST: snap to final state — content immediately visible
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
            },
          })
          tl.to('.title', { opacity: 1, y: 0 }).to(
            '.cards',
            { opacity: 1, y: 0, stagger: 0.1 },
            '-=0.2',
          )
        }

        if (isMobile) {
          // Simple viewport reveals — no pinning
          gsap.from('.content-block', {
            y: 30,
            opacity: 0,
            stagger: 0.15,
            scrollTrigger: { trigger: '.content-block', start: 'top 85%' },
          })
        }
      },
    )
  },
  { scope: containerRef },
)
```

### Reduced Motion Strategy

| Context                          | Required behavior                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `prefers-reduced-motion: reduce` | `gsap.set()` to final state. No animation, no ScrollTrigger. Content visible immediately. |
| Mobile (below `md`)              | Simple fade-in on viewport entry. No pinning, no horizontal scroll, no parallax.          |
| Desktop                          | Full scroll scene.                                                                        |

Every GSAP component MUST handle reduced motion — this is a hard requirement, not optional.
