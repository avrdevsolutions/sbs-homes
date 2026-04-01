# Phase 1–2 — Intake & Analysis

> Loaded by `@page-architect` during Phases 1 and 2. Collects requirements, analyzes the reference page, extracts content from external sources, and produces the analysis document.

## Phase 1 — Intake Interview

### Determine Input Paths

The agent supports two non-exclusive input paths. The user may combine both.

- **Path A — Reference page**: An existing page in the codebase serves as the structural template. The agent analyzes its architecture, types, and component tree to determine what can be reused.
- **Path B — Inspiration**: The user provides content via URLs (agent fetches), images (agent reads via vision), or conversation (user describes requirements verbally).

Most tasks use both: "Create a doors page like the windows page, here are URLs to the old doors section."

### Round 1 — Content Sources

Use `askQuestions` with the following options:

1. **Reference page** — "Which existing page should I use as a structural template?"
   - Options: list existing routes found by scanning `src/app/` for `page.tsx` files (e.g., `/`, `/about`, `/windows`)
   - Include: **None — I'll describe the structure** (Path B only)
   - Free-form enabled for unlisted routes

2. **Content sources** — "Where should I get the content for the new page?"
   - **URLs** — "I'll give you URLs to fetch" (include free-form for the URLs)
   - **Images** — "I have screenshots in a folder" (include free-form for folder path)
   - **I'll describe it** — conversational content input
   - **Combination** — multiple sources
   - Free-form enabled

### Round 2 — Target & Sections

1. **Target route** — "Where should the new page live?" (e.g., `/doors`, `/services/consulting`)
   - Free-form input

2. **Section scope** — Present based on what was learned:
   - **If reference page given**: List the reference page's sections (discovered from its route file). Ask:
     - **Same sections** — identical structure, new content
     - **Modified** — add, remove, or reorder sections (free-form to specify changes)
   - **If no reference page**: Ask the user to describe the sections they want. Propose defaults for common page types.

3. **Feature name inference** — Derive from route:
   - `/doors` → `doors-page`
   - `/services/consulting` → `consulting-page`
   - General: last meaningful path segment + `-page`

### Round 3 — Content & Language

1. **Language** — "What language should the content be in?" Always ask, never assume.
2. **Content mode** — "Should I draft content from the sources, or do you have real copy?"
   - **Draft from sources** — agent extracts and adapts (default)
   - **Real copy provided** — user will supply exact text
   - **Mix** — some sections have real copy, others need drafting
3. **Image handling** — "How should I handle images?"
   - **Keep source URLs** — reference existing image paths
   - **Placeholder paths** — use `/images/{page-name}/section-name.webp` patterns for assets to be added later
   - **Copy from reference** — reuse reference page image paths where applicable

### Manifest Initialization

After Round 3, create `.github/flow-generator/page-architect/specs/page-architect.manifest.json`:

```json
{
  "$schema": "page-architect-manifest-v1",
  "agent": "page-architect",
  "created_at": "<ISO 8601>",
  "updated_at": "<ISO 8601>",
  "status": "in-progress",
  "approved": false,
  "approved_at": null,
  "change_rounds": [],
  "input_mode": "<reference | inspiration | conversation | mixed>",
  "reference_page": {
    "route": "<route>",
    "feature": "<feature-name>",
    "content_file": "<path>"
  },
  "content_sources": [],
  "target_page": {
    "route": "<route>",
    "feature": "<feature-name>",
    "content_file": "src/dictionaries/<feature-name>.ts"
  },
  "last_completed_step": null,
  "extraction_validated": false,
  "refactoring": {
    "needed": false,
    "generic_feature": null,
    "shared_types_file": null,
    "renames": [],
    "files_modified": []
  },
  "sections": [],
  "files_created": [],
  "quality_gates": {}
}
```

Set `reference_page` to `null` if Path B only (no reference page).

---

## Phase 2 — Analysis

### Step 1 — Reference Page Analysis (Path A)

If a reference page was given, perform a deep analysis:

1. **Read the route file** (`src/app/{route}/page.tsx`):
   - List all imported section components
   - Note the import source (feature folder path)
   - Note the content object import

2. **Read the content file** (`src/dictionaries/{page-name}.ts`):
   - Extract all type definitions (interfaces and type aliases)
   - Note which types are section-specific vs shared
   - Catalog type shapes: fields, nested types, union types

3. **Read each section component** (every `.tsx` in the feature folder):
   - For each component, determine:
     - **Props interface**: exact type name and shape
     - **Content import**: does it import types from the content file?
     - **Hardcoded strings**: any domain-specific text in JSX (aria-labels, IDs, asset paths)?
     - **Domain coupling**: any logic that wouldn't generalize? (not just naming — actual behavioral coupling)
     - **Sub-components**: does it compose other components in the same feature folder?
     - **External dependencies**: animation hooks, scroll scenes, media queries?

4. **Score each component** for reusability:

   | Score       | Criteria                                                                | Action needed               |
   | ----------- | ----------------------------------------------------------------------- | --------------------------- |
   | **Reuse**   | Zero hardcoded domain strings, props are content-typed, no domain logic | Use as-is                   |
   | **Generic** | Minor coupling (type import path, 1-2 hardcoded IDs/labels)             | Rename types, fix hardcodes |
   | **New**     | Structural differences, different section layout, domain-specific logic | Create new component        |

5. **Determine refactoring strategy**:
   - If ALL sections score "Reuse" or "Generic" → refactoring plan: extract shared types, rename feature folder to generic name, update imports
   - If SOME sections need "New" → partial reuse: keep generic sections, create new ones alongside
   - If MOST sections need "New" → minimal reuse: only share types, build fresh feature folder

### Step 2 — Content Extraction (Path B)

If the user provided URLs or images:

#### URL Extraction

For each URL:

1. Fetch the page content using the web tool.
2. Extract structured data per section:
   - **Headings** (h1–h6) — preserve hierarchy
   - **Body text** — paragraphs, lists, descriptions
   - **Product/service names** — items, categories, types
   - **Features/specs** — bullet points, detail lists
   - **CTAs** — button text, link destinations
   - **Image descriptions** — alt text, captions, contextual descriptions of visible images
   - **Contact info** — phone, email, addresses
   - **Credentials/certifications** — regulatory mentions, awards, standards
3. Group extracted content by the section structure of the reference page (if Path A + B combined) or by natural content groupings.

#### Image Extraction

For each image in the specified folder:

1. Read the image via vision.
2. Extract the same structured data as URL extraction.
3. Note visual elements that inform content (product photos, team photos, installation galleries).

#### Conversation Extraction

If the user chose to describe content:

1. Use `askQuestions` to collect content section by section.
2. For each section (from reference page or user-described structure), ask what content goes there.
3. Accept free-form descriptions — the agent will structure them into the type shapes later.

### Step 3 — Extraction Checkpoint

**CRITICAL**: Present extracted content to the user for validation before proceeding.

Format the extraction as a structured summary:

```markdown
## Extracted Content Summary

### Section: Hero

- **Title**: [extracted]
- **Subtitle**: [extracted]
- **CTA**: [extracted]
- **Background image**: [description]

### Section: Product Lines

- **Item 1**: [name] — [description]
- **Item 2**: [name] — [description]
  ...

### Section: Benefits

- **Benefit 1**: [title] — [description]
  ...
```

Use `askQuestions`:

- **Content looks correct** — proceed to brief
- **Needs corrections** — free-form input for what's wrong

If corrections are needed: update the extracted content, re-present. Loop until validated.

Set `extraction_validated: true` in the manifest after validation.

### Step 4 — Write Analysis Document

Write `.github/flow-generator/page-architect/specs/page-architect.analysis.md`:

```markdown
# Page Architect Analysis

## Reference Page: [name] ([route])

### Architecture

- Route file: [path]
- Content file: [path]
- Feature folder: [path]
- Sections: [count]

### Component Reusability Map

| Section       | Component           | Score   | Action                 | Notes                                             |
| ------------- | ------------------- | ------- | ---------------------- | ------------------------------------------------- |
| hero          | WindowsHeroSection  | Generic | Rename, fix aria-label | Only "Windows hero" aria-label is domain-specific |
| product-lines | ProductLinesSection | Reuse   | None                   | Fully content-driven                              |
| ...           | ...                 | ...     | ...                    | ...                                               |

### Refactoring Strategy

[Summary: what needs to happen to make the reference page reusable]

## Extracted Content

### [Section Name]

[Structured content per section — headings, body, items, CTAs]

### [Section Name]

...

## Content Sources

- [URL / image / conversation] — [what was extracted from each]
```

Update manifest: `last_completed_step: "analysis"`.
