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
            gsap.set(IMAGE(0), { scale: 1, opacity: 1 })
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
            gsap.set(IMAGE(i), { scale: 1.05, opacity: 0 })
            gsap.set(PLAN(i), { opacity: i === 0 ? 1 : 0 })
            gsap.set(TEXT(i), { opacity: 0, y: 20 })
            gsap.set(COUNTER(i), {
              opacity: i === 0 ? 1 : 0,
            })
          }
          gsap.set('[data-int-scrim-top], [data-int-scrim-bottom], [data-int-scrim-right]', {
            opacity: 0,
          })
          gsap.set('[data-int-legend-wrap]', { opacity: 0, y: 30 })
          gsap.set('[data-int-plan-area]', { opacity: 0 })

          /* ────────────────────────────────────────────────────
           * SCENE-BASED ARCHITECTURE
           *
           * Same approach as Exterior section:
           * Header starts centered on warm bg, moves to top,
           * warm bg dissolves, images crossfade underneath.
           *
           * Timeline layout (total = 1.00 for 4 rooms):
           *   0.00–0.04  Hold: header centered on warm bg
           *   0.04–0.18  Animate: reveal (header up, bg out, image 0 in)
           *   0.18–0.28  Hold: room 0 settled
           *   0.28–0.40  Animate: crossfade to room 1
           *   0.40–0.50  Hold: room 1 settled
           *   0.50–0.62  Animate: crossfade to room 2
           *   0.62–0.72  Hold: room 2 settled
           *   0.72–0.84  Animate: crossfade to room 3
           *   0.84–1.00  Hold: room 3 settled
           * ──────────────────────────────────────────────────── */

          const master = gsap.timeline()

          /* ── Phase 0: Cinematic reveal (0.04 → 0.18) ──────── */
          master.to('[data-int-desc]', { opacity: 0, y: -10, duration: 0.02 }, 0.04)
          master.to('[data-int-sep]', { opacity: 0, duration: 0.02 }, 0.04)
          master.to(
            '[data-int-header-wrap]',
            { y: topY, duration: 0.1, ease: 'power1.inOut' },
            0.045,
          )
          master.to('[data-int-warm-bg]', { opacity: 0, duration: 0.07, ease: 'none' }, 0.05)
          master.to(IMAGE(0), { scale: 1, opacity: 1, duration: 0.12, ease: 'power1.out' }, 0.05)
          master.to(
            '[data-int-scrim-top], [data-int-scrim-bottom], [data-int-scrim-right]',
            { opacity: 1, duration: 0.06 },
            0.09,
          )
          master.to('[data-int-title]', { color: '#ffffff', duration: 0.04 }, 0.11)
          master.set('[data-int-warm-bg]', { pointerEvents: 'none' }, 0.13)
          master.to('[data-int-legend-wrap]', { opacity: 1, y: 0, duration: 0.04 }, 0.13)
          master.to(TEXT(0), { opacity: 1, y: 0, duration: 0.04, ease: 'power1.out' }, 0.14)
          master.fromTo(
            '[data-int-plan-area]',
            { opacity: 0 },
            { opacity: 1, duration: 0.05, ease: 'none' },
            0.13,
          )
          /* ── hold 0.18–0.28 ── nothing moves ──────────────── */

          /* ── Room crossfades — generated for rooms 1..N ────── */
          const roomStarts = [0.28, 0.5, 0.72]

          for (let r = 1; r < total; r++) {
            const t = roomStarts[r - 1]
            if (t === undefined) break
            const prev = r - 1

            /* Outgoing — clean fade, no scale shift */
            master.to(IMAGE(prev), { opacity: 0, duration: 0.1, ease: 'none' }, t)
            master.to(TEXT(prev), { opacity: 0, y: -12, duration: 0.04, ease: 'none' }, t)

            /* Incoming */
            master.to(IMAGE(r), { scale: 1, opacity: 1, duration: 0.1, ease: 'none' }, t)
            master.to(TEXT(r), { opacity: 1, y: 0, duration: 0.04, ease: 'power1.out' }, t + 0.08)

            /* Counter swap */
            master.to(COUNTER(prev), { opacity: 0, duration: 0.03, ease: 'none' }, t + 0.04)
            master.to(COUNTER(r), { opacity: 1, duration: 0.03, ease: 'none' }, t + 0.06)

            /* Plan swap */
            master.to(PLAN(prev), { opacity: 0, duration: 0.03, ease: 'none' }, t + 0.04)
            master.fromTo(
              PLAN(r),
              { opacity: 0 },
              { opacity: 1, duration: 0.03, ease: 'none' },
              t + 0.07,
            )
          }

          /* ── Force timeline to span for final hold ─────────── */
          master.set({}, {}, 1.0)

          ScrollTrigger.create({
            trigger: el,
            start: 'top top',
            end: () => `+=${vh * 10}`,
            pin: true,
            scrub: 1.2,
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
              style={{ zIndex: i, willChange: 'transform, opacity' }}
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
                className='relative ml-auto hidden shrink-0 lg:block'
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
                      willChange: 'opacity',
                    }}
                  >
                    <Image
                      src={room.plan.src}
                      alt={room.plan.alt}
                      width={room.plan.width}
                      height={room.plan.height}
                      loading='lazy'
                      className='size-full object-contain'
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
