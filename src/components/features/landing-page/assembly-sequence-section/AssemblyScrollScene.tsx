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
          isDesktop: '(min-width: 768px)',
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
              scrub: 1,
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
              duration: 0.5,
              ease: 'none',
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
          tl.to({}, { duration: 0.4 })

          /* Steps 1–N: reveal image, swap text, update progress */
          for (let i = 1; i < totalSteps; i++) {
            const label = `step${i}`
            tl.addLabel(label)

            /* Fade in this image layer */
            tl.to(
              `.assembly-image[data-step="${i}"]`,
              {
                opacity: 1,
                duration: 0.8,
                ease: 'none',
              },
              label,
            )

            /* Fade out previous text */
            tl.to(
              `.assembly-step-text[data-step="${i - 1}"]`,
              {
                opacity: 0,
                y: -10,
                duration: 0.3,
                ease: 'none',
              },
              label,
            )

            /* Fade in this text */
            tl.to(
              `.assembly-step-text[data-step="${i}"]`,
              {
                opacity: 1,
                y: 0,
                duration: 0.5,
                ease: 'none',
              },
              `${label}+=0.3`,
            )

            /* Update progress — animate the fill bar inside each segment */
            tl.to(
              `.assembly-progress-fill[data-step="${i}"]`,
              {
                scaleX: 1,
                duration: 0.4,
                ease: 'none',
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
                duration: 0.8,
                ease: 'none',
              },
              label,
            )

            /* Hold before next step */
            tl.to({}, { duration: 0.4 })
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
        <div className='assembly-header pointer-events-none absolute left-0 top-0 z-20 w-full pt-20'>
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
            <div className='relative grid grid-cols-12 items-center gap-8'>
              {/* Image stack — centered column */}
              <div className='col-span-6 col-start-4'>
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

              {/* Text overlays — alternating left / right */}
              {steps.map((step, i) => {
                const isLeft = i % 2 === 0
                return (
                  <div
                    key={step.name}
                    className={cn(
                      'assembly-step-text absolute row-start-1 self-center',
                      isLeft
                        ? 'col-span-3 col-start-1 text-left'
                        : 'col-span-3 col-start-10 text-left',
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
                    <Typography
                      variant='body-sm'
                      className='text-white'
                      style={{ opacity: 0.5, maxWidth: '24ch' }}
                    >
                      {step.description}
                    </Typography>
                  </div>
                )
              })}
            </div>
          </Container>
        </div>

        {/* Progress indicator */}
        <div className='pb-8'>
          <Container size='xl'>
            <div className='flex items-center gap-4'>
              <div className='flex gap-2' role='img' aria-label='Assembly progress'>
                {steps.map((step, i) => (
                  <div
                    key={step.name}
                    className='relative h-1 overflow-hidden rounded-full'
                    style={{ width: 32, backgroundColor: 'rgba(255,255,255,0.08)' }}
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
