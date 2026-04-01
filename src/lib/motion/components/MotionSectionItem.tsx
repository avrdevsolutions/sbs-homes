'use client'

import { type ReactNode, useContext } from 'react'

import { m, useMotionValue } from 'motion/react'

import { cn } from '@/lib/utils'

import { buildWillChange } from '../helpers'
import { useMotionAnimation } from '../hooks/useMotionAnimation'
import { useMotionEnabled } from '../hooks/useMotionEnabled'
import { MotionSectionContext } from '../MotionSectionContext'

import type { ChannelMap, SpringConfig } from '../types'

type MotionSectionItemProps = {
  children: ReactNode
  /** Dynamic animation channels — keys are CSS properties, values are RangeConfigs. */
  channels?: ChannelMap
  /** Optional spring smoothing for the scroll progress. */
  smooth?: SpringConfig
  className?: string
}

/**
 * Reads scrollYProgress from the nearest parent MotionSection via context.
 * Accepts any number of animation channels dynamically.
 * Warns in dev if used outside a MotionSection.
 */
export const MotionSectionItem = ({
  children,
  channels = {},
  smooth,
  className,
}: MotionSectionItemProps) => {
  const scrollYProgress = useContext(MotionSectionContext)
  const fallback = useMotionValue(0)
  const motionEnabled = useMotionEnabled()

  if (process.env.NODE_ENV !== 'production' && !scrollYProgress) {
    console.warn('MotionSectionItem must be used inside a MotionSection.')
  }

  const progress = scrollYProgress ?? fallback

  const values = useMotionAnimation(progress, channels, smooth ? { smooth } : undefined)
  const willChange = buildWillChange(channels, motionEnabled)

  if (!scrollYProgress) return <>{children}</>

  return (
    <m.div
      className={cn(className)}
      style={{ ...(values as Record<string, unknown>), willChange } as React.CSSProperties}
    >
      {children}
    </m.div>
  )
}

MotionSectionItem.displayName = 'MotionSectionItem'
