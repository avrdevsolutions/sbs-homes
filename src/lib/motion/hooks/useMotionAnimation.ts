'use client'

import { useEffect, useRef } from 'react'

import { type MotionValue, motionValue, transform, useReducedMotion, useSpring } from 'motion/react'

import type { ChannelMap, SpringConfig } from '../types'

type MotionAnimationOptions = {
  /** Pipe progress through useSpring before interpolation. */
  smooth?: SpringConfig
}

/**
 * Creates dynamic scroll-driven MotionValues from a progress source.
 *
 * Channel keys are CSS property names — the return object maps each key
 * to a MotionValue that can be spread directly into `style`.
 *
 * Under reduced motion, values snap to the last outputRange entry (the "done" state).
 *
 * @example
 * const { scrollYProgress } = useScroll({ target: ref })
 * const { opacity, y, rotate } = useMotionAnimation(scrollYProgress, {
 *   opacity: createMotionRange([0, 0.5], [0, 1]),
 *   y: createMotionRange([0, 1], [50, -50]),
 *   rotate: createMotionRange([0, 1], [0, 15]),
 * }, { smooth: SPRING_PRESETS.smooth })
 */
export const useMotionAnimation = <T extends ChannelMap>(
  progress: MotionValue<number>,
  channels: T,
  options?: MotionAnimationOptions,
): { [K in keyof T]: MotionValue<number> } => {
  const prefersReduced = useReducedMotion()

  // Optional spring smoothing — called unconditionally for hook rules.
  // When smooth is not requested, springProgress is unused (negligible overhead).
  const springProgress = useSpring(progress, options?.smooth ?? { stiffness: 100, damping: 30 })
  const source = options?.smooth ? springProgress : progress

  // Imperative MotionValues — one per channel, stable across renders
  const valuesRef = useRef<Record<string, MotionValue<number>>>({})

  for (const key of Object.keys(channels)) {
    if (!valuesRef.current[key]) {
      valuesRef.current[key] = motionValue(channels[key].outputRange[0])
    }
  }

  // Refs for latest values (stale closure protection in the subscription)
  const channelsRef = useRef(channels)
  channelsRef.current = channels
  const reducedRef = useRef(prefersReduced)
  reducedRef.current = prefersReduced

  useEffect(() => {
    const unsubscribe = source.on('change', (latest: number) => {
      for (const [key, config] of Object.entries(channelsRef.current)) {
        const mv = valuesRef.current[key]
        if (!mv) continue

        if (reducedRef.current) {
          mv.set(config.outputRange[config.outputRange.length - 1])
        } else {
          mv.set(transform(latest, config.inputRange, config.outputRange))
        }
      }
    })

    return unsubscribe
  }, [source])

  return valuesRef.current as { [K in keyof T]: MotionValue<number> }
}
