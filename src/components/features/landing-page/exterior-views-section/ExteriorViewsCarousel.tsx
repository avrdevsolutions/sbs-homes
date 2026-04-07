'use client'

import { useCallback, useRef, useState } from 'react'

import Image from 'next/image'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import 'yet-another-react-lightbox/styles.css'

import { SectionBlockHeader } from '@/components/shared'
import { Typography } from '@/components/ui'
import type { ExteriorViewsSectionContent } from '@/dictionaries/landing-page'
import { cn } from '@/lib/utils'

import { ExteriorSlide } from './ExteriorSlide'

gsap.registerPlugin(useGSAP)

type ExteriorViewsCarouselProps = {
  content: ExteriorViewsSectionContent
}

export const ExteriorViewsCarousel = ({ content }: ExteriorViewsCarouselProps) => {
  const { vantagePoints } = content
  const trackRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const isAnimatingRef = useRef(false)
  const touchStartRef = useRef<number | null>(null)
  /* trackIndex maps to the extended track: [clone-last, 0, 1, 2, clone-first] */
  const trackIndexRef = useRef(1)

  const SLIDE_GAP = 24
  const SLIDE_RATIO = 0.75

  const total = vantagePoints.length
  const active = vantagePoints[activeIndex]

  /* ── Compute pixel offset for a given track index ── */
  const getOffset = useCallback((ti: number) => {
    const viewportWidth = viewportRef.current?.clientWidth ?? 0
    const slideWidth = viewportWidth * SLIDE_RATIO
    return -(ti * (slideWidth + SLIDE_GAP))
  }, [])

  /* ── Set track position immediately (no animation) ── */
  const snapTrack = useCallback(
    (ti: number) => {
      const track = trackRef.current
      if (track) gsap.set(track, { x: getOffset(ti) })
      trackIndexRef.current = ti
    },
    [getOffset],
  )

  /* ── Animate legend for a slide ── */
  const animateLegend = useCallback((slideIndex: number, show: boolean) => {
    const track = trackRef.current
    if (!track) return
    /* Find all legends matching this data index (real + clone) */
    const legends = track.querySelectorAll(`[data-ext-legend="${slideIndex}"]`)
    if (!legends.length) return
    if (show) {
      gsap.to(legends, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.15 })
    } else {
      gsap.to(legends, { opacity: 0, y: 20, duration: 0.25, ease: 'power2.in' })
    }
  }, [])

  /* ── Set initial track position and legend states ── */
  useGSAP(
    () => {
      /* Re-position track at current active slide */
      const currentTrack = activeIndex + 1
      snapTrack(currentTrack)
      /* Hide all legends, then show only the active */
      const track = trackRef.current
      if (track) {
        gsap.set(track.querySelectorAll('[data-ext-legend]'), { opacity: 0, y: 20 })
        gsap.set(track.querySelectorAll(`[data-ext-legend="${activeIndex}"]`), { opacity: 1, y: 0 })
        /* Reveal track now that it's correctly positioned */
        gsap.set(track, { visibility: 'visible' })
        setReady(true)
      }
    },
    { scope: containerRef },
  )

  /* ── Navigate to next/prev with infinite wrap ── */
  const goToSlide = useCallback(
    (realIndex: number) => {
      if (isAnimatingRef.current) return
      isAnimatingRef.current = true

      const track = trackRef.current
      if (!track) return

      const prevReal = activeIndex

      /* Calculate the target track index.
         Extended track: [clone-last(0), real-0(1), real-1(2), real-2(3), clone-first(4)]
         When wrapping forward past last: animate to clone-first, then snap to real-0.
         When wrapping backward past first: animate to clone-last, then snap to real-last. */
      let targetTrack: number
      let wrapTo: number | null = null

      if (realIndex >= total) {
        /* Wrapping forward: animate to clone-first (index total+1) */
        targetTrack = total + 1
        wrapTo = 1 // snap to real-0
      } else if (realIndex < 0) {
        /* Wrapping backward: animate to clone-last (index 0) */
        targetTrack = 0
        wrapTo = total // snap to real-last
      } else {
        targetTrack = realIndex + 1
      }

      const nextReal = wrapTo !== null ? (realIndex < 0 ? total - 1 : 0) : realIndex

      /* Animate site plan */
      const direction = realIndex > prevReal || (realIndex < 0 && prevReal === 0) ? 1 : -1
      const container = containerRef.current
      const planEls = container?.querySelectorAll('[data-ext-plan]')
      if (planEls?.length) {
        gsap.to(planEls, {
          x: direction * -40,
          opacity: 0,
          duration: 0.25,
          ease: 'power2.in',
          onComplete: () => {
            setActiveIndex(nextReal)
            gsap.fromTo(
              planEls,
              { x: direction * 40, opacity: 0 },
              { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' },
            )
          },
        })
      } else {
        setActiveIndex(nextReal)
      }

      /* Hide outgoing legend */
      animateLegend(prevReal, false)

      /* Slide track */
      gsap.to(track, {
        x: getOffset(targetTrack),
        duration: 0.5,
        ease: 'power2.inOut',
        onComplete: () => {
          if (wrapTo !== null) {
            snapTrack(wrapTo)
          } else {
            trackIndexRef.current = targetTrack
          }
          /* Show incoming legend */
          animateLegend(nextReal, true)
          isAnimatingRef.current = false
        },
      })
    },
    [activeIndex, total, getOffset, snapTrack, animateLegend],
  )

  const goNext = useCallback(() => goToSlide(activeIndex + 1), [activeIndex, goToSlide])
  const goPrev = useCallback(() => goToSlide(activeIndex - 1), [activeIndex, goToSlide])

  /* ── Touch / swipe handlers ── */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartRef.current === null) return
      const diff = touchStartRef.current - e.changedTouches[0].clientX
      const threshold = 50
      if (diff > threshold) goNext()
      else if (diff < -threshold) goPrev()
      touchStartRef.current = null
    },
    [goNext, goPrev],
  )

  const openImageLightbox = useCallback(() => setImageLightboxOpen(true), [])

  return (
    <div ref={containerRef} className='relative flex h-full flex-col'>
      {/* Plan pinned to container top-right */}
      <div className='absolute right-0 top-10 z-10'>
        <div data-ext-plan>
          <button
            type='button'
            onClick={() => setLightboxOpen(true)}
            className='cursor-zoom-in'
            aria-label={`View ${active.sitePlan.alt} fullscreen`}
          >
            <div className='relative' style={{ width: 270, height: 200 }}>
              <Image
                src={active.sitePlan.src}
                alt={active.sitePlan.alt}
                fill
                className='object-contain object-right-top'
                sizes='270px'
              />
            </div>
          </button>
        </div>
      </div>

      {/* ── Section header ── */}
      <div className='shrink-0 pt-10'>
        <SectionBlockHeader
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
          titleAs='h2'
        />
      </div>

      {/* ── Carousel — exterior images ── */}
      <div className='relative min-h-0 flex-1'>
        {/* Skeleton — visible until GSAP positions track */}
        {!ready ? (
          <div className='absolute inset-0 flex' style={{ gap: SLIDE_GAP }}>
            <div
              className='h-full shrink-0 animate-pulse rounded-2xl bg-secondary-200'
              style={{ width: `${SLIDE_RATIO * 100}%` }}
            />
            {SLIDE_RATIO < 1 ? (
              <div
                className='h-full shrink-0 animate-pulse rounded-2xl bg-secondary-200'
                style={{ width: `${(1 - SLIDE_RATIO) * 100}%`, opacity: 0.5 }}
              />
            ) : null}
          </div>
        ) : null}
        <div
          ref={viewportRef}
          className='size-full overflow-hidden'
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-roledescription='carousel'
          aria-label='Exterior views'
        >
          <div
            ref={trackRef}
            className='flex h-full'
            style={{ willChange: 'transform', gap: SLIDE_GAP, visibility: 'hidden' }}
          >
            {/* Clone of last slide (for backward wrap) */}
            <ExteriorSlide
              vantagePoint={vantagePoints[total - 1]}
              index={total - 1}
              total={total}
              slideRatio={SLIDE_RATIO}
              onImageClick={openImageLightbox}
            />
            {/* Real slides */}
            {vantagePoints.map((vp, i) => (
              <ExteriorSlide
                key={vp.id}
                vantagePoint={vp}
                index={i}
                total={total}
                slideRatio={SLIDE_RATIO}
                onImageClick={openImageLightbox}
              />
            ))}
            {/* Clone of first slide (for forward wrap) */}
            <ExteriorSlide
              vantagePoint={vantagePoints[0]}
              index={0}
              total={total}
              slideRatio={SLIDE_RATIO}
              onImageClick={openImageLightbox}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom bar: navigation ── */}
      <div className='shrink-0 pt-3 md:pb-6 md:pt-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='flex gap-1.5' role='tablist' aria-label='Exterior view slides'>
              {vantagePoints.map((vp, i) => (
                <button
                  key={vp.id}
                  type='button'
                  role='tab'
                  aria-selected={i === activeIndex}
                  aria-label={vp.title}
                  onClick={() => goToSlide(i)}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300',
                    i === activeIndex ? 'w-6 bg-primary-600' : 'w-3 bg-secondary-900/15',
                  )}
                />
              ))}
            </div>
            <Typography
              variant='overline'
              className='text-secondary-900/40'
              style={{ fontSize: '0.6rem' }}
            >
              {activeIndex + 1} / {total}
            </Typography>
          </div>

          {/* Mobile: View Plan button */}
          <button
            type='button'
            onClick={() => setLightboxOpen(true)}
            className='flex items-center gap-1.5 text-primary-600 md:hidden'
            aria-label={`View ${active.sitePlan.alt}`}
          >
            <Typography variant='overline' className='text-primary-600'>
              View Plan
            </Typography>
            <svg width='12' height='12' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
              <path
                d='M4 12L12 4M12 4H5M12 4V11'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </button>

          <div className='hidden gap-2 md:flex'>
            <button
              type='button'
              onClick={goPrev}
              aria-label='Previous view'
              className='flex size-9 items-center justify-center rounded-full border border-secondary-900/25 text-secondary-900/70 transition-colors hover:border-secondary-900/50 hover:text-secondary-900'
            >
              <svg width='14' height='14' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
                <path
                  d='M10 12L6 8L10 4'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </button>
            <button
              type='button'
              onClick={goNext}
              aria-label='Next view'
              className='flex size-9 items-center justify-center rounded-full border border-secondary-900/25 text-secondary-900/70 transition-colors hover:border-secondary-900/50 hover:text-secondary-900'
            >
              <svg width='14' height='14' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
                <path
                  d='M6 4L10 8L6 12'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Lightbox for site plan ── */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={vantagePoints.map((vp) => ({
          src: vp.sitePlan.src,
          alt: vp.sitePlan.alt,
          width: vp.sitePlan.width * 1.5,
          height: vp.sitePlan.height * 1.5,
        }))}
        index={activeIndex}
        plugins={[Zoom]}
        zoom={{ minZoom: 3, maxZoomPixelRatio: 3, scrollToZoom: true }}
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

      {/* ── Lightbox for exterior images ── */}
      <Lightbox
        open={imageLightboxOpen}
        close={() => setImageLightboxOpen(false)}
        slides={vantagePoints.map((vp) => ({
          src: vp.image.src,
          alt: vp.image.alt,
          width: vp.image.width,
          height: vp.image.height,
        }))}
        index={activeIndex}
        plugins={[Zoom]}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        carousel={{ finite: true }}
        animation={{ fade: 300 }}
        controller={{ closeOnBackdropClick: true }}
        styles={{
          container: { backgroundColor: 'rgba(20, 20, 22, 0.95)' },
        }}
      />
    </div>
  )
}
