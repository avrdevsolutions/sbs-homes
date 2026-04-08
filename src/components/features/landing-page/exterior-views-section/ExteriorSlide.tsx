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
  onPlanClick?: () => void
}

export const ExteriorSlide = memo(
  ({ vantagePoint, index, total, slideRatio, onImageClick, onPlanClick }: ExteriorSlideProps) => (
    <div
      className='absolute inset-y-0 left-0 overflow-hidden'
      style={{ width: `${slideRatio * 100}%`, willChange: 'transform', borderRadius: 16 }}
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

      {/* Site plan — bottom right */}
      <button
        type='button'
        className='pointer-events-auto absolute bottom-5 right-5 cursor-zoom-in md:bottom-7 md:right-7 lg:bottom-8 lg:right-8'
        onClick={(e) => {
          e.stopPropagation()
          onPlanClick?.()
        }}
        aria-label={`View ${vantagePoint.sitePlan.alt} fullscreen`}
      >
        <div
          className='relative overflow-hidden rounded-lg bg-white shadow-lg'
          style={{ width: 200, height: 150 }}
        >
          <Image
            src={vantagePoint.sitePlan.src}
            alt={vantagePoint.sitePlan.alt}
            fill
            className='object-contain p-3'
            sizes='160px'
          />
        </div>
      </button>
    </div>
  ),
)

ExteriorSlide.displayName = 'ExteriorSlide'
