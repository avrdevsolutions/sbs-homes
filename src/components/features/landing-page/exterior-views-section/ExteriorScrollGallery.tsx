'use client'

import { useRef } from 'react'

import Image from 'next/image'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { Separator, Typography } from '@/components/ui'
import type { ExteriorVantagePoint } from '@/dictionaries/landing-page'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const TOTAL = 3

/* ── Selectors ─────────────────────────────────────────────────── */
const IMAGE = (i: number) => `[data-ext-image="${i}"]`
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
            gsap.set('[data-ext-frame]', { opacity: 1 })
            gsap.set('[data-ext-header-wrap]', { y: 0 })
            gsap.set('[data-ext-desc], [data-ext-sep]', { opacity: 0, display: 'none' })
            gsap.set('[data-ext-counter-wrap]', { opacity: 1 })
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
          const topY = 24

          /* ── Initial states ────────────────────────────────── */
          gsap.set('[data-ext-header-wrap]', { y: centeredY })
          gsap.set('[data-ext-frame]', { opacity: 0 })
          gsap.set('[data-ext-counter-wrap]', { opacity: 0 })

          /* Images 1 & 2 fully clipped from left (hidden).
             As wipe progresses, left-inset shrinks → reveals. */
          gsap.set(IMAGE(1), { clipPath: 'inset(0% 0% 0% 100%)' })
          gsap.set(IMAGE(2), { clipPath: 'inset(0% 0% 0% 100%)' })
          gsap.set('[data-ext-wipe-line]', { opacity: 0, left: '100%' })

          /* ────────────────────────────────────────────────────
           * ROUNDED FRAME + WIPE TRANSITIONS
           *
           * White bg throughout. Section header on white above
           * the frame — never inside it. Rounded-rect card below
           * header holds stacked images. Each image layer carries
           * its own legend text + plan image — they wipe in WITH
           * the image. 20px vertical divider sweeps at the edge.
           *
           *   0.00–0.16  Header lifts → counter → image appears
           *   0.16–0.24  HOLD — absorb image 0
           *   0.24–0.40  WIPE 1 — image 1 + its legend/plan
           *              sweeps in from right with divider line
           *   0.40–0.52  HOLD — absorb image 1
           *   0.52–0.68  WIPE 2 — image 2 sweeps in same way
           *   0.68–0.78  HOLD — absorb image 2
           *   0.78–0.88  Frame scales down (1 → 0.88)
           *   0.88–0.92  DEAD ZONE
           * ──────────────────────────────────────────────────── */

          const WIPE = 0.16
          const master = gsap.timeline()

          /* ── Reveal (0.00 → 0.16) ─────────────────────────── *
           *  1. Header lifts to top (starts immediately)
           *  2. Desc + sep fade out as header nears top
           *  3. Counter appears after header settles
           *  4. Image fades in last
           * ──────────────────────────────────────────────────── */
          master.to('[data-ext-header-wrap]', { y: topY, duration: 0.1, ease: 'none' }, 0.0)
          master.to('[data-ext-desc]', { opacity: 0, y: -8, duration: 0.03, ease: 'none' }, 0.06)
          master.to('[data-ext-sep]', { opacity: 0, duration: 0.03, ease: 'none' }, 0.06)
          master.to('[data-ext-counter-wrap]', { opacity: 1, duration: 0.03, ease: 'none' }, 0.1)
          master.to('[data-ext-warm-bg]', { opacity: 0, duration: 0.07, ease: 'none' }, 0.12)
          master.to('[data-ext-frame]', { opacity: 1, duration: 0.07, ease: 'none' }, 0.12)
          master.set('[data-ext-warm-bg]', { pointerEvents: 'none' }, 0.16)

          /* ── Wipe 1: Image 1 enters from right (0.24 → 0.40) ─
           * clipPath left-inset goes from 100% → 0%. The image
           * layer carries its own legend + plan, so they appear
           * naturally as the wipe reveals them. */
          master.to(
            IMAGE(1),
            { clipPath: 'inset(0% 0% 0% 0%)', duration: WIPE, ease: 'none' },
            0.24,
          )
          /* 40px divider line sweeps with the clip edge */
          master.set('[data-ext-wipe-line]', { opacity: 1, left: '100%' }, 0.24)
          master.to('[data-ext-wipe-line]', { left: '0%', duration: WIPE, ease: 'none' }, 0.24)
          master.set('[data-ext-wipe-line]', { opacity: 0 }, 0.24 + WIPE + 0.001)
          /* Counter swap at wipe midpoint */
          const mid1 = 0.24 + WIPE * 0.5
          master.set(COUNTER(0), { opacity: 0 }, mid1)
          master.set(COUNTER(1), { opacity: 1 }, mid1)

          /* ── Wipe 2: Image 2 enters from right (0.52 → 0.68) ─ */
          master.to(
            IMAGE(2),
            { clipPath: 'inset(0% 0% 0% 0%)', duration: WIPE, ease: 'none' },
            0.52,
          )
          master.set('[data-ext-wipe-line]', { opacity: 1, left: '100%' }, 0.52)
          master.to('[data-ext-wipe-line]', { left: '0%', duration: WIPE, ease: 'none' }, 0.52)
          master.set('[data-ext-wipe-line]', { opacity: 0 }, 0.52 + WIPE + 0.001)
          const mid2 = 0.52 + WIPE * 0.5
          master.set(COUNTER(1), { opacity: 0 }, mid2)
          master.set(COUNTER(2), { opacity: 1 }, mid2)

          /* ── Scale down (0.78 → 0.88) ──────────────────────── */
          master.to('[data-ext-frame]', { scale: 0.88, duration: 0.1, ease: 'none' }, 0.78)

          /* ── Dead End ──────────────────────────────────────── */
          master.set({}, {}, 0.92)

          /* ── ScrollTrigger ─────────────────────────────────── */
          ScrollTrigger.create({
            trigger: el,
            start: 'top top',
            end: () => `+=${vh * 7}`,
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
    <div ref={sceneRef} className='relative h-screen w-full overflow-hidden bg-secondary-100'>
      {/* ── White cover — dissolves to reveal the frame card ──── */}
      <div data-ext-warm-bg className='absolute inset-0 bg-secondary-100' style={{ zIndex: 5 }} />

      {/* Content container — capped at 1920px, centered on ultra-wide */}
      <div className='absolute inset-0 mx-auto' style={{ maxWidth: '120rem' }}>
        {/* ── Section header — white bg, dark text, above the frame ── */}
        <div className='absolute inset-x-0 top-0 px-5 md:px-10 lg:px-14' style={{ zIndex: 20 }}>
          <div
            data-ext-header-wrap
            className='flex items-start justify-between gap-8 pt-5 md:pt-6'
            style={{ willChange: 'transform' }}
          >
            {/* Left: eyebrow + title */}
            <div className='min-w-0'>
              <Typography data-ext-eyebrow variant='overline' className='text-primary-600'>
                {header.eyebrow}
              </Typography>
              <Typography
                data-ext-title
                variant='h2'
                as='h2'
                className='mt-2 text-secondary-900'
                style={{ maxWidth: '28ch' }}
              >
                {header.title}
              </Typography>
              <Typography
                data-ext-desc
                variant='body'
                className='mt-3 text-secondary-900'
                style={{ maxWidth: '44ch', opacity: 0.6 }}
              >
                {header.description}
              </Typography>
              <Separator
                data-ext-sep
                variant='accent'
                className='mt-5 w-12 bg-primary-600 opacity-50'
              />
            </div>

            {/* Right: counter (01 / 03) */}
            <div
              data-ext-counter-wrap
              className='mt-6 shrink-0'
              style={{ opacity: 0, willChange: 'opacity' }}
            >
              <div className='flex items-baseline gap-1'>
                <div className='relative overflow-hidden' style={{ width: '2ch', height: '1.2em' }}>
                  {vantagePoints.map((_, i) => (
                    <span
                      key={i}
                      data-ext-counter={i}
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
                  / {String(TOTAL).padStart(2, '0')}
                </Typography>
              </div>
            </div>
          </div>
        </div>

        {/* Rounded frame card — positioned below header.
          Each image layer is self-contained: photo + gradient
          scrim + plan card + legend text. When a wipe reveals
          the next image, its plan and legend come WITH it —
          no separate overlay animation needed. */}
        <div
          className='absolute inset-x-0 px-5 md:px-10 lg:px-14'
          style={{ zIndex: 2, top: '16vh', bottom: '3vh' }}
        >
          <div
            data-ext-frame
            className='relative size-full overflow-hidden'
            style={{
              borderRadius: '16px',
              opacity: 0,
              willChange: 'transform, opacity',
              transformOrigin: '50% 50%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
          >
            {/* ── Image layers ──────────────────────────────────── */}
            {vantagePoints.map((vp, i) => (
              <div
                key={vp.id}
                data-ext-image={i}
                className='absolute inset-0'
                style={{
                  zIndex: i + 1,
                  ...(i > 0 ? { willChange: 'clip-path' } : {}),
                }}
              >
                <Image
                  src={vp.image.src}
                  alt={vp.image.alt}
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

                {/* Plan card — top right (inside this layer, clips with wipe) */}
                <div
                  className='absolute right-4 top-3 overflow-hidden rounded-xl shadow-lg ring-1 ring-white/30 lg:right-6 lg:top-4'
                  style={{
                    width: 200,
                    height: 120,
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(20px) saturate(1.5)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
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

                {/* Legend text — bottom left (inside this layer, clips with wipe) */}
                <div className='absolute bottom-0 left-0 p-5 md:p-6 lg:p-7'>
                  <Typography variant='h4' as='h3' className='text-white'>
                    {vp.title}
                  </Typography>
                  <Typography
                    variant='body-sm'
                    className='mt-1.5 text-white/60'
                    style={{ maxWidth: '38ch' }}
                  >
                    {vp.description}
                  </Typography>
                </div>
              </div>
            ))}

            {/* ── 40px wipe divider line ────────────────────────── *
             *  Sweeps right-to-left, centered on the clip edge.
             *  Gives a physical, mechanical feel to the transition. */}
            <div
              data-ext-wipe-line
              className='absolute inset-y-0'
              style={{
                zIndex: 10,
                width: 40,
                opacity: 0,
                left: '100%',
                transform: 'translateX(-50%)',
                background: '#f5f3f0',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
