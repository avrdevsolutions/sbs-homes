---
name: scroll-content-animations
description: >-
  Scroll-driven content animations — per-word text reveal, video scrubbing,
  background color transitions, clip-path/mask reveals, number counter animation.
  Use when animating text word-by-word, scrubbing video with scroll, morphing
  background colors between sections, revealing content through clip-path masks, or
  counting up stats on scroll.
---

# Scroll-Driven Scenes — Content Animations

**Compiled from**: ADR-0030 §6 Per-Word Text Reveal, §8 Video Scrubbing, §9 Background Color Transitions, §10 Clip-Path Reveals, §12 Number Counter
**Last synced**: 2026-03-28

---

## 1. Per-Word / Per-Line Text Reveal

Text highlights or illuminates word-by-word as the user scrolls. Words go from dim (0.15 opacity) to full brightness sequentially.

### When to use

- Feature description or manifesto text
- A single sentence or short paragraph — the text IS the experience
- No hero image competing for attention

### When NOT to use

- Long paragraphs — too much scroll distance, user loses patience
- Body copy — only for headlines and taglines
- Content that must be immediately readable (pricing, legal)

### Implementation

Extract a `WordSpan` child component (hooks can't go inside `.map()`):

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
  const wordStart = index / totalWords
  const wordEnd = (index + 1) / totalWords

  const smoothProgress = useSpring(progress, { stiffness: 120, damping: 20, mass: 0.35 })
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

For longer text, reveal line by line. Split at `\n` and apply the same pattern with `<m.span className="block">` per line.

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

## 2. Video Scrubbing

Video playback controlled by scroll position — the illusion that scrolling "plays" the video. Apple's most recognizable technique.

### When to use

- Product reveal videos or 360° rotation
- Complex animations too expensive for CSS/transforms
- The "wow" moment — highest perceived quality of any scroll technique

### When NOT to use

- Poor network conditions — video must preload fully before scrubbing works
- Content that makes sense only at normal speed (narration, music)
- Mobile with limited bandwidth — consider fallback image sequence

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
  const lastFrameRef = useRef(0)
  const motionEnabled = useMotionEnabled()

  const clampedProgress = useTransform(progress, [0.05, 0.95], [0, 1])
  const smoothProgress = useSpring(clampedProgress, { stiffness: 80, damping: 25, mass: 0.5 })

  useMotionValueEvent(smoothProgress, 'change', (latest) => {
    const video = videoRef.current
    if (!video || !video.duration || !motionEnabled) return

    const targetTime = latest * video.duration
    if (Math.abs(targetTime - lastFrameRef.current) < 0.03) return

    lastFrameRef.current = targetTime
    video.currentTime = targetTime
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.preload = 'auto'
    video.load()
  }, [src])

  return <video ref={videoRef} src={src} muted playsInline preload='auto' className={className} />
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

For videos where individual frames matter (product rotation):

```tsx
const FRAME_RATE = 30
const snapToFrame = (time: number): number => Math.round(time * FRAME_RATE) / FRAME_RATE

// In the event handler:
video.currentTime = snapToFrame(targetTime)
```

### Reduced motion

Display the video poster frame or a static image. Do not scrub.

---

## 3. Background Color / Theme Transitions

The page background color morphs as the user scrolls between sections. Creates distinct visual "zones."

### When to use

- Sections with different themes (light → dark → light)
- Creating progression through distinct chapters
- Product color showcase (background matches product color)

### When NOT to use

- High-contrast transitions that flash — can trigger vestibular issues
- More than 4 color stops — becomes a rainbow

### Implementation

```tsx
'use client'

import { useRef } from 'react'
import { m, useScroll, useSpring, useTransform } from 'motion/react'
import { SPRING_PRESETS, useMotionEnabled } from '@/lib/motion'

type ScrollColorSectionProps = {
  colors: string[]
  children: React.ReactNode
}

export const ScrollColorSection = ({ colors, children }: ScrollColorSectionProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const motionEnabled = useMotionEnabled()

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const smoothProgress = useSpring(scrollYProgress, SPRING_PRESETS.smooth)

  const stops = colors.map((_, i) => i / (colors.length - 1))
  const backgroundColor = useTransform(smoothProgress, stops, colors)

  if (!motionEnabled) return <div ref={ref}>{children}</div>

  return (
    <m.div ref={ref} style={{ backgroundColor }}>
      {children}
    </m.div>
  )
}
```

### With text color adaptation

```tsx
const textColor = useTransform(
  smoothProgress,
  [0, 0.45, 0.55, 1],
  ['hsl(var(--text-primary))', 'hsl(var(--text-primary))', '#ffffff', '#ffffff'],
)
```

### Accessibility

- Ensure contrast ratios meet WCAG AA at every point in the transition (not just start/end)
- Test mid-transition colors — interpolated values between stops may have insufficient contrast
- Under reduced motion, snap to the nearest color stop rather than interpolating

---

## 4. Clip-Path / Mask Reveals

An element revealed through an expanding clip-path tied to scroll progress. Dramatic "curtain opening" or "spotlight expanding" reveals.

### When to use

- Dramatic product reveal — the "unveiling" moment
- Section transitions — one section clips away to reveal the next
- Image galleries where images "open" as you scroll

### When NOT to use

- Content that must be immediately accessible (clip-path hides it visually)
- Safari < 15.4 without fallback (clip-path animations weren't GPU-accelerated)

### Implementation

```tsx
'use client'

import { type MotionValue, m, useSpring, useTransform } from 'motion/react'
import { SPRING_PRESETS, useMotionEnabled } from '@/lib/motion'

type ClipRevealProps = {
  progress: MotionValue<number>
  revealRange?: [number, number]
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
    const t = Math.max(0, Math.min(1, (v - revealRange[0]) / (revealRange[1] - revealRange[0])))
    if (shape === 'circle') {
      const radius = t * 75
      return `circle(${radius}% at 50% 50%)`
    }
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

Content hidden by `clip-path` is still in the DOM and accessible to screen readers. The visual reveal is decorative animation, not content gating.

---

## 5. Number Counter Animation

Numeric values count up from 0 to their final value as the user scrolls. Used for product specs and "by the numbers" sections.

### When to use

- Product specifications, performance metrics, stats
- "By the numbers" sections

### When NOT to use

- Non-numeric content
- Numbers without impact (counting to 3 is not impressive)

### Implementation

```tsx
'use client'

import { type MotionValue, m, useSpring, useTransform } from 'motion/react'
import { SPRING_PRESETS, useMotionEnabled } from '@/lib/motion'

type ScrollCounterProps = {
  from: number
  to: number
  progress: MotionValue<number>
  countRange?: [number, number]
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
