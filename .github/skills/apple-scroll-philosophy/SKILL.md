---
name: apple-scroll-philosophy
description: >-
  Apple scroll animation philosophy and planning framework — Apple's design language for scroll pages (typography scale contrast, monochrome palette with exact hex values, whitespace philosophy, imagery rules), 4-layer technology stack decision table (CSS/GSAP/Canvas/WebGL with page share %), 5 observable animation principles (30% Rule, One Thing at a Time, Heavy Scroll Feel with scrub-to-product-personality mapping, Mobile is a Different Product, Static First), 7-Act storyboard structure with pin budgets and technique assignments per act. Use when analysing how Apple would approach a page, planning an Apple-style scroll narrative, building scroll-driven marketing sites inspired by apple.com, deciding which animation engine to use for each page section, or starting a cinematic product showcase from scratch.
---

# Apple Scroll — Philosophy & Planning Framework

**Compiled from**: ADR-0035 §1–3, §14, §18
**Last synced**: 2026-04-05

---

## 1. Apple's Design Language

### Typography

- Headlines: 80–120px desktop, SF Pro Display Semibold/Bold
- Supporting text: 21–28px, SF Pro Text Regular
- Almost always centered, on solid black or off-white backgrounds
- Scale contrast creates hierarchy — animation reinforces it, not creates it

### Color Palette

| Surface                  | Color     | Usage                             |
| ------------------------ | --------- | --------------------------------- |
| Dark hero background     | `#000000` | Premium reveals, canvas sequences |
| Dark section background  | `#1d1d1f` | Secondary dark sections           |
| Light section background | `#f5f5f7` | Feature details, specs            |
| White section background | `#fbfbfd` | CTA, pricing, comparison          |
| Dark text                | `#1d1d1f` | On light backgrounds              |
| Light text               | `#f5f5f7` | On dark backgrounds               |
| Muted text               | `#86868b` | Secondary/caption text            |

### Whitespace

- 80–200px vertical padding between sections
- Content occupies only 40–60% of viewport height within pinned sections
- Whitespace is load-bearing — it makes animations feel unhurried

### Imagery

- Products on seamless backgrounds (black or white), studio lighting
- No lifestyle shots during animated sections — product is the sole visual focus

---

## 2. Animation Technology Stack

| Layer | Tool                     | Coverage                                                         | Page Share     |
| ----- | ------------------------ | ---------------------------------------------------------------- | -------------- |
| 1     | CSS transforms + opacity | Fade-ins, slides, parallax — GPU-composited, zero JS             | ~60% of motion |
| 2     | GSAP + ScrollTrigger     | Pinned sections, staggered timelines, scrubbed sequences         | ~30% of motion |
| 3     | Canvas frame sequences   | Product rotation/turntable via pre-rendered frames on `<canvas>` | ~8% of motion  |
| 4     | WebGL / Three.js / USDZ  | Real-time 3D model manipulation (Vision Pro, recent iPhone)      | ~2% of motion  |

Layers 1 and 2 are the primary tools for this project. Layer 3 (canvas) is Pattern 04 in companion skill `apple-scroll-patterns`. Layer 4 (WebGL) is out of scope unless explicitly requested.

---

## 3. Five Observable Animation Principles

### 3.1 The 30% Rule

On any pinned section, animation occupies at most 30–50% of total scroll distance. The rest is dead space. iPhone hero sections pin for 4–5× viewport height but only animate in the middle third.

Dead space at start (~15%) gives the brain time to register the section. Dead space at end (~20%) lets the user process what they saw. Removing either makes the page feel frantic.

### 3.2 One Thing at a Time

Never animate two elements simultaneously. Every element enters on its own scroll beat. Minimum 15–20% timeline gaps between elements.

Simultaneous animation is noise. Sequential animation is narrative. Stagger controls reading order: headline → image → body → CTA.

### 3.3 Heavy Scroll Feel

Use numeric `scrub` smoothing (0.5–1.0s). Fast scrolling doesn't make animations race — they "catch up" with weight. Absorbs noisy trackpad/touch input and makes products feel substantial.

| Product Personality | `scrub` | Feel                        |
| ------------------- | ------- | --------------------------- |
| AirPods Pro         | `0.5`   | Light, airy, floating       |
| Vision Pro          | `0.6`   | Futuristic, effortless      |
| iPhone              | `0.8`   | Solid, grounded, precise    |
| Mac Pro             | `1.0`   | Heavy, powerful, monolithic |

### 3.4 Mobile is a Different Product

Ship entirely separate animation configs for mobile via `gsap.matchMedia()`. This is not responsive design — it's a separate animation architecture. Less pinning, shorter distances, simplified sequences, often static images replacing canvas sequences.

### 3.5 Static First, Motion Second

Every section is a complete, readable layout without JavaScript. Text is already in the DOM and visible. Canvas sequences have a static first-frame `<img>` fallback. Animation is progressive enhancement, never a gate.

---

## 4. Scroll Narrative Storyboard

Plan the full page before writing any animation code. Each section has a narrative role.

### 4.1 Act Structure

| Act                   | Role                                | Technique                                                             | Pin Budget  |
| --------------------- | ----------------------------------- | --------------------------------------------------------------------- | ----------- |
| Act 1: Hero Reveal    | First impression — product identity | Canvas sequence (Pattern 04) or Scale-in + Dead Space (Pattern 01)    | `400–500vh` |
| Act 2: Key Feature A  | Primary selling point               | Staggered Choreography (Pattern 02) + Kinetic Typography (Pattern 07) | `300vh`     |
| Act 3: Key Feature B  | Supporting feature                  | Parallax (Pattern 05) + Text fade-in (Pattern 07)                     | No pin      |
| Act 4: Tech Deep-Dive | Technical credibility               | Canvas sequence (Pattern 04) or Reveal Mask (Pattern 06)              | `250vh`     |
| Act 5: Color Options  | Personalization                     | Snap Points (Pattern 08) or horizontal scroll                         | Optional    |
| Act 6: Specs          | Detail for decision-makers          | No pin, simple fade-in on viewport entry                              | None        |
| Act 7: CTA            | Conversion                          | Sticky pricing bar + final product shot                               | None        |

### 4.2 Budget Rules

- Hero: 400–500vh — earns the most scroll attention
- Supporting features: 200–300vh
- Specs: no pin — users want to scan, not wait
- Complex scroll scenes per page: 1–2 maximum
- Rest of page: simple viewport reveals (`once: true` ScrollTriggers or CSS)
- Total pin distance: cap at `800vh` per section

---

## 5. Scope Boundary

| This Skill / ADR-0035 Covers                                          | Covered Elsewhere                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Apple-style compositional philosophy (dead space, stagger, narrative) | GSAP API, ScrollTrigger config, `useGSAP()` (GSAP skills)           |
| Canvas frame sequences (Pattern 04)                                   | Video scrubbing, horizontal scroll, number counters (GSAP skills)   |
| Scrub-as-brand-personality mapping                                    | Scrub value reference table (GSAP ScrollTrigger skill)              |
| Composite multi-pattern examples                                      | React lifecycle/mount animations (Motion skills)                    |
| Scroll narrative storyboard planning                                  | CSS scroll-driven single-element effects (CSS scroll-driven skills) |
| Apple-specific color palette and transition philosophy                | Token system and project palette (styling-tokens skill)             |

See companion skill `apple-scroll-patterns` for Pattern 01–05 implementations and `apple-scroll-composition` for Pattern 06–08, production checklist, and Next.js integration.
