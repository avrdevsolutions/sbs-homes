'use client'

import { type ReactNode, useRef } from 'react'

import { type MotionValue, m, useScroll } from 'motion/react'

import { cn } from '@/lib/utils'

import { buildWillChange } from '../helpers'
import { useMotionAnimation } from '../hooks/useMotionAnimation'
import { useMotionEnabled } from '../hooks/useMotionEnabled'

import type {
  ChannelMap,
  MotionInteractionProps,
  ScrollOffset,
  SpringConfig,
} from '../types'

type MotionBoxProps = MotionInteractionProps & {
  children: ReactNode
  /** Dynamic animation channels — keys are CSS properties, values are RangeConfigs. */
  channels?: ChannelMap
  /** Scroll offset. Defaults to `['start end', 'end start']`. */
  offset?: ScrollOffset
  /** External scrollYProgress to be driven by a parent instead of own useScroll. */
  scrollYProgress?: MotionValue<number>
  /** Optional spring smoothing for the scroll progress. */
  smooth?: SpringConfig
  className?: string
}

/**
 * Self-contained scroll animation box. Owns its own useScroll by default,
 * or accepts an external scrollYProgress from a parent.
 * Accepts any number of animation channels dynamically + FM interaction props.
 */
export const MotionBox = ({
  children,
  channels = {},
  offset = ['start end', 'end start'],
  scrollYProgress: externalProgress,
  smooth,
  className,
  whileHover,
  whileTap,
  whileFocus,
  animate,
  initial,
  exit,
  variants,
  transition,
}: MotionBoxProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const motionEnabled = useMotionEnabled()

  const { scrollYProgress: localProgress } = useScroll({
    target: ref,
    offset,
  })

  const progress = externalProgress ?? localProgress

  const values = useMotionAnimation(progress, channels, smooth ? { smooth } : undefined)
  const willChange = buildWillChange(channels, motionEnabled)

  return (
    <m.div
      ref={ref}
      className={cn(className)}
      style={{ ...(values as Record<string, unknown>), willChange } as React.CSSProperties}
      whileHover={whileHover}
      whileTap={whileTap}
      whileFocus={whileFocus}
      animate={animate}
      initial={initial}
      exit={exit}
      variants={variants}
      transition={transition}
    >
      {children}
    </m.div>
  )
}

MotionBox.displayName = 'MotionBox'
