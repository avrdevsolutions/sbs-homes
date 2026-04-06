'use client'

import { useState } from 'react'

import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import type { FloorPlanTab } from '@/dictionaries/landing-page'

import 'yet-another-react-lightbox/styles.css'

type FloorPlanLightboxProps = {
  tabs: FloorPlanTab[]
  slideIndex: number
  children: React.ReactNode
}

export const FloorPlanLightbox = ({ tabs, slideIndex, children }: FloorPlanLightboxProps) => {
  const [open, setOpen] = useState(false)

  const slides = tabs.map((tab) => ({
    src: tab.image.src,
    alt: tab.image.alt,
    width: tab.image.width,
    height: tab.image.height,
  }))

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='block w-full cursor-zoom-in'
        aria-label={`View ${tabs[slideIndex].label} plan fullscreen`}
      >
        {children}
      </button>
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={slideIndex}
        slides={slides}
        plugins={[Zoom]}
        zoom={{ maxZoomPixelRatio: 3 }}
        carousel={{ finite: true }}
        animation={{ fade: 300 }}
        controller={{ closeOnBackdropClick: true }}
        styles={{
          container: { backgroundColor: 'rgba(245, 243, 240, 0.98)' },
          button: { color: '#1C1C1E', filter: 'none' },
          navigationPrev: { color: '#1C1C1E' },
          navigationNext: { color: '#1C1C1E' },
          icon: { color: '#1C1C1E' },
        }}
      />
    </>
  )
}
