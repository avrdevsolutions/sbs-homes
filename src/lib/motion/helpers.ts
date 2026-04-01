import type { ChannelMap, RangeConfig } from './types'

/**
 * Creates a RangeConfig for scroll-driven animations.
 *
 * @example
 * createMotionRange([0, 0.5, 1], [0, 1, 0])
 * // → { inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }
 */
export const createMotionRange = (inputRange: number[], outputRange: number[]): RangeConfig => ({
  inputRange,
  outputRange,
})

/* ─── Spring Presets ───────────────────────────────────────────── */

/** Reusable spring configs from ADR-0003 transition defaults. */
export const SPRING_PRESETS = {
  /** Smooth scroll-linked values — general purpose. */
  smooth: { stiffness: 120, damping: 20, mass: 0.35 },
  /** Quick interactive feedback — buttons, toggles. */
  snappy: { stiffness: 500, damping: 28, mass: 0.4 },
  /** Playful overshoot — cards, reveals. */
  bouncy: { stiffness: 300, damping: 15, mass: 0.5 },
  /** Weighted cinematic trailing — hero scenes, dramatic scroll reveals. */
  cinematic: { stiffness: 60, damping: 20, mass: 0.3 },
} as const

/* ─── Will-Change Helper ───────────────────────────────────────── */

const TRANSFORM_KEYS = new Set([
  'x',
  'y',
  'z',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'rotateX',
  'rotateY',
  'rotateZ',
  'skewX',
  'skewY',
])

/**
 * Computes the `will-change` CSS hint from channel keys.
 * Returns undefined when motion is disabled or no composited properties are used.
 */
export const buildWillChange = (
  channels: ChannelMap,
  motionEnabled: boolean,
): string | undefined => {
  if (!motionEnabled) return undefined

  const keys = Object.keys(channels)
  if (keys.length === 0) return undefined

  const parts: string[] = []
  if (keys.some((k) => TRANSFORM_KEYS.has(k))) parts.push('transform')
  if (keys.includes('opacity')) parts.push('opacity')

  return parts.length > 0 ? parts.join(', ') : undefined
}
