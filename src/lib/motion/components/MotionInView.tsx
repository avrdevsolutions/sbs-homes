'use client'

import type { ReactNode } from 'react'

import { m, useReducedMotion } from 'motion/react'

import { cn } from '@/lib/utils'

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

type EasingName =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'circIn'
  | 'circOut'
  | 'circInOut'
  | 'backIn'
  | 'backOut'
  | 'backInOut'
  | 'anticipate'

type MotionInViewProps = {
  children: ReactNode
  /** Direction the element enters from. Defaults to `'up'`. */
  direction?: Direction
  /** Distance in pixels. Defaults to `24`. */
  distance?: number
  /** Delay in seconds. Defaults to `0`. */
  delay?: number
  /** Duration in seconds. Defaults to `0.6`. */
  duration?: number
  /** Easing name. Defaults to `'easeOut'`. */
  ease?: EasingName
  /** Fire-and-forget — animate only once. Defaults to `true`. */
  once?: boolean
  /** Opacity range [initial, final]. Defaults to `[0, 1]`. */
  opacityRange?: [number, number]
  /** Scale range [initial, final]. E.g. `[0.9, 1]` for a subtle scale-up reveal. */
  scaleRange?: [number, number]
  /** Viewport margin for triggering. Defaults to `'-10% 0px'`. */
  viewportMargin?: string
  className?: string
}

const directionOffset = (direction: Direction, distance: number): { x: number; y: number } => {
  switch (direction) {
    case 'up':
      return { x: 0, y: distance }
    case 'down':
      return { x: 0, y: -distance }
    case 'left':
      return { x: distance, y: 0 }
    case 'right':
      return { x: -distance, y: 0 }
    case 'none':
      return { x: 0, y: 0 }
  }
}

/**
 * Fire-and-forget viewport reveal.
 * Supports directional entrance (up/down/left/right/none), delay, duration, ease.
 * Automatically falls back to opacity-only under reduced motion.
 */
export const MotionInView = ({
  children,
  direction = 'up',
  distance = 24,
  delay = 0,
  duration = 0.6,
  ease = 'easeOut',
  once = true,
  opacityRange = [0, 1],
  scaleRange,
  viewportMargin = '-10% 0px',
  className,
}: MotionInViewProps) => {
  const prefersReduced = useReducedMotion()

  const { x: offsetX, y: offsetY } = directionOffset(direction, distance)

  const initial = prefersReduced
    ? { opacity: opacityRange[0] }
    : {
        opacity: opacityRange[0],
        x: offsetX,
        y: offsetY,
        ...(scaleRange ? { scale: scaleRange[0] } : {}),
      }

  const animate = prefersReduced
    ? { opacity: opacityRange[1] }
    : {
        opacity: opacityRange[1],
        x: 0,
        y: 0,
        ...(scaleRange ? { scale: scaleRange[1] } : {}),
      }

  return (
    <m.div
      className={cn(className)}
      initial={initial}
      whileInView={animate}
      viewport={{ once, margin: viewportMargin }}
      transition={{
        duration: prefersReduced ? duration * 0.5 : duration,
        delay,
        ease,
      }}
    >
      {children}
    </m.div>
  )
}

MotionInView.displayName = 'MotionInView'
