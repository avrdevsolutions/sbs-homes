# Phase 3–4 — Brief & Execution

> Loaded by `@page-architect` during Phases 3 and 4. Writes the execution brief, runs the approval gate, then executes the plan: refactoring, content file, route file, and new sections.

## Prerequisites

- `page-architect.analysis.md` exists
- `extraction_validated: true` in manifest (if external sources were used)

---

## Phase 3 — Brief

### Brief Format

Write `.github/flow-generator/page-architect/specs/page-architect.brief.md`:

```markdown
---
approved: false
---

# Page Architect Brief

## Target Page

- **Route**: [e.g., /doors]
- **Feature name**: [e.g., doors-page]
- **Content file**: [e.g., src/dictionaries/doors-page.ts]
- **Language**: [e.g., English]

## Reference Page

- **Route**: [e.g., /windows] (or "None")
- **Feature**: [e.g., windows-page]

## Sections

| #   | Section       | Reuse Strategy | Component           | Source                               |
| --- | ------------- | -------------- | ------------------- | ------------------------------------ |
| 1   | hero          | genericized    | HeroSection         | features/product-page/hero/          |
| 2   | product-lines | as-is          | ProductLinesSection | features/product-page/product-lines/ |
| ... | ...           | ...            | ...                 | ...                                  |

## Content Summary

### Hero

- Title: [drafted content]
- Subtitle: [drafted content]
- CTA: [drafted content]
- Background: [image path or description]

### [Section Name]

[Content per section — all fields that match the type contract]

## Refactoring Plan

### Step 1: Shared Types

- **Create**: `src/dictionaries/{generic-name}.types.ts`
  - Extract types: [list of types to extract]
- **Modify**: `src/dictionaries/{original-page}.ts`
  - Change: import types from shared file instead of defining inline

### Step 2: Rename Feature Folder (if needed)

- **From**: `src/components/features/{original-page}/`
- **To**: `src/components/features/{generic-name}/`
- **Component renames**: [list: OldName → NewName]
- **Barrel export updates**: [list]

### Step 3: Fix Hardcoded References

- [file]: [what to fix] (e.g., `id='windows-gallery-title'` → prop-driven)

### Step 4: Update Imports

- `src/app/{original-route}/page.tsx`: update feature imports
- [other files with broken imports]

## New Files

- `src/dictionaries/{new-page}.ts` — content file with drafted data
- `src/app/{new-route}/page.tsx` — route file

## New Sections (if any)

[Only if the target page has sections not present in the reference]

- **[section-name]**: [description, component name, what it does]

## Image Strategy

[Keep reference paths / placeholder paths / specific assets]
```

### Brief Rules

- **Every section must have full drafted content** — no empty fields or TODOs.
- State the refactoring plan as concrete file operations (create, rename, modify, delete).
- If no refactoring is needed (all components already generic), state "No refactoring needed."
- If no reference page (Path B only), skip the refactoring section and list all components as "new."

### Brief Gate

1. Set manifest `status: "pending-approval"`.
2. Present a summary of the brief to the user (section list, refactoring scope, content preview).
3. Use `askQuestions`: **Approve brief** / **Request changes** (free-form).
4. If **approved**: set `approved: true` in brief frontmatter. Set manifest `status: "in-progress"`. Proceed to Phase 4.
5. If **changes requested**:
   - Append to `change_rounds[]` in manifest.
   - Set `status: "revision-requested"`.
   - Address feedback, update the brief.
   - Set `status: "pending-approval"`. Loop back to step 2.

---

## Phase 4 — Execution

Execute the approved brief step by step. Update `last_completed_step` in the manifest after each step.

### Step 1 — Refactoring (if `refactoring.needed` is true)

**This step modifies existing files.** Work carefully — the reference page must continue to function after each sub-step.

#### 1a. Extract Shared Types

If multiple pages will share the same content type shapes:

1. Create `src/dictionaries/{generic-name}.types.ts` (e.g., `product-page.types.ts`).
2. Move type definitions from the original content file to the shared types file.
   - Copy the type definitions (interfaces, type aliases).
   - In the original content file, replace inline types with imports from the shared file.
   - The original content data stays in the original file — only types move.
3. **Verify**: `pnpm tsc --noEmit` — catch any broken imports immediately.

#### 1b. Rename Feature Folder (if needed)

When the reference page feature folder is domain-named (e.g., `windows-page`) and the components are generic enough to be reused:

1. Rename the feature folder: `features/{old-name}/` → `features/{generic-name}/`.
2. Rename components that carry the domain prefix:
   - `WindowsHeroSection` → `HeroSection`
   - `WindowsFinalCtaSection` → `FinalCtaSection`
   - Update the component filename, the export name, and the barrel export.
3. Update the barrel export (`index.ts`) in the renamed feature folder.
4. **Verify**: `pnpm tsc --noEmit`.

#### 1c. Fix Hardcoded References

For each hardcoded domain string found during analysis:

- **Hardcoded IDs** (e.g., `id='windows-gallery-title'`): Replace with a prop-driven or content-derived value. Add a `pageSlug` or `titleId` prop if needed, passing it from the content object.
- **Hardcoded aria-labels**: Replace with content-driven values.
- **Hardcoded asset paths**: Replace with content-driven paths.

#### 1d. Update Imports

After renames, update all files that imported from the old paths:

1. The reference page's route file (`src/app/{route}/page.tsx`): update feature imports.
2. Any cross-references from other files (search for the old import path).
3. Update the top-level feature barrel if one exists (`src/components/features/index.ts`).

**Verify**: `pnpm tsc --noEmit`.

Update manifest: `last_completed_step: "refactoring"`.

### Step 2 — Content File

Create `src/dictionaries/{new-page-name}.ts`:

1. Import shared types from `src/dictionaries/{generic-name}.types.ts` (or from the original content file if no shared types extraction was needed).
2. Define the page-level content type composing all section types:
   ```typescript
   export type DoorsPageContent = {
     hero: HeroContent
     productLines: ProductLinesContent
     // ... etc
   }
   ```
3. Export the content constant with all drafted content from the approved brief:
   ```typescript
   export const doorsPageContent: DoorsPageContent = {
     hero: { ... },
     productLines: { ... },
     // ... etc
   }
   ```
4. Content must match the type shapes exactly — no missing fields, no TODOs.
5. Mark uncertain content with `/* REVIEW */` inline comments (not `// TODO`).

**Verify**: `pnpm tsc --noEmit`.

Update manifest: `last_completed_step: "content"`.

### Step 3 — Route File

Create `src/app/{route}/page.tsx`:

1. Follow the same composition pattern as the reference page route file.
2. Import section components from the (now-generic) feature folder.
3. Import the new content object from the new content file.
4. Compose sections in order, passing content props.
5. Use `export default` (Next.js special file convention).

Example structure:

```tsx
import {
  BenefitsSection,
  FinalCtaSection,
  HeroSection,
  // ...
} from '@/components/features/product-page'
import { doorsPageContent } from '@/dictionaries/doors-page'

const DoorsPage = () => (
  <main id='main-content'>
    <HeroSection content={doorsPageContent.hero} />
    {/* ... */}
  </main>
)

export default DoorsPage
```

**Verify**: `pnpm tsc --noEmit`.

Update manifest: `last_completed_step: "route"`.

### Step 4 — New Sections (if any)

If the target page has sections not present in the reference:

1. Create a new section folder in the feature directory: `features/{feature-name}/{section-name}/`.
2. Create the section component following feature folder conventions:
   - Barrel export (`index.ts`)
   - Named export, arrow function, typed props
   - Primitives-first (Section, Container, Stack, Typography, Button from `catalog.json`)
   - Server component by default
3. Add the section's content types to the content file.
4. Add the section's content data to the content constant.
5. Import and render in the route file.

**Verify**: `pnpm tsc --noEmit`.

Update manifest: `last_completed_step: "new-sections"`.
