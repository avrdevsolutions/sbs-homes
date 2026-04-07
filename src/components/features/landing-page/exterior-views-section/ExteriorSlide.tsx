import { memo } from 'react'

import Image from 'next/image'

import { Typography } from '@/components/ui'
import type { ExteriorVantagePoint } from '@/dictionaries/landing-page'

type ExteriorSlideProps = {
  vantagePoint: ExteriorVantagePoint
  index: number
  total: number
  slideRatio: number
  onImageClick?: () => void
}

export const ExteriorSlide = memo(
  ({ vantagePoint, index, total, slideRatio, onImageClick }: ExteriorSlideProps) => (
    <div
      className='h-full shrink-0 overflow-hidden rounded-2xl'
      style={{ width: `${slideRatio * 100}%` }}
      data-ext-slide={index}
      aria-roledescription='slide'
      aria-label={`${index + 1} of ${total}: ${vantagePoint.title}`}
      role='group'
    >
      <button
        type='button'
        className='relative size-full cursor-zoom-in text-left'
        onClick={onImageClick}
        aria-label={`View ${vantagePoint.title} fullscreen`}
      >
        <Image
          src={vantagePoint.image.src}
          alt={vantagePoint.image.alt}
          fill
          sizes='(max-width: 768px) 100vw, 75vw'
          priority={index === 0}
          className='object-cover'
        />

        {/* Bottom gradient scrim for text readability */}
        <div
          className='pointer-events-none absolute inset-x-0 bottom-0'
          style={{
            height: '55%',
            background:
              'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.5) 30%, rgba(0,0,0,0.15) 60%, transparent 100%)',
          }}
        />

        {/* Legend text — bottom left, visibility owned by GSAP */}
        <div data-ext-legend={index} className='absolute bottom-0 left-0 p-5 md:p-7 lg:p-8'>
          <Typography variant='h4' as='h3' className='text-white'>
            {vantagePoint.title}
          </Typography>
          <Typography
            variant='body-sm'
            className='mt-1.5 text-white/60'
            style={{ maxWidth: '38ch' }}
          >
            {vantagePoint.description}
          </Typography>
        </div>
      </button>
    </div>
  ),
)

ExteriorSlide.displayName = 'ExteriorSlide'
