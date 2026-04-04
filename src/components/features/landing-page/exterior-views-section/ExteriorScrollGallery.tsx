'use client'

import { memo, useRef } from 'react'

import Image from 'next/image'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { SectionBlockHeader } from '@/components/shared'
import { Typography } from '@/components/ui'
import type { ExteriorVantagePoint } from '@/dictionaries/landing-page'
import { cn } from '@/lib/utils'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const TOTAL = 3

/** Shorthand for data-attribute GSAP selectors */
const img = (i: number) => `[data-ext-img="${i}"]`
const text = (i: number) => `[data-ext-text="${i}"]`
const plan = (i: number) => `[data-ext-plan="${i}"]`
const LEGEND = '[data-ext-legend]'

type ExteriorScrollGalleryProps = {
  vantagePoints: [ExteriorVantagePoint, ExteriorVantagePoint, ExteriorVantagePoint]
  header: {
    eyebrow: string
    title: string
    description: string
  }
}

export const ExteriorScrollGallery = ({ vantagePoints, header }: ExteriorScrollGalleryProps) => {
  const galleryRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef<HTMLSpanElement>(null)

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

          // Reduced motion or mobile: leave the initial HTML state (first vantage point visible)
          if (reduceMotion || !isDesktop) return

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: galleryRef.current,
              start: 'top top',
              end: () => `+=${window.innerHeight * 3.5}`,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                if (!counterRef.current) return
                const p = self.progress
                const idx = p > 0.63 ? 2 : p > 0.3 ? 1 : 0
                counterRef.current.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(TOTAL).padStart(2, '0')}`
              },
            },
          })

          /* ── Legend entrance ──────────────────────────────────── */
          tl.from(LEGEND, { opacity: 0, y: 20, duration: 0.6, ease: 'none' }, 0)

          /* ── Phase 1: Image 0 — Ken Burns ────────────────────── */
          tl.fromTo(img(0), { scale: 1 }, { scale: 1.06, duration: 3, ease: 'none' }, 0)

          /* ── Transition 0 → 1 ────────────────────────────────── */
          tl.to(img(0), { opacity: 0, duration: 0.8, ease: 'none' }, 2.5)
          tl.to(text(0), { opacity: 0, y: -12, duration: 0.5, ease: 'none' }, 2.5)
          tl.to(plan(0), { opacity: 0, duration: 0.5, ease: 'none' }, 2.5)
          tl.fromTo(
            text(1),
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'none' },
            2.7,
          )
          tl.fromTo(plan(1), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'none' }, 2.7)

          /* ── Phase 2: Image 1 — Ken Burns ────────────────────── */
          tl.fromTo(img(1), { scale: 1 }, { scale: 1.06, duration: 3, ease: 'none' }, 3)

          /* ── Transition 1 → 2 ────────────────────────────────── */
          tl.to(img(1), { opacity: 0, duration: 0.8, ease: 'none' }, 5.5)
          tl.to(text(1), { opacity: 0, y: -12, duration: 0.5, ease: 'none' }, 5.5)
          tl.to(plan(1), { opacity: 0, duration: 0.5, ease: 'none' }, 5.5)
          tl.fromTo(
            text(2),
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'none' },
            5.7,
          )
          tl.fromTo(plan(2), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'none' }, 5.7)

          /* ── Phase 3: Image 2 — Ken Burns ────────────────────── */
          tl.fromTo(img(2), { scale: 1 }, { scale: 1.06, duration: 3, ease: 'none' }, 6)
        },
      )
    },
    { scope: galleryRef },
  )

  return (
    <div ref={galleryRef} className='relative h-screen w-full overflow-hidden'>
      {/* Image layers — stacked by z-index, top fades out to reveal bottom */}
      {vantagePoints.map((vp, i) => (
        <div
          key={vp.id}
          data-ext-img={i}
          className='absolute inset-0'
          style={{
            zIndex: TOTAL - i,
            willChange: 'transform, opacity',
          }}
        >
          <Image
            src={vp.image.src}
            alt={vp.image.alt}
            fill
            sizes='100vw'
            priority={i === 0}
            className='object-cover'
          />
        </div>
      ))}

      {/* Radial gradient — header readability over dark images */}
      <div
        className='pointer-events-none absolute inset-0'
        style={{
          zIndex: TOTAL + 1,
          background:
            'radial-gradient(ellipse 80% 70% at 0% 0%, rgba(20,20,22,0.85) 0%, transparent 100%)',
        }}
      />

      {/* Content layer — header top-left, legend bottom-left */}
      <div
        className='relative flex size-full flex-col justify-between'
        style={{ zIndex: TOTAL + 2 }}
      >
        {/* Section header — white text on dark gradient */}
        <div className='px-5 pt-12 md:px-10 md:pt-16 lg:px-14 lg:pt-20'>
          <SectionBlockHeader
            eyebrow={header.eyebrow}
            title={header.title}
            description={header.description}
            titleAs='h2'
            dark
          />
        </div>

        {/* Frosted glass legend panel — light bg for site plan SVGs */}
        <div data-ext-legend className='px-5 pb-10 md:px-10 md:pb-14 lg:px-14 lg:pb-16'>
          <div
            className='flex flex-col gap-5 rounded-2xl border border-black/5'
            style={{
              padding: '1.5rem 1.75rem',
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(24px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
              maxWidth: '22rem',
            }}
          >
            {/* Counter */}
            <Typography variant='overline' className='text-primary-600' aria-live='polite'>
              <span ref={counterRef}>01 / {String(TOTAL).padStart(2, '0')}</span>
            </Typography>

            {/* Crossfading text panels */}
            <div className='relative' style={{ minHeight: 90 }}>
              {vantagePoints.map((vp, i) => (
                <div
                  key={vp.id}
                  data-ext-text={i}
                  className={cn(i === 0 ? 'relative' : 'absolute inset-x-0 top-0')}
                  style={{
                    opacity: i === 0 ? 1 : 0,
                    willChange: 'transform, opacity',
                  }}
                >
                  <div className='flex flex-col gap-1.5'>
                    <Typography variant='h4' as='h3' className='text-foreground'>
                      {vp.title}
                    </Typography>
                    <Typography variant='body-sm' className='text-foreground/60'>
                      {vp.description}
                    </Typography>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className='h-px bg-black/10' />

            {/* Crossfading site plans */}
            <div className='relative' style={{ height: 160 }}>
              {vantagePoints.map((vp, i) => (
                <SitePlanLayer key={vp.id} vantagePoint={vp} index={i} isFirst={i === 0} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Memoized site plan layer ──────────────────────────────────── */

type SitePlanLayerProps = {
  vantagePoint: ExteriorVantagePoint
  index: number
  isFirst: boolean
}

const SitePlanLayer = memo(({ vantagePoint, index, isFirst }: SitePlanLayerProps) => (
  <div
    data-ext-plan={index}
    className={cn(isFirst ? 'relative size-full' : 'absolute inset-0')}
    style={{ opacity: isFirst ? 1 : 0 }}
    aria-hidden={!isFirst}
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
))

SitePlanLayer.displayName = 'SitePlanLayer'
