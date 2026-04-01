# ADR-0030: Scroll-Driven Animation Techniques

**Status**: Accepted
**Date**: 2026-03-28

---

## Context

ADR-0003 defines the animation architecture — Framer Motion v12, LazyMotion, the three-tier scroll data flow, motion components (`MotionSection`, `MotionSectionItem`, `MotionBox`, `MotionInView`), hooks (`useMotionAnimation`, `useParallax`, `useMotionEnabled`), and reduced-motion strategy. It answers "what tools do we have?"

This ADR answers a different question: **"how do we design and compose scroll-driven animation scenes that feel like an Apple product page?"**

Apple product pages (iPhone, Mac Pro, AirPods, Vision Pro) use a consistent scroll-driven toolkit: tall sticky sections, scroll-driven transforms, horizontal conveyors, scale reveals, video scrubbing, per-word text opacity, clip-path masks, and background color morphing. These effects all share one foundation: **vertical scroll position → mapped output values → GPU-composited CSS transforms and opacity.** The project's Framer Motion system already provides this pipeline. What's missing is a catalog of techniques, the math behind scroll budget subdivision, and the composition patterns that make these scenes work.

This ADR is a companion to ADR-0003. It does not redefine architecture — it teaches technique.

## Decision

**Scroll-driven animation techniques follow the patterns documented below. All implementations use the Framer Motion system from ADR-0003. CSS Scroll-Driven Animations API (native browser `animation-timeline`) may complement Framer Motion for simple composited effects where running off the main thread provides a measurable benefit.**

---

## Rules

| Rule                                                                                         | Level      |
| -------------------------------------------------------------------------------------------- | ---------- |
| All scroll-driven scene code imports from `@/lib/motion` (per ADR-0003)                      | **MUST**   |
| Each technique must have a mobile fallback (§Mobile Fallback Patterns)                       | **MUST**   |
| Each technique must have a reduced-motion fallback (per ADR-0003 §Reduced Motion)            | **MUST**   |
| Animate only `transform` and `opacity` in scroll-driven scenes (Tier 1, ADR-0003)            | **MUST**   |
| Apply spring smoothing to all scroll-linked MotionValues (§Spring Smoothing Strategy)        | **MUST**   |
| Calculate scroll height from the scroll budget formula (§Scroll Budget Subdivision)          | **MUST**   |
| Keep per-scene GPU layer count ≤ 8 elements with active `willChange`                         | **SHOULD** |
| Disable complex scroll scenes below the `md` breakpoint (§Mobile Fallback)                   | **SHOULD** |
| Use `MotionSection` for multi-element sticky scenes; `MotionBox` for self-contained elements — or build manually when the scene needs custom scroll plumbing | **SHOULD** |
| Prefer `useTransform` chains over `useMotionValueEvent` callbacks for derived values         | **SHOULD** |
| Test scroll scenes at 30fps throttled CPU to verify smoothness on mid-range devices          | **SHOULD** |

---

## 1. Sticky-Pinned Scene Anatomy

The foundation of every Apple-style scroll-driven section. A tall outer container provides scroll real estate; an inner sticky viewport stays locked in view while scroll progress drives animations inside it.

### Structure

```
┌─────────────────────────────────────────────┐
│  Outer container  (height: N × 100vh)       │  ← provides scroll distance
│  position: relative                         │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Inner sticky viewport              │    │  ← position: sticky; top: 0
│  │  height: 100vh                      │    │  ← stays pinned while outer scrolls
│  │  overflow: hidden                   │    │
│  │                                     │    │
│  │  ┌───────────────────────────────┐  │    │
│  │  │  Animated content             │  │    │  ← transforms driven by scrollYProgress
│  │  │  (cards, images, text, video) │  │    │
│  │  └───────────────────────────────┘  │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### Why it works

- The outer container's height creates scroll distance. The browser reports scroll progress from 0 (top of outer hits top of viewport) to 1 (bottom of outer hits bottom of viewport).
- `position: sticky; top: 0` on the inner container pins it to the viewport while the outer scrolls behind it.
- `overflow: hidden` on the inner container clips animated elements that move outside the viewport bounds.
- `MotionSection` implements exactly this pattern: the `height` prop sets the outer container height, `containerHeight` sets the inner sticky height (default `100vh`), and `useScroll({ target: ref, offset })` produces `scrollYProgress`.

### Implementation with MotionSection

```tsx
<MotionSection
  height="400vh"              // 4 screens of scroll distance
  containerHeight="100vh"     // sticky viewport = full screen
  className="flex items-center justify-center"
>
  {/* Children read scrollYProgress from context */}
  <MotionSectionItem channels={...}>
    <Content />
  </MotionSectionItem>
</MotionSection>
```

### Manual implementation (when MotionSection doesn't fit)

```tsx
const ref = useRef<HTMLDivElement>(null)
const { scrollYProgress } = useScroll({
  target: ref,
  offset: ['start start', 'end end'],
})

<m.div ref={ref} className="relative" style={{ height: '400vh' }}>
  <div className="sticky top-0 h-screen overflow-hidden">
    {/* Animated content here */}
  </div>
</m.div>
```

### Common mistakes

| Mistake                                     | Symptom                                                           | Fix                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Missing `position: relative` on outer       | Sticky child escapes to nearest positioned ancestor               | `MotionSection` adds this automatically; manual: add `relative` class |
| Inner container taller than outer           | Sticky pinning never activates — element scrolls normally         | Ensure outer height > inner height                                    |
| Missing `overflow: hidden` on sticky        | Animated elements visually overflow the viewport                  | `MotionSection` adds this; manual: add `overflow-hidden`              |
| Using `position: fixed` instead of `sticky` | Element ignores scroll context entirely, breaks in nested layouts | Always use `sticky` — it respects the containing block                |
| Outer height too short                      | Animation feels rushed, not enough scroll real estate             | Use the scroll budget formula (§2)                                    |

---

## 2. Scroll Budget Subdivision

Scroll budget is the total vertical scroll distance (outer container height) allocated to a scroll-driven scene. Subdividing it correctly determines how much "screen time" each animated element gets.

### The formula

```
totalHeight = (N × screenTimePerItem + overlapZones + entryBuffer + exitBuffer) × 100vh
```

Where:

- **N** = number of items to animate through
- **screenTimePerItem** = how many "screens" of scroll each item occupies (typically 1.0–1.5)
- **overlapZones** = scroll distance where one item exits while the next enters (typically 0.2–0.5 per transition)
- **entryBuffer** = optional pause at the start before animation begins
- **exitBuffer** = optional pause at the end after animation completes

### Example: 4-card horizontal conveyor

```
4 cards × 1.2 screens each = 4.8
3 transitions × 0.3 overlap = 0.9
Entry buffer                = 0.3
Exit buffer                 = 0.0  (last card rests — no exit)
─────────────────────────────────
Total                       = 6.0 → height: "600vh"
```

### Progress range math

With a `600vh` section and `offset: ['start start', 'end end']`, `scrollYProgress` moves from 0→1 across 600vh of scroll. To allocate ranges per card:

```tsx
// 4 cards, each gets ~0.25 of the total range
// But with overlaps and buffers, the actual ranges are:
const CARD_RANGES = [
  { enter: 0.0, hold: 0.05, exit: 0.25 }, // Card 1: enters immediately, exits at 25%
  { enter: 0.2, hold: 0.3, exit: 0.5 }, // Card 2: enters at 20% (overlap with card 1)
  { enter: 0.45, hold: 0.55, exit: 0.75 }, // Card 3
  { enter: 0.7, hold: 0.8, exit: 1.0 }, // Card 4: enters, holds, no exit
]
```

### Using createMotionRange for per-card channels

```tsx
// Card 1: scale from 1.5 → 1.0, then hold, then exit left
const card1Channels = {
  scale: createMotionRange(
    [0.0, 0.05, 0.2, 0.25], // input progress points
    [1.5, 1.0, 1.0, 1.0], // output scale values
  ),
  x: createMotionRange(
    [0.0, 0.05, 0.2, 0.25],
    [0, 0, 0, -120], // percentage of viewport width
  ),
  opacity: createMotionRange([0.0, 0.05, 0.2, 0.25], [1, 1, 1, 0]),
}
```

### Guidelines

| Guideline                                 | Value                                           |
| ----------------------------------------- | ----------------------------------------------- |
| Minimum screen time per item              | 1.0 (100vh of scroll) — less feels rushed       |
| Maximum screen time per item              | 2.0 (200vh) — more feels sluggish               |
| Overlap zone for cross-fades              | 0.2–0.4 of item screen time                     |
| Overlap zone for conveyors                | 0.3–0.5 (simultaneous exit/enter needs more)    |
| Entry buffer (first item already visible) | 0.3–0.5 (gives user time to notice the pinning) |
| Total section cap                         | 800vh — beyond this, user fatigue sets in       |

---

## 3. Horizontal Scroll Conveyor

Vertical scroll drives horizontal card translation — the signature Apple product-page card parade.

### When to use

- Showcasing 3–6 product cards, feature highlights, or portfolio items
- Content is visually similar (cards of the same type) but each deserves full-screen presence
- You want the cinematic feel of a "card changing station"

### When NOT to use

- More than 8 items — too much scroll distance, user loses patience
- Items have very different aspect ratios — the uniform stage assumption breaks
- Mobile — always fall back to vertical stack (§Mobile Fallback)

### Anatomy

```
Progress: 0 ────────────────────────────────────── 1
          │                                         │
Card 1:   [═══ scale-in ═══][════ hold ════][exit→ ]
Card 2:                 [←enter][═══ scale-in ═══][════ hold ════][exit→ ]
Card 3:                                      [←enter][═══ scale-in ═══][hold]
```

Each card has three phases:

1. **Enter** — translates from off-screen right to center, scaled up
2. **Scale-in** — scales from dramatic (1.4×–1.8×) to resting (1.0×)
3. **Hold** — rests at center, natural size
4. **Exit** — translates to off-screen left (except the last card)

### Implementation pattern

```tsx
'use client'

import { useRef } from 'react'

import { type MotionValue, m, useScroll, useSpring, useTransform } from 'motion/react'

import { createMotionRange, SPRING_PRESETS } from '@/lib/motion'
import { useMotionAnimation } from '@/lib/motion'
import { useMotionEnabled } from '@/lib/motion'

// --- Scroll budget ---
// 4 cards × 1.5 screens + buffers = ~700vh
const SECTION_HEIGHT = '700vh'
const DRAMATIC_SCALE = 1.5

// Per-card progress ranges (calculated from §2 formula)
const CARDS = [
  { scaleIn: [0.0, 0.12], hold: [0.12, 0.22], exit: [0.22, 0.3] },
  { enter: [0.22, 0.3], scaleIn: [0.3, 0.42], hold: [0.42, 0.52], exit: [0.52, 0.6] },
  { enter: [0.52, 0.6], scaleIn: [0.6, 0.72], hold: [0.72, 0.82], exit: [0.82, 0.9] },
  { enter: [0.82, 0.9], scaleIn: [0.9, 1.0], hold: [1.0, 1.0] }, // last card: no exit
]

type ConveyorCardProps = {
  index: number
  progress: MotionValue<number>
  children: React.ReactNode
}

const ConveyorCard = ({ index, progress, children }: ConveyorCardProps) => {
  const card = CARDS[index]
  const motionEnabled = useMotionEnabled()

  // Build the channel maps based on card phase
  const isFirst = index === 0
  const isLast = index === CARDS.length - 1

  // X position: enter from right → center → exit left
  const xPoints: number[] = []
  const xValues: number[] = []

  if (!isFirst && card.enter) {
    xPoints.push(card.enter[0], card.enter[1])
    xValues.push(100, 0) // enter from 100% right
  }
  xPoints.push(card.scaleIn[0], card.hold[0])
  xValues.push(isFirst ? 0 : 0, 0) // hold at center
  if (!isLast && card.exit) {
    xPoints.push(card.exit[0], card.exit[1])
    xValues.push(0, -100) // exit to -100% left
  }

  // Scale: dramatic → 1.0
  const scalePoints = [card.scaleIn[0], card.scaleIn[1]]
  const scaleValues = [DRAMATIC_SCALE, 1.0]

  const channels = {
    x: createMotionRange(xPoints, xValues),
    scale: createMotionRange(scalePoints, scaleValues),
  }

  const values = useMotionAnimation(progress, channels, {
    smooth: SPRING_PRESETS.smooth,
  })

  if (!motionEnabled) return <div className='w-full'>{children}</div>

  return (
    <m.div
      className='absolute inset-0 flex items-center justify-center'
      style={{
        x: useTransform(values.x, (v) => `${v}%`),
        scale: values.scale,
        willChange: 'transform',
      }}
    >
      {children}
    </m.div>
  )
}
```

### Image parallax within conveyor cards

Each card's image drifts at a different rate than the card itself, creating depth:

```tsx
// Inside ConveyorCard — image parallax relative to card's visible range
const imageYChannels = {
  y: createMotionRange(
    [card.scaleIn[0], card.exit?.[1] ?? card.hold[0]],
    [20, -20] // subtle vertical drift in pixels
  ),
}

const imageValues = useMotionAnimation(progress, imageYChannels, {
  smooth: SPRING_PRESETS.smooth,
})

<m.div className="overflow-hidden rounded-2xl">
  <m.img
    src={imageSrc}
    alt={alt}
    className="h-full w-full object-cover"
    style={{ y: imageValues.y, willChange: 'transform' }}
  />
</m.div>
```

---

## 4. Scale-In / Scale-Out Hero

A product image starts at a dramatic, larger-than-life scale and shrinks to natural size as the user scrolls. Creates the "close-up then reveal" effect Apple uses for hero product shots.

### When to use

- Section opener — the first thing the user sees when they scroll into a section
- Product photography or a single hero image
- Combined with a sticky section where the scaling is the primary animation

### When NOT to use

- Multiple items competing for attention — scale overwhelms when duplicated
- Content with text overlays that must remain readable at all scales

### Implementation

```tsx
const HERO_SCALE = 1.8 // start dramatic — adjust per content

const heroChannels = {
  scale: createMotionRange(
    [0.0, 0.3, 0.8, 1.0],
    [HERO_SCALE, 1.0, 1.0, 0.9]  // scale in → hold → slight scale-out as section exits
  ),
  opacity: createMotionRange(
    [0.0, 0.1, 0.85, 1.0],
    [1, 1, 1, 0]                    // fully visible during hold, fade on exit
  ),
}

// Using MotionSection + MotionSectionItem:
<MotionSection height="300vh" className="flex items-center justify-center bg-surface-primary">
  <MotionSectionItem
    channels={heroChannels}
    smooth={SPRING_PRESETS.smooth}
    className="w-[80vw] max-w-5xl"
  >
    <Image src={heroImage} alt="Product hero" priority fill className="object-contain" />
  </MotionSectionItem>
</MotionSection>
```

### Scale factor guidelines

| Content type                     | Recommended start scale | Notes                                                                    |
| -------------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| Full-bleed product photo         | 1.4–1.6                 | Fills viewport at start, settles to natural                              |
| Centered product with whitespace | 1.6–2.0                 | More dramatic — whitespace absorbs excess                                |
| Card or contained element        | 1.2–1.4                 | Subtler — card border makes scale obvious                                |
| Text block                       | 1.05–1.1                | Very subtle — text readability degrades fast at scale                    |
| Hero-to-card shrink              | Inverse — start at 1.0  | Use `scale` down (e.g. 1.0→0.4) + `translate` to reposition. Tier 1.   |

---

## 5. Cross-Fade Panel Sequence

Multiple full-screen content panels stacked in the same sticky viewport, fading in and out sequentially. Each panel gets its "moment" — Apple uses this for feature descriptions where each scroll position reveals a different product benefit.

### When to use

- 3–6 content panels describing different features or benefits
- Each panel deserves full-screen treatment
- Visual continuity matters — smoother than page sections

### When NOT to use

- Panels have very different structures (mixed text-heavy and image-heavy) — cross-fade feels disjointed
- User needs to compare panels side by side

### Anatomy

```
Progress: 0 ──────────────────────────────── 1
Panel 1:  [████ visible ████][fade out]
Panel 2:       [fade in][████ visible ████][fade out]
Panel 3:                     [fade in][████ visible ████]
```

### Implementation

```tsx
const PANEL_COUNT = 3
const panelDuration = 1 / PANEL_COUNT // each panel gets equal time

const getPanelChannels = (index: number, total: number) => {
  const start = index / total
  const end = (index + 1) / total
  const fadeIn = start + panelDuration * 0.1
  const fadeOut = end - panelDuration * 0.1

  return {
    opacity: createMotionRange([start, fadeIn, fadeOut, end], [0, 1, 1, 0]),
  }
}

// Last panel: no fade out
const getLastPanelChannels = (index: number, total: number) => {
  const start = index / total
  const fadeIn = start + panelDuration * 0.1

  return {
    opacity: createMotionRange([start, fadeIn, 1.0], [0, 1, 1]),
  }
}

// Usage:
;<MotionSection height='400vh' className='relative'>
  {panels.map((panel, i) => (
    <MotionSectionItem
      key={panel.id}
      channels={
        i === panels.length - 1
          ? getLastPanelChannels(i, panels.length)
          : getPanelChannels(i, panels.length)
      }
      smooth={SPRING_PRESETS.smooth}
      className='absolute inset-0 flex items-center justify-center'
    >
      <PanelContent {...panel} />
    </MotionSectionItem>
  ))}
</MotionSection>
```

### With directional movement

Add a subtle y-translate to make panels feel like they're sliding in from below:

```tsx
const getPanelChannelsWithSlide = (index: number, total: number) => {
  const start = index / total
  const end = (index + 1) / total
  const fadeIn = start + panelDuration * 0.15
  const fadeOut = end - panelDuration * 0.15

  return {
    opacity: createMotionRange([start, fadeIn, fadeOut, end], [0, 1, 1, 0]),
    y: createMotionRange([start, fadeIn, fadeOut, end], [40, 0, 0, -40]),
  }
}
```

---

## 6. Per-Word / Per-Line Text Reveal

Text that highlights or illuminates word-by-word as the user scrolls. Apple uses this for feature descriptions — words go from dim (0.15 opacity) to full brightness sequentially.

### When to use

- Feature description or manifesto text
- A single sentence or short paragraph that deserves dramatic treatment
- Section where the text IS the experience (no hero image competing)

### When NOT to use

- Long paragraphs — too much scroll distance, user loses patience
- Body copy — only for headlines and taglines
- Content that must be immediately readable (e.g., pricing, legal)

### Implementation

The pattern requires extracting a `WordSpan` child component (hooks can't go inside `.map()`):

```tsx
'use client'

import { type MotionValue, m, useSpring, useTransform } from 'motion/react'

import { useMotionEnabled } from '@/lib/motion'

const DIM_OPACITY = 0.15
const FULL_OPACITY = 1.0

type WordSpanProps = {
  word: string
  index: number
  totalWords: number
  progress: MotionValue<number>
}

const WordSpan = ({ word, index, totalWords, progress }: WordSpanProps) => {
  const motionEnabled = useMotionEnabled()

  // Each word occupies a narrow slice of the total scroll range
  const wordStart = index / totalWords
  const wordEnd = (index + 1) / totalWords

  // Smooth the source progress
  const smoothProgress = useSpring(progress, { stiffness: 120, damping: 20, mass: 0.35 })

  // Map this word's range to opacity
  const opacity = useTransform(smoothProgress, [wordStart, wordEnd], [DIM_OPACITY, FULL_OPACITY])

  if (!motionEnabled) return <span>{word} </span>

  return (
    <m.span style={{ opacity }} className='inline-block'>
      {word}
      {'\u00A0'}
    </m.span>
  )
}

type ScrollTextRevealProps = {
  text: string
  progress: MotionValue<number>
  className?: string
}

export const ScrollTextReveal = ({ text, progress, className }: ScrollTextRevealProps) => {
  const words = text.split(' ')

  return (
    <p className={className}>
      {words.map((word, i) => (
        <WordSpan
          key={`${word}-${i}`}
          word={word}
          index={i}
          totalWords={words.length}
          progress={progress}
        />
      ))}
    </p>
  )
}
```

### Per-line variant

For longer text, reveal line by line instead of word by word. Split at `\n` and apply the same pattern with `<m.span className="block">` per line.

### With color transition (dim → accent → white)

```tsx
const color = useTransform(
  smoothProgress,
  [wordStart, wordEnd],
  ['hsl(var(--text-muted))', 'hsl(var(--text-primary))']
)

<m.span style={{ color }}>...</m.span>
```

---

## 7. Parallax Depth Layers

Multiple visual layers moving at different speeds relative to scroll, creating a sense of three-dimensional depth. Apple uses this within product sections — the product moves at one speed while background textures and foreground particles move at others.

### When to use

- Hero sections with multiple visual layers (product, background, decorative elements)
- Sections where depth perception enhances the storytelling
- Combined with sticky scenes for immersive effect

### When NOT to use

- Content-heavy sections where parallax distracts from reading
- More than 3–4 layers — diminishing returns and GPU overhead

### Implementation with useParallax (simple)

```tsx
import { useParallax } from '@/lib/motion'

const HeroWithDepth = () => {
  const bgLayer = useParallax(30) // slow — background moves 30px
  const midLayer = useParallax(60) // medium
  const fgLayer = useParallax(90) // fast — foreground moves 90px

  return (
    <div className='relative h-screen overflow-hidden'>
      <m.div ref={bgLayer.ref} style={bgLayer.style} className='absolute inset-0 -inset-y-10'>
        <BackgroundTexture />
      </m.div>
      <m.div ref={midLayer.ref} style={midLayer.style} className='relative z-10'>
        <ProductImage />
      </m.div>
      <m.div
        ref={fgLayer.ref}
        style={fgLayer.style}
        className='pointer-events-none absolute inset-0 z-20'
      >
        <ForegroundParticles />
      </m.div>
    </div>
  )
}
```

### Implementation within a sticky section (context-driven)

When parallax is inside a `MotionSection`, use `MotionSectionItem` with y-channels at different speeds:

```tsx
<MotionSection height='300vh' className='relative'>
  {/* Background layer — slow */}
  <MotionSectionItem
    channels={{ y: createMotionRange([0, 1], [0, -30]) }}
    smooth={SPRING_PRESETS.smooth}
    className='absolute inset-0 -inset-y-8'
  >
    <BackgroundImage />
  </MotionSectionItem>

  {/* Main content — no parallax */}
  <div className='relative z-10'>
    <MainContent />
  </div>

  {/* Foreground layer — fast */}
  <MotionSectionItem
    channels={{ y: createMotionRange([0, 1], [0, -90]) }}
    smooth={SPRING_PRESETS.smooth}
    className='pointer-events-none absolute inset-0 z-20'
  >
    <DecorativeElements />
  </MotionSectionItem>
</MotionSection>
```

### Parallax within clipped cards

Image drift inside a card with overflow clipping — the image is taller than the card and slides within it:

```tsx
// Card container clips the overflow
<div className='relative h-80 overflow-hidden rounded-2xl'>
  {/* Image is ~120% height, parallax slides it within the card */}
  <MotionSectionItem
    channels={{ y: createMotionRange([0, 1], [20, -20]) }}
    smooth={SPRING_PRESETS.smooth}
    className='absolute inset-x-0 -inset-y-[10%] h-[120%]'
  >
    <Image src={src} alt={alt} fill className='object-cover' />
  </MotionSectionItem>
</div>
```

### Speed ratio guidelines

| Layer                 | Speed (px) | Relative rate | Effect                       |
| --------------------- | ---------- | ------------- | ---------------------------- |
| Far background        | 15–30      | 0.3×          | Barely moves — deep distance |
| Near background       | 40–60      | 0.6×          | Moderate — mid-distance      |
| Main subject          | 0          | 1.0× (static) | Reference point for depth    |
| Foreground decoration | 70–100     | 1.5×          | Fast — close to camera       |

---

## 8. Video Scrubbing

Video playback controlled by scroll position — the illusion that scrolling "plays" the video. Apple's most recognizable technique (iPhone page, AirPods page).

### When to use

- Product reveal videos or 360° product rotation
- Complex animations that are too expensive to reproduce in CSS/transforms
- The "wow" moment — video scrubbing has the highest perceived quality of any scroll technique

### When NOT to use

- Poor network conditions expected — video must preload fully before scrubbing works
- Content that makes sense only at normal playback speed (narration, music)
- Mobile with limited bandwidth (consider a fallback image sequence)

### Implementation

```tsx
'use client'

import { useEffect, useRef } from 'react'

import { type MotionValue, useMotionValueEvent, useSpring, useTransform } from 'motion/react'

import { useMotionEnabled } from '@/lib/motion'

type ScrollVideoProps = {
  src: string
  progress: MotionValue<number>
  className?: string
}

export const ScrollVideo = ({ src, progress, className }: ScrollVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastFrameRef = useRef(0) // throttle guard
  const motionEnabled = useMotionEnabled()

  // Deadzone: ignore the first 5% and last 5% of scroll
  const clampedProgress = useTransform(progress, [0.05, 0.95], [0, 1])

  // Smooth to prevent jittery frame seeking
  const smoothProgress = useSpring(clampedProgress, {
    stiffness: 80,
    damping: 25,
    mass: 0.5,
  })

  // Map progress to video duration
  useMotionValueEvent(smoothProgress, 'change', (latest) => {
    const video = videoRef.current
    if (!video || !video.duration || !motionEnabled) return

    // Frame throttle: only update if enough progress changed
    const targetTime = latest * video.duration
    if (Math.abs(targetTime - lastFrameRef.current) < 0.03) return

    lastFrameRef.current = targetTime
    video.currentTime = targetTime
  })

  // Preload the video
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.preload = 'auto'
    video.load()
  }, [src])

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      playsInline
      preload='auto'
      className={className}
      // Do NOT set autoPlay — scroll controls playback
    />
  )
}
```

### Usage in a sticky section

```tsx
<MotionSection height='500vh'>
  <ScrollVideo
    src='/videos/product-rotation.mp4'
    progress={scrollYProgress}
    className='h-full w-full object-cover'
  />
</MotionSection>
```

### Frame-snapping for smoother seeking

For videos where individual frames matter (product rotation), snap time to frame boundaries:

```tsx
const FRAME_RATE = 30

const snapToFrame = (time: number): number => {
  return Math.round(time * FRAME_RATE) / FRAME_RATE
}

// In the event handler:
video.currentTime = snapToFrame(targetTime)
```

### Reduced motion

Under reduced motion, display the video poster frame or a static image. Do not scrub.

---

## 9. Background Color / Theme Transitions

The page background color morphs as the user scrolls between sections, creating distinct visual "zones." Apple uses this to shift between light and dark themes within a single page.

### When to use

- Sections with different visual themes (light → dark → light)
- Creating a sense of progression through distinct chapters
- Product color showcase (background matches product color)

### When NOT to use

- High-contrast transitions that flash — can trigger vestibular issues
- More than 4 color stops — becomes a rainbow, loses intentionality

### Implementation

```tsx
'use client'

import { m, useScroll, useSpring, useTransform } from 'motion/react'

import { SPRING_PRESETS } from '@/lib/motion'
import { useMotionEnabled } from '@/lib/motion'

type ScrollColorSectionProps = {
  colors: string[] // e.g. ['#000000', '#1a1a2e', '#f5f5f5']
  children: React.ReactNode
}

export const ScrollColorSection = ({ colors, children }: ScrollColorSectionProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const motionEnabled = useMotionEnabled()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  const smoothProgress = useSpring(scrollYProgress, SPRING_PRESETS.smooth)

  // Generate evenly spaced stops: [0, 0.5, 1] for 3 colors
  const stops = colors.map((_, i) => i / (colors.length - 1))

  const backgroundColor = useTransform(smoothProgress, stops, colors)

  if (!motionEnabled) {
    return <div ref={ref}>{children}</div>
  }

  return (
    <m.div ref={ref} style={{ backgroundColor }}>
      {children}
    </m.div>
  )
}
```

### With text color adaptation

When the background shifts from light to dark, text color must follow:

```tsx
const textColor = useTransform(
  smoothProgress,
  [0, 0.45, 0.55, 1],
  ['hsl(var(--text-primary))', 'hsl(var(--text-primary))', '#ffffff', '#ffffff'],
)
```

### Accessibility

- Ensure contrast ratios meet WCAG AA at every point in the transition (not just start/end)
- Test mid-transition colors — the interpolated values between stops may have insufficient contrast
- Under reduced motion, snap to the nearest color stop rather than interpolating

---

## 10. Clip-Path / Mask Reveals

An element is revealed through an expanding clip-path tied to scroll progress. Creates dramatic product reveals — like a curtain opening or a spotlight expanding.

### When to use

- Dramatic product reveal — the "unveiling" moment
- Section transitions — one section's content is clipped away to reveal the next
- Image galleries where images "open" as you scroll

### When NOT to use

- Content that must be immediately accessible (clip-path hides it from screen readers unless handled)
- Safari < 15.4 without fallback — `clip-path` animations weren't GPU-accelerated

### Implementation

```tsx
'use client'

import { type MotionValue, m, useSpring, useTransform } from 'motion/react'

import { SPRING_PRESETS } from '@/lib/motion'
import { useMotionEnabled } from '@/lib/motion'

type ClipRevealProps = {
  progress: MotionValue<number>
  /** Progress range within which the reveal happens */
  revealRange?: [number, number]
  /** Shape: 'circle' expands from center, 'inset' reveals from edges */
  shape?: 'circle' | 'inset'
  children: React.ReactNode
  className?: string
}

export const ClipReveal = ({
  progress,
  revealRange = [0, 0.5],
  shape = 'circle',
  children,
  className,
}: ClipRevealProps) => {
  const motionEnabled = useMotionEnabled()

  const smoothProgress = useSpring(progress, SPRING_PRESETS.smooth)

  const clipPath = useTransform(smoothProgress, revealRange, (v) => {
    // Normalize to 0–1 within the reveal range
    const t = Math.max(0, Math.min(1, (v - revealRange[0]) / (revealRange[1] - revealRange[0])))

    if (shape === 'circle') {
      // Circle expands from center: 0% → 75% radius
      const radius = t * 75
      return `circle(${radius}% at 50% 50%)`
    }

    // Inset shrinks from edges to nothing
    const inset = (1 - t) * 50
    return `inset(${inset}% ${inset}% ${inset}% ${inset}%)`
  })

  if (!motionEnabled) return <div className={className}>{children}</div>

  return (
    <m.div style={{ clipPath }} className={className}>
      {children}
    </m.div>
  )
}
```

### Usage

```tsx
<MotionSection height='300vh'>
  <ClipReveal progress={scrollYProgress} shape='circle' revealRange={[0.1, 0.5]}>
    <Image src='/images/hero.webp' alt='Product reveal' fill className='object-cover' />
  </ClipReveal>
</MotionSection>
```

### Accessibility note

Content hidden by `clip-path` is still in the DOM and accessible to screen readers. This is correct behavior — the visual reveal is decorative animation, not content gating.

---

## 11. Zoom-Through (Scale to Full-Screen)

An element starts small (like a thumbnail or badge) and scales to fill the entire viewport as the user scrolls. Creates the "diving into the product" effect.

### When to use

- Transition from overview to detail — a card in a grid scales up to become the section hero
- Product showcase where the product "comes to you"
- Section transitions — one section's hero element becomes the next section's background

### When NOT to use

- Elements with text — text at 3× scale is unreadable blur
- Without a sticky section — the element would scroll past while scaling

### Implementation

```tsx
const zoomChannels = {
  scale: createMotionRange(
    [0.0, 0.4, 0.6, 1.0],
    [0.3, 0.3, 1.0, 1.0]    // hold small → scale to full → hold full
  ),
  borderRadius: createMotionRange(
    [0.0, 0.4, 0.6, 1.0],
    [24, 24, 0, 0]            // rounded when small → sharp when full
  ),
}

<MotionSection height="300vh" className="flex items-center justify-center">
  <MotionSectionItem
    channels={zoomChannels}
    smooth={SPRING_PRESETS.smooth}
    className="w-full h-full"
  >
    <Image src="/images/product.webp" alt="Product zoom" fill className="object-cover" />
  </MotionSectionItem>
</MotionSection>
```

### With opacity layering

Combine with a text overlay that fades out as the image zooms in:

```tsx
const textChannels = {
  opacity: createMotionRange([0.0, 0.2, 0.35], [1, 1, 0]),
  scale: createMotionRange([0.0, 0.35], [1, 0.95]),
}

const imageChannels = {
  scale: createMotionRange([0.0, 0.35, 0.6], [0.3, 0.3, 1.0]),
  opacity: createMotionRange([0.0, 0.3, 0.4], [0, 0, 1]),
}
```

---

## 12. Number Counter Animation

Numeric values that count up from 0 (or a start value) to their final value as the user scrolls through. Apple uses this for product specs — "20 hours battery life" ticks up from 0 to 20.

### When to use

- Product specifications, performance metrics, stats
- "By the numbers" sections

### When NOT to use

- Non-numeric content
- Numbers that don't have impact (counting to 3 is not impressive)

### Implementation

```tsx
'use client'

import { type MotionValue, m, useSpring, useTransform } from 'motion/react'

import { SPRING_PRESETS } from '@/lib/motion'
import { useMotionEnabled } from '@/lib/motion'

type ScrollCounterProps = {
  from: number
  to: number
  progress: MotionValue<number>
  /** Progress range within which counting happens */
  countRange?: [number, number]
  /** Number of decimal places */
  decimals?: number
  suffix?: string
  prefix?: string
  className?: string
}

export const ScrollCounter = ({
  from,
  to,
  progress,
  countRange = [0.2, 0.6],
  decimals = 0,
  suffix = '',
  prefix = '',
  className,
}: ScrollCounterProps) => {
  const motionEnabled = useMotionEnabled()

  const smoothProgress = useSpring(progress, SPRING_PRESETS.smooth)

  const value = useTransform(smoothProgress, countRange, [from, to])

  // Round to specified decimal places
  const display = useTransform(value, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`)

  if (!motionEnabled) {
    return (
      <span className={className}>
        {prefix}
        {to.toFixed(decimals)}
        {suffix}
      </span>
    )
  }

  return <m.span className={className}>{display}</m.span>
}
```

### Usage

```tsx
<MotionSection height='200vh' className='flex items-center justify-center gap-16'>
  <ScrollCounter from={0} to={20} suffix=' hours' progress={scrollYProgress} />
  <ScrollCounter from={0} to={120} suffix=' fps' progress={scrollYProgress} />
  <ScrollCounter from={0} to={6.1} suffix='"' decimals={1} progress={scrollYProgress} />
</MotionSection>
```

### Accessibility

Add `aria-label` with the final value so screen readers announce "20 hours" immediately, not the animated intermediate values.

---

## 13. Multi-Element Choreography

Orchestrating multiple animated elements within a single scroll range — the "timeline within a timeline" pattern. This is how Apple coordinates text, image, badge, and background animations to enter and exit in a composed sequence.

### The principle

A single `scrollYProgress` (0→1) is the master clock. Each element maps different sub-ranges of that clock to its own animation. The key is **phase staggering**: elements don't all animate at once — they enter, hold, and exit at slightly offset ranges.

### Phase pattern

```
Progress: 0 ──── 0.2 ──── 0.4 ──── 0.6 ──── 0.8 ──── 1.0
                  │         │         │         │
Background: [═══ fade in ══════════ hold ══════════ fade out ═══]
Headline:         [═══ enter ═══][═════ hold ═════][═ exit ═]
Body text:           [══ enter ══][═══ hold ═══][═ exit ═]
CTA badge:              [═ enter ═][══ hold ══][exit]
Product img:   [═══════════════ slow scale ═══════════════════]
```

Each element starts its animation slightly after the previous one — creating a "waterfall" effect where elements cascade in.

### Implementation

```tsx
// Phase offsets for choreography — all elements share one scrollYProgress
const CHOREO = {
  bg: { fadeIn: [0.0, 0.1], hold: [0.1, 0.85], fadeOut: [0.85, 1.0] },
  headline: { enter: [0.1, 0.2], hold: [0.2, 0.7], exit: [0.7, 0.8] },
  body: { enter: [0.15, 0.25], hold: [0.25, 0.65], exit: [0.65, 0.75] },
  badge: { enter: [0.2, 0.3], hold: [0.3, 0.6], exit: [0.6, 0.7] },
  image: { scaleRange: [0.0, 1.0] },
}

const headlineChannels = {
  opacity: createMotionRange(
    [
      CHOREO.headline.enter[0],
      CHOREO.headline.enter[1],
      CHOREO.headline.exit[0],
      CHOREO.headline.exit[1],
    ],
    [0, 1, 1, 0],
  ),
  y: createMotionRange(
    [
      CHOREO.headline.enter[0],
      CHOREO.headline.enter[1],
      CHOREO.headline.exit[0],
      CHOREO.headline.exit[1],
    ],
    [30, 0, 0, -30],
  ),
}

const bodyChannels = {
  opacity: createMotionRange(
    [CHOREO.body.enter[0], CHOREO.body.enter[1], CHOREO.body.exit[0], CHOREO.body.exit[1]],
    [0, 1, 1, 0],
  ),
  y: createMotionRange(
    [CHOREO.body.enter[0], CHOREO.body.enter[1], CHOREO.body.exit[0], CHOREO.body.exit[1]],
    [20, 0, 0, -20],
  ),
}

// ... similar for badge, bg, image
```

### Helper: createChoreoChannels

A utility to generate enter/hold/exit channels without manual math:

```tsx
type Phase = {
  enter: [number, number]
  hold: [number, number]
  exit: [number, number]
}

/**
 * Creates standard opacity + y channels for a choreographed element.
 * Enter: fade + slide up. Hold: visible. Exit: fade + slide out.
 */
const createChoreoChannels = (phase: Phase, { yDistance = 25 }: { yDistance?: number } = {}) => ({
  opacity: createMotionRange(
    [phase.enter[0], phase.enter[1], phase.exit[0], phase.exit[1]],
    [0, 1, 1, 0],
  ),
  y: createMotionRange(
    [phase.enter[0], phase.enter[1], phase.exit[0], phase.exit[1]],
    [yDistance, 0, 0, -yDistance],
  ),
})
```

---

## 14. Spring Smoothing Strategy

Raw `scrollYProgress` updates every paint frame with the exact scroll position. Without smoothing, scroll-driven animations feel "1:1 mechanical" — tightly locked to the finger/trackpad. **Spring smoothing adds physical weight**, making elements feel like they have mass and momentum. This is the difference between "JS scroll handler" and "Apple."

### When to smooth

**Always.** Every scroll-driven MotionValue should be smoothed. The question is which spring preset.

### Preset selection guide

| Preset                  | Config                                        | Feel                         | Best for                                                |
| ----------------------- | --------------------------------------------- | ---------------------------- | ------------------------------------------------------- |
| `SPRING_PRESETS.smooth` | `{ stiffness: 120, damping: 20, mass: 0.35 }` | Weighted, cinematic trailing | Parallax, background color, opacity fades, text reveals |
| `SPRING_PRESETS.snappy` | `{ stiffness: 500, damping: 28, mass: 0.4 }`  | Tight, responsive            | Navigation indicators, progress bars, counters          |
| `SPRING_PRESETS.bouncy` | `{ stiffness: 300, damping: 15, mass: 0.5 }`  | Playful overshoot            | Card entrances, badge reveals                           |
| Custom heavy            | `{ stiffness: 60, damping: 18, mass: 0.8 }`   | Slow, weighty, luxurious     | Hero scale animations, zoom-through, dramatic reveals   |

### How smoothing works in the pipeline

```
scrollYProgress (raw)
     │
     ▼
useSpring(scrollYProgress, springConfig)  ← smoothing applied HERE
     │
     ▼
useTransform / useMotionAnimation         ← maps smoothed progress to CSS values
     │
     ▼
m.div style={{ ... }}                     ← GPU-composited render
```

### With MotionSectionItem / MotionBox

Both accept a `smooth` prop that applies spring smoothing before channel mapping:

```tsx
<MotionSectionItem
  channels={myChannels}
  smooth={SPRING_PRESETS.smooth}  // ← smooth the consumed scrollYProgress
>
```

### Manual smoothing

When using `useScroll` + `useTransform` directly:

```tsx
const { scrollYProgress } = useScroll({ target: ref, offset: [...] })
const smoothed = useSpring(scrollYProgress, SPRING_PRESETS.smooth)
const scale = useTransform(smoothed, [0, 1], [1.5, 1.0])
```

### Latency vs. weight tradeoff

Higher mass and lower stiffness = more cinematic weight, but also more perceived input lag. If the user scrolls quickly and the animation is still catching up 200ms+ later, it feels broken, not luxurious.

| Stiffness | Damping | Mass | Catch-up time | Feels like                            |
| --------- | ------- | ---- | ------------- | ------------------------------------- |
| 500       | 28      | 0.4  | ~50ms         | Nearly 1:1 — responsive               |
| 120       | 20      | 0.35 | ~120ms        | Weighted — the Apple sweet spot       |
| 60        | 18      | 0.8  | ~300ms        | Heavy — may feel laggy on fast scroll |

### Rule of thumb

- If the user can see the element while actively scrolling (parallax, conveyors): use `smooth` preset
- If the element appears only at a progress threshold (reveals, clip-paths): `smooth` or `bouncy`
- If the animation must feel precise (progress bars, counters): use `snappy`
- If the moment is dramatic and worth waiting for (hero zoom-through): use custom heavy

---

## 15. Mobile Fallback Patterns

Complex scroll-driven scenes (sticky pinning, horizontal conveyors, multi-layer parallax) should be simplified or disabled on mobile. Reasons:

1. **Sticky + tall sections hijack the scroll experience** — on mobile, users scroll to navigate, not to animate
2. **GPU memory is limited** — multi-layer composited transforms can cause thermal throttling
3. **Touch scroll physics differ** — spring smoothing on top of iOS momentum scrolling creates conflicting physics
4. **Screen size** — dramatic scale effects (1.5× product hero) may overflow the viewport

### Decision tree

```
Is the user on a device below the md breakpoint (768px)?
├── YES → Use mobile fallback
│   ├── Sticky-pinned scene → Vertical stack with MotionInView reveals
│   ├── Horizontal conveyor → Vertical card column with viewport reveals
│   ├── Multi-layer parallax → Static layers, no parallax
│   ├── Video scrubbing → Autoplay muted video OR static poster
│   ├── Cross-fade panels → Vertical stack with MotionInView reveals
│   ├── Zoom-through → Static image at final size
│   ├── Per-word text reveal → Paragraph appears with MotionInView (whole block)
│   └── Number counter → MotionInView fade-in with final value
├── NO → Use full scroll-driven scene
```

### Implementation: breakpoint detection

```tsx
'use client'

import { useMediaQuery } from '@/hooks/useMediaQuery'

const ProductSection = () => {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (!isDesktop) return <ProductSectionMobile />
  return <ProductSectionDesktop />
}
```

Or with dynamic import to avoid shipping desktop animation code to mobile:

```tsx
import dynamic from 'next/dynamic'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const ProductSectionDesktop = dynamic(() => import('./ProductSectionDesktop'), { ssr: false })

const ProductSection = () => {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (!isDesktop) return <ProductSectionMobile />
  return <ProductSectionDesktop />
}
```

### Mobile fallback: vertical stack with MotionInView

The standard mobile pattern — cards stack vertically, each with a simple viewport reveal:

```tsx
const ProductSectionMobile = ({ cards }: { cards: CardData[] }) => (
  <Section>
    <Container>
      <Stack gap='lg'>
        {cards.map((card) => (
          <MotionInView key={card.id} direction='up' distance={20} scaleRange={[0.96, 1]} once>
            <ProductCard {...card} />
          </MotionInView>
        ))}
      </Stack>
    </Container>
  </Section>
)
```

### Reduced motion (all breakpoints)

Under `prefers-reduced-motion: reduce`, collapse to the mobile layout regardless of screen size:

```tsx
const motionEnabled = useMotionEnabled()
const isDesktop = useMediaQuery('(min-width: 768px)')

// Reduced motion → always use simple layout
if (!motionEnabled || !isDesktop) return <ProductSectionMobile />
return <ProductSectionDesktop />
```

---

## 16. Performance Rules for Complex Scenes

Complex scroll-driven scenes add multiple composited layers, spring computations, and MotionValues. Performance degrades gracefully until it doesn't — then it jank-frames.

### Layer budget

| Constraint                                           | Limit   | Why                                                                 |
| ---------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| Active `willChange: transform` elements per scene    | ≤ 8     | Each creates a GPU compositing layer; more = memory pressure        |
| Active `useSpring` instances per scene               | ≤ 12    | Each runs a spring solver per frame; springs are cheap but not free |
| Active `useMotionValueEvent` subscriptions per scene | ≤ 4     | Each triggers JS per scroll frame; keep imperative work minimal     |
| Total section height                                 | ≤ 800vh | Beyond this, user fatigue > animation value                         |

### willChange management

`buildWillChange()` from the motion system handles this automatically for `MotionSectionItem` and `MotionBox`. For manual implementations:

```tsx
// ✅ Correct: apply willChange only when motion is enabled
const motionEnabled = useMotionEnabled()

<m.div style={{
  ...values,
  willChange: motionEnabled ? 'transform, opacity' : undefined,
}}>
```

```tsx
// ❌ Wrong: unconditional willChange wastes GPU memory
<m.div style={{ ...values, willChange: 'transform' }}>
```

### Frame budget awareness

A scroll frame must complete in ~16ms (60fps) or ~8ms (120fps ProMotion). Budget breakdown:

| Work                                | Budget              |
| ----------------------------------- | ------------------- |
| Browser scroll handling             | ~2ms                |
| Spring solver (per spring)          | ~0.1ms              |
| MotionValue transform interpolation | ~0.05ms per channel |
| Compositing + paint                 | ~4ms                |
| **Available for JS**                | ~10ms at 60fps      |

With 8 elements × 3 channels × spring smoothing = ~24 channel updates per frame = ~2ms. Well within budget.

With 20 elements × 5 channels = ~100 updates = ~5ms. Getting close.

### Anti-jank checklist

1. Only `transform` and `opacity` in scroll-driven channels — never `width`, `height`, `margin`, `padding`
2. `willChange` only on elements that need it, only when motion enabled
3. No `useState` from scroll position — values stay in MotionValue graph
4. No DOM reads (getBoundingClientRect) inside scroll callbacks
5. `memo()` on scroll-animated list items to prevent re-renders
6. `useSpring` creates one spring per call — don't call it inside `.map()`
7. Heavy scroll scenes behind `next/dynamic` with `ssr: false`
8. Test on a throttled 4× CPU slowdown in Chrome DevTools

### CSS Scroll-Driven Animations API

For the simplest scroll effects (progress bars, basic opacity reveals), the CSS-native `animation-timeline: scroll()` runs entirely off the main thread and is more performant than any JS solution. Consider using it for:

- Reading progress indicators
- Simple fade-in-on-enter reveals (via `animation-timeline: view()`)
- Background color transitions with only two stops

Do NOT use the native API for:

- Anything needing spring physics (the API only supports CSS easing)
- Multi-element choreography (no shared MotionValue graph)
- Anything needing runtime JS logic (conditionals, dynamic ranges)
- Effects requiring `clip-path` function interpolation with computed values

Browser support: Chrome 115+, Edge 115+, Safari 26+, Firefox behind flag.

---

## 17. Decision Tree: Technique Selection

Use this to choose the right technique for a given content type and desired effect.

```
What content are you animating?
│
├── A single hero/product image
│   ├── Want "close-up then pull back"? → §4 Scale-In Hero
│   ├── Want "zoom into" transition? → §11 Zoom-Through
│   ├── Want dramatic reveal? → §10 Clip-Path Reveal
│   └── Want depth/dimension? → §7 Parallax + Scale-In combo
│
├── A sequence of cards or items (3–8)
│   ├── Want horizontal "card parade"? → §3 Horizontal Conveyor
│   ├── Want each to take full screen? → §5 Cross-Fade Panel Sequence
│   ├── Want vertical list with depth? → §7 Parallax Depth Layers
│   └── On mobile? → §15 MotionInView vertical stack
│
├── Text content (headline, tagline, feature description)
│   ├── Short (1–2 sentences)? → §6 Per-Word Text Reveal
│   ├── Long (paragraph)? → §6 Per-Line variant
│   └── Numeric stats? → §12 Number Counter
│
├── Video content
│   └── → §8 Video Scrubbing
│
├── Section theme/mood change
│   ├── Color transition? → §9 Background Color Morph
│   └── Content swap with visual continuity? → §5 Cross-Fade Panel
│
├── Multiple elements entering together
│   └── → §13 Multi-Element Choreography (waterfall stagger)
│
└── Simple "appear on scroll"
    └── → MotionInView from ADR-0003 (no need for a full scroll-driven scene)
```

### Combining techniques

Most Apple-quality scenes combine 2–3 techniques within one scroll-driven section. **Combining catalog techniques is composition, not invention** — no CTO approval needed.

When combining techniques, the existing `MotionSection` + `MotionSectionItem` may not be sufficient — scenes that need per-element spring configs, multi-phase progress subdivision, or mixed scroll plumbing should use `useScroll` + `useSpring` + `useTransform` directly (or create new helpers in `src/lib/motion/`). This is expected.

| Combination                          | Effect                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Conveyor + Image Parallax            | Cards translate horizontally, images drift within cards                      |
| Scale-In + Text Reveal               | Hero scales down, text illuminates word-by-word                              |
| Cross-Fade + Background Color        | Panels fade while background theme morphs                                    |
| Zoom-Through + Clip-Path             | Element scales up and reveals through expanding mask                         |
| Choreography + Scale-In              | Product image scales, text cascades in with stagger                          |
| Scale-In + Choreography + Conveyor   | Hero shrinks via scale+translate, cards stagger in, row scrolls horizontally |

### Budget per page

A full landing page should have **1–2 hero scroll-driven scenes** and the rest as simpler `MotionInView` reveals. More than 3 complex scroll scenes on one page creates scroll fatigue. Apple's own pages have exactly 2–3 major scroll-driven sections with simpler reveals between them.

---

## 18. Anti-Patterns

| Don't                                                     | Why                                                                                      | Do Instead                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Raw unsmoothed scrollYProgress → transform                | Mechanical "1:1" feel, no weight or momentum — looks like a JS scroll handler, not Apple | Always apply `useSpring` or the `smooth` prop                                    |
| Scroll height too short for content count                 | Animation feels rushed, elements flash by                                                | Use the scroll budget formula (§2) — minimum 100vh per animated item             |
| Scroll height too long                                    | User endures empty scrolling, reaches for the scroll bar                                 | Cap at 800vh, reduce if animation finishes before 80% progress                   |
| `position: fixed` instead of `sticky` for pinned viewport | Breaks in nested layouts, ignores parent scroll context                                  | `position: sticky; top: 0` (MotionSection does this)                             |
| Animating `width`, `height`, `margin` with scroll         | Triggers layout recalculation every frame — 60fps jank on mobile                         | Only `transform` + `opacity` (Tier 1 per ADR-0003)                               |
| No mobile fallback                                        | Scroll hijacking on touch devices, GPU thermal throttling                                | Always provide a simplified mobile layout (§15)                                  |
| No reduced motion fallback                                | Accessibility violation, WCAG 2.3.3                                                      | Use ADR-0003 reduced motion layers; collapse to static layout                    |
| `useState` to read scroll position                        | React re-renders on every scroll frame — kills performance                               | Keep values in MotionValue graph (ADR-0003 architecture)                         |
| Multiple `useScroll` on the same target                   | Duplicate IntersectionObservers — wasted work                                            | Use context (`MotionSection`) or prop-drill one `scrollYProgress`                |
| `willChange: transform` on all elements                   | GPU memory exhaustion — browser may drop layers or compositing                           | Only on elements with active scroll-driven transforms, only when motion enabled  |
| Spring smoothing on a progress bar                        | Progress bars should feel precise, not laggy                                             | Use `snappy` preset or no smoothing for indicators                               |
| Video scrubbing without preload                           | Video hasn't loaded → seeking to frames shows black/frozen                               | `preload="auto"` and load on mount; show poster until ready                      |
| Clip-path animated from 0% to 100% without easing         | Linear clip expansion looks robotic                                                      | Use spring smoothing — the expansion should decelerate as it opens               |
| Same spring config for all elements in a choreography     | Everything moves in lockstep — no cascade feel                                           | Vary spring mass slightly: first element lighter (faster), last heavier (trails) |
| Testing only at 60fps on MacBook Pro                      | Mid-range Android phones are 4–6× slower                                                 | Throttle CPU 4× in Chrome DevTools and test every scroll scene                   |

---

## Consequences

**Positive:**

- Animator agents have a complete technique catalog — they can look up "I need a horizontal conveyor" and find the exact pattern, math, and code
- Scroll budget formula prevents the trial-and-error of guessing section heights
- Spring smoothing strategy eliminates the most common quality gap between "web animation" and "Apple animation"
- Decision tree guides technique selection — reduces over-engineering and under-delivering
- Mobile fallback section ensures every scene degrades gracefully
- Performance budget prevents GPU layer explosion on complex pages
- Anti-patterns catalog addresses every common mistake discovered in production

**Negative:**

- More techniques means more decisions — mitigated by the decision tree (§17)
- Complex scenes require more code — mitigated by the existing motion system components
- Scroll budget calculation adds planning overhead — mitigated by the formula and example math
- Heavy scroll scenes add bundle size — mitigated by `next/dynamic` with `ssr: false` for desktop-only code
