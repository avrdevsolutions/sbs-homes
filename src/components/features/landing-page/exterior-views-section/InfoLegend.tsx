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

/**
 * Floating legend panel — frosted glass over the image.
 * Dark backdrop so site plan SVG lines read white-on-dark.
 */
export const InfoLegend = memo(({ vantagePoints, progress }: InfoLegendProps) => {
  const activeFloat = useTransform(progress, [0, 0.28, 0.38, 0.62, 0.72, 1], [0, 0, 1, 1, 2, 2])

  const counterIndex = useTransform(activeFloat, (v) => Math.round(Math.min(v, PANEL_COUNT - 1)))

  return (
    <div
      className='flex flex-col gap-5 rounded-2xl border border-black/5'
      style={{
        padding: '1.5rem 1.75rem',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(24px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        maxWidth: '22rem',
      }}
    >
      {/* Counter */}
      <CounterDisplay progress={counterIndex} total={PANEL_COUNT} />

      {/* Text — crossfading */}
      <div className='relative' style={{ minHeight: 90 }}>
        {vantagePoints.map((vp, i) => (
          <TextSlide key={vp.id} vantagePoint={vp} index={i} progress={activeFloat} />
        ))}
      </div>

      {/* Divider */}
      <div className='h-px bg-black/10' />

      {/* Site plan — crossfading, now white-on-dark */}
      <div className='relative' style={{ height: 160 }}>
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
      className={index === 0 ? 'relative size-full' : 'absolute inset-0'}
      style={{ opacity }}
      aria-hidden={index !== 0}
    >
      <Image
        src={vantagePoint.sitePlan.src}
        alt={vantagePoint.sitePlan.alt}
        width={vantagePoint.sitePlan.width}
        height={vantagePoint.sitePlan.height}
        loading='lazy'
        className='size-full object-contain'
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
    return delta * -12
  })

  return (
    <m.div
      className={index === 0 ? 'relative' : 'absolute inset-x-0 top-0'}
      style={{ opacity, y, willChange: 'transform, opacity' }}
    >
      <div className='flex flex-col gap-1.5'>
        <Typography variant='h4' as='h3' className='text-foreground'>
          {vantagePoint.title}
        </Typography>
        <Typography variant='body-sm' className='text-foreground/60'>
          {vantagePoint.description}
        </Typography>
      </div>
    </m.div>
  )
})

TextSlide.displayName = 'TextSlide'
