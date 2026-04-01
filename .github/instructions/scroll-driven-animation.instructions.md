---
description: 'Scroll-driven animation technique constraints — mandatory spring smoothing, scroll budget, mobile fallback, GPU layer budget, technique catalog. Scoped to motion system and component files.'
applyTo: 'src/lib/motion/**/*.{ts,tsx}, src/components/**/*.{ts,tsx}'
---

# Scroll-Driven Animation Technique Constraints

**Compiled from**: ADR-0030

## Scene Setup

- SHOULD use `MotionSection` for multi-element sticky scenes; `MotionBox` for self-contained scroll boxes
- When the scene requires per-element spring configs or manual scroll plumbing that `MotionSection`/`useMotionAnimation` don't support, build the sticky-pinned structure manually using `useScroll` + `useSpring` + `useTransform` from `@/lib/motion` — this is expected, not a workaround
- MUST calculate scroll height from the scroll budget formula — never guess section heights
- MUST NOT set scroll height below 100vh per animated item — animation feels rushed
- MUST NOT exceed 800vh total section height — user fatigue
- SHOULD limit a page to 1–2 hero scroll-driven scenes; use `MotionInView` for the rest

### MotionSection vs Manual — Decision Tree

```
Can all children share one scrollYProgress and one spring config?
├── YES → MotionSection + MotionSectionItem
│         (simplest path — channels on each item, shared smooth)
├── MOSTLY, but 1-2 children need different springs
│   → MotionSection for the shared ones, manual useSpring for outliers
│     (get scrollYProgress from MotionSectionContext)
└── NO — scene needs multi-phase progress subdivision, multiple scroll
    sources, or per-element custom springs
    → Build sticky-pinned structure manually (useScroll + useSpring + useTransform)
      See skill scroll-scene-foundations §1 "Manual implementation"
```

### Dimension Strategy

- **Static layout dimensions** → use Tailwind tokens (spacing, maxWidth, etc.)
- **Viewport-dependent scroll-scene dimensions** → use inline `style={}` (card widths in vw, section heights in vh, computed transform values)
- **DOM-dependent dimensions** (unknown until rendered) → use `useRef` + measurement on mount/resize. `useState` for storing measured dimensions is fine — this is not "useState from scroll"

## Spring Smoothing

- MUST apply spring smoothing to all scroll-linked MotionValues — raw scroll feels mechanical, not Apple-quality
- MUST use `SPRING_PRESETS.smooth` as default; `snappy` for progress indicators; custom heavy for dramatic reveals
- MUST NOT leave any scroll-driven `useTransform` or `useMotionAnimation` output unsmoothed

### Spring Budget Counting

Each `useSpring()` call = 1 spring. `useMotionAnimation` with `smooth` = 1 spring internally (it smooths the progress source, not each channel separately). Channel count does NOT multiply springs. Budget: ≤ 12 springs per scene.

## Mobile & Reduced Motion

- MUST provide a mobile fallback for every scroll-driven scene (see skill `scroll-scene-foundations`)
- SHOULD disable complex scroll scenes below the `md` breakpoint (768px)
- SHOULD use `MotionInView` vertical stacks as the standard mobile fallback
- MUST collapse to static layout under `prefers-reduced-motion: reduce`

## Performance

- SHOULD keep per-scene GPU layer count ≤ 8 elements with active `willChange`
- SHOULD keep per-scene active `useSpring` instances ≤ 12
- SHOULD keep per-scene `useMotionValueEvent` subscriptions ≤ 4
- MUST NOT animate `width`, `height`, `margin`, or `padding` in scroll-driven channels
- SHOULD prefer `useTransform` chains over `useMotionValueEvent` callbacks for derived values
- SHOULD test scroll scenes at 4× CPU throttle in Chrome DevTools

## Extending `src/lib/motion/`

- MAY create new hooks, helpers, or components inside `src/lib/motion/` when existing ones don't cover the scene's needs
- New files MUST follow the same conventions as existing ones: `'use client'`, `displayName`, types in `types.ts`, re-export from `index.ts`
- Common reasons to extend: per-channel spring configs, scene-specific progress subdivision helpers, composite scroll hooks that combine multiple techniques

## Technique Catalog

- Technique implementations MUST follow patterns in ADR-0030 — see skills `scroll-scene-techniques`, `scroll-content-animations`, `scroll-choreography`
- Combining 2–3 catalog techniques into a single scene is expected and encouraged (see ADR-0030 §17 combining table) — this is composition, not invention
- MUST NOT invent fundamentally new scroll-driven primitives (new scroll data sources, new smoothing strategies) outside the ADR-0030 catalog without CTO approval
