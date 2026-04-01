# Phase 2: Execution

> Read this file after the foundation brief is approved. Execute changes following the brief precisely — it is your spec. The brief may include additional primitives beyond those in `catalog.json` — handle them the same way.

**Quality gates run after each step** — load `skills/feo-ui-foundation-workflow/quality-gates.patterns.md` when you reach a gate checkpoint marker (→).

## Ground Rule — Atomic Edit + Manifest

**Every file edit is complete only when its corresponding manifest is also updated.** The unit of work is **file + manifest**, not file alone.

| File edited                                       | Manifest to update immediately                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `tailwind.config.ts`, `globals.css`, `layout.tsx` | `src/components/ui/design-tokens.json`                                                        |
| `src/components/ui/<name>/<Name>.tsx`             | `src/components/ui/<name>/manifest.json` + `src/components/ui/catalog.json` (if axes changed) |
| `src/components/ui/<name>/<Name>.stories.tsx`     | No manifest needed                                                                            |
| `src/components/ui/index.ts`                      | No manifest needed                                                                            |

Do NOT defer manifest updates to Phase 3. Quality gates **verify** manifests are correct — they do not create them.

## Manifest-First Reading

- Read `src/components/ui/catalog.json` for a quick overview of all primitives (names, patterns, variant axes).
- Read individual `manifest.json` files for detailed API surface (variant values, props, defaults, exports).
- **Read `.tsx` source files ONLY when you are about to edit them.** Never read source for metadata — manifests provide that.
- Do NOT read `.tsx` source files that the brief does not modify.

## 0. Set Foundation Manifest to In-Progress — CRITICAL (FIRST action)

**Before making any code changes**, immediately update `.github/flow-generator/FE/specs/ui-foundation.manifest.json`:

1. Set base schema fields: `"$schema": "feo-manifest-v1"`, `"agent": "ui-foundation"`, `created_at` (if first creation), `updated_at` to now
2. Set `status` to `"in-progress"`
3. Set `approved` to `false`, `approved_at` to `null`, `change_rounds` to `[]`
4. Set `scenario` from the brief's context (e.g., `"A"`, `"B"`, `"C"`)
5. Set `strategy` from the scenario (`"fresh-mockup"`, `"update-from-mockup"`, `"standalone-interview"`)
6. Set `source_mockup` from the brief's frontmatter (e.g., `"mockup-r2-v3.html"`, or `null` for scenario C)
7. Set `last_completed_step` to `"started"`
8. Reset all `quality_gates` to `"not_run"`
9. Clear `files_modified` to `[]`, `completed_at` to `null`

This ensures that if the session ends at any point during execution, the manifest reflects that work was started and the resume protocol can route to the correct step.

## 1. Design Tokens & Fonts

Apply token changes from the brief to three files:

- **`src/app/globals.css`** — Replace/add CSS custom properties in `@layer base { :root { ... } }`. Add `.dark` overrides if the brief specifies them.
- **`tailwind.config.ts`** — Replace placeholder tokens with the brief's palette. **Remove the `⚠️ PLACEHOLDER TOKENS` comment** (execution-complete signal). Keep `.storybook/**` in `content`.
- **`src/app/layout.tsx`** — Register fonts from the brief.

For token structure, HSL format, flat vs scaled decisions, and font registration steps, follow:

- skill `styling-tokens` — §Step 2 (config structure), §Step 3 (CSS custom props), §Color Scale Structure
- skill `ui-primitives-customization` — §Font Registration (layout.tsx imports, CSS variables, tailwind fontFamily)

### Update `design-tokens.json` (atomic — do this NOW, not in Phase 3)

After editing the three token files above, **immediately** update `src/components/ui/design-tokens.json` to reflect the changes:

- `colors.scaled` — object keyed by token name, each an array of shade steps present (e.g., `["50", "100", ..., "950"]`)
- `colors.flat` — object keyed by token name with a single value (hex or HSL) for surface/border tokens
- `colors.semantic` — object keyed by token name, each an array of shade steps present
- `colors.dynamic` — array of CSS custom property color names (e.g., `["background", "foreground"]`)
- `fonts` — object keyed by font token name, each with `family`, `variable`, and `fallback` array
- `customTokens` — object with `spacing`, `borderRadius`, `boxShadow`, and any other extended theme sections
- Set `lastUpdatedBy` to the scenario identifier (e.g., `"ui-foundation-A"`)

**→ Run gates G0 (Manifest sync), G1 (Token completeness), and G2 (Font registration) before continuing.**

### Checkpoint: Update foundation manifest

After gates G0–G2 pass, immediately update `ui-foundation.manifest.json`:

- Set `last_completed_step` to `"tokens"`
- Append all token-related files to `files_modified` (e.g., `"tailwind.config.ts"`, `"src/app/globals.css"`, `"src/app/layout.tsx"`, `"src/components/ui/design-tokens.json"`)
- Update `quality_gates` with results for G0, G1, G2

## 2. Primitives

Update every primitive listed in the brief. For each primitive:

1. Read the primitive's `manifest.json` to understand its current API surface (variant axes, props, defaults, exports).
2. Compare the manifest against the brief to determine what changes are needed.
3. Read the `.tsx` source file — you are about to edit it.
4. Apply the brief's changes — update variant styles, maps, types, or cva definitions.
5. Follow the auto-attached `ui-primitives.instructions.md` rules (active when editing `src/components/ui/**`).
6. **Immediately update** the primitive's `manifest.json` with any new/changed variant values, props, defaults, or exports.
7. **Immediately update** `src/components/ui/catalog.json` if the primitive's axes changed (new axis added or removed).

Repeat steps 1–7 for the next primitive. Do NOT batch manifest updates — each primitive's manifest is written before moving to the next.

For variant customization patterns (Typography variant discovery, Button/Badge cva updates, standard variant coverage), follow skill `ui-primitives-customization`.

If the brief includes new primitives (Card, Input, etc.), create them following the checklist in `instructions/ui-primitives.instructions.md` §Creating a New Primitive. This checklist already includes manifest.json creation and catalog.json update as required steps.

**→ Run gates G3 (Primitive completeness) and G4 (Variant coverage) before continuing.**

### Checkpoint: Update foundation manifest

After gates G3–G4 pass, immediately update `ui-foundation.manifest.json`:

- Set `last_completed_step` to `"primitives"`
- Append all primitive-related files to `files_modified`
- Update `quality_gates` with results for G3, G4

### Write Mockup Mapping Table

After all primitives are customized and gates G3–G4 pass, write the `mockup_mapping` object into `ui-foundation.manifest.json`. This table maps the mockup's CSS classes to the primitive props the builder agent should use.

1. Re-read the mockup HTML (path from `source_mockup`).
2. Identify all CSS classes used for typography (`.type-*`), buttons (`.btn-*`), sections (`.section-*`), backgrounds (section-level class that sets background), separators (`.divider*`), and containers (`.container*`).
3. For each class, look up the primitive and variant/prop combination you just customized in Step 2.
4. Write the result as a `mockup_mapping` object in `ui-foundation.manifest.json` with these sub-keys:
   - `typography` — maps `.type-*` classes to Typography `variant` values (e.g., `".type-display": "display"`)
   - `buttons` — maps `.btn-*` classes to `{ "variant": "...", "size": "..." }` objects
   - `sections` — maps section classes to `{ "spacing": "..." }` objects
   - `backgrounds` — maps background classes to `{ "background": "...", "color_context": "..." }` objects
   - `separators` — maps `.divider*` classes to `{ "variant": "..." }` objects
   - `containers` — maps `.container*` classes to `{ "size": "...", "padding": "..." }` objects

All information for this step is already available from the primitives you just customized — no new analysis is needed. See the Foundation Manifest section in `quality-gates.patterns.md` for the full schema and example.

## 3. Storybook

Update the story file for every primitive that changed, plus create stories for new primitives. Follow the auto-attached `storybook.instructions.md` conventions (active when editing `**/*.stories.tsx`).

**→ Run gate G5 (Story coverage) before continuing.**

### Checkpoint: Update foundation manifest

After gate G5 passes, immediately update `ui-foundation.manifest.json`:

- Set `last_completed_step` to `"stories"`
- Append all story files to `files_modified`
- Update `quality_gates` with result for G5

## 4. Barrel Export

Verify `src/components/ui/index.ts` has complete exports for all primitives + variant exports + type exports. Add exports for any new primitives. Cross-check against what each primitive's `manifest.json` declares in its `exports` field.

**→ Run gate G6 (Barrel export completeness) before continuing.**

### Checkpoint: Update foundation manifest

After gate G6 passes, immediately update `ui-foundation.manifest.json`:

- Set `last_completed_step` to `"barrel"`
- Append barrel export file to `files_modified` (if changed)
- Update `quality_gates` with result for G6

## 5. Final Verification

**→ Run gate G7 (No forbidden patterns) — sweep all modified source files.**

**→ Run gate G8 (Build verification) — `pnpm build` must succeed.**

After all gates pass (or are explicitly skipped by user), update `ui-foundation.manifest.json` to its final state:

- Set `status` to `"completed"`
- Set `last_completed_step` to `"completed"`
- Set `completed_at` to the current ISO 8601 timestamp
- Update `quality_gates` with results for G7, G8
- Ensure `files_modified` is complete

**CRITICAL: Write the manifest BEFORE the completion report.** If context is running low, prioritize the manifest write over the user-facing report. The manifest is the handoff contract — without it, downstream agents cannot proceed.

See the Foundation Manifest section in `skills/feo-ui-foundation-workflow/quality-gates.patterns.md` for the full schema.
