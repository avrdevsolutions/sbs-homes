'use client'

import { useRef } from 'react'

import Image from 'next/image'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { Container, Separator, Typography } from '@/components/ui'
import type { ExteriorVantagePoint } from '@/dictionaries/landing-page'

import { GalleryLegend } from './GalleryLegend'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const TOTAL = 3

/* ── Selectors ─────────────────────────────────────────────────── */
const IMAGE = (i: number) => `[data-ext-image="${i}"]`
const PLAN = (i: number) => `[data-ext-plan="${i}"]`
const LEGEND = (i: number) => `[data-ext-legend="${i}"]`
const COUNTER = (i: number) => `[data-ext-counter="${i}"]`

type ExteriorScrollGalleryProps = {
  vantagePoints: [ExteriorVantagePoint, ExteriorVantagePoint, ExteriorVantagePoint]
  header: {
    eyebrow: string
    title: string
    description: string
  }
}

export const ExteriorScrollGallery = ({ vantagePoints, header }: ExteriorScrollGalleryProps) => {
  const sceneRef = useRef<HTMLDivElement>(null)

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
            gsap.set('[data-ext-warm-bg]', { opacity: 0 })
            gsap.set(IMAGE(0), { opacity: 1, scale: 1 })
            gsap.set('[data-ext-scrim-top], [data-ext-scrim-bottom]', { opacity: 1 })
            gsap.set('[data-ext-header-wrap]', { y: 0 })
            gsap.set('[data-ext-title]', { color: '#ffffff' })
            gsap.set('[data-ext-desc], [data-ext-sep]', { opacity: 0, display: 'none' })
            gsap.set('[data-ext-plan-area]', { opacity: 1 })
            gsap.set('[data-ext-legend-wrap]', { opacity: 1 })
            return
          }

          if (!isDesktop) return

          const vh = window.innerHeight

          /* ── Measure header to vertically center it ─────────── */
          const headerWrap = sceneRef.current?.querySelector(
            '[data-ext-header-wrap]',
          ) as HTMLElement
          if (!headerWrap) return
          const headerH = headerWrap.offsetHeight
          const centeredY = (vh - headerH) / 2
          const topY = vh * 0.1

          /* ── Initial states ────────────────────────────────── */
          gsap.set('[data-ext-header-wrap]', { y: centeredY })
          gsap.set(IMAGE(0), { opacity: 0, scale: 1.15 })
          gsap.set(IMAGE(1), { xPercent: 100, scale: 1.05 })
          gsap.set(IMAGE(2), { xPercent: 100, scale: 1.05 })
          gsap.set('[data-ext-scrim-top], [data-ext-scrim-bottom]', { opacity: 0 })
          gsap.set('[data-ext-plan-area]', { opacity: 0, scale: 0.92 })
          gsap.set('[data-ext-legend-wrap]', { opacity: 0, y: 30 })

          /* ── Timeline ──────────────────────────────────────── */
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: sceneRef.current,
              start: 'top top',
              end: () => `+=${vh * 5.5}`,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })

          /*
           * ── Phase map ─────────────────────────────────────
           * 0–0.5      Hold — title card, warm background
           * 0.5–2.2    Cinematic reveal — header rises, scene opens
           * 2.2–3.2    Hold — image 0
           * 3.2–4.8    Image 1 slides from right, legend swaps
           * 4.8–5.8    Hold — image 1
           * 5.8–7.4    Image 2 slides from right, legend swaps
           * 7.4–8.5    Hold — image 2
           */

          /* ── Phase 0: Hold on title card ────────────────────── */
          tl.to({}, { duration: 0.5 }, 0)

          /* ── Phase 1: Cinematic reveal ──────────────────────── */
          // Header ascends from center to top
          tl.to('[data-ext-header-wrap]', { y: topY, duration: 1.7, ease: 'power2.inOut' }, 0.5)
          // Description + separator fade out early
          tl.to('[data-ext-desc]', { opacity: 0, y: -10, duration: 0.5 }, 0.5)
          tl.to('[data-ext-sep]', { opacity: 0, duration: 0.4 }, 0.5)
          // Warm background dissolves
          tl.to('[data-ext-warm-bg]', { opacity: 0, duration: 1.2, ease: 'none' }, 0.8)
          // Image 0 fades in and settles (scale 1.15 → 1.0)
          tl.to(IMAGE(0), { opacity: 1, scale: 1, duration: 1.4, ease: 'power2.out' }, 0.8)
          // Cinematic scrims appear
          tl.to('[data-ext-scrim-top], [data-ext-scrim-bottom]', { opacity: 1, duration: 0.8 }, 1.0)
          // Title transitions to white over the image
          tl.to('[data-ext-title]', { color: '#ffffff', duration: 0.7 }, 1.2)
          tl.to('[data-ext-eyebrow]', { color: 'rgba(255,255,255,0.7)', duration: 0.7 }, 1.2)
          // Site plan card appears top-right
          tl.to(
            '[data-ext-plan-area]',
            { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' },
            1.5,
          )
          // Legend area rises into view
          tl.to('[data-ext-legend-wrap]', { opacity: 1, y: 0, duration: 0.7 }, 1.6)

          /* ── Phase 2: Hold image 0 ──────────────────────────── */
          tl.to({}, { duration: 1.0 }, 2.2)

          /* ── Phase 3: Image 1 slides in from right ──────────── */
          tl.to(IMAGE(1), { xPercent: 0, scale: 1, duration: 1.6, ease: 'power2.inOut' }, 3.2)
          // Subtle push-back on outgoing image
          tl.to(IMAGE(0), { scale: 0.95, duration: 1.6, ease: 'none' }, 3.2)
          // Legend text swap
          tl.to(COUNTER(0), { y: '-100%', opacity: 0, duration: 0.4, ease: 'none' }, 3.8)
          tl.to(COUNTER(1), { y: '0%', opacity: 1, duration: 0.4, ease: 'none' }, 3.9)
          tl.to(LEGEND(0), { x: -40, opacity: 0, duration: 0.5, ease: 'none' }, 3.8)
          tl.to(LEGEND(1), { x: 0, opacity: 1, duration: 0.5, ease: 'none' }, 4.1)
          // Site plan swap
          tl.to(PLAN(0), { opacity: 0, scale: 0.9, duration: 0.4, ease: 'none' }, 3.8)
          tl.to(PLAN(1), { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, 4.0)

          /* ── Phase 4: Hold image 1 ──────────────────────────── */
          tl.to({}, { duration: 1.0 }, 4.8)

          /* ── Phase 5: Image 2 slides in from right ──────────── */
          tl.to(IMAGE(2), { xPercent: 0, scale: 1, duration: 1.6, ease: 'power2.inOut' }, 5.8)
          tl.to(IMAGE(1), { scale: 0.95, duration: 1.6, ease: 'none' }, 5.8)
          // Legend text swap
          tl.to(COUNTER(1), { y: '-100%', opacity: 0, duration: 0.4, ease: 'none' }, 6.4)
          tl.to(COUNTER(2), { y: '0%', opacity: 1, duration: 0.4, ease: 'none' }, 6.5)
          tl.to(LEGEND(1), { x: -40, opacity: 0, duration: 0.5, ease: 'none' }, 6.4)
          tl.to(LEGEND(2), { x: 0, opacity: 1, duration: 0.5, ease: 'none' }, 6.7)
          // Site plan swap
          tl.to(PLAN(1), { opacity: 0, scale: 0.9, duration: 0.4, ease: 'none' }, 6.4)
          tl.to(PLAN(2), { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, 6.6)

          /* ── Phase 6: Hold image 2 ──────────────────────────── */
          tl.to({}, { duration: 1.1 }, 7.4)
        },
      )
    },
    { scope: sceneRef },
  )

  return (
    <div ref={sceneRef} className='relative h-screen w-full overflow-hidden bg-secondary-100'>
      {/* ── Z-0 · Warm background — dissolves to reveal image ── */}
      <div data-ext-warm-bg className='absolute inset-0 bg-secondary-100' style={{ zIndex: 1 }} />

      {/* ── Z-1 · Full-bleed images — stacked, highest = latest ─ */}
      <div className='absolute inset-0' style={{ zIndex: 2 }}>
        {vantagePoints.map((vp, i) => (
          <div
            key={vp.id}
            data-ext-image={i}
            className='absolute inset-0 overflow-hidden'
            style={{
              zIndex: i,
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
      </div>

      {/* ── Z-2 · Cinematic gradient scrims ──────────────────── */}
      <div
        data-ext-scrim-top
        className='absolute inset-x-0 top-0'
        style={{
          zIndex: 10,
          height: '45%',
          opacity: 0,
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)',
        }}
      />
      <div
        data-ext-scrim-bottom
        className='absolute inset-x-0 bottom-0'
        style={{
          zIndex: 10,
          height: '40%',
          opacity: 0,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.28) 50%, transparent 100%)',
        }}
      />

      {/* ── Z-3 · Header + site-plan row ─────────────────────── */}
      <div className='absolute inset-x-0 top-0' style={{ zIndex: 20 }}>
        <Container>
          <div
            data-ext-header-wrap
            className='flex items-start justify-between gap-8'
            style={{ willChange: 'transform' }}
          >
            {/* Left: section heading */}
            <div className='min-w-0'>
              <Typography data-ext-eyebrow variant='overline' className='text-primary-600'>
                {header.eyebrow}
              </Typography>
              <Typography
                data-ext-title
                variant='h2'
                as='h2'
                className='mt-4 text-secondary-900'
                style={{ maxWidth: '22ch', willChange: 'color' }}
              >
                {header.title}
              </Typography>
              <Typography
                data-ext-desc
                variant='body'
                className='mt-4 text-secondary-900'
                style={{ maxWidth: '44ch', opacity: 0.6 }}
              >
                {header.description}
              </Typography>
              <Separator
                data-ext-sep
                variant='accent'
                className='mt-6 w-12 bg-primary-600 opacity-50'
              />
            </div>

            {/* Right: frosted-glass site-plan card */}
            <div
              data-ext-plan-area
              className='relative ml-auto hidden shrink-0 lg:block'
              style={{
                width: 220,
                height: 165,
                opacity: 0,
                willChange: 'transform, opacity',
              }}
            >
              {vantagePoints.map((vp, i) => (
                <div
                  key={vp.id}
                  data-ext-plan={i}
                  className='absolute inset-0 rounded-xl shadow-lg ring-1 ring-white/30'
                  style={{
                    opacity: i === 0 ? 1 : 0,
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(20px) saturate(1.5)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
                    willChange: 'transform, opacity',
                  }}
                >
                  <Image
                    src={vp.sitePlan.src}
                    alt={vp.sitePlan.alt}
                    width={vp.sitePlan.width}
                    height={vp.sitePlan.height}
                    loading='lazy'
                    className='size-full object-contain'
                  />
                </div>
              ))}
            </div>
          </div>
        </Container>
      </div>

      {/* ── Z-3 · Bottom legend ──────────────────────────────── */}
      <div
        data-ext-legend-wrap
        className='absolute inset-x-0 bottom-0 pb-8 md:pb-10 lg:pb-12'
        style={{ zIndex: 20, opacity: 0 }}
      >
        <Container>
          <GalleryLegend vantagePoints={vantagePoints} total={TOTAL} />
        </Container>
      </div>
    </div>
  )
}
