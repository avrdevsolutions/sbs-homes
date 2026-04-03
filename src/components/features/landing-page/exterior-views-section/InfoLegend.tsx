'use client'

import { memo } from 'react'

import Image from 'next/image'

import { Typography } from '@/components/ui'
import type { ExteriorVantagePoint } from '@/dictionaries/landing-page'
import { m, type MotionValue, useTransform } from '@/lib/motion'

const PANEL_COUNT = 3

type InfoLegendProps = {
  vantagePoints: ExteriorVantagePoint[]
  progress: MotionValue<number>
}

export const InfoLegend = memo(({ vantagePoints, progress }: InfoLegendProps) => {
  /**
   * Active index 0→2, leading the card arrival.
   * Card 0: [0, 0.15], transition [0.15, 0.22],
   * Card 1: [0.22, 0.50], transition [0.50, 0.58],
   * Card 2: [0.58, 1.0]
   */
  const activeFloat = useTransform(progress, [0, 0.15, 0.22, 0.5, 0.58, 1], [0, 0, 1, 1, 2, 2])

  const counterIndex = useTransform(activeFloat, (v) => Math.round(Math.min(v, PANEL_COUNT - 1)))

  return (
    <div className='flex shrink-0 flex-col gap-5' style={{ maxWidth: '28ch' }}>
      {/* Counter + text on top */}
      <div className='flex min-w-0 flex-col gap-2'>
        <CounterDisplay progress={counterIndex} total={PANEL_COUNT} />

        <div className='relative' style={{ minHeight: 80 }}>
          {vantagePoints.map((vp, i) => (
            <TextSlide key={vp.id} vantagePoint={vp} index={i} progress={activeFloat} />
          ))}
        </div>
      </div>

      {/* Site plan below — crossfade */}
      <div className='relative' style={{ width: 250 }}>
        {vantagePoints.map((vp, i) => (
          <SitePlanLayer key={vp.id} vantagePoint={vp} index={i} progress={activeFloat} />
        ))}
      </div>
    </div>
  )
})

InfoLegend.displayName = 'InfoLegend'

/* ── Counter ───────────────────────────────────────────────────── */

type CounterDisplayProps = {
  progress: MotionValue<number>
  total: number
}

const CounterDisplay = memo(({ progress, total }: CounterDisplayProps) => {
  const display = useTransform(progress, (v) => {
    const idx = Math.round(v)
    return `${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`
  })

  return (
    <Typography variant='overline' className='text-primary-600' aria-live='polite'>
      <m.span>{display}</m.span>
    </Typography>
  )
})

CounterDisplay.displayName = 'CounterDisplay'

/* ── Site plan layers ──────────────────────────────────────────── */

type SitePlanLayerProps = {
  vantagePoint: ExteriorVantagePoint
  index: number
  progress: MotionValue<number>
}

const SitePlanLayer = memo(({ vantagePoint, index, progress }: SitePlanLayerProps) => {
  const opacity = useTransform(progress, (v) => {
    const dist = Math.abs(v - index)
    return Math.max(0, 1 - dist * 2.5)
  })

  return (
    <m.div
      className={index === 0 ? 'relative' : 'absolute inset-0'}
      style={{ opacity }}
      aria-hidden={index !== 0}
    >
      <Image
        src={vantagePoint.sitePlan.src}
        alt={vantagePoint.sitePlan.alt}
        width={vantagePoint.sitePlan.width}
        height={vantagePoint.sitePlan.height}
        loading='lazy'
        className='w-full'
      />
    </m.div>
  )
})

SitePlanLayer.displayName = 'SitePlanLayer'

/* ── Text slides ───────────────────────────────────────────────── */

type TextSlideProps = {
  vantagePoint: ExteriorVantagePoint
  index: number
  progress: MotionValue<number>
}

const TextSlide = memo(({ vantagePoint, index, progress }: TextSlideProps) => {
  const opacity = useTransform(progress, (v) => {
    const dist = Math.abs(v - index)
    return Math.max(0, 1 - dist * 2.5)
  })

  const y = useTransform(progress, (v) => {
    const delta = v - index
    return delta * -20
  })

  return (
    <m.div
      className={index === 0 ? 'relative' : 'absolute inset-x-0 top-0'}
      style={{ opacity, y, willChange: 'transform, opacity' }}
    >
      <div className='flex flex-col gap-1'>
        <Typography variant='h4' as='h3'>
          {vantagePoint.title}
        </Typography>
        <Typography variant='body-sm' className='text-foreground' style={{ opacity: 0.6 }}>
          {vantagePoint.description}
        </Typography>
      </div>
    </m.div>
  )
})

TextSlide.displayName = 'TextSlide'
