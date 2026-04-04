'use client'

import { memo } from 'react'

import Image from 'next/image'

import type { ExteriorVantagePoint } from '@/dictionaries/landing-page'
import { m, type MotionValue, useTransform } from '@/lib/motion'

type ImageCrossfadeProps = {
  vantagePoints: ExteriorVantagePoint[]
  progress: MotionValue<number>
}

/**
 * Full-bleed cinematic image crossfade.
 * Images stack absolutely; scroll drives opacity + subtle scale.
 * Each image scales slowly (1.0→1.05) during its hold phase for a Ken Burns feel.
 */
export const ImageCrossfade = memo(({ vantagePoints, progress }: ImageCrossfadeProps) => (
  <div className='absolute inset-0'>
    {vantagePoints.map((vp, i) => (
      <ImageLayer
        key={vp.id}
        vantagePoint={vp}
        index={i}
        total={vantagePoints.length}
        progress={progress}
      />
    ))}
    {/* Top-left radial gradient — header readability */}
    <div
      className='pointer-events-none absolute inset-0'
      style={{
        zIndex: vantagePoints.length + 1,
        background:
          'radial-gradient(ellipse 80% 70% at 0% 0%, rgba(20,20,22,0.85) 0%, transparent 100%)',
      }}
    />
  </div>
))

ImageCrossfade.displayName = 'ImageCrossfade'

/* ── Individual image layer ─────────────────────────────────────── */

type ImageLayerProps = {
  vantagePoint: ExteriorVantagePoint
  index: number
  total: number
  progress: MotionValue<number>
}

const ImageLayer = memo(({ vantagePoint, index, total, progress }: ImageLayerProps) => {
  const segmentSize = 1 / total
  const fadePoint = (index + 1) * segmentSize
  const fadeDuration = 0.1

  // Reverse z-index: first image on top, last at bottom.
  // Top images fade OUT to reveal the layer below — no flash.
  const zIndex = total - index

  const opacity = useTransform(progress, (v) => {
    // Bottom layer (last image) is always fully visible
    if (index === total - 1) return 1
    // Other layers: hold at 1, then fade out
    if (v <= fadePoint - fadeDuration) return 1
    if (v >= fadePoint) return 0
    return 1 - (v - (fadePoint - fadeDuration)) / fadeDuration
  })

  // Subtle Ken Burns scale across the image's visible phase
  const scale = useTransform(progress, [index * segmentSize, fadePoint], [1, 1.06])

  return (
    <m.div
      className='absolute inset-0'
      style={{ opacity, scale, zIndex, willChange: 'opacity, transform' }}
    >
      <Image
        src={vantagePoint.image.src}
        alt={vantagePoint.image.alt}
        fill
        sizes='100vw'
        priority={index === 0}
        className='object-cover'
      />
    </m.div>
  )
})

ImageLayer.displayName = 'ImageLayer'
