'use client'

import { createContext } from 'react'

import type { MotionValue } from 'motion/react'

/**
 * Shares scrollYProgress from a MotionSection to its MotionSectionItem children.
 * Null when no parent MotionSection exists.
 */
export const MotionSectionContext = createContext<MotionValue<number> | null>(null)
