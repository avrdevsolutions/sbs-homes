'use client'

import { useState } from 'react'

import Image from 'next/image'

import { AnimatePresence, motion } from 'motion/react'

import type { FloorPlanTab } from '@/dictionaries/landing-page'
import { useMotionEnabled } from '@/hooks/useMotionEnabled'
import { cn } from '@/lib/utils'

import { FloorPlanLightbox } from './FloorPlanLightbox'

const tabVariantsFull = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const tabVariantsReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

type FloorPlanTabsProps = {
  tabs: FloorPlanTab[]
}

export const FloorPlanTabs = ({ tabs }: FloorPlanTabsProps) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const motionEnabled = useMotionEnabled()
  const variants = motionEnabled ? tabVariantsFull : tabVariantsReduced

  return (
    <div>
      <div
        role='radiogroup'
        aria-label='Floor plan level'
        className='mb-8 flex gap-0 border border-foreground/10'
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            type='button'
            role='radio'
            aria-checked={activeIndex === index}
            onClick={() => setActiveIndex(index)}
            className={cn(
              'flex-1 px-4 py-3 font-display text-button uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:px-6',
              activeIndex === index
                ? 'bg-foreground text-background'
                : 'bg-transparent text-foreground/60 hover:text-foreground/80',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div aria-live='polite' className='relative overflow-hidden'>
        <AnimatePresence mode='wait'>
          <motion.div
            key={activeIndex}
            variants={variants}
            initial='hidden'
            animate='visible'
            exit='exit'
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className='relative w-full'
            style={{ aspectRatio: '3971 / 2533' }}
          >
            <FloorPlanLightbox tabs={tabs} slideIndex={activeIndex}>
              <Image
                src={tabs[activeIndex].image.src}
                alt={tabs[activeIndex].image.alt}
                fill
                className='object-contain'
                priority={activeIndex === 0}
                unoptimized
              />
            </FloorPlanLightbox>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
