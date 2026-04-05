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
            gsap.set(IMAGE(0), { xPercent: 0, scale: 1 })
            gsap.set('[data-ext-scrim-top], [data-ext-scrim-bottom]', { opacity: 1 })
            gsap.set('[data-ext-header-wrap]', { y: 0 })
            gsap.set('[data-ext-title]', { color: '#ffffff' })
            gsap.set('[data-ext-desc], [data-ext-sep]', { opacity: 0, display: 'none' })
            gsap.set('[data-ext-plan-area]', { opacity: 1 })
            gsap.set('[data-ext-legend-wrap]', { opacity: 1 })
            return
          }

          if (!isDesktop) return

          const el = sceneRef.current
          if (!el) return

          const vh = window.innerHeight

          /* ── Measure header to vertically center it ─────────── */
          const headerWrap = el.querySelector('[data-ext-header-wrap]') as HTMLElement
          if (!headerWrap) return
          const headerH = headerWrap.offsetHeight
          const centeredY = (vh - headerH) / 2
          const topY = vh * 0.08

          /* ── Initial states ────────────────────────────────── */
          gsap.set('[data-ext-header-wrap]', { y: centeredY })
          gsap.set(IMAGE(0), { xPercent: 105, scale: 1.05 })
          gsap.set(IMAGE(1), { xPercent: 105, scale: 1.05 })
          gsap.set(IMAGE(2), { xPercent: 105, scale: 1.05 })
          gsap.set('[data-ext-scrim-top], [data-ext-scrim-bottom]', { opacity: 0 })
          gsap.set('[data-ext-plan-area]', { opacity: 0 })
          gsap.set('[data-ext-legend-wrap]', { opacity: 0, y: 20 })

          /* ────────────────────────────────────────────────────
           * APPLE-STYLE TIMELINE — text leads, plan trails
           *
           * Same choreography as Interior section:
           *   1. Counter swaps instantly (always visible)
           *   2. Old text exits + new text enters (opacity only)
           *   3. Image slides in (hero moment)
           *   4. Plan: old fades with image, new appears after
           *
           *   0.00–0.12  Reveal: header up, bg out, scrims + legend in
           *   0.12–0.15  HOLD — scene 1 registers
           *   0.15–0.26  Scene 0 → 1
           *   0.26–0.29  HOLD — scene 2 registers
           *   0.29–0.40  Scene 1 → 2
           *   0.40–0.45  HOLD — final scene registers
           * ──────────────────────────────────────────────────── */

          const TEXT_DUR = 0.03 // text exit/enter — snappy
          const WIPE = 0.08 // image slide — the hero moment
          const PLAN_DUR = 0.03 // plan fade
          const HOLD = 0.03 // breathing room between scenes
          const CYCLE = WIPE + PLAN_DUR
          const master = gsap.timeline()

          /* ── Reveal (0.00 → 0.12) ─────────────────────────── */
          master.to('[data-ext-desc]', { opacity: 0, y: -8, duration: 0.03 }, 0.0)
          master.to('[data-ext-sep]', { opacity: 0, duration: 0.03 }, 0.0)
          master.to('[data-ext-header-wrap]', { y: topY, duration: 0.08, ease: 'power2.out' }, 0.01)
          master.to('[data-ext-warm-bg]', { opacity: 0, duration: 0.06 }, 0.02)
          master.to(IMAGE(0), { xPercent: 0, scale: 1, duration: 0.09, ease: 'power2.out' }, 0.03)
          master.to(
            '[data-ext-scrim-top], [data-ext-scrim-bottom]',
            { opacity: 1, duration: 0.04 },
            0.06,
          )
          master.to('[data-ext-title]', { color: '#ffffff', duration: 0.03 }, 0.07)
          master.set('[data-ext-warm-bg]', { pointerEvents: 'none' }, 0.09)
          master.to('[data-ext-legend-wrap]', { opacity: 1, y: 0, duration: 0.03 }, 0.08)
          master.to('[data-ext-plan-area]', { opacity: 1, duration: 0.03 }, 0.09)

          /* ── Scene transitions ─────────────────────────────── */
          const sceneStarts = [0.15, 0.15 + CYCLE + HOLD]

          for (let s = 1; s < TOTAL; s++) {
            const t = sceneStarts[s - 1]
            if (t === undefined) break
            const prev = s - 1

            /* 1. Counter — instant swap, always visible */
            master.set(COUNTER(prev), { opacity: 0 }, t)
            master.set(COUNTER(s), { opacity: 1 }, t)

            /* 2. Legend text — old slides out left, new slides in from right */
            master.to(
              LEGEND(prev),
              { x: -40, opacity: 0, duration: TEXT_DUR, ease: 'power2.in' },
              t,
            )
            master.to(
              LEGEND(s),
              { x: 0, opacity: 1, duration: TEXT_DUR, ease: 'power2.out' },
              t + TEXT_DUR,
            )

            /* 3. Image slide — the hero moment */
            master.to(IMAGE(s), { xPercent: 0, scale: 1, duration: WIPE, ease: 'power2.inOut' }, t)

            /* 4. Plan — old disappears with image, new appears after */
            master.to(PLAN(prev), { opacity: 0, duration: PLAN_DUR }, t)
            master.to(PLAN(s), { opacity: 1, duration: PLAN_DUR }, t + PLAN_DUR + WIPE * 0.35)
          }

          /* Final hold so last scene doesn't cut off */
          const endMark = sceneStarts[sceneStarts.length - 1]! + CYCLE + HOLD * 2
          master.set({}, {}, endMark)

          /* ── ScrollTrigger: pin + pure scrub ───────────────── */
          ScrollTrigger.create({
            trigger: el,
            start: 'top top',
            end: () => `+=${vh * 7}`,
            pin: true,
            scrub: 0.6,
            animation: master,
          })
        },
      )
    },
    { scope: sceneRef },
  )

  return (
    <div ref={sceneRef} className='relative h-screen w-full overflow-hidden bg-secondary-100'>
      <div
        data-ext-scene
        style={{ willChange: 'transform, opacity' }}
        className='relative size-full'
      >
        {/* ── Z-5 · Warm background — dissolves to reveal image ── */}
        <div data-ext-warm-bg className='absolute inset-0 bg-secondary-100' style={{ zIndex: 5 }} />

        {/* ── Z-2 · Full-bleed images — stacked, clipped, highest = latest ─ */}
        <div className='absolute inset-0 overflow-hidden' style={{ zIndex: 2 }}>
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
                  width: 400,
                  height: 200,
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
    </div>
  )
}
