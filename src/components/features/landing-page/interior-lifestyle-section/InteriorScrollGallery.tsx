'use client'

import { useRef } from 'react'

import Image from 'next/image'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { Separator, Typography } from '@/components/ui'
import type { InteriorRoom } from '@/dictionaries/landing-page'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/* ── Selectors ─────────────────────────────────────────────────── */
const IMAGE = (i: number) => `[data-int-image="${i}"]`
const COUNTER = (i: number) => `[data-int-counter="${i}"]`

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
            gsap.set('[data-int-warm-bg]', { opacity: 0 })
            gsap.set('[data-int-frame]', { opacity: 1 })
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
          gsap.set('[data-int-frame]', { opacity: 0 })
          gsap.set('[data-int-counter-wrap]', { opacity: 0 })

          /* Images 1–3 fully clipped from top (hidden).
             As wipe progresses, top-inset shrinks → reveals bottom-to-top. */
          for (let i = 1; i < total; i++) {
            gsap.set(IMAGE(i), { clipPath: 'inset(100% 0% 0% 0%)' })
          }
          gsap.set('[data-int-wipe-line]', { opacity: 0, top: '100%' })

          /* ────────────────────────────────────────────────────
           * ROUNDED FRAME + BOTTOM-TO-TOP WIPE TRANSITIONS
           *
           * Same visual language as Section 02 (Exterior) but
           * wipes bottom-to-top. 20px horizontal divider sweeps
           * upward at the clip edge. 4 rooms instead of 3.
           *
           *   0.00–0.04  DEAD ZONE — warm bg, centered header
           *   0.00–0.16  Header lifts → counter → image appears
           *   0.16–0.20  HOLD — absorb room 0
           *   0.20–0.34  WIPE 1 — room 1 sweeps up
           *   0.34–0.42  HOLD — absorb room 1
           *   0.42–0.56  WIPE 2 — room 2 sweeps up
           *   0.56–0.64  HOLD — absorb room 2
           *   0.64–0.78  WIPE 3 — room 3 sweeps up
           *   0.78–0.84  HOLD — absorb room 3
           *   0.84–0.90  Frame scales down (1 → 0.88)
           *   0.90–0.94  DEAD ZONE
           * ──────────────────────────────────────────────────── */

          const WIPE = 0.14
          const master = gsap.timeline()

          /* ── Reveal (0.00 → 0.16) ─────────────────────────── *
           *  1. Header lifts to top (starts immediately)
           *  2. Desc + sep fade out as header nears top
           *  3. Counter appears after header settles
           *  4. Image fades in last
           * ──────────────────────────────────────────────────── */
          master.to('[data-int-header-wrap]', { y: topY, duration: 0.1, ease: 'none' }, 0.0)
          master.to('[data-int-desc]', { opacity: 0, y: -8, duration: 0.03, ease: 'none' }, 0.06)
          master.to('[data-int-sep]', { opacity: 0, duration: 0.03, ease: 'none' }, 0.06)
          master.to('[data-int-counter-wrap]', { opacity: 1, duration: 0.03, ease: 'none' }, 0.1)
          master.to('[data-int-warm-bg]', { opacity: 0, duration: 0.07, ease: 'none' }, 0.12)
          master.to('[data-int-frame]', { opacity: 1, duration: 0.07, ease: 'none' }, 0.12)
          master.set('[data-int-warm-bg]', { pointerEvents: 'none' }, 0.16)

          /* ── Wipe transitions — bottom-to-top ─────────────── */
          const wipeStarts = [0.2, 0.42, 0.64]

          for (let r = 1; r < total; r++) {
            const t = wipeStarts[r - 1]
            if (t === undefined) break

            /* Image wipe: clipPath top-inset 100% → 0% (bottom-to-top reveal) */
            master.to(IMAGE(r), { clipPath: 'inset(0% 0% 0% 0%)', duration: WIPE, ease: 'none' }, t)

            /* 20px horizontal divider line sweeps upward with the clip edge */
            master.set('[data-int-wipe-line]', { opacity: 1, top: '100%' }, t)
            master.to('[data-int-wipe-line]', { top: '0%', duration: WIPE, ease: 'none' }, t)
            master.set('[data-int-wipe-line]', { opacity: 0 }, t + WIPE + 0.001)

            /* Counter swap at wipe midpoint */
            const mid = t + WIPE * 0.5
            master.set(COUNTER(r - 1), { opacity: 0 }, mid)
            master.set(COUNTER(r), { opacity: 1 }, mid)
          }

          /* ── Scale down (0.84 → 0.90) ──────────────────────── */
          master.to('[data-int-frame]', { scale: 0.88, duration: 0.06, ease: 'none' }, 0.84)

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
      {/* ── Warm cover — dissolves to reveal the frame card ──── */}
      <div data-int-warm-bg className='absolute inset-0 bg-secondary-200' style={{ zIndex: 5 }} />

      {/* Content container — capped at 1920px, centered on ultra-wide */}
      <div className='absolute inset-0 mx-auto' style={{ maxWidth: '120rem' }}>
        {/* ── Section header — warm bg, dark text, above the frame ── */}
        <div className='absolute inset-x-0 top-0 px-5 md:px-10 lg:px-14' style={{ zIndex: 20 }}>
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

            {/* Right: counter (01 / 04) */}
            <div
              data-int-counter-wrap
              className='mt-6 shrink-0'
              style={{ opacity: 0, willChange: 'opacity' }}
            >
              <div className='flex items-baseline gap-1'>
                <div className='relative overflow-hidden' style={{ width: '2ch', height: '1.2em' }}>
                  {rooms.map((_, i) => (
                    <span
                      key={i}
                      data-int-counter={i}
                      className='absolute inset-0'
                      style={{ opacity: i === 0 ? 1 : 0, willChange: 'opacity' }}
                    >
                      <Typography variant='overline' as='span' className='text-primary-600'>
                        {String(i + 1).padStart(2, '0')}
                      </Typography>
                    </span>
                  ))}
                </div>
                <Typography variant='overline' as='span' className='text-secondary-900'>
                  / {String(total).padStart(2, '0')}
                </Typography>
              </div>
            </div>
          </div>
        </div>

        {/* ── Rounded frame card ──────────────────────────────── */}
        <div
          className='absolute inset-x-0 px-5 md:px-10 lg:px-14'
          style={{ zIndex: 2, top: '16vh', bottom: '3vh' }}
        >
          <div
            data-int-frame
            className='relative size-full overflow-hidden'
            style={{
              borderRadius: '16px',
              opacity: 0,
              willChange: 'transform, opacity',
              transformOrigin: '50% 50%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
          >
            {/* ── Image layers ──────────────────────────────── */}
            {rooms.map((room, i) => (
              <div
                key={room.id}
                data-int-image={i}
                className='absolute inset-0'
                style={{
                  zIndex: i + 1,
                  ...(i > 0 ? { willChange: 'clip-path' } : {}),
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

                {/* Plan overlay — top right (inside layer, clips with wipe) */}
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

                {/* Legend text — bottom left (inside layer, clips with wipe) */}
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

            {/* ── 40px horizontal wipe divider line ──────────── *
             *  Sweeps bottom-to-top, centered on the clip edge. */}
            <div
              data-int-wipe-line
              className='absolute inset-x-0'
              style={{
                zIndex: 10,
                height: 40,
                opacity: 0,
                top: '100%',
                transform: 'translateY(-50%)',
                background: '#edebe8',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
