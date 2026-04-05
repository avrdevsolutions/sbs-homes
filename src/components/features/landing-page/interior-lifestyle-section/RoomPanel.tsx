'use client'

import { memo, useRef } from 'react'

import Image from 'next/image'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { Container } from '@/components/ui'
import type { InteriorRoom } from '@/dictionaries/landing-page'

gsap.registerPlugin(useGSAP, ScrollTrigger)

type RoomPanelProps = {
  room: InteriorRoom
  index: number
}

export const RoomPanel = memo(({ room, index }: RoomPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null)

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
            gsap.set('[data-room-text]', { opacity: 1, y: 0 })
            gsap.set('[data-room-plan]', { opacity: 1 })
            return
          }

          /* ── Image parallax — subtle upward drift ─────────── */
          gsap.fromTo(
            '[data-room-image]',
            { y: isDesktop ? 60 : 30 },
            {
              y: isDesktop ? -60 : -30,
              ease: 'none',
              scrollTrigger: {
                trigger: panelRef.current,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
              },
            },
          )

          /* ── Overlay reveal ───────────────────────────────── */
          gsap.fromTo(
            '[data-room-plan]',
            { opacity: 0, y: 24 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: panelRef.current,
                start: 'top 50%',
                toggleActions: 'play none none reverse',
              },
            },
          )

          /* ── Text — fast drop from top ────────────────────── */
          gsap.fromTo(
            '[data-room-text]',
            { opacity: 0, y: -60 },
            {
              opacity: 1,
              y: 0,
              duration: 0.45,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: panelRef.current,
                start: 'top 50%',
                toggleActions: 'play none none reverse',
              },
            },
          )
        },
      )
    },
    { scope: panelRef },
  )

  return (
    <div ref={panelRef} className='relative h-screen w-full overflow-hidden'>
      {/* ── Base image with parallax ─────────────────────────── */}
      <div
        data-room-image
        className='absolute inset-0'
        style={{ top: '-60px', bottom: '-60px', willChange: 'transform' }}
      >
        <Image
          src={room.image.src}
          alt={room.image.alt}
          fill
          sizes='100vw'
          priority={index === 0}
          className='object-cover'
        />
      </div>

      {/* ── Gradient scrims on both sides for readability ────── */}
      <div className='absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50' />

      {/* ── Content layer — Container-aligned ────────────────── */}
      <div className='absolute inset-0 flex items-center'>
        <Container>
          {/* ── Text — always left ───────────────────────────── */}
          <div data-room-text style={{ opacity: 0 }}>
            <span className='font-display text-eyebrow uppercase tracking-widest text-white/70'>
              {room.title}
            </span>
            <h3
              className='mt-2 font-display text-h1-sm uppercase tracking-wider text-white md:text-h1-md lg:text-h1-lg'
              style={{ maxWidth: '16ch' }}
            >
              {room.subtitle}
            </h3>
          </div>
        </Container>
      </div>

      {/* ── Overlay image — bottom-right corner ─────────────── */}
      <div
        data-room-plan
        className='absolute bottom-8 right-8 hidden md:bottom-10 md:right-10 md:block lg:bottom-12 lg:right-16'
        style={{ opacity: 0 }}
      >
        <Image
          src={room.plan.src}
          alt={room.plan.alt}
          width={room.plan.width}
          height={room.plan.height}
          sizes='30vw'
          className='w-[30vw] max-w-[420px]'
        />
      </div>
    </div>
  )
})

RoomPanel.displayName = 'RoomPanel'
