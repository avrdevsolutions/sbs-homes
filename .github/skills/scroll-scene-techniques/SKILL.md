---
name: scroll-scene-techniques
description: >-
  Scroll-driven scene techniques — horizontal conveyor, scale-in/scale-out hero,
  cross-fade panel sequence, parallax depth layers, zoom-through, and technique
  selection decision tree. Use when building horizontal card parades, hero scale
  reveals, cross-fade panels, parallax sections, zoom-through transitions, or
  choosing which scroll technique to use.
---

# Scroll-Driven Scenes — Techniques

**Compiled from**: ADR-0030 §3 Horizontal Scroll Conveyor, §4 Scale-In Hero, §5 Cross-Fade Panel Sequence, §7 Parallax Depth Layers, §11 Zoom-Through, §17 Decision Tree
**Last synced**: 2026-03-28

---

## 1. Horizontal Scroll Conveyor

> **Cross-references**: Budget formula → skill `scroll-scene-foundations` §2. Spring presets → skill `scroll-scene-foundations` §3. Multi-element choreography → skill `scroll-choreography` §1.

Cards translate horizontally across a sticky viewport, driven by vertical scroll. Each card has phases: enter from right → scale up → hold at center → scale down → exit left.

### When to use

- 3–8 items that each deserve full-screen treatment
- Product parade, portfolio showcase, timeline
- When vertical stacking would feel monotonous

### When NOT to use

- 2 or fewer items — use cross-fade instead
- Items with long text — horizontal scroll doesn't give reading time
- Mobile — always fall back to vertical stack with MotionInView

### Anatomy

```
Progress: 0 ─────────────────────────────────── 1
Card 1:  [scaleIn][═══ hold ════][exit  ]
Card 2:       [enter][scaleIn][══ hold ═══][exit  ]
Card 3:            [enter][scaleIn][══ hold ═══][exit  ]
Card 4:                 [enter][scaleIn][══ hold ═══]
```

### Phase calculation

Use the scroll budget formula from §2. For 4 cards:

```
totalHeight = (4 × 1.0 + 0.6 + 0.2 + 0.2) × 100vh = 500vh
```

Each card's phases are sub-ranges of scrollYProgress (0→1). Use `createMotionRange()` to map phases to x, scale, and opacity.

### Implementation pattern

```tsx
// Card component receives index, progress, and CARDS phase config
const ConveyorCard = ({ index, progress, children }: ConveyorCardProps) => {
  const card = CARDS[index]
  const motionEnabled = useMotionEnabled()

  // X: enter from right → center → exit left
  // Scale: dramatic → 1.0
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

Each card's image drifts at a different rate than the card, creating depth:

```tsx
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

## 2. Scale-In / Scale-Out Hero

A product image starts at a dramatic scale and shrinks to natural size as the user scrolls. The "close-up then reveal" effect.

### When to use

- Section opener — first thing the user sees when scrolling into a section
- Product photography or a single hero image
- Combined with a sticky section where scaling is the primary animation

### When NOT to use

- Multiple items competing for attention — scale overwhelms when duplicated
- Content with text overlays that must remain readable at all scales

### Implementation

```tsx
const HERO_SCALE = 1.8

const heroChannels = {
  scale: createMotionRange(
    [0.0, 0.3, 0.8, 1.0],
    [HERO_SCALE, 1.0, 1.0, 0.9]  // scale in → hold → slight scale-out
  ),
  opacity: createMotionRange(
    [0.0, 0.1, 0.85, 1.0],
    [1, 1, 1, 0]                    // fade on exit
  ),
}

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

| Content type              | Start scale            | Notes                                                                |
| ------------------------- | ---------------------- | -------------------------------------------------------------------- |
| Full-bleed product photo  | 1.4–1.6                | Fills viewport, settles to natural                                   |
| Centered with whitespace  | 1.6–2.0                | More dramatic — whitespace absorbs excess                            |
| Card or contained element | 1.2–1.4                | Subtler — border makes scale obvious                                 |
| Text block                | 1.05–1.1               | Very subtle — readability degrades fast                              |
| Hero-to-card shrink       | Inverse — start at 1.0 | Use `scale` down (e.g. 1.0→0.4) + `translate` to reposition. Tier 1. |

### Hero-to-Card Scale Pattern

A card starts at its natural DOM size and position, but is CSS-scaled up to fill the viewport as a hero. As the user scrolls, it animates down to `scale(1)` + `translate(0, 0)`, revealing the card at natural size. Additional cards then stagger in.

**Why scale+translate (not width/height):** CSS `scale` is a GPU-composited transform. It does NOT trigger layout recalculation. The card renders at its natural size, the browser just paints it larger. This is a Tier 1 transform — no `layout` prop needed.

**Computing the scale factor:**

```tsx
// Card's natural width (from Tailwind token or inline style)
const CARD_WIDTH_VW = 80 // e.g. 80vw on mobile, or fixed px
// Viewport-filling target
const HERO_SCALE = 100 / CARD_WIDTH_VW // ≈ 1.25 for 80vw card

// Or compute dynamically from DOM measurement:
const cardRef = useRef<HTMLDivElement>(null)
const [heroScale, setHeroScale] = useState(1.5)
useEffect(() => {
  if (!cardRef.current) return
  const { width } = cardRef.current.getBoundingClientRect()
  setHeroScale(window.innerWidth / width)
}, []) // one-time measurement on mount
```

**Full implementation — hero card shrinks to natural size, then row scrolls:**

```tsx
'use client'

import { useRef, useState, useEffect, memo } from 'react'
import {
  m,
  useScroll,
  useSpring,
  useTransform,
  useMotionEnabled,
  SPRING_PRESETS,
  buildWillChange,
} from '@/lib/motion'

const SCROLL_HEIGHT = '500vh'

const HeroToCardScene = memo(({ cards }: { cards: CardData[] }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const motionEnabled = useMotionEnabled()
  const [heroScale, setHeroScale] = useState(1.8)

  // One-time measurement — allowed even though it's useState
  useEffect(() => {
    if (!cardRef.current) return
    const { width } = cardRef.current.getBoundingClientRect()
    setHeroScale(Math.min(window.innerWidth / width, 2.5))
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })
  const progress = useSpring(scrollYProgress, SPRING_PRESETS.smooth)

  // Phase 1 (0→0.4): Hero card scales from heroScale → 1.0
  const heroCardScale = useTransform(progress, [0, 0.35, 0.4], [heroScale, heroScale, 1.0])
  // Phase 2 (0.4→1.0): Cards stagger in and row scrolls horizontally
  const rowX = useTransform(progress, [0.4, 1.0], ['0%', '-60%'])

  if (!motionEnabled) {
    return <StaticFallback cards={cards} />
  }

  return (
    <m.div ref={containerRef} className='relative' style={{ height: SCROLL_HEIGHT }}>
      <div className='sticky top-0 flex h-screen items-center overflow-hidden'>
        <m.div className='flex gap-8 px-8' style={{ x: rowX }}>
          <m.div
            ref={cardRef}
            style={{
              scale: heroCardScale,
              ...buildWillChange('transform'),
            }}
            className='w-96 shrink-0'
          >
            <ProductCard {...cards[0]} />
          </m.div>
          {cards.slice(1).map((card, i) => (
            <StaggerCard key={card.id} card={card} index={i} progress={progress} />
          ))}
        </m.div>
      </div>
    </m.div>
  )
})
HeroToCardScene.displayName = 'HeroToCardScene'
```

**Key decisions this pattern makes for you:**

- Scale factor: computed from DOM measurement (one-time `useState` + `useEffect` on mount)
- Spring: `SPRING_PRESETS.smooth` on the shared progress — one spring for the whole scene
- Phase split: 0→0.4 = hero shrink, 0.4→1.0 = horizontal scroll
- Centering: the styled card is the first in the flex row — no absolute positioning needed
- `overflow: hidden` on the sticky viewport handles the scaled card overflow

---

## 3. Cross-Fade Panel Sequence

Multiple full-screen panels stacked in the same sticky viewport, fading in and out sequentially. Each panel gets its "moment."

### When to use

- 3–6 content panels describing different features/benefits
- Each panel deserves full-screen treatment
- Visual continuity matters — smoother than page sections

### When NOT to use

- Panels have very different structures — cross-fade feels disjointed
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
const panelDuration = 1 / PANEL_COUNT

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

Add a subtle y-translate for panels sliding in from below:

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

## 4. Parallax Depth Layers

Multiple visual layers moving at different speeds, creating three-dimensional depth.

### When to use

- Hero sections with multiple visual layers (product, background, decorative elements)
- Sections where depth perception enhances storytelling
- Combined with sticky scenes for immersive effect

### When NOT to use

- Content-heavy sections where parallax distracts from reading
- More than 3–4 layers — diminishing returns and GPU overhead

### With useParallax (simple)

```tsx
import { useParallax } from '@/lib/motion'

const HeroWithDepth = () => {
  const bgLayer = useParallax(30) // slow — 30px
  const midLayer = useParallax(60) // medium
  const fgLayer = useParallax(90) // fast

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

### Within a sticky section (context-driven)

```tsx
<MotionSection height='300vh' className='relative'>
  <MotionSectionItem
    channels={{ y: createMotionRange([0, 1], [0, -30]) }}
    smooth={SPRING_PRESETS.smooth}
    className='absolute inset-0 -inset-y-8'
  >
    <BackgroundImage />
  </MotionSectionItem>

  <div className='relative z-10'>
    <MainContent />
  </div>

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

Image drift inside a card with overflow clipping:

```tsx
<div className='relative h-80 overflow-hidden rounded-2xl'>
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

| Layer           | Speed (px) | Relative rate | Effect                       |
| --------------- | ---------- | ------------- | ---------------------------- |
| Far background  | 15–30      | 0.3×          | Barely moves — deep distance |
| Near background | 40–60      | 0.6×          | Moderate — mid-distance      |
| Main subject    | 0          | 1.0× (static) | Reference point              |
| Foreground      | 70–100     | 1.5×          | Fast — close to camera       |

---

## 5. Zoom-Through

An element starts small and scales to fill the entire viewport. The "diving into the product" effect.

### When to use

- Transition from overview to detail — a card scales up to become the section hero
- Product showcase where the product "comes to you"
- Section transitions — one section's hero becomes the next section's background

### When NOT to use

- Elements with text — text at 3× scale is unreadable
- Without a sticky section — element scrolls past while scaling

### Implementation

```tsx
const zoomChannels = {
  scale: createMotionRange(
    [0.0, 0.4, 0.6, 1.0],
    [0.3, 0.3, 1.0, 1.0]    // hold small → scale full → hold full
  ),
  borderRadius: createMotionRange(
    [0.0, 0.4, 0.6, 1.0],
    [24, 24, 0, 0]            // rounded small → sharp full
  ),
}

<MotionSection height="300vh" className="flex items-center justify-center">
  <MotionSectionItem channels={zoomChannels} smooth={SPRING_PRESETS.smooth} className="w-full h-full">
    <Image src="/images/product.webp" alt="Product zoom" fill className="object-cover" />
  </MotionSectionItem>
</MotionSection>
```

### With opacity layering

Text fades out as image zooms in:

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

## 6. Decision Tree — Technique Selection

```
What content are you animating?
│
├── A single hero/product image
│   ├── "Close-up then pull back"? → Scale-In Hero (§4)
│   ├── "Zoom into" transition? → Zoom-Through (§11)
│   ├── Dramatic reveal? → Clip-Path Reveal (§10)
│   └── Depth/dimension? → Parallax + Scale-In combo
│
├── A sequence of cards/items (3–8)
│   ├── Horizontal "card parade"? → Horizontal Conveyor (§3)
│   ├── Each full-screen? → Cross-Fade Panels (§5)
│   ├── Vertical with depth? → Parallax Depth Layers (§7)
│   └── On mobile? → MotionInView vertical stack
│
├── Text content
│   ├── Short (1–2 sentences)? → Per-Word Text Reveal (§6)
│   ├── Long (paragraph)? → Per-Line variant
│   └── Numeric stats? → Number Counter (§12)
│
├── Video content → Video Scrubbing (§8)
│
├── Section theme/mood change
│   ├── Color transition? → Background Color Morph (§9)
│   └── Content swap? → Cross-Fade Panel
│
├── Multiple elements entering together → Choreography (§13)
│
└── Simple "appear on scroll" → MotionInView (ADR-0003)
```

### Common technique combinations

Combining 2–3 catalog techniques in one scene is **composition, not invention** — no special approval needed. Complex combinations often require manual scroll plumbing (`useScroll` + `useSpring` + `useTransform` directly) or a custom hook in `src/lib/motion/` rather than `MotionSection` + `MotionSectionItem`.

| Combination                        | Effect                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Conveyor + Image Parallax          | Cards translate horizontally, images drift within cards                      |
| Scale-In + Text Reveal             | Hero scales down, text illuminates word-by-word                              |
| Cross-Fade + Background Color      | Panels fade while background theme morphs                                    |
| Zoom-Through + Clip-Path           | Element scales up and reveals through expanding mask                         |
| Choreography + Scale-In            | Product image scales, text cascades in with stagger                          |
| Scale-In + Choreography + Conveyor | Hero shrinks via scale+translate, cards stagger in, row scrolls horizontally |

### Budget per page

A landing page should have **1–2 hero scroll-driven scenes** and the rest as simpler `MotionInView` reveals. More than 3 complex scroll scenes creates scroll fatigue.
