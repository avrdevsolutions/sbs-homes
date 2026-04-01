---
description: 'Non-deterministic writing rules for markdown — open-set list phrasing, example framing, source-of-truth references. Scoped to all markdown files.'
applyTo: '**/*.md'
---

# Documentation Writing Constraints

## No Deterministic Lists

When listing items from a set that may grow (primitives, tokens, variants, components, libraries, file types), NEVER write a closed list. Agents treat listed items as exhaustive.

- Use "e.g.," / "such as" / "for example" before items from a growable set
- Reference the source of truth file instead of enumerating current contents
- Anti-patterns: describe the CLASS of violation, not just specific instances

Bad — agent reads as closed set:
- "use Section, Container, Stack, Typography, Button, Badge, Separator"
- "No text-gray-, bg-slate-, border-zinc-"
- "Button has variants: primary, secondary, outline, ghost, danger, link"

Good — agent understands more may exist:
- "use primitives from the UI catalog (e.g., Section, Typography) before raw HTML"
- "no default Tailwind palette classes (e.g., text-gray-*, bg-slate-*) — project tokens only"
- "Button variants are defined in its manifest.json (e.g., primary, outline)"

## Examples Are Illustrations, Not Specifications

When showing code examples or anti-patterns, make clear these illustrate the PATTERN, not the complete set of cases.

- Frame examples with "for example," "such as," "common cases include"
- Add "and similar patterns" or "among others" when listing multiple instances of the same rule
- Never imply the examples shown are the only cases the rule applies to

## Reference Sources of Truth

When a rule depends on a dynamic inventory, reference the source file — not a snapshot of current contents.

- Primitive inventory → `src/components/ui/catalog.json`
- Token inventory → `src/components/ui/design-tokens.json`
- Per-primitive API → `src/components/ui/<name>/manifest.json`
- Color palette → `tailwind.config.ts` colors section
- Font families → `tailwind.config.ts` fontFamily section
