/**
 * Motion system — central re-export.
 *
 * All application code imports from `@/lib/motion`.
 * Never import `motion/react` directly outside this module.
 */

/* ─── Re-exports from motion/react ─────────────────────────────── */
export {
  AnimatePresence,
  m,
  motionValue,
  useAnimate,
  useAnimation,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTime,
  useTransform,
  useVelocity,
} from 'motion/react'

/* ─── Re-exported types from motion/react ──────────────────────── */
export type { MotionValue, Variants } from 'motion/react'

/* ─── Provider ─────────────────────────────────────────────────── */
export { MotionProvider } from './MotionProvider'

/* ─── Context ──────────────────────────────────────────────────── */
export { MotionSectionContext } from './MotionSectionContext'

/* ─── Types ────────────────────────────────────────────────────── */
export type {
  ChannelMap,
  MotionInteractionProps,
  RangeConfig,
  ScrollOffset,
  SpringConfig,
} from './types'

/* ─── Helpers ──────────────────────────────────────────────────── */
export { buildWillChange, createMotionRange, SPRING_PRESETS } from './helpers'

/* ─── Hooks ────────────────────────────────────────────────────── */
export { useMotionAnimation } from './hooks/useMotionAnimation'
export { useMotionEnabled } from './hooks/useMotionEnabled'
export { useParallax } from './hooks/useParallax'

/* ─── Components ───────────────────────────────────────────────── */
export { MotionBox } from './components/MotionBox'
export { MotionInView } from './components/MotionInView'
export { MotionSection } from './components/MotionSection'
export { MotionSectionItem } from './components/MotionSectionItem'
