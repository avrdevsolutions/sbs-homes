---
name: apple-scroll-patterns
description: >-
  Apple-style scroll animation pattern implementations (Patterns 01–05) — Dead Space Pacing with pin length guide (300/400/500vh configs and active zone percentages), Staggered Choreography with timing rules table (15% gap minimum, headline→image→body→CTA reading order), Velocity Smoothing with scrub-as-brand-personality mapping (0.5 AirPods to 1.0 Mac Pro) plus getVelocity micro-tilt effect, Canvas Frame Sequences (full CanvasSequence component, useFramePreloader hook with IntersectionObserver 2-viewports-ahead, responsive canvas with DPR handling, ffmpeg asset pipeline commands, accessibility and responsive strategy), Parallax Depth Layers (CSS-first approach with custom property + GSAP multi-element with data-parallax attribute, depth-speed mapping table). Use when implementing Apple-style dead space pacing, building a canvas frame sequence for product rotation, adding staggered choreography to a pinned section, replicating Apple product page scroll effects, or choosing the right scrub value for a product's personality.
---

# Apple Scroll — Pattern Implementations 01–05

**Compiled from**: ADR-0035 §4–8
**Last synced**: 2026-04-05

---

## Pattern 01 — Dead Space Pacing

Pin long, animate short. The scroll distance is 3–5× the viewport, but active animation only fires in the middle 30–50%.

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

    tl.to('.hero', { y: -80, ease: 'power1.inOut' }, 0.45)

    // 60% → 100%: DEAD ZONE — breathing room before next section
  },
  { scope: containerRef },
)
```

### Pin Length Guide

| Pin Length | Active Zone | Dead Space (Start) | Dead Space (End) | Apple Example               |
| ---------- | ----------- | ------------------ | ---------------- | --------------------------- |
| `300vh`    | 30–65%      | 30%                | 35%              | Feature detail section      |
| `400vh`    | 25–60%      | 25%                | 40%              | iPhone hero, MacBook reveal |
| `500vh`    | 20–55%      | 20%                | 45%              | Vision Pro spatial demo     |

### When to Use / Not Use

**Use when:** Section deserves focused attention (hero reveal, key feature); content is visually simple (1–2 elements); pin duration ≥ `250vh`.

**Don't use when:** Specs/comparison sections (use simple fade-in); sections with dense text (users want to scan); more than 2–3 dead-space sections per page (scroll fatigue).

---

## Pattern 02 — Staggered Choreography

One thing at a time. Sequential animation is narrative — stagger controls reading order.

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

### Timing Rules

| Rule                                    | Value                                                |
| --------------------------------------- | ---------------------------------------------------- |
| Minimum gap between layer start points  | 15% of timeline                                      |
| Maximum overlap between adjacent layers | 10%                                                  |
| First layer starts at                   | 10–15% (dead space before first element)             |
| Last layer completes by                 | 85–90% (dead space after last element)               |
| Maximum layers per section              | 3–5 — more creates confusion                         |
| Reading order                           | Headline → Image → Body → CTA (always this sequence) |

**Don't use when:** Section has only 1–2 elements; body text paragraphs (block fade-in only); elements that need to be read simultaneously.

---

## Pattern 03 — Velocity Smoothing

Weight > precision. The `scrub` smoothing value defines the product's perceived physical weight.

### Scrub Personality Mapping

| Product Personality | `scrub`   | Feel                        | When to Use               |
| ------------------- | --------- | --------------------------- | ------------------------- |
| Light/airy          | `0.5`     | Floating, responsive        | Wearables, audio products |
| Futuristic          | `0.6`     | Effortless, smooth          | AR/VR, spatial products   |
| Solid/grounded      | `0.8`     | Precise, cinematic          | Phones, tablets           |
| Heavy/powerful      | `1.0`     | Monolithic, weighty         | Desktops, pro hardware    |
| Dramatic            | `1.5–2.0` | Extreme cinema, slow reveal | Signature hero moments    |

### Velocity-Aware Micro-Effects

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

**Don't use smoothed scrub for:** Progress indicators/counters (need `scrub: true` for 1:1 mapping); video scrubbing (smoothing adds lag); background color transitions (instant response is correct).

---

## Pattern 04 — Canvas Frame Sequences

Pre-render product rotation as ~90 WebP frames drawn on `<canvas>`, swapping frames based on scroll position. Standard technique for turntable/360° effects.

### Full CanvasSequence Component

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

  useEffect(() => {
    const images: HTMLImageElement[] = []
    for (let i = 0; i < frameCount; i++) {
      const img = new Image()
      img.src = `${basePath}/${String(i).padStart(4, '0')}.webp`
      images.push(img)
    }
    imagesRef.current = images

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

### Responsive Canvas with DPR

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

### Lazy Preloader Hook (2 Viewports Ahead)

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

### Asset Pipeline

| Concern      | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| Format       | WebP (quality 80–85) or AVIF where supported                   |
| Desktop      | 1920px wide, 2× DPR → actual 3840px rendered                   |
| Mobile       | 960px wide — **separate** set of smaller frames                |
| Frame count  | 60–120 frames (90 is the sweet spot for 360° rotation)         |
| Total weight | < 5 MB for the full sequence                                   |
| Preload      | IntersectionObserver 2 viewports ahead via `useFramePreloader` |
| Fallback     | First frame as static `<img>` for no-JS                        |

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

### Accessibility

- First frame as eager static `<img>` — content visible without JS
- `aria-label` on canvas or container with descriptive text
- Reduced motion: show a static middle frame, no scroll animation

### Responsive Strategy

- Desktop: full canvas sequence with `scrub: 0.5`
- Tablet: same canvas sequence with simplified preloading
- Mobile: static hero image or 3–5 key frames as a swipeable carousel — **no** scroll-driven canvas

**Use for:** Product turntable/360°, material/finish showcases, assembly sequences.
**Don't use for:** Simple opacity/scale transitions; video that doesn't need frame-accurate scrubbing; mobile-only sections.

---

## Pattern 05 — Parallax Depth Layers

Speed ≠ position. Speed = depth. Differential scroll speeds create perceived depth.

### CSS-First Approach

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
useEffect(() => {
  const handler = () => {
    document.documentElement.style.setProperty('--scroll-y', `${window.scrollY}px`)
  }
  window.addEventListener('scroll', handler, { passive: true })
  return () => window.removeEventListener('scroll', handler)
}, [])
```

### GSAP Approach (Complex Multi-Element Scenes)

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

### Depth-Speed Mapping

| Layer           | Speed     | Perceived Depth        | Apple Example             |
| --------------- | --------- | ---------------------- | ------------------------- |
| Deep background | 0.10–0.20 | Sky, distant particles | Watch Ultra deep water    |
| Background      | 0.25–0.40 | Environmental elements | Bubbles, texture patterns |
| Midground       | 0.45–0.60 | Supporting elements    | Feature callout cards     |
| Product (focus) | 0.65–0.80 | Primary focus          | Watch, iPhone, AirPod     |
| Foreground/UI   | 0.85–1.00 | UI overlays, text      | Headlines, pricing        |

### Key Details

- Use `scrub: true` (not smoothed) for parallax — smoothing makes layers feel disconnected from each other
- Apply `will-change: transform` on active layers only — GPU memory is finite
- Layer count budget: ≤ 8 promoted layers per scene
- Mobile: reduce layer count or disable via `gsap.matchMedia()`
