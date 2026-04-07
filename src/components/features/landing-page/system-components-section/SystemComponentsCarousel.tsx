'use client'

import { useCallback, useRef, useState } from 'react'

import Image from 'next/image'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { SectionBlockHeader } from '@/components/shared'
import { Typography } from '@/components/ui'
import type { SystemComponentsSectionContent } from '@/dictionaries/landing-page'
import { cn } from '@/lib/utils'

import { ComponentSlide } from './ComponentSlide'

gsap.registerPlugin(useGSAP)

type SystemComponentsCarouselProps = {
  content: SystemComponentsSectionContent
}

export const SystemComponentsCarousel = ({ content }: SystemComponentsCarouselProps) => {
  const { components } = content
  const trackRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const locationKeyRef = useRef<HTMLDivElement>(null)
  const locationLineRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const animatedSlidesRef = useRef<Set<number>>(new Set())
  const isAnimatingRef = useRef(false)
  const touchStartRef = useRef<number | null>(null)
  const prevIndexRef = useRef(0)

  const total = components.length
  const active = components[activeIndex]

  /* ── Animate annotations for a slide ── */
  const animateAnnotations = useCallback((slideIndex: number) => {
    if (animatedSlidesRef.current.has(slideIndex)) return
    animatedSlidesRef.current.add(slideIndex)

    const slideEl = document.querySelector(`[data-sc-slide="${slideIndex}"]`)
    if (!slideEl) return

    const annotations = slideEl.querySelectorAll('[data-sc-annotation]')
    if (!annotations.length) return

    gsap.to(annotations, {
      opacity: 1,
      clipPath: 'inset(0 0% 0 0%)',
      duration: 0.6,
      ease: 'power2.out',
      stagger: 0.08,
      delay: 0.3,
    })
  }, [])

  /* ── Animate first slide on mount ── */
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.delayedCall(0.4, () => animateAnnotations(0))
      })
      mm.add('(prefers-reduced-motion: reduce)', () => {
        const allAnnotations = document.querySelectorAll('[data-sc-annotation]')
        gsap.set(allAnnotations, { opacity: 1, clipPath: 'inset(0 0% 0 0%)' })
      })
    },
    { scope: containerRef },
  )

  /* ── Navigate to a slide ── */
  const goToSlide = useCallback(
    (index: number) => {
      if (isAnimatingRef.current || index === activeIndex || index < 0 || index >= total) return
      isAnimatingRef.current = true

      const track = trackRef.current
      if (!track) return

      /* Animate location key: slide out in travel direction, swap image, slide in, then draw line */
      const direction = index > activeIndex ? 1 : -1
      const keyEl = locationKeyRef.current
      const lineEl = locationLineRef.current
      if (keyEl) {
        /* Collapse line first */
        if (lineEl) {
          gsap.to(lineEl, { scaleX: 0, duration: 0.15, ease: 'power2.in' })
        }
        gsap.to(keyEl, {
          x: direction * -40,
          opacity: 0,
          duration: 0.25,
          ease: 'power2.in',
          onComplete: () => {
            prevIndexRef.current = index
            setActiveIndex(index)
            gsap.fromTo(
              keyEl,
              { x: direction * 40, opacity: 0 },
              {
                x: 0,
                opacity: 1,
                duration: 0.3,
                ease: 'power2.out',
                onComplete: () => {
                  /* Draw line in after image lands */
                  if (lineEl) {
                    gsap.fromTo(
                      lineEl,
                      { scaleX: 0 },
                      { scaleX: 1, duration: 0.4, ease: 'power2.out' },
                    )
                  }
                },
              },
            )
          },
        })
      } else {
        setActiveIndex(index)
      }

      gsap.to(track, {
        x: `${-index * 100}%`,
        duration: 0.5,
        ease: 'power2.inOut',
        onComplete: () => {
          isAnimatingRef.current = false
          animateAnnotations(index)
        },
      })
    },
    [activeIndex, total, animateAnnotations],
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

  return (
    <div ref={containerRef} className='flex size-full flex-col md:px-10 md:pt-14 lg:px-24 lg:pt-16'>
      {/* ── Top row — section header (left) + location key (right) ── */}
      <div className='shrink-0 px-5 pt-10'>
        <div className='flex items-start justify-between gap-6'>
          <SectionBlockHeader
            eyebrow={content.eyebrow}
            title={content.title}
            description={content.description}
            descriptionOpacity={0.5}
            titleAs='h2'
            dark
          />
          <div className='hidden shrink-0 md:block'>
            <div ref={locationKeyRef}>
              <div className='relative' style={{ width: 270, height: 200 }}>
                <Image
                  src={active.locationKeyImage.src}
                  alt={active.locationKeyImage.alt}
                  fill
                  className='object-contain object-right-top'
                  sizes='120px'
                />
              </div>
            </div>
            <div
              ref={locationLineRef}
              className='mt-3 h-px bg-white/[0.06]'
              style={{ width: 270, transformOrigin: 'right center' }}
            />
          </div>
        </div>
      </div>

      {/* ── Carousel — card info + cross-section ── */}
      <div className='min-h-0 flex-1 px-5'>
        <div
          className='size-full overflow-hidden'
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-roledescription='carousel'
          aria-label='System components'
        >
          <div ref={trackRef} className='flex h-full' style={{ willChange: 'transform' }}>
            {components.map((component, i) => (
              <ComponentSlide key={component.id} component={component} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Navigation bar ── */}
      <div className='shrink-0 px-5 pb-6 pt-3'>
        <div className='mb-3 h-px bg-white/[0.06]' />
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='flex gap-1.5' role='tablist' aria-label='Component slides'>
              {components.map((component, i) => (
                <button
                  key={component.id}
                  type='button'
                  role='tab'
                  aria-selected={i === activeIndex}
                  aria-label={component.subtitle}
                  onClick={() => goToSlide(i)}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300',
                    i === activeIndex ? 'w-6 bg-primary-600' : 'w-3 bg-white/15',
                  )}
                />
              ))}
            </div>
            <Typography variant='overline' className='text-white/40' style={{ fontSize: '0.6rem' }}>
              {activeIndex + 1} / {total}
            </Typography>
          </div>

          <div className='flex gap-2'>
            <button
              type='button'
              onClick={goPrev}
              disabled={activeIndex === 0}
              aria-label='Previous component'
              className={cn(
                'flex size-9 items-center justify-center rounded-full border transition-colors',
                activeIndex === 0
                  ? 'cursor-not-allowed border-white/10 text-white/20'
                  : 'border-white/25 text-white/70 hover:border-white/50 hover:text-white',
              )}
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
              disabled={activeIndex === total - 1}
              aria-label='Next component'
              className={cn(
                'flex size-9 items-center justify-center rounded-full border transition-colors',
                activeIndex === total - 1
                  ? 'cursor-not-allowed border-white/10 text-white/20'
                  : 'border-white/25 text-white/70 hover:border-white/50 hover:text-white',
              )}
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
    </div>
  )
}
