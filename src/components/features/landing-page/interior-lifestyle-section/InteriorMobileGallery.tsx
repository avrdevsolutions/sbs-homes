'use client'

import { useState } from 'react'

import Image from 'next/image'

import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import 'yet-another-react-lightbox/styles.css'

import { SectionBlockHeader } from '@/components/shared'
import { Container, Stack } from '@/components/ui'
import type { InteriorRoom } from '@/dictionaries/landing-page'

type InteriorMobileGalleryProps = {
  rooms: InteriorRoom[]
  eyebrow: string
  title: string
  description: string
}

export const InteriorMobileGallery = ({
  rooms,
  eyebrow,
  title,
  description,
}: InteriorMobileGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const slides = rooms.map((room) => ({
    src: room.image.src,
    alt: room.image.alt,
  }))

  const openLightbox = (index: number) => {
    setActiveIndex(index)
    setLightboxOpen(true)
  }

  return (
    <>
      <Container size='xxl' padding='xxl'>
        <div className='pb-10 pt-26'>
          <SectionBlockHeader
            eyebrow={eyebrow}
            title={title}
            description={description}
            titleAs='h2'
          />
        </div>
      </Container>
      <Stack gap='8'>
        {rooms.map((room, i) => (
          <button
            key={room.id}
            type='button'
            onClick={() => openLightbox(i)}
            className='relative aspect-video w-full'
            aria-label={`View ${room.title} fullscreen`}
          >
            <Image
              src={room.image.src}
              alt={room.image.alt}
              fill
              sizes='100vw'
              className='object-cover'
            />
            <div
              className='absolute inset-0'
              style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)',
              }}
            />
            <div className='absolute bottom-5 left-5 text-left'>
              <span className='font-display text-eyebrow uppercase tracking-widest text-primary-600'>
                {room.title}
              </span>
              <h3 className='mt-1 font-display text-h2-sm uppercase tracking-wider text-white md:text-h2-md'>
                {room.subtitle}
              </h3>
            </div>
          </button>
        ))}
      </Stack>

      {lightboxOpen && (
        <Lightbox
          open
          close={() => setLightboxOpen(false)}
          index={activeIndex}
          slides={slides}
          plugins={[Zoom]}
          zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
          animation={{ fade: 300 }}
          controller={{ closeOnBackdropClick: true }}
          styles={{
            container: { backgroundColor: 'rgba(0, 0, 0, 0.95)' },
          }}
        />
      )}
    </>
  )
}
