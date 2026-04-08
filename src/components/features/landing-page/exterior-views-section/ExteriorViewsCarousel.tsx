'use client'

import { useCallback, useRef, useState } from 'react'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import 'yet-another-react-lightbox/styles.css'

import { Container, Separator, Typography } from '@/components/ui'
import type { ExteriorViewsSectionContent } from '@/dictionaries/landing-page'
import { cn } from '@/lib/utils'

import { ExteriorSlide } from './ExteriorSlide'

gsap.registerPlugin(useGSAP, ScrollTrigger)

type ExteriorViewsCarouselProps = {
  content: ExteriorViewsSectionContent
}

export const ExteriorViewsCarousel = ({ content }: ExteriorViewsCarouselProps) => {
  const { vantagePoints } = content
  const sceneRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const isAnimatingRef = useRef(false)
  const touchStartRef = useRef<number | null>(null)

  const SLIDE_GAP = 20
  const SLIDE_RATIO = 0.82
  const SIDE_SCALE = 0.85

  const total = vantagePoints.length

  /* ── Modular wrap helper ── */
  const wrap = useCallback((i: number) => ((i % total) + total) % total, [total])

  /* ── Get a slide DOM element by its data index ── */
  const getSlideEl = useCallback(
    (index: number) =>
      viewportRef.current?.querySelector(`[data-ext-slide="${index}"]`) as HTMLElement | null,
    [],
  )

  /* ── Compute x-position for a slot (-2, -1, 0, +1, +2) ── */
  const getSlotX = useCallback((slot: number) => {
    const vw = viewportRef.current?.clientWidth ?? 0
    const slideWidth = vw * SLIDE_RATIO
    return (vw - slideWidth) / 2 + slot * (slideWidth + SLIDE_GAP)
  }, [])

  /* ── Determine which slot a slide occupies relative to the active index ── */
  const getSlot = useCallback(
    (slideIndex: number, activeIdx: number) => {
      let diff = slideIndex - activeIdx
      if (diff > Math.floor(total / 2)) diff -= total
      if (diff < -Math.floor(total / 2)) diff += total
      return diff
    },
    [total],
  )

  /* ── Position all slides at their current slots (no animation) ── */
  const positionAllSlides = useCallback(
    (activeIdx: number) => {
      for (let i = 0; i < total; i++) {
        const el = getSlideEl(i)
        if (!el) continue
        const slot = getSlot(i, activeIdx)
        gsap.set(el, { x: getSlotX(slot), scale: slot === 0 ? 1 : SIDE_SCALE })
      }
    },
    [total, getSlideEl, getSlot, getSlotX],
  )

  /* ── Animate legend for a slide ── */
  const animateLegend = useCallback(
    (slideIndex: number, show: boolean) => {
      const el = getSlideEl(slideIndex)
      if (!el) return
      const legend = el.querySelector(`[data-ext-legend="${slideIndex}"]`)
      if (!legend) return
      if (show) {
        gsap.to(legend, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.2 })
      } else {
        gsap.to(legend, { opacity: 0, y: 20, duration: 0.3, ease: 'power2.in' })
      }
    },
    [getSlideEl],
  )

  const INTRO_SCALE = 1.15

  /* ── Scroll-reveal intro + initial carousel setup ── */
  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add(
        {
          isDesktop: '(min-width: 768px)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { isDesktop, reduceMotion } = context.conditions!

          if (reduceMotion) {
            /* Reduced motion: skip scroll intro, show final state */
            gsap.set('[data-ext-header-wrap]', { y: 0 })
            gsap.set('[data-ext-desc], [data-ext-sep]', { opacity: 0, display: 'none' })
            gsap.set('[data-ext-carousel-wrap]', { y: 0, scale: 1 })
            gsap.set('[data-ext-nav]', { opacity: 1 })
            positionAllSlides(0)
            const viewport = viewportRef.current
            if (viewport) {
              gsap.set(viewport.querySelectorAll('[data-ext-legend]'), { opacity: 0, y: 20 })
              gsap.set(viewport.querySelectorAll('[data-ext-legend="0"]'), { opacity: 1, y: 0 })
            }
            for (let i = 0; i < total; i++) {
              const el = getSlideEl(i)
              if (el) gsap.set(el, { opacity: 1 })
            }
            setReady(true)
            return
          }

          if (!isDesktop) return

          const el = sceneRef.current
          if (!el) return

          const vh = window.innerHeight
          const vw = window.innerWidth

          /* ── Measure header to vertically center it ── */
          const headerWrap = el.querySelector('[data-ext-header-wrap]') as HTMLElement
          if (!headerWrap) return
          const headerH = headerWrap.offsetHeight
          const centeredY = (vh - headerH) / 2
          const topY = 24

          /* ── Initial states ── */
          gsap.set('[data-ext-header-wrap]', { y: centeredY })
          gsap.set('[data-ext-carousel-wrap]', { y: '90vh', scale: INTRO_SCALE })
          gsap.set('[data-ext-nav]', { opacity: 0 })

          /* Position slides at their carousel slots */
          positionAllSlides(0)

          /* Hide legends */
          const viewport = viewportRef.current
          if (viewport) {
            gsap.set(viewport.querySelectorAll('[data-ext-legend]'), { opacity: 0, y: 20 })
          }

          /* Push side slides further out + hide */
          for (let i = 0; i < total; i++) {
            const slideEl = getSlideEl(i)
            if (!slideEl) continue
            const slot = getSlot(i, 0)
            if (slot !== 0) {
              const extraX = slot * vw * 0.2
              gsap.set(slideEl, { x: `+=${extraX}`, opacity: 0 })
            }
          }

          setReady(true)

          /* ──────────────────────────────────────────────────
           * SCROLL-DRIVEN INTRO
           *
           *   0.00–0.20  Header lifts from center to top
           *   0.00–0.24  Carousel rises from below + scales 1.15 → 1
           *   0.08–0.14  Description / separator fade out
           *   0.08–0.24  Side slides fly in from left & right
           *   0.24–0.30  Nav bar + legend fade in
           *   0.30–0.40  DEAD ZONE
           * ────────────────────────────────────────────────── */

          const master = gsap.timeline()

          /* Header lifts from center to top */
          master.to('[data-ext-header-wrap]', { y: topY, duration: 0.2, ease: 'none' }, 0.0)
          master.to('[data-ext-desc]', { opacity: 0, y: -8, duration: 0.04, ease: 'none' }, 0.08)
          master.to('[data-ext-sep]', { opacity: 0, duration: 0.04, ease: 'none' }, 0.08)

          /* Carousel rises + scales down simultaneously */
          master.to(
            '[data-ext-carousel-wrap]',
            {
              y: 0,
              scale: 1,
              duration: 0.24,
              ease: 'none',
            },
            0.0,
          )

          /* Side slides fly in from left & right */
          for (let i = 0; i < total; i++) {
            const slot = getSlot(i, 0)
            if (slot !== 0) {
              master.to(
                `[data-ext-slide="${i}"]`,
                {
                  x: getSlotX(slot),
                  opacity: 1,
                  duration: 0.16,
                  ease: 'none',
                },
                0.08,
              )
            }
          }

          /* Nav controls fade in (in header) */
          master.to('[data-ext-nav]', { opacity: 1, duration: 0.06, ease: 'none' }, 0.24)

          /* Legend on active slide */
          master.to(
            '[data-ext-legend="0"]',
            { opacity: 1, y: 0, duration: 0.06, ease: 'none' },
            0.26,
          )

          /* Dead zone */
          master.set({}, {}, 0.4)

          /* ── ScrollTrigger ── */
          ScrollTrigger.create({
            trigger: el,
            start: 'top top',
            end: () => `+=${vh * 3}`,
            pin: true,
            scrub: 0.8,
            animation: master,
          })
        },
      )
    },
    { scope: sceneRef },
  )

  /* ── Navigate to a slide ── */
  const goToSlide = useCallback(
    (targetIndex: number) => {
      const current = activeIndexRef.current
      const nextActive = wrap(targetIndex)
      if (nextActive === current || isAnimatingRef.current) return
      isAnimatingRef.current = true

      /* Determine shortest-path direction */
      let diff = nextActive - current
      if (diff > Math.floor(total / 2)) diff -= total
      if (diff < -Math.floor(total / 2)) diff += total
      const direction = diff > 0 ? 1 : -1

      /* Hide outgoing legend */
      animateLegend(current, false)

      /* Animate each slide to its new slot */
      const DURATION = 0.75
      const HALF = DURATION / 2
      const tl = gsap.timeline({
        onComplete: () => {
          animateLegend(nextActive, true)
          isAnimatingRef.current = false
        },
      })

      /* Update indicator at the midpoint when the new slide is visually centering */
      tl.call(
        () => {
          activeIndexRef.current = nextActive
          setActiveIndex(nextActive)
        },
        [],
        HALF,
      )

      for (let i = 0; i < total; i++) {
        const el = getSlideEl(i)
        if (!el) continue

        const oldSlot = getSlot(i, current)
        const newSlot = getSlot(i, nextActive)
        const isWrapping = Math.abs(newSlot - oldSlot) > 1

        if (isWrapping) {
          /* Wrapping slide: fade out in place, teleport, fade in at new slot */
          tl.to(
            el,
            {
              opacity: 0,
              scale: SIDE_SCALE * 0.95,
              duration: HALF * 0.8,
              ease: 'power2.in',
            },
            0,
          )
          tl.set(
            el,
            {
              x: getSlotX(newSlot),
              scale: SIDE_SCALE * 0.95,
            },
            HALF,
          )
          tl.to(
            el,
            {
              opacity: 1,
              scale: SIDE_SCALE,
              duration: HALF * 0.8,
              ease: 'power2.out',
            },
            HALF,
          )
        } else {
          const isScalingUp = newSlot === 0
          tl.to(
            el,
            {
              x: getSlotX(newSlot),
              scale: newSlot === 0 ? 1 : SIDE_SCALE,
              duration: DURATION,
              ease: 'power3.inOut',
              delay: isScalingUp ? 0.04 : 0,
            },
            0,
          )
        }
      }
    },
    [total, wrap, getSlideEl, getSlot, getSlotX, animateLegend],
  )

  const goNext = useCallback(() => goToSlide(activeIndexRef.current + 1), [goToSlide])
  const goPrev = useCallback(() => goToSlide(activeIndexRef.current - 1), [goToSlide])

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
    <div ref={sceneRef} className='relative h-screen w-full overflow-hidden bg-secondary-100'>
      {/* ── Section header — absolute, lifts from center to top ── */}
      <div className='absolute inset-x-0 top-0' style={{ zIndex: 20 }}>
        <Container size='xxl' padding='xxl'>
          <div
            data-ext-header-wrap
            className='flex items-start justify-between gap-8 pt-5 md:pt-6'
            style={{ willChange: 'transform' }}
          >
            {/* Left: eyebrow + title + desc + separator */}
            <div className='min-w-0'>
              <Typography variant='overline' className='text-primary-600'>
                {content.eyebrow}
              </Typography>
              <Typography
                variant='h2'
                as='h2'
                className='mt-2 text-secondary-900'
                style={{ maxWidth: '28ch' }}
              >
                {content.title}
              </Typography>
              <Typography
                data-ext-desc
                variant='body'
                className='mt-3 text-secondary-900'
                style={{ maxWidth: '44ch', opacity: 0.6 }}
              >
                {content.description}
              </Typography>
              <Separator
                data-ext-sep
                variant='accent'
                className='mt-5 w-12 bg-primary-600 opacity-50'
              />
            </div>

            {/* Right: nav controls (appears after scroll) */}
            <div className='mt-6 shrink-0'>
              <div data-ext-nav style={{ opacity: 0, willChange: 'opacity' }}>
                <div className='flex items-center gap-4'>
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
                      as='span'
                      className='text-secondary-900/40'
                      style={{ fontSize: '0.6rem' }}
                    >
                      {activeIndex + 1} / {total}
                    </Typography>
                  </div>
                  <div className='flex gap-1.5'>
                    <button
                      type='button'
                      onClick={goPrev}
                      aria-label='Previous view'
                      className='flex size-8 items-center justify-center rounded-full border border-secondary-900/20 text-secondary-900/50 transition-colors hover:border-secondary-900/40 hover:text-secondary-900'
                    >
                      <svg
                        width='12'
                        height='12'
                        viewBox='0 0 16 16'
                        fill='none'
                        aria-hidden='true'
                      >
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
                      className='flex size-8 items-center justify-center rounded-full border border-secondary-900/20 text-secondary-900/50 transition-colors hover:border-secondary-900/40 hover:text-secondary-900'
                    >
                      <svg
                        width='12'
                        height='12'
                        viewBox='0 0 16 16'
                        fill='none'
                        aria-hidden='true'
                      >
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
            </div>
          </div>
        </Container>
      </div>

      {/* ── Carousel — rises from below, scales down ── */}
      <div
        data-ext-carousel-wrap
        className='absolute inset-x-0'
        style={{
          zIndex: 2,
          top: '20vh',
          bottom: '8vh',
          transformOrigin: '50% 50%',
          willChange: 'transform',
        }}
      >
        <div
          ref={viewportRef}
          className='relative size-full'
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-roledescription='carousel'
          aria-label='Exterior views'
        >
          {vantagePoints.map((vp, i) => (
            <ExteriorSlide
              key={vp.id}
              vantagePoint={vp}
              index={i}
              total={total}
              slideRatio={SLIDE_RATIO}
              onImageClick={openImageLightbox}
              onPlanClick={() => setLightboxOpen(true)}
            />
          ))}
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
