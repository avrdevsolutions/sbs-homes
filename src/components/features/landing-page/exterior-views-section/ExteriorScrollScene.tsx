'use client'

import { type ReactNode, useRef } from 'react'

import { m, type MotionValue, useScroll, useSpring, useTransform } from '@/lib/motion'

type ExteriorScrollSceneProps = {
  children: (progress: MotionValue<number>) => ReactNode
  /** Total scroll runway. Defaults to "500vh". */
  scrollHeight?: string
}

/** Tight scroll smoothing — eliminates jitter, near-zero perceived lag. */
const SCROLL_SMOOTH = { stiffness: 300, damping: 40, mass: 0.15 }

/** warm (#f5f3f0) → warm-alt (#edebe8) background transition at the end */
const BG_FROM = '#f5f3f0'
const BG_TO = '#edebe8'

/**
 * Full-viewport scroll scene — sticky h-screen container.
 * Background morphs warm→warm-alt in the last 15% of scroll.
 */
export const ExteriorScrollScene = ({
  children,
  scrollHeight = '500vh',
}: ExteriorScrollSceneProps) => {
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  const progress = useSpring(scrollYProgress, SCROLL_SMOOTH)
  const bgColor = useTransform(progress, [0, 0.85, 1], [BG_FROM, BG_FROM, BG_TO])

  return (
    <div ref={ref} className='relative' style={{ height: scrollHeight }}>
      <m.div
        className='sticky top-0 h-screen w-full overflow-hidden'
        style={{ backgroundColor: bgColor }}
      >
        {children(progress)}
      </m.div>
    </div>
  )
}
