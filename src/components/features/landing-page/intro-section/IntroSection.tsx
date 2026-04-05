'use client'

import { motion } from 'motion/react'

import { Section, Separator, Typography } from '@/components/ui'
import type { IntroSectionContent } from '@/dictionaries/landing-page'
import { useMotionEnabled } from '@/hooks/useMotionEnabled'

/* ── Transition presets (module scope) ──────────────────────── */
const SMOOTH_SPRING = { type: 'spring' as const, stiffness: 120, damping: 20, mass: 0.35 }
const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

/* ── Variants (module scope) ────────────────────────────────── */
const contentStaggerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2, delayChildren: 0.25 },
  },
}

const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SMOOTH_SPRING,
  },
}

const lineDrawVariants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.8, ease: EXPO_OUT },
  },
}

type IntroSectionProps = {
  content: IntroSectionContent
}

export const IntroSection = ({ content }: IntroSectionProps) => {
  const motionEnabled = useMotionEnabled()

  return (
    <Section
      id={content.id}
      spacing='none'
      background='warm'
      className='relative flex min-h-dvh items-center justify-center overflow-hidden text-center'
    >
      {/* Background word — ambient scale-in */}
      <motion.span
        initial={motionEnabled ? { opacity: 0, scale: 0.85 } : false}
        whileInView={{ opacity: 0.035, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.4, ease: EXPO_OUT }}
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 flex items-center justify-center font-display uppercase text-foreground'
        style={{
          fontSize: '16vw',
          letterSpacing: '0.1em',
          willChange: motionEnabled ? 'transform, opacity' : undefined,
        }}
      >
        {content.backgroundWord}
      </motion.span>

      {/* Content — staggered fade-up with line draw */}
      <motion.div
        variants={contentStaggerVariants}
        initial={motionEnabled ? 'hidden' : false}
        whileInView='visible'
        viewport={{ once: true, amount: 0.5 }}
        className='relative z-10'
      >
        <motion.div variants={fadeUpVariants}>
          <Typography variant='section-number' as='p' className='mb-8 text-primary-600'>
            {content.sectionNumber}
          </Typography>
        </motion.div>
        <motion.div variants={fadeUpVariants}>
          <Typography variant='h1' as='h2' className='mx-auto' style={{ maxWidth: '16ch' }}>
            {content.title}
          </Typography>
        </motion.div>
        <motion.div variants={fadeUpVariants}>
          <Typography
            variant='body'
            className='mx-auto mt-6 text-secondary-600'
            style={{ maxWidth: '42ch' }}
          >
            {content.description}
          </Typography>
        </motion.div>
        <motion.div
          variants={lineDrawVariants}
          className='mx-auto mt-8 w-14'
          style={{ willChange: motionEnabled ? 'transform' : undefined }}
        >
          <Separator variant='accent' className='bg-primary-600 opacity-50' />
        </motion.div>
      </motion.div>
    </Section>
  )
}
