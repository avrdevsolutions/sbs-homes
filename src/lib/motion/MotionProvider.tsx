'use client'

import type { ReactNode } from 'react'

import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'

type MotionProviderProps = {
  children: ReactNode
}

/**
 * Wraps the application with LazyMotion (domAnimation, strict) and MotionConfig.
 * Place in the site layout to enable motion across public-facing pages.
 *
 * - `domAnimation`: loads only needed features (~20kB vs ~60kB full)
 * - `strict`: throws runtime error if `motion.*` is used instead of `m.*`
 * - `reducedMotion="user"`: respects OS prefers-reduced-motion setting
 *
 * Note: Sanity Studio at /studio uses a separate layout (no MotionProvider)
 * to avoid conflicts with Studio's internal framer-motion usage.
 */
export const MotionProvider = ({ children }: MotionProviderProps) => (
  <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion='user'>{children}</MotionConfig>
  </LazyMotion>
)

MotionProvider.displayName = 'MotionProvider'
