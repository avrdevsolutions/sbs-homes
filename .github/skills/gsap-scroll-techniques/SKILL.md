---
name: gsap-scroll-techniques
description: >-
  GSAP scroll-driven technique catalog — scroll budget formula (phases × multiplier × 100vh,
  constraints table), sticky-pinned section anatomy, horizontal scroll (math + implementation),
  multi-element choreography with stagger, video scrubbing with seek threshold, scale-in hero,
  cross-fade panel sequence, per-word/per-line text reveal with SplitText vs manual splitting,
  clip-path reveals (circle/inset/wipe), number counter via proxy object, multi-layer parallax
  (depth ratios), background color transitions (3+ stops), zoom-through transition. Use when
  implementing any scroll-driven animation technique in GSAP, choosing how tall to make a pinned
  section, or building a multi-technique composed scroll scene.
---

# GSAP — Scroll-Driven Technique Catalog

**Compiled from**: ADR-0003 §13–25 (Scroll Budget, Techniques)
**Last synced**: 2026-04-04

> This skill covers scroll technique implementations. GSAP setup (useGSAP, contextSafe) and
> ScrollTrigger configuration (scrub, pin, snap, matchMedia) are covered in companion GSAP skills.

---

## Scroll Budget Formula

Before implementing any scroll scene, calculate the required section height:

```
scrollHeight = numberOfAnimatedPhases × viewportMultiplier × 100vh
```

- **`numberOfAnimatedPhases`** — distinct animation steps (hero scale = 1, text reveal = 1, cards slide in = 1 → total: 3)
- **`viewportMultiplier`** — scroll distance per phase. Typically `1–1.5`

### Constraints

| Constraint        | Value         | Why                                               |
| ----------------- | ------------- | ------------------------------------------------- |
| Minimum per phase | `100vh`       | Less feels rushed                                 |
| Maximum total     | `~800vh`      | Beyond this, users reach for the scrollbar        |
| Completion target | By 80% scroll | Last 20% should be settling/exit, not dead scroll |

### Quick Reference

| Scene                    | Phases | Multiplier | Use                           |
| ------------------------ | ------ | ---------- | ----------------------------- |
| Hero scale-down only     | 1      | 1.5        | `150vh` → round up to `200vh` |
| Hero + text + cards      | 3      | 1.5        | `450vh`                       |
| Full Apple-style section | 5      | 1.2        | `600vh`                       |

---

## Sticky-Pinned Section

Foundation pattern: tall outer container provides scroll distance; inner content is pinned while scroll drives a timeline.

```tsx
useGSAP(
  () => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=3000', // 3000px of pinned scroll (~300vh)
        pin: true,
        scrub: 1,
        anticipatePin: 1,
      },
    })

    tl.to('.hero-image', { scale: 0.8, opacity: 0.5 })
      .to('.title', { y: 0, opacity: 1 }, '-=0.3')
      .to('.cards', { x: 0, opacity: 1 }, '-=0.2')
  },
  { scope: containerRef },
)
```

**Common mistakes:** using `position: fixed` manually; animating the pinned element itself (animate children instead); scroll height too short for the number of phases.

---

## Horizontal Scroll

Vertical scroll drives horizontal translation.

### Math

```
totalHorizontalDistance = (numberOfPanels × panelWidth) - viewportWidth
scrollHeight = totalHorizontalDistance + viewportHeight
```

### Implementation

```tsx
useGSAP(
  () => {
    const panels = gsap.utils.toArray<HTMLElement>('.panel')
    const totalWidth = panels.length * panelWidth

    gsap.to('.panels-container', {
      x: -(totalWidth - window.innerWidth),
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: () => `+=${totalWidth}`, // function — recalculates on refresh
        pin: true,
        scrub: 1,
        snap: 1 / (panels.length - 1), // snap to each panel
        anticipatePin: 1,
        invalidateOnRefresh: true, // flush cached values on resize
      },
    })
  },
  { scope: containerRef },
)
```

Mobile fallback: vertical stack or swipeable carousel — no horizontal scroll on mobile.

---

## Multi-Element Choreography

Multiple elements animate in a coordinated sequence within one scroll range.

```tsx
useGSAP(
  () => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=2500',
        pin: true,
        scrub: 1,
      },
    })

    tl.fromTo('.hero', { scale: 1 }, { scale: 0.6, opacity: 0.3 })
      .fromTo('.title', { y: 60, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.3')
      .fromTo('.card', { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1 }, '-=0.2')
  },
  { scope: containerRef },
)
```

Position parameter (`-=`, `+=`, labels) is the composition tool. Vary stagger values for different element groups — uniform stagger feels mechanical.

---

## Video Scrubbing

Video playback controlled by scroll progress. Use `scrub: true` (not `scrub: 1`) for video — smoothing adds lag.

```tsx
useGSAP(
  () => {
    const video = videoRef.current
    if (!video) return

    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: '+=3000',
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        if (!video.duration) return
        const targetTime = self.progress * video.duration
        // Threshold prevents seeking on micro-scrolls
        if (Math.abs(targetTime - video.currentTime) > 0.03) {
          video.currentTime = targetTime
        }
      },
    })
  },
  { scope: containerRef },
)
```

| Concern          | Solution                                                 |
| ---------------- | -------------------------------------------------------- |
| Video not loaded | Show poster frame until `loadeddata` fires               |
| Choppy seeking   | Frame snap: `Math.round(time * frameRate) / frameRate`   |
| Reduced motion   | Show poster image — no scrubbing                         |
| Mobile           | Consider image-sequence fallback if video is too heavy   |
| Format           | MP4 H.264, short duration (10–30s max), `preload="auto"` |

---

## Scale-In Hero

Image or hero zooms in (close-up) and scales down as user scrolls — "pulling back the camera."

```tsx
useGSAP(
  () => {
    gsap.fromTo(
      '.hero-image',
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
        },
      },
    )
  },
  { scope: containerRef },
)
```

Scroll budget: 1 phase → `150–200vh`. Variations: scale down + translate to card; scale down + text reveal; scale down + background color change.

---

## Cross-Fade Panel Sequence

Multiple full-screen panels that fade between each other. Only one panel visible at a time.

```tsx
useGSAP(
  () => {
    const panels = gsap.utils.toArray<HTMLElement>('.panel')
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: () => `+=${panels.length * 150}vh`,
        pin: true,
        scrub: 1,
      },
    })

    panels.forEach((panel, i) => {
      if (i > 0) tl.fromTo(panel, { opacity: 0 }, { opacity: 1 })
      tl.to({}, { duration: 0.5 }) // hold
      if (i < panels.length - 1) tl.to(panel, { opacity: 0 })
    })
  },
  { scope: containerRef },
)
```

Scroll budget: ~150vh per panel (entry + hold + exit). Mobile fallback: vertical stack, each panel with simple fade-in on viewport entry.

---

## Per-Word / Per-Line Text Reveal

Text illuminates word-by-word tied to scroll progress.

```tsx
useGSAP(
  () => {
    gsap.fromTo(
      '.word',
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
        },
      },
    )
  },
  { scope: containerRef },
)
```

### Text Splitting

**Manual** (simple cases):

```tsx
const words = text.split(' ').map((word, i) => (
  <span key={i} className='word inline-block'>
    {word}&nbsp;
  </span>
))
```

**SplitText plugin** (now free, preferred for complex splits): handles word, character, and line splitting with automatic revert.

Screen readers read all words regardless — all spans are in the DOM, visual effect is decorative.

---

## Clip-Path Reveals

Content revealed through an expanding clip-path tied to scroll.

```tsx
useGSAP(
  () => {
    gsap.fromTo(
      '.reveal-target',
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
        },
      },
    )
  },
  { scope: containerRef },
)
```

| Shape              | From                    | To                       |
| ------------------ | ----------------------- | ------------------------ |
| Circle reveal      | `circle(0% at 50% 50%)` | `circle(75% at 50% 50%)` |
| Rectangular reveal | `inset(50%)`            | `inset(0%)`              |
| Horizontal wipe    | `inset(0 100% 0 0)`     | `inset(0 0% 0 0)`        |

Reduced motion: show content fully revealed (no clip). Content behind clip-path is accessible to screen readers.

---

## Number Counter

Numeric value counts from start to end tied to scroll. GSAP tweens arbitrary object properties, not just CSS.

```tsx
useGSAP(
  () => {
    const counter = { value: 0 }
    const statEl = statRef.current

    gsap.to(counter, {
      value: 1250,
      ease: 'none',
      scrollTrigger: {
        trigger: statsRef.current,
        start: 'top 80%',
        end: 'bottom 20%',
        scrub: 1,
      },
      onUpdate: () => {
        if (statEl) statEl.textContent = Math.round(counter.value).toLocaleString()
      },
    })
  },
  { scope: containerRef },
)
```

- Suffix/prefix: append in `onUpdate` — `$${Math.round(counter.value).toLocaleString()}M`
- Accessibility: `aria-label` on the element with the final value — screen readers don't need to hear counting
- Reduced motion: `gsap.set()` to show the final number immediately

---

## Multi-Layer Parallax

Multiple elements at different depths moving at different rates.

```tsx
useGSAP(
  () => {
    gsap.to('.bg-layer', { y: -50, scrollTrigger: { trigger: sectionRef.current, scrub: true } })
    gsap.to('.mid-layer', { y: -120, scrollTrigger: { trigger: sectionRef.current, scrub: true } })
    gsap.to('.fg-layer', { y: -200, scrollTrigger: { trigger: sectionRef.current, scrub: true } })
  },
  { scope: containerRef },
)
```

| Layer      | Y range         | Speed                   |
| ---------- | --------------- | ----------------------- |
| Background | Small (`-50`)   | Slow — appears far away |
| Midground  | Medium (`-120`) | Medium                  |
| Foreground | Large (`-200`)  | Fast — appears close    |

Use `scrub: true` (not smoothed) for parallax — smoothing makes layers feel disconnected. `will-change: transform` on active layers only. Max 8 promoted layers per scene. Mobile: reduce to 1–2 layers or disable entirely.

---

## Background Color Transitions (3+ stops)

Background morphs through multiple colors as the user scrolls. For ≤2 color stops, use CSS Scroll-Driven Animations instead (compositor thread, no JS).

```tsx
useGSAP(
  () => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pageRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
      },
    })

    tl.to(sectionRef.current, { backgroundColor: '#1a1a2e', duration: 1 })
      .to(sectionRef.current, { backgroundColor: '#e8e8e8', duration: 1 })
      .to(sectionRef.current, { backgroundColor: '#0a0a0a', duration: 1 })
  },
  { scope: containerRef },
)
```

WCAG contrast: verify text contrast meets AA at **all** interpolated mid-values — test at 25%, 50%, 75% progress, not just at color stops.

---

## Zoom-Through Transition

Element scales up dramatically as if the camera moves through it.

```tsx
useGSAP(
  () => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=2000',
        pin: true,
        scrub: 1,
      },
    })

    tl.to('.current-content', { scale: 15, opacity: 0, ease: 'power2.in' }).fromTo(
      '.next-content',
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1 },
      '-=0.5',
    )
  },
  { scope: containerRef },
)
```

Scroll budget: at least `200vh` for a single zoom-through. Element scales from `1` to `5–20` while opacity fades to 0, creating the illusion of flying into the element.
