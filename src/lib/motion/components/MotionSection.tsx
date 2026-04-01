'use client'

import { type ReactNode, useRef } from 'react'

import { m, useScroll } from 'motion/react'

import { cn } from '@/lib/utils'

import { MotionSectionContext } from '../MotionSectionContext'

import type { ScrollOffset } from '../types'

type MotionSectionProps = {
  children: ReactNode
  /** Total scroll height of the section (e.g. "300vh"). */
  height: string
  /** Visible viewport container height (e.g. "100vh"). Defaults to "100vh". */
  containerHeight?: string
  /** Scroll offset configuration. Defaults to `['start start', 'end end']`. */
  offset?: ScrollOffset
  className?: string
}

/**
 * Scroll container that produces scrollYProgress and shares it with
 * MotionSectionItem children via context. Handles sticky positioning
 * and scroll tracking — layout is the consumer's job via className.
 */
export const MotionSection = ({
  children,
  height,
  containerHeight = '100vh',
  offset = ['start start', 'end end'],
  className,
}: MotionSectionProps) => {
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset,
  })

  return (
    <m.div ref={ref} className='relative' style={{ height }}>
      <div
        className={cn('sticky top-0 overflow-hidden', className)}
        style={{ height: containerHeight }}
      >
        <MotionSectionContext.Provider value={scrollYProgress}>
          {children}
        </MotionSectionContext.Provider>
      </div>
    </m.div>
  )
}

MotionSection.displayName = 'MotionSection'
