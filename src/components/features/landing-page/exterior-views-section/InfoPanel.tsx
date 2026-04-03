'use client'

import { memo } from 'react'

import Image from 'next/image'

import { Container, Typography } from '@/components/ui'
import type { ExteriorVantagePoint } from '@/dictionaries/landing-page'
import { m, type MotionValue, useTransform } from '@/lib/motion'

const PANEL_COUNT = 3

type InfoPanelProps = {
  vantagePoints: ExteriorVantagePoint[]
  progress: MotionValue<number>
}

export const InfoPanel = memo(({ vantagePoints, progress }: InfoPanelProps) => {
  /**
   * Active index as continuous value 0→2, synced to PhotoStrip timing.
   * Strip holds: card 0 [0, 0.30], transition [0.30, 0.38],
   *              card 1 [0.38, 0.62], transition [0.62, 0.70],
   *              card 2 [0.70, 1.0]
   */
  const activeFloat = useTransform(progress, [0, 0.3, 0.38, 0.62, 0.7, 1], [0, 0, 1, 1, 2, 2])

  /* Counter text — discrete jump */
  const counterIndex = useTransform(activeFloat, (v) => Math.round(Math.min(v, PANEL_COUNT - 1)))

  return (
    <div className='relative shrink-0 bg-secondary-100'>
      <Container>
        <div className='flex items-start gap-8 py-8 md:gap-12 md:py-10 lg:gap-16'>
          {/* Site plan — always visible */}
          <div className='relative shrink-0' style={{ width: 120 }}>
            {vantagePoints.map((vp, i) => (
              <SitePlanLayer key={vp.id} vantagePoint={vp} index={i} progress={activeFloat} />
            ))}
          </div>

          {/* Text area */}
          <div className='flex min-h-0 flex-1 flex-col gap-3'>
            {/* Counter — always visible */}
            <m.div>
              <CounterDisplay progress={counterIndex} total={PANEL_COUNT} />
            </m.div>

            {/* Animated title + description */}
            <div className='relative' style={{ minHeight: 100 }}>
              {vantagePoints.map((vp, i) => (
                <TextSlide key={vp.id} vantagePoint={vp} index={i} progress={activeFloat} />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
})

InfoPanel.displayName = 'InfoPanel'

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

/* ── Site plan layers — crossfade between plans ────────────────── */

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

/* ── Text slides — crossfade between title+description ─────────── */

type TextSlideProps = {
  vantagePoint: ExteriorVantagePoint
  index: number
  progress: MotionValue<number>
}

const TextSlide = memo(({ vantagePoint, index, progress }: TextSlideProps) => {
  /* Opacity — peaks at 1 when progress === index, fades to 0 at ±0.5 */
  const opacity = useTransform(progress, (v) => {
    const dist = Math.abs(v - index)
    return Math.max(0, 1 - dist * 2.5)
  })

  /* Y offset — slides up as it enters, slides further up as it exits */
  const y = useTransform(progress, (v) => {
    const delta = v - index
    return delta * -30
  })

  return (
    <m.div
      className={index === 0 ? 'relative' : 'absolute inset-x-0 top-0'}
      style={{ opacity, y, willChange: 'transform, opacity' }}
    >
      <div className='flex flex-col gap-2'>
        <Typography variant='h3' as='h3'>
          {vantagePoint.title}
        </Typography>
        <Typography
          variant='body-sm'
          className='text-foreground'
          style={{ opacity: 0.6, maxWidth: '44ch' }}
        >
          {vantagePoint.description}
        </Typography>
      </div>
    </m.div>
  )
})

TextSlide.displayName = 'TextSlide'
