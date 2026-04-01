'use client'

import { useRef } from 'react'

import { useScroll, useSpring, useTransform } from 'motion/react'

import { SPRING_PRESETS } from '../helpers'

import { useMotionEnabled } from './useMotionEnabled'

import type { ScrollOffset, SpringConfig } from '../types'


type UseParallaxOptions = {
  offset?: ScrollOffset
  /** Spring config for smoothing. Defaults to SPRING_PRESETS.smooth. */
  smooth?: SpringConfig
}

/**
 * One-liner parallax effect.
 *
 * @param speed - Pixel offset in each direction. Defaults to 50.
 * @returns `ref` to attach to the element and `style` with the y MotionValue.
 *
 * @example
 * const { ref, style } = useParallax(60)
 * <m.div ref={ref} style={style}>...</m.div>
 */
export const useParallax = (speed: number = 50, options?: UseParallaxOptions) => {
  const ref = useRef<HTMLDivElement>(null)
  const motionEnabled = useMotionEnabled()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: options?.offset ?? ['start end', 'end start'],
  })

  const rawY = useTransform(scrollYProgress, [0, 1], motionEnabled ? [speed, -speed] : [0, 0])

  const y = useSpring(rawY, options?.smooth ?? SPRING_PRESETS.smooth)

  return { ref, style: { y } }
}
