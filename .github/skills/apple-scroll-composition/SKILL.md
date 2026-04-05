---
name: apple-scroll-composition
description: >-
  Apple-style scroll composition, advanced patterns, and production checklist — Progressive Reveal Masks (circle/Vision Pro, horizontal wipe/MacBook, vertical curtain/iPad — all with clip-path), Kinetic Typography (per-line slide-up, per-word build with SplitWords component, text animation hierarchy table), Section Snap Points (CSS snap + GSAP arrival choreography hybrid, when-to-snap decision table), Section Color Transitions (dark↔light with scroll-tied crossfade, WCAG contrast at every scroll progress point), full composite multi-pattern example combining 4 patterns with reduced motion and mobile fallback, Next.js AnimatedSection wrapper + dynamic import + ScrollRefresh patterns, Apple-standard performance checklist (12 items), 16-entry anti-patterns table. Use when combining multiple Apple scroll patterns into a cohesive scene, reviewing an Apple-style scroll page for production readiness, building reveal mask effects, implementing kinetic typography like Apple's M-chip pages, or wiring the Next.js integration for scroll-driven components.
---

# Apple Scroll — Composition, Advanced Patterns & Production

**Compiled from**: ADR-0035 §9–13, §15–17
**Last synced**: 2026-04-05

See companion skill `apple-scroll-patterns` for Pattern 01–05 implementations, and `apple-scroll-philosophy` for planning framework and storyboard structure.

---

## Pattern 06 — Progressive Reveal Masks

Conceal to create desire. Gradual reveal is more engaging than instant display.

All `clip-path` variants (`circle()`, `inset()`, `polygon()`) are GPU-composited in all modern browsers. Content behind `clip-path` is still in the DOM and accessible to screen readers.

### Circle Reveal (Vision Pro Style)

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

### Horizontal Wipe (MacBook Screen Reveal)

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

### Vertical Curtain (iPad Split-Screen Demo)

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

**Reduced motion:** Show content fully revealed — no clip animation.

---

## Pattern 07 — Kinetic Typography

Words have weight and direction. Text is choreographed to control reading pace.

### Per-Line Reveal (Apple's Default for Headlines)

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

### Per-Word Build (M-Chip Feature Callouts)

```tsx
// Manual word splitting — no SplitText plugin required
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

### Text Animation Hierarchy

| Text Type          | Animation         | Stagger    | Apple Example               |
| ------------------ | ----------------- | ---------- | --------------------------- |
| Section headline   | Per-line slide-up | 0.10–0.15s | "Designed to be loved"      |
| Feature callout    | Per-word fade-in  | 0.03–0.06s | M4 chip spec highlights     |
| Large display text | Per-character     | 0.01–0.02s | Product name reveals (rare) |
| Body text          | Block fade/slide  | N/A        | Supporting paragraphs       |

Apple almost never animates per-character — expensive (each char = 1 tween) and illegible at large sizes. Per-line is the workhorse.

**Accessibility:** All words are in the DOM at all times. The animation is decorative; content is always accessible to screen readers.

---

## Pattern 08 — Section Snap Points

Structure the journey, animate the arrival. CSS snap handles macro navigation; GSAP handles micro choreography on landing.

### CSS Layer — Macro Navigation

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

### GSAP Layer — Arrival Choreography

```tsx
useGSAP(
  () => {
    gsap.utils.toArray<HTMLElement>('.snap-section').forEach((section) => {
      const title = section.querySelector('.title')
      const visual = section.querySelector('.visual')
      const details = section.querySelector('.details')

      const enterTl = gsap.timeline({ paused: true })

      enterTl
        .from(title, { y: 60, opacity: 0, duration: 0.8, ease: 'power3.out' })
        .from(visual, { scale: 0.9, opacity: 0, duration: 1, ease: 'power2.out' }, '-=0.4')
        .from(details, { y: 30, opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3')

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

### When-to-Snap Decision Table

| Use Snap                       | Don't Use Snap                                             |
| ------------------------------ | ---------------------------------------------------------- |
| Product comparison pages       | Long-form feature pages (free scroll with pinned sections) |
| Events recaps                  | Dense content sections                                     |
| Gallery / color selectors      | Specs / detail areas                                       |
| Top 3–4 hero sections (hybrid) | Below-fold detail sections                                 |

**Hybrid approach:** CSS snap for top hero sections, then free scroll for specs/details below.

---

## Section Color Transitions

Apple product pages shift between dark and light backgrounds with gradual scroll-tied crossfades — never hard cuts.

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

**Key details:**

- Use `scrub: true` (not numeric smoothing) for color — instant response feels right
- Test WCAG AA contrast at 25%, 50%, 75% scroll progress — not just at the color stops
- For ≤ 2 color stops: CSS Scroll-Driven Animations is simpler
- For 3+ stops: GSAP timeline with sequential `.to()` calls

---

## Composite Example — Combining 4 Patterns

A real Apple feature section combining Dead Space (01), Staggered Choreography (02), Kinetic Typography (07), and mobile/reduced-motion handling.

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
            scrub: 0.8, // iPhone-weight smoothing (Pattern 03)
            start: 'top top',
            end: '+=400%', // Long pin, generous dead space (Pattern 01)
            anticipatePin: 1,
          },
        })

        // 0% → 20%: Dead zone (Pattern 01)

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

      // Mobile — simple reveals, no pinning (Pattern 03.4: Mobile is a Different Product)
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

## Next.js App Router Integration

### AnimatedSection Client Wrapper

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

### Dynamic Import for Code Splitting

```tsx
// app/page.tsx (Server Component — no GSAP here)
import dynamic from 'next/dynamic'

const HeroSection = dynamic(
  () => import('@/components/features/hero/hero-scroll-scene').then((m) => m.HeroScrollScene),
  { ssr: false },
)
```

### ScrollTrigger Refresh on Route Change

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

## Performance Checklist (Apple Standard)

| Check                                                                     | Why                                           |
| ------------------------------------------------------------------------- | --------------------------------------------- |
| Only `transform` and `opacity` animated — no layout-triggering properties | Compositor-thread only                        |
| `will-change: transform` applied before animation, removed after          | GPU memory management                         |
| All `scrub` values numeric (0.3–1.0), never `true` for cinematic scenes   | Smoothing absorbs jitter                      |
| `prefers-reduced-motion` handled — snap to final visible state            | Accessibility — MUST                          |
| Mobile gets separate, simplified config via `gsap.matchMedia()`           | Separate architecture, not responsive scaling |
| Canvas sequences: WebP/AVIF, total < 5 MB, static first-frame fallback    | Performance + progressive enhancement         |
| No more than 2–3 pinned sections per page                                 | Scroll fatigue prevention                     |
| Dead space: ≥ 15% at start, ≥ 20% at end of every pin                     | Pacing — lets users absorb content            |
| All ScrollTriggers cleaned up on unmount via `useGSAP()`                  | Memory leak prevention in SPA                 |
| Content fully readable and functional with JS disabled                    | Progressive enhancement — Static First        |
| Background color transitions use `scrub: true` (no numeric smoothing)     | Instant color response feels correct          |
| Test at 4× CPU throttle in DevTools                                       | Mid-range phones are 4–6× slower than MacBook |

---

## Anti-Patterns

| ❌ Don't                                                   | Why                                                            | ✅ Do Instead                                             |
| ---------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| Animate two elements simultaneously in a staggered section | Simultaneous animation is noise — violates One Thing at a Time | Sequential positions with ≥ 15% gaps                      |
| Skip dead space — start animation at 0% of pin             | User hasn't registered the section yet                         | Start active animation at 15–25% of pin                   |
| Use raw `scrub: true` on cinematic pinned scenes           | Amplifies micro-jitter, feels mechanical                       | Numeric scrub: `0.5`–`1.0`                                |
| Use the same scrub value for every section                 | Monotonous feel, ignores section personality                   | Map scrub to content weight (see Pattern 03)              |
| Pin shorter than `250vh`                                   | Animation feels rushed, not worth the pin                      | Use simple fade-in for lightweight sections               |
| More than 5 layers in a staggered section                  | Confusion — user can't track the sequence                      | Cap at 3–5 layers per pin                                 |
| Exceed `800vh` for a single pinned section                 | Users get frustrated, reach for scrollbar                      | Budget scroll distance per act (see philosophy skill)     |
| Serve 2× DPR canvas frames to mobile                       | Wasted bandwidth, battery drain                                | 960px frames to mobile, 1920px to desktop                 |
| Skip `<img>` fallback for canvas sequences                 | Content invisible without JS                                   | Always include first-frame `<img>`                        |
| Use canvas frame sequences on mobile                       | Battery drain, janky performance                               | Static image or key-frame carousel on mobile              |
| Use CSS snap + GSAP snap on the same section               | Competing scroll behaviors fight each other                    | CSS snap for macro, GSAP for micro arrival (Pattern 08)   |
| Hard-cut between dark and light sections                   | Jarring, breaks the seamless scroll flow                       | Scroll-tied color transition                              |
| Animate body text per-character                            | Expensive (each char = 1 tween), illegible at large sizes      | Per-line or per-word for headlines, block fade for body   |
| Force identical animations on desktop and mobile           | Mobile pinning feels broken on touch                           | Separate mobile config via `gsap.matchMedia()`            |
| More than 3 complex scroll scenes per page                 | Scroll fatigue — users stop engaging                           | 1–2 hero scenes, rest simple reveals                      |
| Animation gates content (invisible without JS)             | Violates Static First principle                                | Default state = visible, animation = journey to get there |
