---
name: frontend-design-conventions
description: >-
  CSS-level design system conventions — token palette in :root, shared .type-* typography
  classes, .btn-* button patterns, section color context, separator classes, spacing
  rhythm, container width. Use when structuring CSS for internal consistency, defining
  shared classes, or building the token layer of a mockup.
---

# Design System Conventions — CSS-Level Patterns

**Compiled from**: CEO/CTO design system brief
**Last synced**: 2026-03-11

---

> These conventions teach structural discipline for HTML+CSS mockups. They do NOT restrict font choices, colors, layouts, density, or creative direction. They require **internal consistency** — the same choice, repeated precisely, not drifting between similar-but-different values. This is how Apple, Stripe, and every world-class team structures CSS — it's textbook, not limiting.

## 1. Token Palette in `:root`

Every mockup MUST declare ALL colors and fonts in a single `:root` CSS custom properties block. No stray hex/rgb values anywhere in section CSS — every color reference uses `var(--color-*)`, every font reference uses `var(--font-*)`.

### Required Semantic Token Names

Name tokens by their **role**, not their visual value:

```css
:root {
  /* Action colors */
  --color-primary: #...;
  --color-primary-dark: #...;
  --color-primary-light: #...;

  /* Surfaces */
  --color-background: #...;
  --color-background-alt: #...;
  /* Additional surfaces get their own names: */
  --color-surface-cream: #...;
  --color-surface-warm: #...;
  --color-surface-charcoal: #...;

  /* Text hierarchy */
  --color-foreground: #...;
  --color-foreground-muted: #...;
  --color-white: #fff;

  /* Structure */
  --color-border: #...;

  /* Fonts */
  --font-display: 'Font Name', serif;
  --font-body: 'Font Name', sans-serif;
}
```

The designer picks the palette — any colors, any mood, any number of surfaces. The naming tells implementation what each color **means**. Additional tokens are encouraged — use more if the design needs them, but always `:root`-centralized and semantically named.

---

## 2. Typography: Think in Roles, Not Sizes

Design with a limited set of text roles. Aim for **5–8 distinct text styles** across the entire mockup. More is fine if genuinely needed — the point is not a limit but a conscious inventory.

### Shared Typography Classes

Define `.type-*` CSS classes at the top of the stylesheet (after `:root`) and reuse them across all component sections:

```css
/* Structure only — NO color in .type-* classes */
.type-display {
  font-family: var(--font-display);
  font-size: 2.75rem;
  font-weight: 400;
  line-height: 1.1;
}
.type-heading {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 400;
  line-height: 1.3;
}
.type-eyebrow {
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.3em;
  text-transform: uppercase;
}
.type-body {
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.7;
}
.type-small {
  font-size: 0.8125rem;
  line-height: 1.5;
}
.type-detail {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
```

### Color Comes from Section Context

**CRITICAL**: `.type-*` classes define structure only — size, weight, tracking, line-height, text-transform. Never font color.

Color comes from the section element:

```css
.hero {
  color: var(--color-foreground);
} /* light section — dark text */
.cta-dark {
  color: var(--color-white);
} /* dark section — light text */
```

The same `.type-eyebrow` appears on both light and dark sections. On a light section it gets the foreground color; on a dark/overlay section it gets white. No `.type-eyebrow-dark` — the structure is identical, only the context changes.

### Responsive Consistency

When a text role uses responsive breakpoints, **all roles at the same tier should use the same stop count**. If `.type-display` uses 3 stops (mobile → tablet → desktop), then `.type-heading` also uses 3 stops. This isn't mandatory for every role — smaller roles like `.type-small` may not need breakpoints — but maintain consistency within tiers.

```css
/* Consistent 3-stop responsive scale */
.type-display {
  font-size: 2rem;
}
.type-heading {
  font-size: 1.25rem;
}

@media (min-width: 768px) {
  .type-display {
    font-size: 2.5rem;
  }
  .type-heading {
    font-size: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .type-display {
    font-size: 3.5rem;
  }
  .type-heading {
    font-size: 2rem;
  }
}
```

---

## 3. Button Patterns as Shared Classes

Define **2–3 button/CTA patterns** as shared classes, not one-offs per section:

```css
/* Button system — reused everywhere */
.btn-primary {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: var(--color-white);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  padding: 0;
  background: transparent;
  color: inherit;
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
}

.btn-input {
  /* Form submit — matches input field height */
  height: 3rem;
  padding: 0 1.5rem;
  /* ... rest of styles */
}
```

The same CTA style in the hero and the same CTA style in the footer MUST use the same class. If a CTA is just text with a decorative line (no box), that's its own pattern — define it once as `.btn-ghost` or `.btn-text`, then reuse it.

---

## 4. Color Context for Dark/Overlay Sections

When a section has a dark background, image overlay, or primary-colored background:

1. **Set `color` on the section element** to flip all child text
2. **Use the same `.type-*` classes** — structure doesn't change, only color
3. **Use lighter/transparent variants** for borders and separators

```css
/* Section-level color context — the ONLY place color flipping happens */
.hero {
  color: var(--color-foreground);
}
.gallery-cta {
  color: var(--color-white);
  background: var(--color-primary-dark);
}
.footer-dark {
  color: var(--color-white);
  background: var(--color-surface-charcoal);
}
```

**NEVER** create `.type-heading-dark`, `.type-eyebrow-light`, or any color-variant typography class. The heading structure is the same everywhere — only the section's `color` property changes.

For muted text within a dark section, use inline opacity:

```css
.footer-dark .meta {
  opacity: 0.7;
}
/* or */
.hero-overlay .subtitle {
  color: rgba(255, 255, 255, 0.8);
}
```

---

## 5. Separator as a Conscious Element

If dividers appear in the mockup, define shared separator classes:

```css
.divider {
  height: 1px;
  background: var(--color-border);
}
.divider--primary {
  background: var(--color-primary);
  opacity: 0.2;
}
.divider--light {
  background: rgba(255, 255, 255, 0.15);
}
.divider--thick {
  height: 3px;
}
```

Don't scatter `border-top: 1px solid #ccc` as inline styles per section. A divider is a design element — define it once, reuse it.

---

## 6. Spacing Rhythm + Container Width

### Section Padding Tiers

Use **2–3 section padding tiers** consistently. Same padding choice = same values every time, no drift:

```css
/* Define these once, use them by name across the mockup */
.section-hero {
  padding: 5rem 0;
} /* largest — hero, major CTA */
.section-standard {
  padding: 4rem 0;
} /* most sections */
.section-compact {
  padding: 2rem 0;
} /* banners, minor CTAs */

@media (min-width: 1024px) {
  .section-hero {
    padding: 8rem 0;
  }
  .section-standard {
    padding: 6rem 0;
  }
  .section-compact {
    padding: 3rem 0;
  }
}
```

### Container Width

**One container `max-width`** across the project. Narrower exceptions (centered CTA, narrow form) should be marked clearly as intentional sub-containers, not drift:

```css
.container {
  max-width: 87.5rem;
  margin: 0 auto;
  padding: 0 1.5rem;
}
.container--narrow {
  max-width: 48rem;
} /* intentional: centered text blocks */

@media (min-width: 1024px) {
  .container {
    padding: 0 4rem;
  }
}
```

### Internal Spacing Consistency

Spacing within sections should settle into **recurring values**. If label-to-heading gap is `2.5rem` in one section, use `2.5rem` for the same label-to-heading relationship everywhere. Build a mental spacing scale and stick to it:

- **Tight**: 0.5–1rem (label to heading, icon to text)
- **Standard**: 1.5–2.5rem (heading to body, items in a list)
- **Loose**: 3–5rem (section groups, major content blocks)

---

## 7. What This Is NOT

**Explicit disclaimer**: these conventions do NOT restrict:

- **Font choices** — use any typeface, any pairing, any weight
- **Color palettes** — dark, light, vibrant, muted, monochrome, rainbow
- **Layout structures** — grids, asymmetry, overlap, single-column, magazine
- **Visual density** — minimal whitespace or maximalist layering
- **Creative direction** — brutalist, luxury, retro, editorial, playful, any style
- **Number of variants** — use as many typography roles, button styles, and separator types as the design genuinely needs

They ask for one thing: **internal consistency**. The same choice, repeated without drift. Named tokens instead of stray values. Shared classes instead of one-offs. A system behind the creativity — the way industry-leading teams operate.

A mockup with 12 typography roles, 5 button styles, and 8 color surfaces is perfectly fine — as long as each is defined once, named meaningfully, and reused precisely.
