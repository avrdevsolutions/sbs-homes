import { memo } from 'react'

import { Typography } from '@/components/ui'
import type { ExteriorVantagePoint } from '@/dictionaries/landing-page'

type GalleryLegendProps = {
  vantagePoints: readonly ExteriorVantagePoint[]
  total: number
}

/**
 * Fixed legend area below the image strip.
 *
 * Structure:
 * - Persistent accent line + "/ 03" counter (never disappears)
 * - Per-vantage-point text blocks stacked absolutely — GSAP slides them
 *   in from the right (x: 40 → 0) and out to the left (x: 0 → -40)
 */
export const GalleryLegend = memo(({ vantagePoints, total }: GalleryLegendProps) => (
  <div className='flex items-start gap-4'>
    {/* Persistent accent line */}
    <div
      className='mt-1.5 shrink-0 bg-primary-600'
      style={{ width: 2, height: 44 }}
      aria-hidden='true'
    />

    {/* Text area — relative container for stacked legend entries */}
    <div className='relative min-w-0 flex-1'>
      {/* Persistent counter — only the number part is animated via GSAP */}
      <div className='flex items-baseline gap-1'>
        <div className='relative overflow-hidden' style={{ width: '2ch', height: '1.2em' }}>
          {vantagePoints.map((_, i) => (
            <span
              key={i}
              data-ext-counter={i}
              className='absolute inset-0'
              style={{
                opacity: i === 0 ? 1 : 0,
                transform: i === 0 ? 'translateY(0)' : 'translateY(100%)',
                willChange: 'transform, opacity',
              }}
            >
              <Typography variant='overline' as='span' className='text-white/90'>
                {String(i + 1).padStart(2, '0')}
              </Typography>
            </span>
          ))}
        </div>
        <Typography variant='overline' as='span' className='text-white/40'>
          / {String(total).padStart(2, '0')}
        </Typography>
      </div>

      {/* Title + description — stacked, push-slide animated */}
      <div className='relative mt-2 overflow-hidden' style={{ minHeight: 72 }}>
        {vantagePoints.map((vp, i) => (
          <div
            key={vp.id}
            data-ext-legend={i}
            className={i === 0 ? 'relative' : 'absolute inset-x-0 top-0'}
            style={{
              opacity: i === 0 ? 1 : 0,
              transform: i === 0 ? 'translateX(0)' : 'translateX(40px)',
              willChange: 'transform, opacity',
            }}
          >
            <Typography variant='h4' as='h3' className='text-white'>
              {vp.title}
            </Typography>
            <Typography
              variant='body-sm'
              className='mt-1.5 text-white/60'
              style={{ maxWidth: '40ch' }}
            >
              {vp.description}
            </Typography>
          </div>
        ))}
      </div>
    </div>
  </div>
))

GalleryLegend.displayName = 'GalleryLegend'
