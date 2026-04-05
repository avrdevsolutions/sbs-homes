'use client'

import { useRef } from 'react'

import Image from 'next/image'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { Container, Separator, Typography } from '@/components/ui'
import type { InteriorRoom } from '@/dictionaries/landing-page'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/* ── Selectors ─────────────────────────────────────────────────── */
const IMAGE = (i: number) => `[data-int-image="${i}"]`
const PLAN = (i: number) => `[data-int-plan="${i}"]`
const TEXT = (i: number) => `[data-int-text="${i}"]`
const COUNTER = (i: number) => `[data-int-cnum="${i}"]`

type InteriorScrollGalleryProps = {
  rooms: InteriorRoom[]
  header: {
    eyebrow: string
    title: string
    description: string
  }
}

export const InteriorScrollGallery = ({ rooms, header }: InteriorScrollGalleryProps) => {
  const sceneRef = useRef<HTMLDivElement>(null)
  const total = rooms.length

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
            gsap.set('[data-int-warm-bg]', { opacity: 0, pointerEvents: 'none' })
            gsap.set(IMAGE(0), { clipPath: 'inset(0% 0 0 0)' })
            gsap.set('[data-int-scrim-top], [data-int-scrim-bottom], [data-int-scrim-right]', {
              opacity: 1,
            })
            gsap.set('[data-int-header-wrap]', { y: 0 })
            gsap.set('[data-int-title]', { color: '#ffffff' })
            gsap.set('[data-int-desc], [data-int-sep]', { opacity: 0, display: 'none' })
            gsap.set('[data-int-legend-wrap]', { opacity: 1 })
            gsap.set('[data-int-plan-area]', { opacity: 1 })
            gsap.set(TEXT(0), { opacity: 1, y: 0 })
            return
          }

          if (!isDesktop) return

          const el = sceneRef.current
          if (!el) return

          const vh = window.innerHeight

          /* ── Measure header to vertically center it ─────────── */
          const headerWrap = el.querySelector('[data-int-header-wrap]') as HTMLElement
          if (!headerWrap) return
          const headerH = headerWrap.offsetHeight
          const centeredY = (vh - headerH) / 2
          const topY = vh * 0.08

          /* ── Initial states ────────────────────────────────── */
          gsap.set('[data-int-header-wrap]', { y: centeredY })
          for (let i = 0; i < total; i++) {
            if (i === 0) {
              gsap.set(IMAGE(i), { clipPath: 'inset(0% 0 0 0)', opacity: 1 })
            } else {
              gsap.set(IMAGE(i), { clipPath: 'inset(100% 0 0 0)', opacity: 1 })
            }
            gsap.set(PLAN(i), { opacity: i === 0 ? 1 : 0 })
            gsap.set(TEXT(i), { opacity: 0, y: 14 })
            gsap.set(COUNTER(i), { opacity: i === 0 ? 1 : 0 })
          }
          gsap.set('[data-int-scrim-top], [data-int-scrim-bottom], [data-int-scrim-right]', {
            opacity: 0,
          })
          gsap.set('[data-int-legend-wrap]', { opacity: 0, y: 20 })
          gsap.set('[data-int-plan-area]', { opacity: 0 })

          /* ────────────────────────────────────────────────────
           * APPLE-STYLE TIMELINE — text leads, plan trails
           *
           * Each room transition:
           *   1. Counter swaps instantly (always visible)
           *   2. Old text exits + new text enters (fast, at wipe start)
           *   3. Image wipes bottom-to-top (hero moment)
           *   4. Plan fades in at the tail end of the wipe
           *   Tiny hold between rooms so each state registers
           *
           *   0.00–0.12  Reveal
           *   0.12–0.15  HOLD — first room
           *   0.15–0.28  Room 0 → 1
           *   0.28–0.31  HOLD
           *   0.31–0.44  Room 1 → 2
           *   0.44–0.47  HOLD
           *   0.47–0.60  Room 2 → 3
           *   0.60–0.65  HOLD — final room
           * ──────────────────────────────────────────────────── */

          const TEXT_DUR = 0.03 // text exit/enter — snappy
          const WIPE = 0.08 // image wipe — the hero moment
          const PLAN_DUR = 0.03 // plan fade — at the tail
          const HOLD = 0.03 // breathing room between rooms
          const CYCLE = WIPE + PLAN_DUR // transition width
          const master = gsap.timeline()

          /* ── Reveal (0.00 → 0.12) ─────────────────────────── */
          master.to('[data-int-desc]', { opacity: 0, y: -8, duration: 0.03 }, 0.0)
          master.to('[data-int-sep]', { opacity: 0, duration: 0.03 }, 0.0)
          master.to('[data-int-header-wrap]', { y: topY, duration: 0.08, ease: 'power2.out' }, 0.01)
          master.to('[data-int-warm-bg]', { opacity: 0, duration: 0.06 }, 0.02)
          master.to(
            '[data-int-scrim-top], [data-int-scrim-bottom], [data-int-scrim-right]',
            { opacity: 1, duration: 0.04 },
            0.06,
          )
          master.to('[data-int-title]', { color: '#ffffff', duration: 0.03 }, 0.07)
          master.set('[data-int-warm-bg]', { pointerEvents: 'none' }, 0.09)
          master.to('[data-int-legend-wrap]', { opacity: 1, y: 0, duration: 0.03 }, 0.08)
          master.to(TEXT(0), { opacity: 1, y: 0, duration: 0.03, ease: 'power2.out' }, 0.09)
          master.to('[data-int-plan-area]', { opacity: 1, duration: 0.03 }, 0.09)

          /* ── Room transitions ──────────────────────────────── */
          const roomStarts = [0.15, 0.15 + CYCLE + HOLD, 0.15 + (CYCLE + HOLD) * 2]

          for (let r = 1; r < total; r++) {
            const t = roomStarts[r - 1]
            if (t === undefined) break
            const prev = r - 1

            /* 1. Counter — instant swap, always visible */
            master.set(COUNTER(prev), { opacity: 0 }, t)
            master.set(COUNTER(r), { opacity: 1 }, t)

            /* 2. Text — old fades out (no y movement), new fades in */
            master.to(TEXT(prev), { opacity: 0, duration: TEXT_DUR, ease: 'power2.in' }, t)
            master.to(
              TEXT(r),
              { opacity: 1, y: 0, duration: TEXT_DUR, ease: 'power2.out' },
              t + TEXT_DUR,
            )

            /* 3. Image wipe — the hero moment, starts immediately */
            master.to(
              IMAGE(r),
              { clipPath: 'inset(0% 0 0 0)', duration: WIPE, ease: 'power2.inOut' },
              t,
            )

            /* 4. Plan — old disappears WITH the image, new appears AFTER */
            master.to(PLAN(prev), { opacity: 0, duration: PLAN_DUR }, t)
            master.to(PLAN(r), { opacity: 1, duration: PLAN_DUR }, t + PLAN_DUR + WIPE * 0.35)
          }

          /* Final hold so last room doesn't cut off */
          const endMark = roomStarts[roomStarts.length - 1]! + CYCLE + HOLD * 2
          master.set({}, {}, endMark)

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
    <div ref={sceneRef} className='relative h-screen w-full overflow-hidden bg-secondary-200'>
      <div className='relative size-full'>
        {/* ── Warm background — dissolves to reveal images ──── */}
        <div data-int-warm-bg className='absolute inset-0 bg-secondary-200' style={{ zIndex: 5 }} />

        {/* ── Stacked images ─────────────────────────────────── */}
        <div className='absolute inset-0 overflow-hidden' style={{ zIndex: 2 }}>
          {rooms.map((room, i) => (
            <div
              key={room.id}
              data-int-image={i}
              className='absolute inset-0 overflow-hidden'
              style={{
                zIndex: i + 1,
                willChange: 'clip-path',
                clipPath: i === 0 ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)',
              }}
            >
              <Image
                src={room.image.src}
                alt={room.image.alt}
                fill
                sizes='100vw'
                priority={i === 0}
                className='object-cover'
              />
            </div>
          ))}
        </div>

        {/* ── Gradient scrims ─────────────────────────────────── */}
        <div
          data-int-scrim-top
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
          data-int-scrim-bottom
          className='absolute inset-x-0 bottom-0'
          style={{
            zIndex: 10,
            height: '50%',
            opacity: 0,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)',
          }}
        />
        {/* Right-side gradient for plan readability */}
        <div
          data-int-scrim-right
          className='absolute inset-y-0 right-0'
          style={{
            zIndex: 10,
            width: '40%',
            opacity: 0,
            background:
              'linear-gradient(to left, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
          }}
        />

        {/* ── Header — centered initially, GSAP moves to top ── */}
        <div className='absolute inset-x-0 top-0' style={{ zIndex: 20 }}>
          <Container>
            <div
              data-int-header-wrap
              className='flex items-start justify-between gap-8'
              style={{ willChange: 'transform' }}
            >
              {/* Left: section heading */}
              <div className='min-w-0'>
                <Typography variant='overline' className='text-primary-600'>
                  {header.eyebrow}
                </Typography>
                <Typography
                  data-int-title
                  variant='h2'
                  as='h2'
                  className='mt-4 text-secondary-900'
                  style={{ maxWidth: '22ch', willChange: 'color' }}
                >
                  {header.title}
                </Typography>
                <Typography
                  data-int-desc
                  variant='body'
                  className='mt-4 text-secondary-900'
                  style={{ maxWidth: '44ch', opacity: 0.6 }}
                >
                  {header.description}
                </Typography>
                <Separator
                  data-int-sep
                  variant='accent'
                  className='mt-6 w-12 bg-primary-600 opacity-50'
                />
              </div>

              {/* Right: plan image */}
              <div
                data-int-plan-area
                className='relative ml-auto hidden shrink-0 overflow-hidden lg:block'
                style={{
                  width: 320,
                  height: 220,
                  opacity: 0,
                  willChange: 'opacity',
                }}
              >
                {rooms.map((room, i) => (
                  <div
                    key={room.id}
                    data-int-plan={i}
                    className='absolute inset-0'
                    style={{
                      opacity: i === 0 ? 1 : 0,
                    }}
                  >
                    <Image
                      src={room.plan.src}
                      alt={room.plan.alt}
                      fill
                      sizes='320px'
                      loading='lazy'
                      className='object-contain'
                    />
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </div>

        {/* ── Bottom legend — room text + counter ──────────────── */}
        <div
          data-int-legend-wrap
          className='absolute inset-x-0 bottom-0 pb-8 md:pb-10 lg:pb-12'
          style={{ zIndex: 20, opacity: 0 }}
        >
          <Container>
            <div className='flex items-end justify-between gap-8'>
              {/* Left: Room text blocks — stacked, GSAP animates */}
              <div className='relative min-w-0 flex-1'>
                {rooms.map((room, i) => (
                  <div
                    key={room.id}
                    data-int-text={i}
                    className={i === 0 ? 'relative' : 'absolute inset-x-0 top-0'}
                    style={{
                      opacity: 0,
                      transform: 'translateY(20px)',
                      willChange: 'transform, opacity',
                    }}
                  >
                    <Typography variant='overline' as='span' className='text-primary-600'>
                      {room.title}
                    </Typography>
                    <Typography
                      variant='h3'
                      as='h3'
                      className='mt-2 block text-white'
                      style={{ maxWidth: '20ch' }}
                    >
                      {room.subtitle}
                    </Typography>
                  </div>
                ))}
              </div>

              {/* Right: Counter — same width as plan area to align right edges */}
              <div
                className='relative hidden shrink-0 lg:block'
                style={{ width: 320, height: '1.4em' }}
              >
                {rooms.map((_, i) => (
                  <span
                    key={i}
                    data-int-cnum={i}
                    className='absolute right-0 top-0 font-mono text-xs tracking-widest'
                    style={{
                      opacity: i === 0 ? 1 : 0,
                      willChange: 'opacity',
                    }}
                  >
                    <span className='text-primary-600'>{String(i + 1).padStart(2, '0')}</span>
                    <span className='text-white'> / {String(total).padStart(2, '0')}</span>
                  </span>
                ))}
              </div>
            </div>
          </Container>
        </div>
      </div>
    </div>
  )
}
