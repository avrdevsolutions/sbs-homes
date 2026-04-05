# ADR-0035: Apple-Style Scroll Animation Patterns

**Status**: Accepted
**Date**: 2026-04-05
**Supersedes**: N/A

---

## Context

Apple's product marketing pages (iPhone, MacBook, AirPods, Vision Pro, Apple Watch) represent the gold standard for scroll-driven web animation. Their pages are essentially independent mini-sites — each is its own codebase sharing only global nav and footer — allowing the scroll narrative, asset pipeline, and animation config to be tailored per product.

ADR-0003 establishes GSAP + ScrollTrigger as the scroll-driven animation engine and documents the technical API, individual techniques, and production patterns. ADR-0034 covers CSS Scroll-Driven Animations for simple compositor-thread effects. ADR-0030 covers Motion for React lifecycle animations.

This ADR fills a different gap: the **compositional design philosophy** and **pattern library** behind Apple-caliber scroll experiences. It documents Apple's specific animation principles, their design language, their technique-specific implementations with full GSAP code, and how to combine multiple patterns into cohesive scroll narratives. Where ADR-0003 documents _what_ GSAP can do, this ADR documents _how Apple uses it_ and _why_.

This ADR is designed to be compiled into a standalone skill. It is intentionally self-contained — patterns include full implementation code even where they overlap with ADR-0003's technique catalog, because the Apple-specific depth (pacing ratios, timing rules, brand-personality mapping, narrative sequencing) requires the implementation context to be useful.

Without this ADR, developers implement scroll-driven techniques in isolation — a pinned section here, a text reveal there — without the compositional thinking that makes Apple pages feel cohesive. The result is technically correct animation that feels disjointed, rushed, or overwrought.

## Decision

**Apple-style scroll animation patterns follow an 8-pattern catalog built on five principles: the 30% Rule (animate only 30–50% of pin scroll distance), One Thing at a Time (sequential not simultaneous), Heavy Scroll Feel (scrub smoothing 0.5–1.0s), Mobile is a Different Product (entirely separate animation configs), and Static First (content readable without JS). All patterns use GSAP + ScrollTrigger per ADR-0003. Canvas frame sequences are the standard technique for product rotation/turntable effects. Scroll pages are planned as storyboards with Act-based narrative structure. Every pattern provides dead space, reduced motion, and mobile fallback implementations.**

---

## Rules

| Rule                                                                                        | Level        |
| ------------------------------------------------------------------------------------------- | ------------ |
| Plan scroll pages as storyboards before coding — map each section to a narrative act        | **MUST**     |
| Pin sections for at least `250vh` — shorter pins use simple fade-in instead                 | **MUST**     |
| Active animation occupies at most 50% of total pin scroll distance (30% Rule)               | **MUST**     |
| Include dead space at the start (≥15% of pin) and end (≥20% of pin) of every pinned section | **MUST**     |
| Animate one element at a time — minimum 15% timeline gap between layer start points         | **MUST**     |
| Use numeric `scrub` values (0.5–1.0) — never raw `scrub: true` for cinematic scenes         | **MUST**     |
| Provide reduced motion path — snap to final visible state, no ScrollTrigger                 | **MUST**     |
| Ship separate mobile animation config via `gsap.matchMedia()` — not responsive scaling      | **MUST**     |
| Canvas frame sequences must include a static first-frame `<img>` fallback                   | **MUST**     |
| Canvas frame total asset weight < 5 MB                                                      | **MUST**     |
| Use `scrub: 1` as default — adjust to 0.5–0.8 for lighter, 1.0–2.0 for heavier products     | **SHOULD**   |
| Keep layer count to 3–5 per pinned section — more creates confusion                         | **SHOULD**   |
| Follow headline → image → body → CTA reading order for staggered choreography               | **SHOULD**   |
| Preload canvas frame sequences 2 viewports ahead via IntersectionObserver                   | **SHOULD**   |
| Limit complex scroll-driven scenes to 1–2 per page                                          | **SHOULD**   |
| Cap total pin scroll distance at `800vh` per section                                        | **SHOULD**   |
| Use CSS snap for macro navigation, GSAP for micro arrival choreography (hybrid)             | **SHOULD**   |
| Serve separate mobile frame sets (960px) for canvas sequences — never 2× to mobile          | **SHOULD**   |
| Exceed 3 complex scroll scenes per page                                                     | **MUST NOT** |
| Animate two elements simultaneously within a staggered section                              | **MUST NOT** |
| Use raw `scrub: true` on cinematic pinned scenes                                            | **MUST NOT** |
| Skip dead space at start/end of pins — every pin needs breathing room                       | **MUST NOT** |
| Serve 2× DPR canvas frames to mobile devices                                                | **MUST NOT** |

---

## Part 1 — Design Philosophy

## 1. Apple's Design Language for Scroll Pages

Before any animation code, understand the visual system Apple animates within. The animation reinforces a pre-existing visual hierarchy — it does not create it.

### 1.1 Typography

Apple uses SF Pro at extreme scale contrasts. Headlines are 80–120px on desktop, set in SF Pro Display Semibold/Bold. Supporting text is 21–28px in SF Pro Text Regular. The scale difference itself creates hierarchy — animation reinforces it. Text is almost always centered, set against solid black or off-white backgrounds.

### 1.2 Color

Apple's scroll pages are predominantly monochrome. Deep black backgrounds for premium/hero moments, off-white for feature detail sections. Accent color is used sparingly and almost always comes from the product itself (titanium gray, midnight blue, product red). Background color transitions between sections are animated on scroll — never hard cuts.

| Surface                  | Color     | Usage                             |
| ------------------------ | --------- | --------------------------------- |
| Dark hero background     | `#000000` | Premium reveals, canvas sequences |
| Dark section background  | `#1d1d1f` | Secondary dark sections           |
| Light section background | `#f5f5f7` | Feature details, specs            |
| White section background | `#fbfbfd` | CTA, pricing, comparison          |
| Dark text                | `#1d1d1f` | On light backgrounds              |
| Light text               | `#f5f5f7` | On dark backgrounds               |
| Muted text               | `#86868b` | Secondary/caption text            |

### 1.3 Whitespace

Sections are separated by 80–200px of vertical padding minimum. Within pinned sections, content occupies only 40–60% of viewport height, leaving the rest as breathing room. This whitespace is load-bearing — it's what makes animations feel unhurried.

### 1.4 Imagery

Products are photographed on seamless backgrounds (black or white) with controlled studio lighting. No lifestyle shots during animated sections — the product is the sole visual focus during a scroll-driven moment.

---

## 2. Apple's Animation Technology Stack

Apple uses a layered approach, choosing the lightest tool for each job:

| Layer | Tool                     | Coverage                                                                 | Approximate Page Share |
| ----- | ------------------------ | ------------------------------------------------------------------------ | ---------------------- |
| 1     | CSS transforms + opacity | Simple fade-ins, slides, parallax — GPU-composited, zero JS              | ~60% of motion         |
| 2     | GSAP + ScrollTrigger     | Pinned sections, staggered timelines, scrubbed sequences                 | ~30% of motion         |
| 3     | Canvas frame sequences   | Product rotation/turntable via pre-rendered frames drawn on `<canvas>`   | ~8% of motion          |
| 4     | WebGL / Three.js / USDZ  | Real-time 3D model manipulation (newer pages: Vision Pro, recent iPhone) | ~2% of motion          |

For this project, Layers 1 and 2 are the primary tools. Layer 3 (canvas frame sequences) is documented in this ADR as Pattern 04. Layer 4 (WebGL) is out of scope — use when explicitly requested.

---

## 3. Apple's 5 Animation Principles

These are not generic best practices — they are observable rules extracted from how Apple ships their product pages.

### 3.1 The 30% Rule

On any pinned section, animation occupies at most 30–50% of the total scroll distance. The rest is dead space. iPhone hero sections pin for 4–5× viewport height but only animate in the middle third.

**Why:** Human visual attention needs ~300ms to lock onto a new element. Dead space at the start of a pin gives the brain time to register the section. Dead space at the end lets the user process what they saw. Removing either makes the page feel frantic.

### 3.2 One Thing at a Time

Apple never animates two elements simultaneously. Every element enters on its own scroll beat. When a headline, image, and caption appear, they're on staggered timeline positions with 15–20% gaps between them.

**Why:** Simultaneous animation is noise. Sequential animation is narrative. The stagger controls reading order — Apple shows the headline first so you read the claim, then the image reinforces it, then specs provide evidence.

### 3.3 Heavy Scroll Feel

Apple uses scrub smoothing of 0.5–1.0s. Fast scrolling doesn't make animations race — they "catch up" with weight. This absorbs noisy input (trackpad, mouse wheel, touch inertia) and makes products feel substantial.

| Product Personality | Scrub Value | Feel                        |
| ------------------- | ----------- | --------------------------- |
| AirPods Pro         | `0.5`       | Light, airy, floating       |
| Vision Pro          | `0.6`       | Futuristic, effortless      |
| iPhone              | `0.8`       | Solid, grounded, precise    |
| Mac Pro             | `1.0`       | Heavy, powerful, monolithic |

### 3.4 Mobile is a Different Product

Apple ships entirely different animation configs for mobile via `matchMedia`. Less pinning, shorter scroll distances, simplified sequences, and often static images replacing canvas sequences entirely. This isn't responsive design — it's a separate animation architecture.

### 3.5 Static First, Motion Second

Every Apple section is a complete, readable layout without JavaScript. The pinned canvas sequence has a fallback static hero image. The staggered text reveal has text already in the DOM, visible. Animation is progressive enhancement, never a gate.

---

## Part 2 — Pattern Catalog

## 4. Pattern 01 — Dead Space Pacing

**What Apple does:** On the iPhone product page, the hero device sits perfectly still on screen for a full viewport-height of scrolling before any animation begins. After the rotation/reveal animation completes, there's another full viewport of stillness before the section unpins.

**The principle:** Pin long, animate short. The scroll distance is 3–5× the viewport, but animation only fires in the middle 30–50%.

### 4.1 Implementation

```tsx
useGSAP(
  () => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        pin: true,
        scrub: 0.6,
        start: 'top top',
        end: '+=400%', // 4× viewport pin
      },
    })

    // 0% → 25%: DEAD ZONE — user scrolls, nothing moves. Intentional.

    // 25% → 60%: ACTIVE ZONE
    tl.fromTo(
      '.hero',
      { scale: 0.85, opacity: 0 },
      { scale: 1, opacity: 1, ease: 'power2.out' },
      0.25, // starts at 25% of timeline
    )

    tl.to(
      '.hero',
      { y: -80, ease: 'power1.inOut' },
      0.45, // starts at 45%
    )

    // 60% → 100%: DEAD ZONE — breathing room before next section
  },
  { scope: containerRef },
)
```

### 4.2 Pin Length Guide

| Pin Length | Active Zone | Dead Space (Start) | Dead Space (End) | Apple Example               |
| ---------- | ----------- | ------------------ | ---------------- | --------------------------- |
| `300vh`    | 30–65%      | 30%                | 35%              | Feature detail section      |
| `400vh`    | 25–60%      | 25%                | 40%              | iPhone hero, MacBook reveal |
| `500vh`    | 20–55%      | 20%                | 45%              | Vision Pro spatial demo     |

### 4.3 When to Use

- Section deserves focused attention (hero reveal, key feature)
- Content is visually simple (1–2 elements to absorb)
- Pin duration ≥ `250vh` — if a section doesn't deserve `250vh`, don't pin it

### 4.4 When NOT to Use

- Specs/comparison sections (use simple fade-in on viewport entry)
- Sections with dense text content (users want to scan, not wait)
- More than 2–3 dead-space paced sections per page (scroll fatigue)

---

## 5. Pattern 02 — Staggered Choreography

**What Apple does:** On the Mac Pro page, three things need to appear: the machine image, the headline, and the spec details. Apple never shows them simultaneously. The headline fades in first at 15–35%. The machine image scales up at 35–65%. The spec text slides in at 60–80%. Each element owns an exclusive slice of the scroll timeline.

**The principle:** One thing at a time. Sequential animation is narrative.

### 5.1 Implementation

```tsx
useGSAP(
  () => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        pin: true,
        scrub: 0.8,
        start: 'top top',
        end: '+=300%',
      },
    })

    // Layer 1: Headline — first to appear (15% → 35%)
    tl.fromTo(
      '.headline',
      { y: 60, opacity: 0, filter: 'blur(4px)' },
      { y: 0, opacity: 1, filter: 'blur(0px)', ease: 'power2.out' },
      0.15,
    )

    // Layer 2: Product image — anchors the section (35% → 65%)
    tl.fromTo(
      '.hero-image',
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, ease: 'power2.out' },
      0.35,
    )

    // Layer 3: Supporting text — detail/evidence (55% → 75%)
    tl.fromTo('.caption', { x: -40, opacity: 0 }, { x: 0, opacity: 1, ease: 'power2.out' }, 0.55)

    // Layer 4: CTA — last beat (70% → 85%)
    tl.fromTo('.cta', { y: 20, opacity: 0 }, { y: 0, opacity: 1, ease: 'power2.out' }, 0.7)
  },
  { scope: containerRef },
)
```

### 5.2 Timing Rules

| Rule                                    | Value                                                |
| --------------------------------------- | ---------------------------------------------------- |
| Minimum gap between layer start points  | 15% of timeline                                      |
| Maximum overlap between adjacent layers | 10%                                                  |
| First layer starts at                   | 10–15% (dead space before first element)             |
| Last layer completes by                 | 85–90% (dead space after last element)               |
| Maximum layers per section              | 3–5 — more creates confusion                         |
| Reading order                           | Headline → Image → Body → CTA (always this sequence) |

### 5.3 When NOT to Use

- Sections with only 1–2 elements (overkill — use simple fade-in)
- Body text paragraphs (these get block fade-in, not per-element stagger)
- Elements that need to be read simultaneously (e.g., side-by-side comparison)

---

## 6. Pattern 03 — Velocity Smoothing

**What Apple does:** On the AirPods Pro page, when you scroll past the tilt/rotate section, the AirPods don't snap to position — they drift into place with a ~0.6s delay behind your scroll. If you scroll fast, the animation takes 0.6s to catch up. If you scroll slowly, it's nearly synchronized. This creates a "floating" quality matching AirPods' weightless identity.

**The principle:** Weight > precision. The scrub smoothing value defines the product's perceived physical weight.

### 6.1 Scrub Personality Mapping

| Product Personality | `scrub`   | Feel                        | When to Use               |
| ------------------- | --------- | --------------------------- | ------------------------- |
| Light/airy          | `0.5`     | Floating, responsive        | Wearables, audio products |
| Futuristic          | `0.6`     | Effortless, smooth          | AR/VR, spatial products   |
| Solid/grounded      | `0.8`     | Precise, cinematic          | Phones, tablets           |
| Heavy/powerful      | `1.0`     | Monolithic, weighty         | Desktops, pro hardware    |
| Dramatic            | `1.5–2.0` | Extreme cinema, slow reveal | Signature hero moments    |

### 6.2 Velocity-Aware Micro-Effects

Apple occasionally uses scroll velocity for subtle tilts or motion blur:

```tsx
useGSAP(
  () => {
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top center',
      end: 'bottom center',
      onUpdate: (self) => {
        const velocity = self.getVelocity() // px/sec
        const direction = self.direction // 1 (down) or -1 (up)

        // Subtle tilt based on scroll speed — clamped to prevent extreme values
        const tilt = gsap.utils.clamp(-8, 8, velocity / 500)
        gsap.to('.product-image', {
          rotateY: tilt * direction,
          duration: 0.3,
          ease: 'power2.out',
        })
      },
    })
  },
  { scope: containerRef },
)
```

### 6.3 When NOT to Use

- Progress indicators or counters — these need precise `scrub: true` (1:1 mapping)
- Video scrubbing — smoothing adds lag that makes seeking feel disconnected (use `scrub: true`)
- Background color transitions — instant response feels right (use `scrub: true`)

---

## 7. Pattern 04 — Canvas Frame Sequences

**What Apple does:** On the iPhone 15 Pro page, as you scroll, the titanium phone rotates 360° through ~90 pre-rendered frames. Apple draws pre-rendered images on a `<canvas>`, swapping frames based on scroll position.

Apple internally uses **Flow** — a proprietary lossless intra-frame diff compression algorithm that generates de-duplicated sprite blocks using De Bruijn packing, encoded into a base64 manifest driving WebGL canvas rendering. This reduces transmitted data dramatically.

**For non-Apple implementation**, replicate the effect with preloaded WebP frames on a standard 2D canvas.

### 7.1 Implementation

```tsx
'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

interface CanvasSequenceProps {
  basePath: string
  frameCount: number
  className?: string
}

export function CanvasSequence({ basePath, frameCount, className }: CanvasSequenceProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])

  // Preload frames
  useEffect(() => {
    const images: HTMLImageElement[] = []
    for (let i = 0; i < frameCount; i++) {
      const img = new Image()
      img.src = `${basePath}/${String(i).padStart(4, '0')}.webp`
      images.push(img)
    }
    imagesRef.current = images

    // Draw first frame as fallback
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    images[0].onload = () => {
      canvas.width = images[0].naturalWidth
      canvas.height = images[0].naturalHeight
      ctx.drawImage(images[0], 0, 0)
    }
  }, [basePath, frameCount])

  // Tie frame index to scroll
  useGSAP(
    () => {
      const images = imagesRef.current
      const canvas = canvasRef.current
      if (!canvas || images.length === 0) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const obj = { frame: 0 }

      gsap.to(obj, {
        frame: frameCount - 1,
        snap: 'frame',
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          pin: true,
          scrub: 0.5, // Lower smoothing for crisp frame transitions
          start: 'top top',
          end: '+=250%',
        },
        onUpdate: () => {
          const i = Math.round(obj.frame)
          if (images[i]?.complete) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(images[i], 0, 0, canvas.width, canvas.height)
          }
        },
      })
    },
    { scope: sectionRef },
  )

  return (
    <div ref={sectionRef} className={className}>
      {/* Static first-frame fallback for no-JS */}
      <img src={`${basePath}/0000.webp`} alt='Product view' className='sr-only' />
      <canvas ref={canvasRef} className='h-auto w-full' />
    </div>
  )
}
```

### 7.2 Responsive Canvas

Apple serves different frame sizes per device and handles DPR:

```tsx
function resizeCanvas(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  ctx: CanvasRenderingContext2D,
) {
  const dpr = window.devicePixelRatio || 1
  const w = container.clientWidth
  const h = w / (16 / 9)
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  ctx.scale(dpr, dpr)
}
```

### 7.3 Lazy Preloader Hook

Preload frames 2 viewports ahead to avoid blocking initial page load:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'

export function useFramePreloader(basePath: string, frameCount: number) {
  const [frames, setFrames] = useState<HTMLImageElement[]>([])
  const [loaded, setLoaded] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!triggerRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const imgs: HTMLImageElement[] = []
          let count = 0

          for (let i = 0; i < frameCount; i++) {
            const img = new Image()
            img.src = `${basePath}/${String(i).padStart(4, '0')}.webp`
            img.onload = () => {
              count++
              if (count === frameCount) setLoaded(true)
            }
            imgs.push(img)
          }

          setFrames(imgs)
          observer.disconnect()
        }
      },
      { rootMargin: '200% 0px' }, // 2 viewports ahead
    )

    observer.observe(triggerRef.current)
    return () => observer.disconnect()
  }, [basePath, frameCount])

  return { frames, loaded, triggerRef }
}
```

### 7.4 Asset Pipeline

| Concern      | Value                                                  |
| ------------ | ------------------------------------------------------ |
| Format       | WebP (quality 80–85) or AVIF where supported           |
| Desktop      | 1920px wide, 2× DPR → actual 3840px rendered           |
| Mobile       | 960px wide — separate set of smaller frames            |
| Frame count  | 60–120 frames (90 is the sweet spot for 360° rotation) |
| Total weight | < 5 MB for the full sequence                           |
| Preload      | IntersectionObserver 2 viewports ahead                 |
| Fallback     | First frame served as static `<img>` for no-JS         |

**Frame extraction from video:**

```bash
# Desktop frames
ffmpeg -i turntable.mp4 \
  -vf "fps=24,scale=1920:-1" \
  -q:v 2 \
  frames/product-%04d.webp

# Mobile frames
ffmpeg -i turntable.mp4 \
  -vf "fps=24,scale=960:-1" \
  -q:v 3 \
  frames/product-mobile-%04d.webp
```

### 7.5 When to Use

- Product turntable/rotation (360° view of physical product)
- Material/finish showcases (showing the same product from multiple angles)
- Assembly or unboxing sequences
- Any effect where smooth rotation under scroll control is needed

### 7.6 When NOT to Use

- Simple opacity/scale transitions (use CSS or GSAP tweens)
- Video that doesn't need frame-accurate scrubbing (use video scrubbing per ADR-0003 §17)
- Mobile-only sections (consider static carousel instead — battery/bandwidth concern)

### 7.7 Accessibility

- First frame loads eagerly as a static `<img>` fallback
- Content is visible without JS (the `<img>` element)
- `aria-label` on the canvas or its container with descriptive text
- Reduced motion: show a static middle frame

### 7.8 Responsive Strategy

- Desktop: full canvas sequence with `scrub: 0.5`
- Tablet: same canvas sequence with simplified preloading
- Mobile: static hero image or 3–5 key frames as a swipeable carousel — no scroll-driven canvas

---

## 8. Pattern 05 — Parallax Depth Layers

**What Apple does:** On the Apple Watch Ultra page, the underwater scene has water particles, bubbles, and the watch itself all moving at different scroll speeds. The deep-water particles barely move (0.15× scroll speed). The bubbles drift at 0.4×. The watch moves at 0.7×. Speed differential creates depth without 3D transforms.

**The principle:** Speed ≠ position. Speed = depth.

### 8.1 CSS-First Approach

For simple parallax where GSAP orchestration isn't needed:

```css
.layer-deep {
  transform: translateY(calc(var(--scroll-y) * 0.15));
}
.layer-mid {
  transform: translateY(calc(var(--scroll-y) * 0.4));
}
.layer-near {
  transform: translateY(calc(var(--scroll-y) * 0.7));
}
.layer-surface {
  transform: translateY(calc(var(--scroll-y) * 1));
}
```

```tsx
// Update CSS custom property — passive listener for performance
useEffect(() => {
  const handler = () => {
    document.documentElement.style.setProperty('--scroll-y', `${window.scrollY}px`)
  }
  window.addEventListener('scroll', handler, { passive: true })
  return () => window.removeEventListener('scroll', handler)
}, [])
```

### 8.2 GSAP Approach

For complex multi-element scenes:

```tsx
useGSAP(
  () => {
    gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
      const speed = parseFloat(el.dataset.parallax ?? '0.5')
      gsap.to(el, {
        yPercent: -100 * speed,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: true, // Raw scrub for parallax — no catch-up needed
        },
      })
    })
  },
  { scope: containerRef },
)
```

### 8.3 Depth-Speed Mapping

| Layer           | Speed     | Perceived Depth        | Apple Example             |
| --------------- | --------- | ---------------------- | ------------------------- |
| Deep background | 0.10–0.20 | Sky, distant particles | Watch Ultra deep water    |
| Background      | 0.25–0.40 | Environmental elements | Bubbles, texture patterns |
| Midground       | 0.45–0.60 | Supporting elements    | Feature callout cards     |
| Product (focus) | 0.65–0.80 | Primary focus          | Watch, iPhone, AirPod     |
| Foreground/UI   | 0.85–1.00 | UI overlays, text      | Headlines, pricing        |

### 8.4 Key Details

- **`scrub: true`** (not smoothed) for parallax — smoothing makes layers feel disconnected from each other
- **`will-change: transform`** on active layers only — GPU memory is finite
- Layer count budget: ≤ 8 promoted layers per scene
- Mobile: reduce layer count or disable parallax entirely via `gsap.matchMedia()`

---

## 9. Pattern 06 — Progressive Reveal Masks

**What Apple does:** On the Vision Pro page, the spatial computing environment is revealed through a radial clip-path mask that expands from the headset's visor area outward. You see a tiny circle of the UI, and as you scroll, the circle expands until the full immersive environment is visible. It mimics putting on the headset — your field of view expanding.

**The principle:** Conceal to create desire. Gradual reveal is more engaging than instant display.

### 9.1 Circle Reveal (Vision Pro Style)

```tsx
useGSAP(
  () => {
    gsap.fromTo(
      '.reveal-element',
      { clipPath: 'circle(0% at 50% 40%)' }, // Origin at visor position
      {
        clipPath: 'circle(75% at 50% 40%)',
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: sectionRef.current,
          scrub: 0.6,
          start: 'top center',
          end: 'bottom center',
        },
      },
    )
  },
  { scope: containerRef },
)
```

### 9.2 Horizontal Wipe (MacBook Screen Reveal)

```tsx
useGSAP(
  () => {
    gsap.fromTo(
      '.screen-content',
      { clipPath: 'inset(0 100% 0 0)' }, // Hidden from right
      {
        clipPath: 'inset(0 0% 0 0)', // Fully revealed
        scrollTrigger: {
          trigger: sectionRef.current,
          scrub: 0.5,
          start: 'top 70%',
          end: 'top 20%',
        },
      },
    )
  },
  { scope: containerRef },
)
```

### 9.3 Vertical Curtain (iPad Split-Screen Demo)

```tsx
useGSAP(
  () => {
    gsap.fromTo(
      '.split-view',
      { clipPath: 'inset(50% 0 50% 0)' }, // Collapsed to center line
      {
        clipPath: 'inset(0% 0 0% 0)', // Expands to full height
        scrollTrigger: {
          trigger: sectionRef.current,
          scrub: 0.6,
          start: 'top center',
          end: 'bottom center',
        },
      },
    )
  },
  { scope: containerRef },
)
```

### 9.4 Performance & Accessibility

- CSS `clip-path` with `circle()`, `inset()`, and `polygon()` is GPU-composited in all modern browsers
- Apple prefers this over SVG masks for geometric reveals — lighter, no extra DOM element
- Content behind `clip-path` is still in the DOM and accessible to screen readers
- Reduced motion: show content fully revealed (no clip)

---

## 10. Pattern 07 — Kinetic Typography

**What Apple does:** On M-series chip pages, feature headlines appear word-by-word as you scroll. On AirPods pages, lines of text slide up from behind a mask, one line at a time.

**The principle:** Words have weight and direction. Text isn't static content — it's choreographed to control reading pace.

### 10.1 Per-Line Reveal (Apple's Default for Headlines)

Apple's most common text animation. Each line slides up from behind an `overflow-hidden` container:

```html
<div class="line-mask" style="overflow: hidden">
  <span class="line" style="display: block">The most powerful</span>
</div>
<div class="line-mask" style="overflow: hidden">
  <span class="line" style="display: block">chip ever in a Mac.</span>
</div>
```

```tsx
useGSAP(
  () => {
    gsap.from('.line', {
      y: '110%',
      stagger: 0.12, // 120ms between lines
      ease: 'power3.out',
      scrollTrigger: {
        trigger: headingRef.current,
        scrub: 0.4,
        start: 'top 80%',
        end: 'top 35%',
      },
    })
  },
  { scope: containerRef },
)
```

### 10.2 Per-Word Build (M-Chip Feature Callouts)

```tsx
// Manual word splitting component — no SplitText plugin required
function SplitWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ')
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden' }}>
          <span className='word' style={{ display: 'inline-block' }}>
            {word}
          </span>
          {i < words.length - 1 && '\u00A0'}
        </span>
      ))}
    </span>
  )
}
```

```tsx
useGSAP(
  () => {
    gsap.from('.word', {
      y: 30,
      opacity: 0,
      stagger: 0.04, // 40ms between words
      scrollTrigger: {
        trigger: headingRef.current,
        scrub: 0.5,
        start: 'top 80%',
        end: 'top 40%',
      },
    })
  },
  { scope: containerRef },
)
```

### 10.3 Text Animation Hierarchy

| Text Type          | Animation         | Stagger    | Apple Example               |
| ------------------ | ----------------- | ---------- | --------------------------- |
| Section headline   | Per-line slide-up | 0.10–0.15s | "Designed to be loved"      |
| Feature callout    | Per-word fade-in  | 0.03–0.06s | M4 chip spec highlights     |
| Large display text | Per-character     | 0.01–0.02s | Product name reveals (rare) |
| Body text          | Block fade/slide  | N/A        | Supporting paragraphs       |

Apple almost never animates per-character. It's expensive (each char = 1 GSAP tween) and usually illegible at large type sizes. Per-line is the workhorse.

### 10.4 Accessibility

Screen readers read the full text regardless — all words are in the DOM, only visually animated. The effect is decorative; content is always accessible.

---

## 11. Pattern 08 — Section Snap Points

**What Apple does:** On Apple Events recap pages and the Watch comparison page, each product section snaps to fill the viewport. When you scroll, the page jumps cleanly from one section to the next. After landing, GSAP animations fire to bring in the section's content.

**The principle:** Structure the journey, animate the arrival.

### 11.1 CSS Layer — Macro Navigation

```css
.snap-container {
  scroll-snap-type: y mandatory;
  overflow-y: scroll;
  height: 100vh;
}

.snap-section {
  scroll-snap-align: start;
  min-height: 100vh;
  position: relative;
}
```

### 11.2 GSAP Layer — Micro Choreography on Landing

```tsx
useGSAP(
  () => {
    gsap.utils.toArray<HTMLElement>('.snap-section').forEach((section) => {
      const title = section.querySelector('.title')
      const visual = section.querySelector('.visual')
      const details = section.querySelector('.details')

      const enterTl = gsap.timeline({ paused: true })

      enterTl
        .from(title, {
          y: 60,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
        })
        .from(
          visual,
          {
            scale: 0.9,
            opacity: 0,
            duration: 1,
            ease: 'power2.out',
          },
          '-=0.4',
        )
        .from(
          details,
          {
            y: 30,
            opacity: 0,
            duration: 0.6,
            ease: 'power2.out',
          },
          '-=0.3',
        )

      ScrollTrigger.create({
        trigger: section,
        start: 'top 80%',
        onEnter: () => enterTl.play(),
        onLeaveBack: () => enterTl.reverse(),
      })
    })
  },
  { scope: containerRef },
)
```

### 11.3 Apple's Snap Usage Decision

| When to Snap                   | When NOT to Snap                                           |
| ------------------------------ | ---------------------------------------------------------- |
| Product comparison pages       | Long-form feature pages (free scroll with pinned sections) |
| Events recaps                  | Dense content sections                                     |
| Gallery/color selectors        | Specs/detail areas                                         |
| Top 3–4 hero sections (hybrid) | Below-fold detail sections                                 |

**Hybrid approach:** Snap for top hero sections, then free scroll for specs/details below.

---

## Part 3 — Composition & Production

## 12. Section Color Transitions

One of Apple's most recognizable techniques. Apple product pages constantly shift between dark and light backgrounds. The transition is never a hard edge — it's a gradual crossfade tied to scroll.

### 12.1 Implementation

```tsx
useGSAP(
  () => {
    // Background: dark → light
    gsap.fromTo(
      lightSectionRef.current,
      { backgroundColor: '#000000' },
      {
        backgroundColor: '#f5f5f7',
        scrollTrigger: {
          trigger: lightSectionRef.current,
          start: 'top bottom',
          end: 'top center',
          scrub: true, // Raw scrub for color — instant response feels right
        },
      },
    )

    // Text color follows background
    gsap.fromTo(
      gsap.utils.toArray('.text-element', lightSectionRef.current),
      { color: '#f5f5f7' },
      {
        color: '#1d1d1f',
        scrollTrigger: {
          trigger: lightSectionRef.current,
          start: 'top bottom',
          end: 'top center',
          scrub: true,
        },
      },
    )
  },
  { scope: containerRef },
)
```

### 12.2 Key Details

- Use `scrub: true` (not numeric smoothing) for color transitions — instant response feels right
- Ensure text contrast meets WCAG AA at every transition point — test at 25%, 50%, 75% progress, not just at color stops
- For ≤ 2 color stops, CSS Scroll-Driven Animations API is simpler (per ADR-0034)
- For 3+ stops, use GSAP timeline with sequential `.to()` calls (per ADR-0003 §24)

---

## 13. Combining Patterns — Composite Example

A real Apple section combines 3–4 patterns. Here's a full implementation matching how the iPhone page builds a feature section:

```tsx
'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

export function IPhoneFeatureSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      // Reduced motion — snap to final state
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.headline .line', { y: 0, clearProps: 'all' })
        gsap.set('.hero-image', { scale: 1, opacity: 1 })
        gsap.set('.body-text .line', { y: 0, clearProps: 'all' })
        gsap.set('.cta', { y: 0, opacity: 1 })
      })

      // Desktop — full choreography
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        const masterTl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            pin: true,
            scrub: 0.8, // Pattern 03: iPhone-weight smoothing
            start: 'top top',
            end: '+=400%', // Pattern 01: Long pin, generous dead space
            anticipatePin: 1,
          },
        })

        // 0% → 20%: Dead zone (Pattern 01)
        // Nothing animates. User registers the new section.

        // 20%: Headline lines reveal (Pattern 07 + 02 layer 1)
        masterTl.from('.headline .line', { y: '110%', stagger: 0.05 }, 0.2)

        // 35%: Product image scales in (Pattern 02 layer 2)
        masterTl.fromTo('.hero-image', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1 }, 0.35)

        // 55%: Body text reveals (Pattern 02 layer 3 + 07)
        masterTl.from('.body-text .line', { y: '110%', stagger: 0.04 }, 0.55)

        // 72%: CTA button (Pattern 02 layer 4)
        masterTl.fromTo('.cta', { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, 0.72)

        // 85% → 100%: Dead zone (Pattern 01)
      })

      // Mobile — simple reveals, no pinning
      mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.from('.headline', {
          y: 30,
          opacity: 0,
          scrollTrigger: { trigger: '.headline', start: 'top 85%' },
        })
        gsap.from('.hero-image', {
          y: 30,
          opacity: 0,
          scrollTrigger: { trigger: '.hero-image', start: 'top 85%' },
        })
        gsap.from('.body-text', {
          y: 30,
          opacity: 0,
          scrollTrigger: { trigger: '.body-text', start: 'top 85%' },
        })
        gsap.from('.cta', {
          y: 20,
          opacity: 0,
          scrollTrigger: { trigger: '.cta', start: 'top 85%' },
        })
      })
    },
    { scope: sectionRef },
  )

  return <section ref={sectionRef}>{/* Section content */}</section>
}
```

---

## 14. Scroll Narrative Storyboard

Apple plans scroll pages like film storyboards. Each section has a narrative role. Plan the full page before writing any animation code.

### 14.1 Act Structure

| Act                   | Role                                | Technique                                                         | Pin         |
| --------------------- | ----------------------------------- | ----------------------------------------------------------------- | ----------- |
| Act 1: Hero Reveal    | First impression — product identity | Canvas sequence (04) or Scale-in (ADR-0003 §18) + Dead Space (01) | `400–500vh` |
| Act 2: Key Feature A  | Primary selling point               | Staggered Choreography (02) + Kinetic Typography (07)             | `300vh`     |
| Act 3: Key Feature B  | Supporting feature                  | Parallax (05) + Text fade-in (07)                                 | No pin      |
| Act 4: Tech Deep-Dive | Technical credibility               | Canvas sequence (04) or Reveal Mask (06)                          | `250vh`     |
| Act 5: Color Options  | Personalization                     | Snap Points (08) or horizontal scroll                             | Optional    |
| Act 6: Specs          | Detail for decision-makers          | No pin, simple fade-in on viewport entry                          | None        |
| Act 7: CTA            | Conversion                          | Sticky pricing bar + final product shot                           | None        |

### 14.2 Budget Rules

- Hero gets 400–500vh — it earns the most scroll attention
- Supporting features get 200–300vh
- Specs get no pin at all — users want to scan, not wait
- Total complex scroll scenes per page: 1–2 maximum
- Rest of page: simple viewport reveals (`once: true` ScrollTriggers or CSS)

---

## 15. Next.js App Router Integration

### 15.1 Client Component Wrapper

```tsx
'use client'

import { useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

interface AnimatedSectionProps {
  children: ReactNode
  className?: string
}

export function AnimatedSection({ children, className }: AnimatedSectionProps) {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      // Animation code — gsap.context auto-scopes selectors to ref
    },
    { scope: ref },
  )

  return (
    <section ref={ref} className={className}>
      {children}
    </section>
  )
}
```

### 15.2 Dynamic Import (Code Splitting)

```tsx
// app/page.tsx (Server Component — no GSAP here)
import dynamic from 'next/dynamic'

const HeroSection = dynamic(
  () => import('@/components/features/hero/hero-scroll-scene').then((m) => m.HeroScrollScene),
  { ssr: false },
)
```

### 15.3 ScrollTrigger Refresh on Route Change

```tsx
'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function ScrollRefresh() {
  const pathname = usePathname()
  useEffect(() => {
    ScrollTrigger.refresh()
  }, [pathname])
  return null
}
```

---

## 16. Performance Checklist (Apple Standard)

| Check                                                                            | Why                                             |
| -------------------------------------------------------------------------------- | ----------------------------------------------- |
| Only `transform` and `opacity` animated — no layout-triggering properties        | Compositor-thread only                          |
| `will-change: transform` applied before animation, removed after                 | GPU memory management                           |
| All `scrub` values are numeric (0.3–1.0), never raw `true` for cinematic scenes  | Smoothing absorbs jitter                        |
| `prefers-reduced-motion` fully handled with static fallbacks                     | Accessibility — MUST                            |
| Mobile gets separate, simplified animation config via `matchMedia`               | Separate architecture, not responsive scaling   |
| Canvas sequences use WebP/AVIF, total < 5 MB, with static first-frame fallback   | Performance + progressive enhancement           |
| No more than 2–3 pinned sections per page                                        | Scroll fatigue prevention                       |
| Dead space: ≥ 15% of scroll distance is intentionally empty at start/end of pins | Pacing — lets users absorb content              |
| All ScrollTriggers cleaned up on unmount via `useGSAP()`                         | Memory leak prevention in SPA                   |
| Content fully readable and functional with JS disabled                           | Progressive enhancement                         |
| Background color transitions use `scrub: true` (no numeric smoothing)            | Instant color response feels correct            |
| Test at 4× CPU throttle in DevTools                                              | Mid-range phones are 4–6× slower than a MacBook |

---

## 17. Anti-Patterns

| ❌ Don't                                                       | Why                                                              | ✅ Do Instead                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| Animate two elements simultaneously within a staggered section | Simultaneous animation is noise — violates "One Thing at a Time" | Sequential timeline positions with ≥ 15% gaps             |
| Skip dead space — start animation at 0% of pin                 | User hasn't registered the section yet                           | Start active animation at 15–25% of pin                   |
| Use raw `scrub: true` on cinematic pinned scenes               | Amplifies micro-jitter, feels mechanical                         | Numeric scrub: `0.5`–`1.0`                                |
| Use the same scrub value for every section                     | Monotonous feel, ignores section personality                     | Map scrub to content weight (see §6.1)                    |
| Pin shorter than `250vh`                                       | Animation feels rushed, not worth the pin                        | Use simple fade-in for lightweight sections               |
| More than 5 layers in a staggered section                      | Confusion — user can't track the sequence                        | Cap at 3–5 layers per pin                                 |
| Exceed `800vh` for a single pinned section                     | Users get frustrated, reach for scrollbar                        | Budget scroll distance per act (§14)                      |
| Serve 2× DPR canvas frames to mobile                           | Wasted bandwidth, battery drain                                  | Serve 960px frames to mobile, 1920px to desktop           |
| Skip `<img>` fallback for canvas sequences                     | Content invisible without JS                                     | Always include first-frame `<img>`                        |
| Use canvas frame sequences on mobile                           | Battery drain, janky performance                                 | Static image or key-frame carousel on mobile              |
| Use CSS snap + GSAP snap on the same section                   | Competing scroll behaviors fight each other                      | CSS snap for macro, GSAP for micro arrival                |
| Hard-cut between dark and light sections                       | Jarring, breaks the seamless scroll flow                         | Scroll-tied color transition (§12)                        |
| Animate body text per-character                                | Expensive (each char = 1 tween), illegible at large sizes        | Per-line or per-word for headlines, block fade for body   |
| Force identical animations on desktop and mobile               | Mobile pinning feels broken on touch                             | Ship entirely separate mobile config via `matchMedia`     |
| More than 3 complex scroll scenes per page                     | Scroll fatigue — users stop engaging                             | 1–2 hero scenes, rest simple reveals                      |
| Animation gates content (invisible without JS)                 | Violates "Static First" principle                                | Default state = visible, animation = journey to get there |

---

## 18. Scope Boundary — Relationship to Other ADRs

| What This ADR Covers                                                                  | What Other ADRs Cover                                          |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Apple-style compositional philosophy (dead space, stagger rules, narrative structure) | GSAP API, ScrollTrigger config, `useGSAP()` (ADR-0003)         |
| Canvas frame sequences (new technique)                                                | Video scrubbing, horizontal scroll, number counters (ADR-0003) |
| Scrub-as-brand-personality mapping                                                    | Scrub value reference table (ADR-0003 §7)                      |
| Composite multi-pattern examples                                                      | React lifecycle/mount animations (ADR-0030)                    |
| Scroll narrative storyboard planning                                                  | CSS scroll-driven single-element effects (ADR-0034)            |
| Apple-specific color palette and transition philosophy                                | Token system and project palette (ADR-0002)                    |

This ADR is a **compositional layer** on top of ADR-0003. It does not replace ADR-0003's technique catalog — it provides the design thinking and Apple-specific implementation depth that transforms individual techniques into cohesive scroll narratives.

---

## Library Compatibility

No new libraries required. All patterns use the GSAP stack already established in ADR-0003:

| Library              | Status        | Notes                                                                     |
| -------------------- | ------------- | ------------------------------------------------------------------------- |
| `gsap`               | `recommended` | Core engine (per ADR-0003)                                                |
| `@gsap/react`        | `recommended` | `useGSAP()` hook (per ADR-0003)                                           |
| `gsap/ScrollTrigger` | `recommended` | Scroll-driven triggers (per ADR-0003)                                     |
| `gsap/SplitText`     | `compatible`  | Optional for text reveals — manual splitting is documented as alternative |

Canvas frame sequences use native `<canvas>` API and `Image()` constructor — no additional dependencies.

---

## Consequences

### Positive

- Developers have a self-contained reference for building Apple-caliber scroll experiences
- The 8-pattern catalog with timing rules prevents the most common composition mistakes (rushed pacing, simultaneous animation, monotonous scrub)
- Canvas frame sequences are documented as a first-class technique with asset pipeline
- Dead space pacing and storyboard planning ensure scroll pages feel intentional, not technically-driven
- Every pattern includes reduced motion, mobile fallback, and accessibility considerations

### Negative

- Overlap with ADR-0003 technique implementations (intentional — this ADR provides Apple-specific depth on top of the base API)
- Canvas frame sequences require asset preparation (frame rendering, format conversion) outside the codebase
- Dead space pacing requires more scroll distance per section — pages are longer, which may not suit all content types
- The 30% Rule and timing constraints require more planning upfront vs. ad-hoc animation
