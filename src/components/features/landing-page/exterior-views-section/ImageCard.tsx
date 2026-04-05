import { memo } from 'react'

import Image from 'next/image'

import type { ExteriorVantagePoint } from '@/dictionaries/landing-page'

type ImageCardProps = {
  vantagePoint: ExteriorVantagePoint
  index: number
  cardWidth: number
  inactiveScale: number
  inactiveOpacity: number
}

export const ImageCard = memo(
  ({ vantagePoint, index, cardWidth, inactiveScale, inactiveOpacity }: ImageCardProps) => (
    <div
      data-ext-card={index}
      className='relative shrink-0 self-stretch overflow-hidden rounded-2xl'
      style={{
        width: `${cardWidth}vw`,
        opacity: index === 0 ? 1 : inactiveOpacity,
        transform: `scale(${index === 0 ? 1 : inactiveScale})`,
        willChange: 'transform, opacity',
      }}
    >
      <Image
        src={vantagePoint.image.src}
        alt={vantagePoint.image.alt}
        fill
        sizes={`${cardWidth}vw`}
        priority={index === 0}
        className='object-cover'
      />

      {/* Site plan chip, bottom-right — frosted glass */}
      <div
        className='absolute bottom-4 right-4 hidden rounded-xl shadow-lg ring-1 ring-white/40 lg:block'
        style={{
          padding: '0.75rem 1rem',
          width: 240,
          height: 180,
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(24px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        }}
      >
        <Image
          src={vantagePoint.sitePlan.src}
          alt={vantagePoint.sitePlan.alt}
          width={vantagePoint.sitePlan.width}
          height={vantagePoint.sitePlan.height}
          loading='lazy'
          className='size-full object-contain'
        />
      </div>
    </div>
  ),
)

ImageCard.displayName = 'ImageCard'
