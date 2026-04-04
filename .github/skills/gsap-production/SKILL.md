---
name: gsap-production
description: >-
  GSAP production patterns — mobile fallback principles and per-technique fallback table
  (pinned→fade-in, horizontal→vertical/carousel, video→autoplay, parallax→reduce/disable),
  composition patterns (one ScrollTrigger per timeline, cross-engine composition table,
  page budget of 1–2 complex scenes), performance rules table (will-change, layer count,
  overwrite, CPU throttle testing), 17-entry anti-patterns table, scope boundary decision
  table (what GSAP handles vs Framer Motion vs CSS Scroll-Driven Animations), library
  compatibility table. Use when reviewing a GSAP scroll scene for production readiness,
  deciding which engine to use for a given animation type, adding mobile fallbacks, or
  optimizing animation performance.
---

# GSAP — Production Patterns

**Compiled from**: ADR-0003 §26–30 (Mobile Fallbacks, Composition, Performance, Anti-Patterns, Scope Boundary)
**Last synced**: 2026-04-04

---

## Mobile Fallback Principles

| Principle                            | Reasoning                                                   |
| ------------------------------------ | ----------------------------------------------------------- |
| No pinning on mobile                 | Pinned sections with scroll-jacking feel bad on touch       |
| No horizontal scroll on mobile       | Vertical scroll is the native interaction                   |
| Simplified or no parallax            | Performance, battery; parallax adds little on small screens |
| Video scrubbing → autoplay or poster | Video scrub drains battery and can feel laggy on mobile     |

### Standard Pattern

```tsx
useGSAP(
  () => {
    const mm = gsap.matchMedia()

    mm.add('(min-width: 768px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=3000',
          pin: true,
          scrub: 1,
        },
      })
      tl.to('.hero', { scale: 0.8 }).to('.title', { y: 0, opacity: 1 }, '-=0.3')
    })

    mm.add('(max-width: 767px)', () => {
      gsap.from('.content-block', {
        y: 30,
        opacity: 0,
        stagger: 0.15,
        scrollTrigger: { trigger: '.content-block', start: 'top 85%' },
      })
    })
  },
  { scope: containerRef },
)
```

### Per-Technique Fallbacks

| Desktop technique                  | Mobile fallback                                  |
| ---------------------------------- | ------------------------------------------------ |
| Pinned section + scrubbed timeline | Vertical stack, simple fade-in on viewport entry |
| Horizontal scroll                  | Vertical stack or swipeable carousel             |
| Video scrubbing                    | Autoplay with `playsinline` or poster image      |
| Multi-layer parallax               | Reduce to 1–2 layers or disable                  |
| Cross-fade panels                  | Vertical stack, each panel in normal flow        |
| Per-word text reveal               | Fade in the whole block at once                  |

---

## Composition Patterns

### One ScrollTrigger, One Timeline, Multiple Techniques

```tsx
// Scale-In Hero + Text Reveal + Card Choreography in one pinned section
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: sectionRef.current,
    start: 'top top',
    end: '+=4000',
    pin: true,
    scrub: 1,
  },
})

tl.addLabel('hero')
  .fromTo('.hero-image', { scale: 1.5 }, { scale: 1 })
  .addLabel('text', '-=0.1')
  .fromTo('.word', { opacity: 0.15 }, { opacity: 1, stagger: 0.03 }, 'text')
  .addLabel('cards')
  .fromTo('.card', { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08 }, 'cards')
```

### Cross-Engine Composition

GSAP, CSS, and Motion (Framer) can coexist at the **section level** — one engine per element:

| Layer                             | Engine                                           |
| --------------------------------- | ------------------------------------------------ |
| Section pinning + scroll timeline | GSAP ScrollTrigger                               |
| SVG line-draw inside the section  | CSS animation (triggered via GSAP `toggleClass`) |
| Hover states on interactive cards | Framer Motion or CSS `:hover`                    |

**MUST NOT** mix GSAP and Framer Motion transforms on the **same DOM element** — two engines fight over the same transform.

### Page Budget

| Guideline                             | Value                                                     |
| ------------------------------------- | --------------------------------------------------------- |
| Complex scroll-driven scenes per page | 1–2 maximum                                               |
| Rest of the page                      | Simpler viewport reveals (`once: true`) or CSS animations |
| Scroll fatigue threshold              | >3 complex scenes creates scroll fatigue                  |

---

## Performance Rules

| Rule                                                                           | Why                                                              |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `will-change: transform` only on elements with active scroll-driven transforms | GPU memory is finite — each promoted layer consumes VRAM         |
| ≤8 elements with `will-change` per scroll scene                                | Browsers may drop compositing layers under pressure              |
| `overwrite: 'auto'` on tweens that could conflict                              | Prevents conflicting tweens from fighting over the same property |
| Never `getBoundingClientRect()` inside `onUpdate`                              | Layout thrash every frame — reads layout while scroll is active  |
| Use `scrub: number` (not `true`) for smooth scenes                             | `scrub: true` amplifies micro-jitter; number adds smoothing      |
| `next/dynamic` with `ssr: false` for heavy scenes                              | Reduces initial bundle, avoids GSAP executing during SSR         |
| `markers: process.env.NODE_ENV === 'development'`                              | Never ship `markers: true` to production                         |
| Test at 4× CPU throttle in DevTools                                            | Mid-range phones are 4–6× slower than a MacBook                  |
| Animate only `transform` and `opacity`                                         | Compositor thread — no layout or paint cost                      |

---

## Anti-Patterns

| ❌ Don't                                                   | ✅ Do instead                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| `useEffect` + manual cleanup for GSAP                      | `useGSAP()` from `@gsap/react`                                |
| Document-wide selectors without scope (`.card`)            | Scoped selectors via `useGSAP({ scope: ref })`                |
| GSAP `.to()` on a Framer Motion-animated element           | One engine per element                                        |
| `scrub: true` on cinematic scenes                          | `scrub: 1` or higher for smoothing                            |
| Manual `position: fixed` for pinning                       | Let ScrollTrigger manage via `pin: true`                      |
| No `gsap.matchMedia()` for responsive/reduced motion       | Always provide desktop, mobile, and reduced-motion paths      |
| Forgetting `ScrollTrigger.refresh()` after dynamic content | Call after fonts, images, or CMS data load                    |
| `markers: true` in production code                         | `markers: process.env.NODE_ENV === 'development'`             |
| Magic numbers in timeline positions                        | Use labels and relative positions (`'-=0.3'`)                 |
| Scroll height too short for number of phases               | Use the scroll budget formula                                 |
| Scroll height > 800vh                                      | Cap at 800vh — ensure animation completes by 80%              |
| Same stagger on all choreography elements                  | Vary stagger for cascade feel                                 |
| No mobile fallback                                         | `gsap.matchMedia()` with simplified mobile version            |
| Testing only on MacBook                                    | 4× CPU throttle in DevTools Performance tab                   |
| >3 complex scroll scenes per page                          | 1–2 hero scenes, rest simple reveals                          |
| GSAP in event handlers without `contextSafe()`             | Wrap in `contextSafe()` — prevents animation leaks on unmount |
| Animating the pinned element itself                        | Animate children inside the pinned element                    |

---

## Scope Boundary — Engine Decision Table

### GSAP Handles

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
- Scale-in hero reveals, cross-fade panel sequences, zoom-through transitions

### Use a Different Engine Instead

| What                                                                 | Use instead                       |
| -------------------------------------------------------------------- | --------------------------------- |
| React mount/unmount transitions                                      | Framer Motion (`AnimatePresence`) |
| Layout animations / FLIP                                             | Framer Motion (`layoutId`)        |
| Gesture responses: hover, tap, drag, focus                           | Framer Motion or CSS              |
| Simple single-element scroll effects (opacity fade, basic translate) | CSS Scroll-Driven Animations API  |
| Component state-driven transitions                                   | Framer Motion                     |
| Background color/opacity ≤2 stops                                    | CSS Scroll-Driven Animations API  |

---

## Library Compatibility

| Library                         | Status        | Notes                                                            |
| ------------------------------- | ------------- | ---------------------------------------------------------------- |
| `gsap`                          | recommended   | Core engine — ~30 kB. All plugins now free (Webflow acquisition) |
| `@gsap/react`                   | recommended   | Required for all GSAP-in-React usage — ~2 kB                     |
| `gsap/ScrollTrigger`            | recommended   | ~12 kB, bundled inside `gsap` package                            |
| `gsap/SplitText`                | compatible    | Now free. Add when per-word/per-line text effects are needed     |
| `ScrollSmoother`                | compatible    | Now free. Only if smooth scrolling is explicitly requested       |
| Lenis / Locomotive Scroll       | **forbidden** | Conflict with ScrollTrigger timing — use ScrollSmoother instead  |
| Any CSS-in-JS animation library | **forbidden** | Violates Tailwind-only styling ADR                               |
