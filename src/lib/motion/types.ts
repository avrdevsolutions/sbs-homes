import type {
  TargetAndTransition,
  UseScrollOptions,
  VariantLabels,
  Variants,
} from 'motion/react'

/* ─── Range Config ─────────────────────────────────────────────── */

/**
 * Maps an input range (progress 0→1) to an output range of numeric CSS values.
 * Used as the value type in ChannelMap.
 */
export type RangeConfig = {
  inputRange: number[]
  outputRange: number[]
}

/* ─── Channel Map ──────────────────────────────────────────────── */

/**
 * Dynamic animation channel map.
 * Keys are CSS property names (opacity, x, y, scale, rotate, borderRadius, etc.).
 * Values are RangeConfig objects mapping scroll progress to output values.
 *
 * @example
 * {
 *   opacity: { inputRange: [0, 0.5], outputRange: [0, 1] },
 *   y: { inputRange: [0, 1], outputRange: [50, -50] },
 *   rotate: { inputRange: [0, 1], outputRange: [0, 15] },
 * }
 */
export type ChannelMap = Record<string, RangeConfig>

/* ─── Scroll Offset ────────────────────────────────────────────── */

/** FM's ScrollOffset type — use this for offset props. */
export type ScrollOffset = UseScrollOptions['offset']

/* ─── Spring Config ────────────────────────────────────────────── */

export type SpringConfig = {
  stiffness?: number
  damping?: number
  mass?: number
}

/* ─── Motion Interaction Props ─────────────────────────────────── */

/** Framer Motion interaction props passable to MotionBox. */
export type MotionInteractionProps = {
  whileHover?: TargetAndTransition | VariantLabels
  whileTap?: TargetAndTransition | VariantLabels
  whileFocus?: TargetAndTransition | VariantLabels
  animate?: TargetAndTransition | VariantLabels | boolean
  initial?: TargetAndTransition | VariantLabels | boolean
  exit?: TargetAndTransition | VariantLabels
  variants?: Variants
  transition?: TargetAndTransition['transition']
}
