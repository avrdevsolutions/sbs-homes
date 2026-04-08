'use client'

import { useRef } from 'react'

import Image from 'next/image'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { Container, Separator, Typography } from '@/components/ui'
import type { InteriorRoom } from '@/dictionaries/landing-page'
import { cn } from '@/lib/utils'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/* ── Selectors ─────────────────────────────────────────────────── */
const IMAGE = (i: number) => `[data-int-image="${i}"]`
const PILL = (i: number) => `[data-int-pill="${i}"]`
const COUNTER_NUM = (i: number) => `[data-int-counter-num="${i}"]`

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
            gsap.set('[data-int-frame]', { y: 0 })
            gsap.set('[data-int-header-wrap]', { y: 0 })
            gsap.set('[data-int-desc], [data-int-sep]', { opacity: 0, display: 'none' })
            gsap.set('[data-int-counter-wrap]', { opacity: 1 })
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
          const topY = 24

          /* ── Initial states ────────────────────────────────── */
          gsap.set('[data-int-header-wrap]', { y: centeredY })
          gsap.set('[data-int-frame]', { y: '80vh' })
          gsap.set('[data-int-counter-wrap]', { opacity: 0 })

          /* ── Measure frame for carousel maths ──────────────── */
          const frame = el.querySelector('[data-int-frame]') as HTMLElement
          if (!frame) return
          const frameW = frame.offsetWidth
          const GAP = 12

          /* ────────────────────────────────────────────────────
           * CAROUSEL TRACK — APPLE-STYLE CARD STRIP
           *
           * All slides sit side-by-side in a flex row with a
           * 4px gap. Scrolling translates the track left.
           * The gap IS the divider — the frame background
           * (#edebe8) shows through between rounded cards.
           *
           *   0.00–0.14  Header lifts → frame parallax up → counter
           *   0.14–0.20  HOLD — absorb room 0
           *   0.20–0.62  Continuous carousel (3 slides, no stops)
           *   0.62–0.68  HOLD — absorb room 3
           *   0.68–0.74  Frame scales down (1 → 0.88)
           *   0.74–0.94  DEAD ZONE
           * ──────────────────────────────────────────────────── */

          const SLIDE = 0.14
          const CAROUSEL_START = 0.2
          const master = gsap.timeline()

          /* ── Reveal (0.00 → 0.14) ─────────────────────────── *
           *  1. Header lifts to top (starts immediately)
           *  2. Frame parallax slides up from below
           *  3. Desc + sep fade out as header nears top
           *  4. Counter appears after header settles
           * ──────────────────────────────────────────────────── */
          master.to('[data-int-header-wrap]', { y: topY, duration: 0.1, ease: 'none' }, 0.0)
          master.to('[data-int-frame]', { y: 0, duration: 0.12, ease: 'none' }, 0.02)
          master.to('[data-int-desc]', { opacity: 0, y: -8, duration: 0.03, ease: 'none' }, 0.06)
          master.to('[data-int-sep]', { opacity: 0, duration: 0.03, ease: 'none' }, 0.06)
          master.to('[data-int-counter-wrap]', { opacity: 1, duration: 0.03, ease: 'none' }, 0.1)

          /* ── Slide transitions — continuous, no stops ──────── */
          for (let r = 1; r < total; r++) {
            /* Each slide starts right after the previous ends */
            const t = CAROUSEL_START + (r - 1) * SLIDE

            /* Shift the entire track left by one card + gap */
            master.to(
              '[data-int-track]',
              { x: -(r * (frameW + GAP)), duration: SLIDE, ease: 'none' },
              t,
            )

            /* Pill + counter swap at slide midpoint */
            const mid = t + SLIDE * 0.5
            master.to(
              PILL(r - 1),
              {
                width: 12,
                backgroundColor: 'rgba(31, 28, 24, 0.15)',
                duration: 0.01,
                ease: 'none',
              },
              mid,
            )
            master.to(
              PILL(r),
              { width: 24, backgroundColor: '#c87941', duration: 0.01, ease: 'none' },
              mid,
            )
            master.set(COUNTER_NUM(r - 1), { opacity: 0 }, mid)
            master.set(COUNTER_NUM(r), { opacity: 1 }, mid)
          }

          /* ── Scale down (0.68 → 0.74) ──────────────────────── */
          master.to('[data-int-frame]', { scale: 0.88, duration: 0.06, ease: 'none' }, 0.68)

          /* ── Dead End ──────────────────────────────────────── */
          master.set({}, {}, 0.94)

          /* ── ScrollTrigger ─────────────────────────────────── */
          ScrollTrigger.create({
            trigger: el,
            start: 'top top',
            end: () => `+=${vh * 8}`,
            pin: true,
            scrub: 0.8,
            animation: master,
          })
        },
      )
    },
    { scope: sceneRef },
  )

  return (
    <div ref={sceneRef} className='relative h-screen w-full overflow-hidden bg-secondary-200'>
      {/* ── Section header — above the frame ── */}
      <div className='absolute inset-x-0 top-0' style={{ zIndex: 20 }}>
        <Container size='xxl' padding='xxl'>
          <div
            data-int-header-wrap
            className='flex items-start justify-between gap-8 pt-5 md:pt-6'
            style={{ willChange: 'transform' }}
          >
            {/* Left: eyebrow + title */}
            <div className='min-w-0'>
              <Typography variant='overline' className='text-primary-600'>
                {header.eyebrow}
              </Typography>
              <Typography
                variant='h2'
                as='h2'
                className='mt-2 text-secondary-900'
                style={{ maxWidth: '28ch' }}
              >
                {header.title}
              </Typography>
              <Typography
                data-int-desc
                variant='body'
                className='mt-3 text-secondary-900'
                style={{ maxWidth: '44ch', opacity: 0.6 }}
              >
                {header.description}
              </Typography>
              <Separator
                data-int-sep
                variant='accent'
                className='mt-5 w-12 bg-primary-600 opacity-50'
              />
            </div>

            {/* Right: pill indicators + counter */}
            <div
              data-int-counter-wrap
              className='mt-6 shrink-0'
              style={{ opacity: 0, willChange: 'opacity' }}
            >
              <div className='flex items-center gap-3'>
                <div className='flex gap-1.5'>
                  {rooms.map((_, i) => (
                    <div
                      key={i}
                      data-int-pill={i}
                      className={cn(
                        'h-1 rounded-full',
                        i === 0 ? 'bg-primary-600' : 'bg-secondary-900/15',
                      )}
                      style={{ width: i === 0 ? 24 : 12 }}
                    />
                  ))}
                </div>
                <Typography
                  variant='overline'
                  as='span'
                  className='text-secondary-900/40'
                  style={{ fontSize: '0.6rem' }}
                >
                  <span className='relative inline-block' style={{ width: '1ch' }}>
                    {rooms.map((_, i) => (
                      <span
                        key={i}
                        data-int-counter-num={i}
                        className='absolute inset-0'
                        style={{ opacity: i === 0 ? 1 : 0, willChange: 'opacity' }}
                      >
                        {i + 1}
                      </span>
                    ))}
                  </span>
                  {' / '}
                  {total}
                </Typography>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* ── Rounded frame card ──────────────────────────────── */}
      <div className='absolute inset-x-0' style={{ zIndex: 2, top: '20vh', bottom: '10vh' }}>
        <Container size='xxl' padding='xxl' className='h-full'>
          <div
            data-int-frame
            className='relative size-full overflow-hidden'
            style={{
              willChange: 'transform',
              transformOrigin: '50% 50%',
            }}
          >
            {/* ── Carousel track — cards side by side with gap ── */}
            <div
              data-int-track
              className='flex h-full'
              style={{ gap: 12, willChange: 'transform' }}
            >
              {rooms.map((room, i) => (
                <div
                  key={room.id}
                  data-int-image={i}
                  className='relative shrink-0 overflow-hidden'
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '10px',
                    boxShadow: 'inset 4px 0 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <Image
                    src={room.image.src}
                    alt={room.image.alt}
                    fill
                    sizes='94vw'
                    priority={i === 0}
                    className='object-cover'
                  />

                  {/* Bottom gradient scrim — legend readability */}
                  <div
                    className='pointer-events-none absolute inset-x-0 bottom-0'
                    style={{
                      height: '55%',
                      background:
                        'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 35%, rgba(0,0,0,0.12) 65%, transparent 100%)',
                    }}
                  />

                  {/* Plan overlay — top right */}
                  <div
                    className='absolute right-4 top-3 overflow-hidden lg:right-6 lg:top-4'
                    style={{
                      width: 200,
                      height: 120,
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

                  {/* Legend text — bottom left */}
                  <div className='absolute bottom-0 left-0 p-5 md:p-6 lg:p-7'>
                    <Typography variant='overline' as='span' className='text-primary-400'>
                      {room.title}
                    </Typography>
                    <Typography variant='h4' as='h3' className='mt-1 text-white'>
                      {room.subtitle}
                    </Typography>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </div>
    </div>
  )
}
