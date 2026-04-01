---
name: scroll-scene-foundations
description: >-
  Scroll-driven scene foundations — sticky-pinned anatomy, scroll budget formula,
  spring smoothing strategy, mobile fallback patterns, performance budgets for complex
  scenes. Use when planning a scroll-driven scene, calculating section height, choosing
  spring config, building mobile fallbacks, or auditing GPU layer count.
---

# Scroll-Driven Scenes — Foundations

**Compiled from**: ADR-0030 §1 Sticky-Pinned Scene Anatomy, §2 Scroll Budget Subdivision, §14 Spring Smoothing Strategy, §15 Mobile Fallback Patterns, §16 Performance Rules
**Last synced**: 2026-03-28

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
│  │                                     │    │
│  │  ┌───────────────────────────┐      │    │
│  │  │  Animated children        │      │    │  ← transform driven by scrollYProgress
│  │  │  (scale, opacity, x, y)  │      │    │
│  │  └───────────────────────────┘      │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Why it works

- The outer container's tall height generates scroll distance without requiring content to fill it
- `position: sticky` keeps the inner viewport visible while the outer container scrolls
- `useScroll({ target: outerRef })` produces `scrollYProgress` (0→1) over the full scroll distance
- Animated children read this progress and map it to transforms — no scroll events, no React re-renders

### MotionSection implements this

```tsx
<MotionSection height='300vh' className='bg-surface-primary flex items-center justify-center'>
  {/* Children receive scrollYProgress from context */}
  <MotionSectionItem channels={myChannels} smooth={SPRING_PRESETS.smooth}>
    <ProductCard />
  </MotionSectionItem>
</MotionSection>
```

`MotionSection` provides `scrollYProgress` via context. `MotionSectionItem` consumes it, applies spring smoothing, and maps channels to CSS values on a `m.div`.

### Manual implementation (when MotionSection doesn't fit)

Some scenes need per-element spring configs, multi-phase progress subdivision, or scroll sources from multiple targets. Build the sticky structure directly — this is expected, not a workaround:

```tsx
const ref = useRef<HTMLDivElement>(null)
const { scrollYProgress } = useScroll({
  target: ref,
  offset: ['start start', 'end end'],
})
const smoothed = useSpring(scrollYProgress, SPRING_PRESETS.smooth)

<m.div ref={ref} className='relative' style={{ height: '400vh' }}>
  <div className='sticky top-0 h-screen overflow-hidden'>
    <AnimatedChild progress={smoothed} />
  </div>
</m.div>
```

For multiple children with different springs, create each child's `useSpring` from the same `scrollYProgress` passed in as a prop. Or create a custom hook in `src/lib/motion/` if the pattern recurs across scenes.

### Common mistakes

| Mistake                               | Consequence                                             | Fix                                                  |
| ------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `position: fixed` instead of `sticky` | Breaks in nested layouts, escapes parent scroll context | Use `sticky` (MotionSection does this)               |
| No `height: 100vh` on inner viewport  | Content collapses, no pinning effect                    | Inner element needs explicit viewport height         |
| Outer height too short                | Animation rushes, no scroll-driven feel                 | Use the scroll budget formula (§2)                   |
| Multiple `useScroll` on same target   | Duplicate observers, wasted work                        | Use MotionSection context or prop-drill one progress |

---

## 2. Scroll Budget Subdivision

### The formula

```
totalHeight = (N × screenTimePerItem + overlapZones + entryBuffer + exitBuffer) × 100vh
```

Where:

- **N** = number of animated items/phases
- **screenTimePerItem** = how much scroll distance each item gets for its animation (typically 0.8–1.2 per item for a full section)
- **overlapZones** = cumulative overlap between adjacent items (cross-fades, staggered entries)
- **entryBuffer** = dead space at the start before the first animation triggers (0.1–0.2)
- **exitBuffer** = dead space at the end after the last animation completes (0.1–0.2)

### Example: 4-card horizontal conveyor

```
N = 4 cards
screenTimePerItem = 1.0 (each card gets one screen of scroll distance)
overlapZones = 3 × 0.2 = 0.6 (20% overlap between adjacent pairs)
entryBuffer = 0.2
exitBuffer = 0.2

totalHeight = (4 × 1.0 + 0.6 + 0.2 + 0.2) × 100vh = 500vh
```

### Progress range math

With `totalHeight = 500vh` and `scrollYProgress` from 0→1:

```
Card 1 visible: 0.04 → 0.24   (entry buffer → end of card 1 time)
Card 2 visible: 0.20 → 0.44   (overlap with card 1 → end of card 2)
Card 3 visible: 0.40 → 0.64
Card 4 visible: 0.60 → 0.96   (card 4 → start of exit buffer)
```

Use `createMotionRange()` to map these ranges to transforms.

### Guidelines

| Guideline                        | Value                   |
| -------------------------------- | ----------------------- |
| Minimum height per animated item | 100vh                   |
| Maximum total section height     | 800vh                   |
| Entry/exit buffer                | 10–20% of total         |
| Overlap between adjacent items   | 15–25% of item duration |
| Dead space at hold position      | 20–30% of item duration |

---

## 3. Spring Smoothing Strategy

Raw `scrollYProgress` updates every paint frame with the exact scroll position. Without smoothing, scroll-driven animations feel "1:1 mechanical." **Spring smoothing adds physical weight**, making elements feel like they have mass and momentum. This is the difference between "JS scroll handler" and "Apple."

### When to smooth

**Always.** Every scroll-driven MotionValue should be smoothed. The question is which spring preset.

### Preset selection guide

| Preset                  | Config                                        | Feel                         | Best for                                                |
| ----------------------- | --------------------------------------------- | ---------------------------- | ------------------------------------------------------- |
| `SPRING_PRESETS.smooth` | `{ stiffness: 120, damping: 20, mass: 0.35 }` | Weighted, cinematic trailing | Parallax, background color, opacity fades, text reveals |
| `SPRING_PRESETS.snappy` | `{ stiffness: 500, damping: 28, mass: 0.4 }`  | Tight, responsive            | Navigation indicators, progress bars, counters          |
| `SPRING_PRESETS.bouncy` | `{ stiffness: 300, damping: 15, mass: 0.5 }`  | Playful overshoot            | Card entrances, badge reveals                           |
| Custom heavy            | `{ stiffness: 60, damping: 18, mass: 0.8 }`   | Slow, weighty, luxurious     | Hero scale animations, zoom-through, dramatic reveals   |

### Pipeline

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
  smooth={SPRING_PRESETS.smooth}
>
```

### Manual smoothing

```tsx
const { scrollYProgress } = useScroll({ target: ref, offset: [...] })
const smoothed = useSpring(scrollYProgress, SPRING_PRESETS.smooth)
const scale = useTransform(smoothed, [0, 1], [1.5, 1.0])
```

### Latency vs. weight tradeoff

| Stiffness | Damping | Mass | Catch-up time | Feel                                  |
| --------- | ------- | ---- | ------------- | ------------------------------------- |
| 500       | 28      | 0.4  | ~50ms         | Nearly 1:1 — responsive               |
| 120       | 20      | 0.35 | ~120ms        | Weighted — the Apple sweet spot       |
| 60        | 18      | 0.8  | ~300ms        | Heavy — may feel laggy on fast scroll |

### Rule of thumb

- User can see the element while scrolling (parallax, conveyors): `smooth` preset
- Element appears at a threshold (reveals, clip-paths): `smooth` or `bouncy`
- Animation must feel precise (progress bars, counters): `snappy`
- Dramatic moment worth waiting for (hero zoom-through): custom heavy

---

## 4. Mobile Fallback Patterns

Complex scroll-driven scenes should be simplified or disabled on mobile (below `md` breakpoint, 768px).

### Why

1. Sticky + tall sections hijack the scroll experience — on mobile, users scroll to navigate, not to animate
2. GPU memory is limited — multi-layer composited transforms cause thermal throttling
3. Touch scroll physics differ — spring smoothing on top of iOS momentum scrolling creates conflicting physics
4. Screen size — dramatic scale effects may overflow the viewport

### Decision tree

```
Is the user on a device below md breakpoint (768px)?
├── YES → Use mobile fallback
│   ├── Sticky-pinned scene → Vertical stack with MotionInView
│   ├── Horizontal conveyor → Vertical card column with MotionInView
│   ├── Multi-layer parallax → Static layers, no parallax
│   ├── Video scrubbing → Autoplay muted video OR static poster
│   ├── Cross-fade panels → Vertical stack with MotionInView
│   ├── Zoom-through → Static image at final size
│   ├── Per-word text reveal → MotionInView on whole block
│   └── Number counter → MotionInView fade-in with final value
├── NO → Use full scroll-driven scene
```

### Breakpoint detection

```tsx
'use client'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const ProductSection = () => {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  if (!isDesktop) return <ProductSectionMobile />
  return <ProductSectionDesktop />
}
```

### Dynamic import for code splitting

```tsx
import dynamic from 'next/dynamic'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const ProductSectionDesktop = dynamic(() => import('./ProductSectionDesktop'), { ssr: false })
```

### Mobile fallback pattern — vertical stack with MotionInView

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

if (!motionEnabled || !isDesktop) return <ProductSectionMobile />
return <ProductSectionDesktop />
```

---

## 5. Performance Rules for Complex Scenes

### Layer budget

| Constraint                                           | Limit   | Why                                         |
| ---------------------------------------------------- | ------- | ------------------------------------------- |
| Active `willChange: transform` elements per scene    | ≤ 8     | Each creates a GPU compositing layer        |
| Active `useSpring` instances per scene               | ≤ 12    | Each runs a spring solver per frame         |
| Active `useMotionValueEvent` subscriptions per scene | ≤ 4     | Each triggers JS per scroll frame           |
| Total section height                                 | ≤ 800vh | Beyond this, user fatigue > animation value |

### willChange management

```tsx
// ✅ Only when motion enabled
const motionEnabled = useMotionEnabled()
<m.div style={{
  ...values,
  willChange: motionEnabled ? 'transform, opacity' : undefined,
}}>
```

### Anti-jank checklist

1. Only `transform` and `opacity` in scroll channels — never `width`, `height`, `margin`, `padding`
2. `willChange` only on elements that need it, only when motion enabled
3. No `useState` from scroll position — values stay in MotionValue graph
4. No DOM reads (getBoundingClientRect) inside scroll callbacks
5. `memo()` on scroll-animated list items to prevent re-renders
6. `useSpring` creates one spring per call — don't call inside `.map()`
7. Heavy scroll scenes behind `next/dynamic` with `ssr: false`
8. Test on a throttled 4× CPU slowdown in Chrome DevTools

### CSS Scroll-Driven Animations API — when to complement

For the simplest effects, the CSS-native `animation-timeline: scroll()` runs off the main thread:

**Use for**: progress indicators, simple fade-in reveals (`animation-timeline: view()`), two-stop background color transitions.

**Do NOT use for**: spring physics, multi-element choreography, runtime JS logic, computed `clip-path` interpolation.

Browser support: Chrome 115+, Edge 115+, Safari 26+, Firefox behind flag.

### Budget per page

A landing page should have **1–2 hero scroll-driven scenes** and the rest as simpler `MotionInView` reveals. More than 3 complex scroll scenes per page creates scroll fatigue.

---

## 6. Implementation Recipe

Step-by-step workflow for building any scroll-driven scene. Follow this sequence instead of designing from scratch.

### Step 1 — Choose technique

Use the decision tree in skill `scroll-scene-techniques` §6 to select the technique(s). Common combinations (e.g., Scale-In + Choreography + Conveyor) are documented there.

### Step 2 — Calculate scroll budget

Apply the formula from §2 above. Inputs: number of animated items, screen time per item, overlap zones, entry/exit buffers. Output: total section height in vh.

### Step 3 — Choose MotionSection vs manual

Use the decision tree in `scroll-driven-animation.instructions.md` → Scene Setup. Quick rule: if all children share one progress source and one spring config → MotionSection. Otherwise → manual.

### Step 4 — Choose dimension strategy

- **Static layout** → Tailwind tokens (w-96, max-w-layout, etc.)
- **Viewport-dependent** → inline `style={}` with vw/vh values (e.g., `style={{ width: '80vw', height: '400vh' }}`)
- **DOM-dependent** → `useRef` + measurement on mount, store in `useState`

### Step 5 — Define phase timeline

Map each element's animation to sub-ranges of scrollYProgress (0→1). Use the progress range math pattern from §2.

### Step 6 — Wire channels

Use `createMotionRange()` for each channel (x, y, scale, opacity, etc.). Pass to `useMotionAnimation` or `MotionSectionItem`. Apply spring smoothing via `smooth` prop or `useSpring`.

### Step 7 — Build mobile fallback

Replace the scroll scene with a vertical stack of `MotionInView` components. Gate with `useMediaQuery('(min-width: 768px)')`. See §4 above.

### Step 8 — Handle reduced motion

For `MotionSection`/`useMotionAnimation` — automatic (snap-to-end). For manual — check `useMotionEnabled()` and collapse to static layout.

### Step 9 — Verify performance budget

Count: `useSpring` calls ≤ 12, `willChange` elements ≤ 8, `useMotionValueEvent` ≤ 4. Run `pnpm build`.
