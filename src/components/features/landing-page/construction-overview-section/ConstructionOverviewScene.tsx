'use client'

import { useRef } from 'react'

import Image from 'next/image'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { Separator, Typography } from '@/components/ui'
import type { ConstructionOverviewSectionContent } from '@/dictionaries/landing-page'

gsap.registerPlugin(useGSAP, ScrollTrigger)

type ConstructionOverviewSceneProps = {
  content: ConstructionOverviewSectionContent
}

export const ConstructionOverviewScene = ({ content }: ConstructionOverviewSceneProps) => {
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
            gsap.set('[data-co="header"]', { opacity: 0 })
            gsap.set('[data-co="exterior"]', { clipPath: 'inset(0% 0% 0% 0%)', opacity: 0 })
            gsap.set('[data-co="cutaway"]', { opacity: 1 })
            gsap.set('[data-co="image-text"]', { opacity: 0 })
            gsap.set('[data-co="image-text-2"]', { opacity: 1, x: 0 })
            gsap.set('[data-co="cutaway-text"]', { opacity: 1, y: 0 })
            gsap.set('[data-co="cutaway-line"]', { opacity: 1, y: 0 })
            gsap.set('[data-co="annotation-group"]', { opacity: 1 })
            return
          }

          if (!isDesktop) return

          const el = sceneRef.current
          if (!el) return

          const vh = window.innerHeight

          /* ── Measure header to vertically center it ──────── */
          const headerWrap = el.querySelector('[data-co="header"]') as HTMLElement
          if (!headerWrap) return
          const headerH = headerWrap.offsetHeight
          const centeredY = (vh - headerH) / 2

          /* ── Initial states ──────────────────────────────── */
          gsap.set('[data-co="header"]', { y: centeredY })
          gsap.set('[data-co="exterior"]', { clipPath: 'inset(100% 0% 0% 0%)' })
          gsap.set('[data-co="cutaway"]', { opacity: 0 })
          gsap.set('[data-co="image-text"]', { opacity: 1, y: vh })
          gsap.set('[data-co="image-text-2"]', { opacity: 0, x: 60 })
          gsap.set('[data-co="cutaway-text"]', { opacity: 0, y: 20 })
          gsap.set('[data-co="cutaway-line"]', { opacity: 0, y: 20 })
          gsap.set('[data-co="cutaway-separator"]', { opacity: 0, scaleX: 0 })
          gsap.set('[data-co="annotation-group"]', { opacity: 0 })

          /* ────────────────────────────────────────────────────
           *  TIMELINE (all scroll-driven, no dead zones)
           *
           *  0.00–0.22  Header parallaxes up + exterior rises + text rises
           *  0.22–0.37  Crossfade exterior→cutaway + text swap
           *  0.37–0.49  Description paragraphs stagger in
           *  0.45–0.49  Separator scales in
           *  0.49–0.53  "The key components" heading
           *  0.53–0.68  Annotation lines stagger in
           *  0.68–0.74  Breathing hold (0.06)
           *  0.80       Dead end
           * ──────────────────────────────────────────────────── */
          const master = gsap.timeline()

          /* ── Header parallaxes upward (fast — moves further than scroll) ── */
          master.to('[data-co="header"]', { y: -vh * 1.2, duration: 0.22, ease: 'none' }, 0)

          /* ── Exterior image rises from bottom ── */
          master.to(
            '[data-co="exterior"]',
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.22, ease: 'none' },
            0,
          )

          /* ── Text rises from bottom to top in sync with image ── */
          master.to('[data-co="image-text"]', { y: 0, duration: 0.22, ease: 'none' }, 0)

          /* ── Text swap: first slides left out, second slides left in ── */
          master.to(
            '[data-co="image-text"]',
            { opacity: 0, x: -60, duration: 0.06, ease: 'none' },
            0.22,
          )
          master.to(
            '[data-co="image-text-2"]',
            { opacity: 1, x: 0, duration: 0.06, ease: 'none' },
            0.24,
          )

          /* ── Crossfade: exterior out, cutaway in ── */
          master.to('[data-co="exterior"]', { opacity: 0, duration: 0.15, ease: 'none' }, 0.22)
          master.to('[data-co="cutaway"]', { opacity: 1, duration: 0.15, ease: 'none' }, 0.22)

          /* ── Description paragraphs stagger in ── */
          master.to(
            '[data-co="cutaway-line"]',
            { opacity: 1, y: 0, duration: 0.04, ease: 'none', stagger: 0.04 },
            0.37,
          )

          /* ── Separator scales in ── */
          master.to(
            '[data-co="cutaway-separator"]',
            { opacity: 1, scaleX: 1, duration: 0.04, ease: 'none' },
            0.45,
          )

          /* ── "The key components" heading ── */
          master.to(
            '[data-co="cutaway-text"]',
            { opacity: 1, y: 0, duration: 0.04, ease: 'none' },
            0.49,
          )

          /* ── Annotation lines stagger in ── */
          master.to(
            '[data-co="annotation-group"]',
            { opacity: 1, duration: 0.03, ease: 'none', stagger: 0.03 },
            0.53,
          )

          /* ── Breathing hold (0.06 — under the 0.08 stall threshold) ── */
          master.to({}, { duration: 0.06 }, 0.68)

          /* ── Dead end ── */
          master.set({}, {}, 0.8)

          /* ── ScrollTrigger ── */
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
    <div ref={sceneRef} className='relative h-screen w-full overflow-hidden bg-surface-dark'>
      {/* ── Section header — left-aligned, parallaxes upward ── */}
      <div
        data-co='header'
        className='absolute inset-x-0 top-0 z-10 px-6 md:px-10 lg:px-24'
        style={{ willChange: 'transform' }}
      >
        <div className='flex flex-col items-start'>
          <Typography variant='overline' className='text-primary-500'>
            {content.eyebrow}
          </Typography>
          <Typography variant='h2' as='h2' className='mt-3 text-white' style={{ maxWidth: '22ch' }}>
            {content.title}
          </Typography>
          <Typography variant='body' className='mt-4 text-white/50' style={{ maxWidth: '36ch' }}>
            {content.description}
          </Typography>
          <Separator variant='accent' className='mt-6 w-12 bg-primary-500 opacity-50' />
        </div>
      </div>

      {/* ── Image stack — both fullscreen, stacked ── */}
      <div className='absolute inset-0'>
        {/* Cutaway (behind — fades in) */}
        <div data-co='cutaway' className='absolute inset-0 opacity-0'>
          <Image
            src={content.cutawayImage.src}
            alt={content.cutawayImage.alt}
            fill
            className='object-cover'
            sizes='100vw'
          />
        </div>
        {/* Exterior (in front — rises from bottom, then fades out) */}
        <div
          data-co='exterior'
          className='absolute inset-0'
          style={{ willChange: 'clip-path, opacity' }}
        >
          <Image
            src={content.exteriorImage.src}
            alt={content.exteriorImage.alt}
            fill
            className='object-cover'
            sizes='100vw'
            priority
          />
        </div>
      </div>

      {/* ── First text — starts at bottom, rises to top with image ── */}
      <Typography
        data-co='image-text'
        variant='h3'
        as='p'
        className='pointer-events-none absolute left-0 top-0 z-20 hidden px-6 pt-16 text-foreground/80 md:block md:px-10 lg:px-24'
        style={{ maxWidth: '55ch', willChange: 'transform, opacity' }}
      >
        Behind a beautiful terrace of four homes lies what makes them special
      </Typography>

      {/* ── Second text — same position, slides in at crossfade, stays on cutaway ── */}
      <Typography
        data-co='image-text-2'
        variant='h3'
        as='p'
        className='pointer-events-none absolute left-0 top-0 z-20 hidden px-6 pt-16 text-foreground/80 md:block md:px-10 lg:px-24'
        style={{ maxWidth: '40ch', willChange: 'transform, opacity' }}
      >
        The key components of the system include
      </Typography>

      {/* ── Cutaway description — right-aligned, text right ── */}
      <div className='pointer-events-none absolute right-0 top-0 z-20 hidden w-5/12 px-10 pt-16 lg:block lg:px-16'>
        <div className='flex flex-col items-end text-right'>
          <div className='flex flex-col gap-5'>
            {content.cutawayParagraphs.map((paragraph, i) => (
              <Typography
                key={i}
                data-co='cutaway-line'
                variant='body-sm'
                as='p'
                className='text-foreground/80'
                style={{ willChange: 'transform, opacity' }}
              >
                {paragraph}
              </Typography>
            ))}
          </div>
          {/*<Separator*/}
          {/*  data-co='cutaway-separator'*/}
          {/*  variant='accent'*/}
          {/*  className='mt-6 w-10 origin-right mr-auto bg-primary-500 opacity-50'*/}
          {/*  style={{ willChange: 'transform, opacity' }}*/}
          {/*/>*/}
          {/*<div*/}
          {/*  data-co='cutaway-text'*/}
          {/*  className='mt-4 mr-auto'*/}
          {/*  style={{ willChange: 'transform, opacity' }}*/}
          {/*>*/}
          {/*  <Typography variant='overline' className='text-primary-500'>*/}
          {/*    The key components of the system include*/}
          {/*  </Typography>*/}
          {/*</div>*/}
        </div>
      </div>

      {/* ── Annotation lines — CSS aspect-ratio wrapper matches object-cover crop.
           `right` uses calc() so labels always align 1.5rem from viewport edge,
           regardless of how wide the inner wrapper is. ── */}
      <div
        className='pointer-events-none absolute inset-0 z-20 hidden overflow-hidden lg:block'
        aria-hidden='true'
      >
        <div
          className='absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2'
          style={{ aspectRatio: '4960 / 2730' }}
        >
          {content.annotations.map((a) => {
            const yPct = (a.anchorY / 2730) * 100
            const leftPct = (a.anchorX / 4960) * 100
            return (
              <div
                key={a.number}
                data-co='annotation-group'
                className='absolute flex items-center opacity-0'
                style={{
                  top: `${yPct}%`,
                  left: `${leftPct}%`,
                  right: 'max(4rem, calc((100vh * 4960 / 2730 - 100vw) / 2 + 4rem))',
                  transform: 'translateY(-50%)',
                }}
              >
                {/* horizontal line — fills available space */}
                <div className='min-w-0 grow' style={{ height: 1, backgroundColor: a.color }} />
                {/* label */}
                <Typography
                  variant='overline'
                  className='ml-3 shrink-0 whitespace-nowrap'
                  style={{ color: a.color }}
                >
                  {a.number} / {a.label.toUpperCase()}
                </Typography>
                {/* colored indicator square */}
                <div
                  className='ml-3 shrink-0 rounded-full'
                  style={{ width: 12, height: 12, backgroundColor: a.color }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Mobile fallback: static layout ── */}
      <div className='relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20 md:hidden'>
        <Typography variant='overline' className='text-primary-500'>
          {content.eyebrow}
        </Typography>
        <Typography variant='h2' as='h2' className='mt-3 text-center text-white'>
          {content.title}
        </Typography>
        <Typography variant='body' className='mt-4 text-center text-white/50'>
          {content.description}
        </Typography>
        <div className='relative mt-10 aspect-video w-full'>
          <Image
            src={content.cutawayImage.src}
            alt={content.cutawayImage.alt}
            fill
            className='object-contain'
            sizes='100vw'
          />
        </div>
      </div>
    </div>
  )
}
