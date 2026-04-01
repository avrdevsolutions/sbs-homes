'use client'

import { useReducedMotion } from 'motion/react'

/**
 * Positive-logic reduced-motion hook.
 * Returns `true` when motion is enabled (user has NOT requested reduced motion).
 *
 * @example
 * const motionEnabled = useMotionEnabled()
 * if (!motionEnabled) return null // skip looping animation
 */
export const useMotionEnabled = (): boolean => !useReducedMotion()
