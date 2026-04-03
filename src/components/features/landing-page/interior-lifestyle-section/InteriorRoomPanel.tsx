'use client'

import { memo } from 'react'

import Image from 'next/image'

import type { InteriorRoom } from '@/dictionaries/landing-page'
import { MotionInView } from '@/lib/motion'
import { cn } from '@/lib/utils'

type InteriorRoomPanelProps = {
  room: InteriorRoom
  index: number
}

export const InteriorRoomPanel = memo(({ room, index }: InteriorRoomPanelProps) => {
  // Alternate sides: even index = text left / overlay right, odd = text right / overlay left
  const textOnLeft = index % 2 === 0

  return (
    <div className='relative w-full overflow-hidden' style={{ height: '100vh' }}>
      {/* Base photo */}
      <Image
        src={room.image.src}
        alt={room.image.alt}
        fill
        sizes='100vw'
        priority={index === 0}
        className='object-cover'
      />

      {/* Top gradient for text legibility */}
      <div
        className='pointer-events-none absolute inset-0'
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 25%, transparent 50%)',
        }}
      />

      {/* Content layer — text top-left or top-right, overlay on opposite side */}
      <div className='absolute inset-0'>
        <div className='mx-auto flex size-full max-w-content px-5 pt-10 md:px-10 md:pt-14 lg:px-14 lg:pt-16'>
          {/* Text — always at top, on one side */}
          <div className='flex flex-1 flex-col justify-start' style={{ order: textOnLeft ? 0 : 1 }}>
            <MotionInView direction='up' distance={40} delay={0.15} once>
              <div className='flex flex-col gap-1'>
                <span
                  className='font-sans uppercase tracking-widest text-white'
                  style={{ fontSize: '0.75rem', letterSpacing: '0.2em', opacity: 0.8 }}
                >
                  {room.title}
                </span>
                <h3
                  className='font-sans font-light uppercase tracking-wide text-white'
                  style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', lineHeight: 1.15 }}
                >
                  {room.subtitle}
                </h3>
              </div>
            </MotionInView>
          </div>

          {/* Overlay — opposite side of text, top-aligned */}
          <div
            className='pointer-events-none flex flex-1 justify-end'
            style={{ order: textOnLeft ? 1 : 0 }}
          >
            <MotionInView direction='none' delay={0.3} once>
              <div className='relative' style={{ width: '22vw', height: '30vh', opacity: 1 }}>
                <Image
                  src={room.overlay.src}
                  alt=''
                  fill
                  sizes='25vw'
                  className={cn(
                    'object-contain',
                    textOnLeft ? 'object-right-top' : 'object-left-top',
                  )}
                  aria-hidden
                />
              </div>
            </MotionInView>
          </div>
        </div>
      </div>
    </div>
  )
})

InteriorRoomPanel.displayName = 'InteriorRoomPanel'
