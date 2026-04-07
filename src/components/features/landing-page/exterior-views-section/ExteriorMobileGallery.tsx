'use client'

import { useState } from 'react'

import Image from 'next/image'

import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import 'yet-another-react-lightbox/styles.css'

import { SectionBlockHeader } from '@/components/shared'
import { Container, Typography } from '@/components/ui'
import type { ExteriorViewsSectionContent } from '@/dictionaries/landing-page'

type ExteriorMobileGalleryProps = {
  content: ExteriorViewsSectionContent
}

export const ExteriorMobileGallery = ({ content }: ExteriorMobileGalleryProps) => {
  const { vantagePoints } = content

  const [planLightboxOpen, setPlanLightboxOpen] = useState(false)
  const [activePlanIndex, setActivePlanIndex] = useState(0)

  const openPlanLightbox = (index: number) => {
    setActivePlanIndex(index)
    setPlanLightboxOpen(true)
  }

  return (
    <div className='bg-secondary-100 py-16'>
      {/* Section header */}
      <Container size='xxl' padding='xxl'>
        <SectionBlockHeader
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
          titleAs='h2'
        />
      </Container>

      {/* Vantage points — immersive stacked gallery */}
      <div className='mt-2 flex flex-col gap-12'>
        {vantagePoints.map((vp, i) => (
          <article key={vp.id}>
            {/* Edge-to-edge image */}
            <div className='relative w-full overflow-hidden' style={{ aspectRatio: '4 / 3' }}>
              <Image
                src={vp.image.src}
                alt={vp.image.alt}
                fill
                sizes='100vw'
                loading={i === 0 ? undefined : 'lazy'}
                priority={i === 0}
                className='object-cover'
              />
            </div>

            {/* Text + View Plan below image */}
            <Container size='xxl' padding='xxl'>
              <div className='pt-4'>
                <Typography variant='h4' as='h3'>
                  {vp.title}
                </Typography>
                <Typography
                  variant='body-sm'
                  className='mt-1.5 text-foreground'
                  style={{ maxWidth: '36ch', opacity: 0.6 }}
                >
                  {vp.description}
                </Typography>

                <div className='mt-3'>
                  <button
                    type='button'
                    onClick={() => openPlanLightbox(i)}
                    className='flex items-center gap-1.5'
                    aria-label={`View ${vp.sitePlan.alt}`}
                  >
                    <Typography variant='overline' className='text-primary-600'>
                      View Plan
                    </Typography>
                    <svg
                      width='12'
                      height='12'
                      viewBox='0 0 16 16'
                      fill='none'
                      aria-hidden='true'
                      className='text-primary-600'
                    >
                      <path
                        d='M4 12L12 4M12 4H5M12 4V11'
                        stroke='currentColor'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </Container>
          </article>
        ))}
      </div>

      {/* Lightbox — single site plan */}
      {planLightboxOpen && (
        <Lightbox
          open
          close={() => setPlanLightboxOpen(false)}
          slides={[
            {
              src: vantagePoints[activePlanIndex].sitePlan.src,
              alt: vantagePoints[activePlanIndex].sitePlan.alt,
              width: vantagePoints[activePlanIndex].sitePlan.width * 1.5,
              height: vantagePoints[activePlanIndex].sitePlan.height * 1.5,
            },
          ]}
          plugins={[Zoom]}
          zoom={{ minZoom: 3, maxZoomPixelRatio: 3, scrollToZoom: true }}
          animation={{ fade: 300 }}
          controller={{ closeOnBackdropClick: true }}
          styles={{
            container: { backgroundColor: 'rgba(245, 243, 240, 0.98)' },
            button: { color: '#1C1C1E', filter: 'none' },
            navigationPrev: { display: 'none' },
            navigationNext: { display: 'none' },
            icon: { color: '#1C1C1E' },
          }}
        />
      )}
    </div>
  )
}
