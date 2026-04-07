'use client'

import { useRef } from 'react'

import Image from 'next/image'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { Container, Separator, Stack, Typography } from '@/components/ui'
import type { AssemblyStep } from '@/dictionaries/landing-page'
import { cn } from '@/lib/utils'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/* ── Constants ──────────────────────────────────────────────── */
const BG_START = '#141416'

type AssemblyScrollSceneProps = {
  steps: AssemblyStep[]
  eyebrow: string
  title: string
  description: string
}

export const AssemblyScrollScene = ({
  steps,
  eyebrow,
  title,
  description,
}: AssemblyScrollSceneProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const totalSteps = steps.length

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add(
        {
          animate: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduceMotion } = context.conditions!

          if (reduceMotion) {
            gsap.set('.assembly-image', { opacity: 1 })
            gsap.set('.assembly-step-text', { opacity: 0 })
            gsap.set(`.assembly-step-text[data-step="${totalSteps - 1}"]`, { opacity: 1, y: 0 })
            gsap.set('.assembly-progress-fill', { scaleX: 1 })
            return
          }

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top top',
              end: `+=${totalSteps * 100}%`,
              pin: true,
              scrub: 1.5,
              anticipatePin: 1,
            },
          })

          /* Fade in first step text (image already visible) */
          tl.addLabel('step0')
          tl.to(
            '.assembly-step-text[data-step="0"]',
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: 'power2.out',
            },
            'step0',
          )
          tl.set(
            '.assembly-step-counter',
            {
              textContent: `Step 1 of ${totalSteps}`,
            },
            'step0',
          )

          /* Hold on step 0 */
          tl.to({}, { duration: 0.5 })

          /* Steps 1–N: reveal image, swap text, update progress */
          for (let i = 1; i < totalSteps; i++) {
            const label = `step${i}`
            tl.addLabel(label)

            /* Fade in this image layer with subtle scale */
            tl.fromTo(
              `.assembly-image[data-step="${i}"]`,
              { opacity: 0, scale: 1.04 },
              {
                opacity: 1,
                scale: 1,
                duration: 1,
                ease: 'power2.out',
              },
              label,
            )

            /* Crossfade text — fade out overlaps with fade in */
            tl.to(
              `.assembly-step-text[data-step="${i - 1}"]`,
              {
                opacity: 0,
                y: -12,
                duration: 0.4,
                ease: 'power2.in',
              },
              label,
            )
            tl.to(
              `.assembly-step-text[data-step="${i}"]`,
              {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: 'power2.out',
              },
              `${label}+=0.15`,
            )

            /* Update progress */
            tl.to(
              `.assembly-progress-fill[data-step="${i}"]`,
              {
                scaleX: 1,
                duration: 0.5,
                ease: 'power1.out',
              },
              label,
            )
            tl.set(
              '.assembly-step-counter',
              {
                textContent: `Step ${i + 1} of ${totalSteps}`,
              },
              label,
            )

            /* Background morph */
            const t = i / (totalSteps - 1)
            const r = Math.round(20 + t * (28 - 20))
            const g = Math.round(20 + t * (28 - 20))
            const b = Math.round(22 + t * (30 - 22))
            tl.to(
              '.assembly-scene',
              {
                backgroundColor: `rgb(${r}, ${g}, ${b})`,
                duration: 1,
                ease: 'power1.inOut',
              },
              label,
            )

            /* Hold before next step */
            tl.to({}, { duration: 0.5 })
          }
        },
      )
    },
    { scope: containerRef },
  )

  return (
    <div ref={containerRef}>
      <div
        className='assembly-scene flex h-dvh flex-col overflow-hidden'
        style={{ backgroundColor: BG_START }}
      >
        {/* Section header */}
        <div className='assembly-header pointer-events-none absolute left-0 top-0 z-20 w-full pt-12 md:pt-20'>
          <Container size='xl'>
            <Stack gap='6'>
              <Typography variant='overline' className='text-primary-600'>
                {eyebrow}
              </Typography>
              <Typography variant='h2' as='h2' className='text-white' style={{ maxWidth: '22ch' }}>
                {title}
              </Typography>
              <Typography
                variant='body'
                className='text-white'
                style={{ maxWidth: '36ch', opacity: 0.5 }}
              >
                {description}
              </Typography>
              <Separator variant='accent' className='w-12 bg-primary-600 opacity-50' />
            </Stack>
          </Container>
        </div>

        {/* Main content area */}
        <div className='flex flex-1 items-center'>
          <Container size='xl'>
            <div className='flex flex-col items-center md:relative md:grid md:grid-cols-12 md:items-center md:gap-8'>
              {/* Image stack */}
              <div className='w-3/5 shrink-0 md:col-span-6 md:col-start-4 md:w-auto'>
                <div className='relative aspect-square'>
                  {steps.map((step, i) => (
                    <div
                      key={step.name}
                      className={cn('assembly-image absolute inset-0', i === 0 && 'relative')}
                      data-step={i}
                      style={{ opacity: i === 0 ? 1 : 0 }}
                    >
                      <Image
                        src={step.image.src}
                        alt={step.image.alt}
                        width={step.image.width}
                        height={step.image.height}
                        className='size-full object-contain'
                        priority={i === 0}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Text overlays — centered below image on mobile, alternating sides on desktop */}
              <div className='relative mt-6 h-32 w-full md:absolute md:inset-0 md:mt-0 md:grid md:h-auto md:grid-cols-12 md:items-center md:gap-8'>
                {steps.map((step, i) => {
                  const isLeft = i % 2 === 0
                  return (
                    <div
                      key={step.name}
                      className={cn(
                        'assembly-step-text absolute',
                        'inset-x-0 top-0 px-6 text-center',
                        'md:inset-auto md:row-start-1 md:self-center md:px-0 md:text-left',
                        isLeft ? 'md:col-span-3 md:col-start-1' : 'md:col-span-3 md:col-start-10',
                      )}
                      data-step={i}
                      style={{ opacity: 0, transform: 'translateY(20px)' }}
                    >
                      <Typography variant='overline' className='mb-2 text-primary-600'>
                        {String(i + 1).padStart(2, '0')}
                      </Typography>
                      <Typography variant='h4' as='h3' className='mb-2 text-white'>
                        {step.name}
                      </Typography>
                      <Typography variant='body-sm' className='text-white' style={{ opacity: 0.5 }}>
                        {step.description}
                      </Typography>
                    </div>
                  )
                })}
              </div>
            </div>
          </Container>
        </div>

        {/* Progress indicator */}
        <div className='pb-8'>
          <Container size='xl'>
            <div className='flex items-center gap-4'>
              <div className='flex gap-1.5 md:gap-2' role='img' aria-label='Assembly progress'>
                {steps.map((step, i) => (
                  <div
                    key={step.name}
                    className='relative h-1 w-6 overflow-hidden rounded-full md:w-8'
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <div
                      className='assembly-progress-fill absolute inset-0 rounded-full'
                      data-step={i}
                      style={{
                        backgroundColor: '#d4740e',
                        transformOrigin: 'left center',
                        transform: i === 0 ? 'scaleX(1)' : 'scaleX(0)',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div aria-live='polite' aria-atomic='true'>
                <span
                  className='assembly-step-counter font-body text-xs uppercase tracking-widest'
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Step 1 of {totalSteps}
                </span>
              </div>
            </div>
          </Container>
        </div>
      </div>
    </div>
  )
}
