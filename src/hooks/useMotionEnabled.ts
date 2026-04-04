'use client'

import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * Positive-logic reduced-motion hook.
 * Returns `true` when motion is enabled (user has NOT requested reduced motion).
 * Library-agnostic — works with any animation engine (Motion, GSAP, CSS).
 *
 * @example
 * const motionEnabled = useMotionEnabled()
 * if (!motionEnabled) return null // skip looping animation
 */
export const useMotionEnabled = (): boolean => !useMediaQuery('(prefers-reduced-motion: reduce)')
