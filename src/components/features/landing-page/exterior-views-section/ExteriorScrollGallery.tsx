'use client'

import { useRef } from 'react'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { SectionBlockHeader } from '@/components/shared'
import { Container } from '@/components/ui'
import type { ExteriorVantagePoint } from '@/dictionaries/landing-page'

import { GalleryLegend } from './GalleryLegend'
import { ImageCard } from './ImageCard'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const TOTAL = 3

/* ── Layout ────────────────────────────────────────────────────── */
const CARD_VW = 65
const GAP_VW = 3
const STEP_VW = CARD_VW + GAP_VW

/* ── Card states ───────────────────────────────────────────────── */
const INACTIVE_SCALE = 0.9
const INACTIVE_OPACITY = 0.5

/* ── Selectors ─────────────────────────────────────────────────── */
const card = (i: number) => `[data-ext-card="${i}"]`
const legend = (i: number) => `[data-ext-legend="${i}"]`
const counter = (i: number) => `[data-ext-counter="${i}"]`
const STRIP = '[data-ext-strip]'

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
  const alignRef = useRef<HTMLDivElement>(null)

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
            gsap.set('[data-ext-card]', { scale: 1, opacity: 1 })
            return
          }

          if (!isDesktop) return

          const vw = window.innerWidth / 100
          const step = STEP_VW * vw

          // Measure Container's left content edge for alignment
          const alignEl = alignRef.current
          if (alignEl) {
            const leftOffset = alignEl.getBoundingClientRect().left
            gsap.set(STRIP, { paddingLeft: leftOffset })
          }

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: sceneRef.current,
              start: 'top top',
              end: () => `+=${window.innerHeight * 3.5}`,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })

          /*
           * 0–0.3    Hold on card 0
           * 0.3–1.8  Slide → card 1, push legend 0→1
           * 1.8–3.3  Slide → card 2, push legend 1→2
           * 3.3–4.5  Hold on card 2
           */

          /* ── Initial hold ───────────────────────────────────── */
          tl.to({}, { duration: 0.5 }, 0)

          /* ── Transition → card 1 ─────────────────────────────── */
          // Images slide
          tl.to(STRIP, { x: -step, duration: 1.5, ease: 'none' }, 0.5)
          tl.to(
            card(0),
            { scale: INACTIVE_SCALE, opacity: INACTIVE_OPACITY, duration: 1.5, ease: 'none' },
            0.5,
          )
          tl.to(card(1), { scale: 1, opacity: 1, duration: 1.5, ease: 'none' }, 0.5)
          // Counter + legend: start at midpoint of slide (1.0)
          tl.to(counter(0), { y: '-100%', opacity: 0, duration: 0.4, ease: 'none' }, 1.0)
          tl.to(counter(1), { y: '0%', opacity: 1, duration: 0.4, ease: 'none' }, 1.1)
          tl.to(legend(0), { x: -40, opacity: 0, duration: 0.5, ease: 'none' }, 1.0)
          tl.to(legend(1), { x: 0, opacity: 1, duration: 0.5, ease: 'none' }, 1.3)

          /* ── Transition → card 2 ─────────────────────────────── */
          // Images slide
          tl.to(STRIP, { x: -step * 2, duration: 1.5, ease: 'none' }, 2.0)
          tl.to(
            card(1),
            { scale: INACTIVE_SCALE, opacity: INACTIVE_OPACITY, duration: 1.5, ease: 'none' },
            2.0,
          )
          tl.to(card(2), { scale: 1, opacity: 1, duration: 1.5, ease: 'none' }, 2.0)
          // Counter + legend: start at midpoint of slide (2.5)
          tl.to(counter(1), { y: '-100%', opacity: 0, duration: 0.4, ease: 'none' }, 2.5)
          tl.to(counter(2), { y: '0%', opacity: 1, duration: 0.4, ease: 'none' }, 2.6)
          tl.to(legend(1), { x: -40, opacity: 0, duration: 0.5, ease: 'none' }, 2.5)
          tl.to(legend(2), { x: 0, opacity: 1, duration: 0.5, ease: 'none' }, 2.8)

          /* ── Hold ────────────────────────────────────────────── */
          tl.to({}, { duration: 1.2 }, 3.5)
        },
      )
    },
    { scope: sceneRef },
  )

  return (
    <div
      ref={sceneRef}
      className='relative flex h-screen w-full flex-col overflow-hidden bg-secondary-100'
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div className='shrink-0 pb-6 pt-8 md:pb-8 md:pt-10 lg:pb-8 lg:pt-12'>
        <Container>
          <div ref={alignRef}>
            <SectionBlockHeader
              eyebrow={header.eyebrow}
              title={header.title}
              description={header.description}
              titleAs='h2'
            />
          </div>
        </Container>
      </div>

      {/* ── Scrolling image strip ────────────────────────────── */}
      <div className='relative min-h-0 flex-1'>
        <div
          data-ext-strip
          className='flex h-full items-stretch px-5 py-4 md:px-10 lg:px-14'
          style={{
            gap: `${GAP_VW}vw`,
            willChange: 'transform',
          }}
        >
          {vantagePoints.map((vp, i) => (
            <ImageCard
              key={vp.id}
              vantagePoint={vp}
              index={i}
              cardWidth={CARD_VW}
              inactiveScale={INACTIVE_SCALE}
              inactiveOpacity={INACTIVE_OPACITY}
            />
          ))}
        </div>
      </div>

      {/* ── Fixed legend ─────────────────────────────────────── */}
      <div className='shrink-0 pb-8 pt-5 md:pb-10 lg:pb-10'>
        <Container>
          <GalleryLegend vantagePoints={vantagePoints} total={TOTAL} />
        </Container>
      </div>
    </div>
  )
}
