'use client'

import { memo } from 'react'

import Image from 'next/image'

import type { ExteriorVantagePoint } from '@/dictionaries/landing-page'
import { m, type MotionValue, useTransform } from '@/lib/motion'

const CARD_COUNT = 3
/** Each card occupies this fraction of the viewport width. */
const CARD_VW = 60
/** Gap between cards in vw. */
const GAP_VW = 3
/** Where the first card sits when centered. */
const CENTER_OFFSET_VW = (100 - CARD_VW) / 2
/** First card starts slightly right of center — 15vw offset. */
const START_OFFSET_VW = CENTER_OFFSET_VW + 15
/** Total travel from first-card-centered to last-card-centered. */
const TRAVEL_VW = (CARD_COUNT - 1) * (CARD_VW + GAP_VW)

/**
 * Continuous cinematic slide — no stops.
 * Entrance [0, 0.10]: first card glides in from right.
 * Travel  [0.10, 0.70]: continuous slide across all 3 cards.
 * Hold    [0.70, 1.0]: last card stays centered.
 */
const ENTRANCE_END = 0.09
const STRIP_STOP = 0.85

type PhotoStripProps = {
  vantagePoints: ExteriorVantagePoint[]
  progress: MotionValue<number>
}

export const PhotoStrip = memo(({ vantagePoints, progress }: PhotoStripProps) => {
  const stripX = useTransform(
    progress,
    [0, ENTRANCE_END, STRIP_STOP, 1],
    [
      `${START_OFFSET_VW}vw`,
      `${CENTER_OFFSET_VW}vw`,
      `${CENTER_OFFSET_VW - TRAVEL_VW}vw`,
      `${CENTER_OFFSET_VW - TRAVEL_VW}vw`,
    ],
  )

  return (
    <div className='relative flex max-h-[50vh] flex-1 items-center overflow-visible px-4 py-6'>
      <m.div
        className='flex'
        style={{
          x: stripX,
          height: '100%',
          gap: `${GAP_VW}vw`,
          willChange: 'transform',
        }}
      >
        {vantagePoints.map((vp, i) => (
          <PhotoCard key={vp.id} vantagePoint={vp} index={i} />
        ))}
      </m.div>
    </div>
  )
})

PhotoStrip.displayName = 'PhotoStrip'

/* ── Individual photo card ─────────────────────────────────────── */

type PhotoCardProps = {
  vantagePoint: ExteriorVantagePoint
  index: number
}

const PhotoCard = memo(({ vantagePoint, index }: PhotoCardProps) => (
  <div
    className='relative h-full shrink-0 overflow-hidden rounded-2xl'
    style={{
      width: `${CARD_VW}vw`,
      boxShadow:
        '0 20px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
      border: '1px solid rgba(255,255,255,0.15)',
    }}
  >
    <Image
      src={vantagePoint.image.src}
      alt={vantagePoint.image.alt}
      fill
      sizes={`${CARD_VW}vw`}
      priority={index === 0}
      className='object-cover'
    />
    {/* Bottom gradient for depth */}
    <div
      className='pointer-events-none absolute inset-x-0 bottom-0'
      style={{
        height: '30%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.15), transparent)',
      }}
    />
  </div>
))

PhotoCard.displayName = 'PhotoCard'
