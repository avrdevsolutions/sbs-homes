'use client'

import { type ReactNode, useRef } from 'react'

import { type MotionValue, useScroll, useSpring } from '@/lib/motion'

type ExteriorScrollSceneProps = {
  children: (progress: MotionValue<number>) => ReactNode
  /** Total scroll runway. Defaults to "400vh". */
  scrollHeight?: string
}

/** Tight scroll smoothing — eliminates jitter, near-zero perceived lag. */
const SCROLL_SMOOTH = { stiffness: 300, damping: 40, mass: 0.15 }

/**
 * Scroll scene — warm bg, sticky 100vh viewport.
 * Light spring smoothing for buttery tracking without lag.
 */
export const ExteriorScrollScene = ({
  children,
  scrollHeight = '400vh',
}: ExteriorScrollSceneProps) => {
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  const progress = useSpring(scrollYProgress, SCROLL_SMOOTH)

  return (
    <div ref={ref} className='relative' style={{ height: scrollHeight }}>
      <div className='sticky top-0 h-screen w-full overflow-hidden'>
        <div className='relative flex size-full flex-col justify-around py-20'>
          {children(progress)}
        </div>
      </div>
    </div>
  )
}
