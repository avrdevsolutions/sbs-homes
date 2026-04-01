# ADR-0033: Sanity Getting Started

**Status**: Accepted (companion to ADR-0031 — operational bootstrap checklist)
**Date**: 2026-03-31

---

## Context

ADR-0031 documents Sanity as a CMS platform — schema conventions, content modeling, GROQ, image CDN, Portable Text, and webhooks. But it assumes the platform is already set up. An agent or developer starting from zero needs a concrete, ordered checklist of Sanity dashboard actions, CLI commands, and file creation steps to go from "no Sanity" to "Studio loads and schemas are visible."

This ADR is the operational companion to ADR-0031. It covers every step to bootstrap Sanity, in order. It does NOT duplicate the conventions and patterns from ADR-0031 — it references them. And it does NOT cover how the frontend consumes Sanity data — that is ADR-0032.

| This ADR (Getting Started)                   | ADR-0031 (Platform Conventions)              | ADR-0032 (Data Consumption)       |
| -------------------------------------------- | -------------------------------------------- | --------------------------------- |
| Account creation                             | —                                            | —                                 |
| Project creation via CLI                     | —                                            | —                                 |
| CORS origins configuration                   | —                                            | —                                 |
| API token generation                         | —                                            | —                                 |
| Webhook creation in dashboard                | Webhook config patterns                      | Webhook handler route in Next.js  |
| Dataset creation commands                    | Multi-env dataset strategy                   | —                                 |
| Package installation                         | Package inventory table                      | Consumption-layer packages        |
| File bootstrap (config, route, schema index) | File structure reference, schema conventions | Client setup in `src/lib/sanity/` |
| First schema & typegen                       | Schema definition pattern, naming rules      | —                                 |
| Env vars — filling values                    | Env var shape & Zod schema                   | —                                 |
| Verification checklist                       | —                                            | —                                 |
| Order of operations                          | —                                            | —                                 |

## Decision

**A step-by-step operational checklist for bootstrapping Sanity CMS in a project, from account creation through Studio verification. Follows the conventions established in ADR-0031.**

---

## Rules

| Rule                                                                                 | Level      |
| ------------------------------------------------------------------------------------ | ---------- |
| Follow this ADR's order of operations when setting up Sanity from scratch            | **MUST**   |
| Create API tokens as robot tokens (not personal tokens) for application use          | **MUST**   |
| Add CORS origins with credentials for any origin hosting embedded Studio             | **MUST**   |
| Generate a cryptographically random revalidation secret (min 32 chars)               | **MUST**   |
| Place all secrets in `.env.local`, never commit to version control                   | **MUST**   |
| Verify Studio loads and schema is visible before proceeding to content modeling      | **MUST**   |
| Use the `clean` template when initializing — do not use framework-specific templates | **SHOULD** |
| Create separate datasets for production and development environments                 | **SHOULD** |

---

## Part 1: Prerequisites & Account

### System Requirements

| Requirement     | Minimum                              |
| --------------- | ------------------------------------ |
| Node.js         | v20 or later                         |
| Package manager | pnpm (project standard)              |
| Sanity account  | Free tier sufficient for development |

### Account Creation

**Option A — Web signup (manual):**

1. Go to [sanity.io](https://www.sanity.io/) and click **Get started**
2. Sign up with Google, GitHub, or email
3. The account is now tied to your login method

**Option B — CLI-prompted (automatic):**

If you don't have an account when running `sanity init` or `pnpm create sanity@latest`, the CLI will open a browser window prompting you to create one. This is the most common path.

### Sanity Login

After account creation, authenticate the CLI:

```bash
pnpm sanity login
```

This generates a personal token stored locally. The CLI uses this token for all subsequent commands (`sanity deploy`, `sanity dataset create`, `sanity typegen`, etc.).

> **Personal tokens are for CLI use only.** Never use a personal token in application code or environment variables. Use robot tokens instead (Part 4).

---

## Part 2: Project Creation

### Initialize a Sanity Project

For projects where Sanity Studio will be embedded in the Next.js app (the default pattern per ADR-0031):

```bash
# From the project root — do NOT use pnpm create sanity@latest
# (that scaffolds a standalone Studio in a new directory)
# Instead, install the sanity package directly:
pnpm add sanity
pnpm add -D @sanity/vision
```

Then create the project via the Sanity dashboard (Option A) or CLI (Option B):

**Option A — Sanity Dashboard (recommended for embedded Studio):**

1. Go to [sanity.io/manage](https://www.sanity.io/manage)
2. Click **Create new project**
3. Enter a project name (e.g., "Sash Bespoke" or the project name)
4. The dashboard creates a project and shows the **Project ID**
5. A `production` dataset is created automatically
6. Copy the Project ID — you will need it for env vars

**Option B — CLI init (for standalone Studio only):**

```bash
pnpm create sanity@latest -- --dataset production --template clean --typescript --output-path studio
```

| Flag                   | Purpose                                |
| ---------------------- | -------------------------------------- |
| `--dataset production` | Names the default dataset `production` |
| `--template clean`     | Empty schema — no demo content         |
| `--typescript`         | TypeScript config files                |
| `--output-path studio` | Directory for standalone Studio        |

> The CLI creates the Sanity project on sanity.io, generates config files, and installs dependencies. It returns the Project ID in its output.

### Retrieving Project ID

If you missed the Project ID during creation:

1. Go to [sanity.io/manage](https://www.sanity.io/manage)
2. Select your project
3. The Project ID appears in the URL: `manage.sanity.io/project/<PROJECT_ID>`
4. It also appears on the project dashboard under **Project ID**

---

## Part 3: CORS Origins

CORS origins control which domains can make authenticated requests to the Sanity Content Lake. **This step must happen before the embedded Studio will work.**

### Required Origins

| Origin                                             | Credentials | When                                   |
| -------------------------------------------------- | ----------- | -------------------------------------- |
| `http://localhost:3000`                            | Allow       | Local development with embedded Studio |
| `http://localhost:3333`                            | Allow       | Local standalone Studio (if used)      |
| Production domain (e.g., `https://yourdomain.com`) | Allow       | Production embedded Studio             |
| Preview/staging domain                             | Allow       | If using preview deployments           |

### Adding via Dashboard

1. Go to [sanity.io/manage](https://www.sanity.io/manage) → your project
2. Navigate to **Settings** → **API**
3. Under **CORS Origins**, click **Add CORS origin**
4. Enter the origin (e.g., `http://localhost:3000`)
5. Check **Allow credentials** (required for Studio authentication)
6. Click **Save**

Repeat for each origin. At minimum, add `http://localhost:3000` with credentials.

### Adding via CLI

```bash
pnpm sanity cors add http://localhost:3000 --credentials
```

### Security Rules

| Rule                                      | Rationale                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| Never use wildcard (`*`) with credentials | Any matching domain could make authenticated requests as logged-in users |
| Add only domains you control              | Prevents unauthorized access to your content                             |
| Remove origins you no longer use          | Minimizes attack surface                                                 |

---

## Part 4: API Tokens

API tokens authenticate server-side requests to the Sanity Content Lake. **Use robot tokens, not personal tokens.**

### Token Types

| Type                 | Use Case                                      | Lifetime                        |
| -------------------- | --------------------------------------------- | ------------------------------- |
| Personal token       | CLI commands (auto-managed by `sanity login`) | 1 year, regenerated on re-login |
| Robot token — Viewer | Server-side reads, including draft content    | Until manually deleted          |
| Robot token — Editor | Server-side writes (mutations, asset uploads) | Until manually deleted          |

### Creating a Robot Token

1. Go to [sanity.io/manage](https://www.sanity.io/manage) → your project
2. Navigate to **Settings** → **API** → **Tokens**
3. Click **Add new token**
4. Configure:
   - **Name**: Descriptive (e.g., `next-app-read`, `webhook-revalidation`)
   - **Permissions**: `Viewer` for read access (sufficient for most frontend use)
5. Click **Save**
6. **Copy the token immediately** — it is shown exactly once and cannot be recovered

### Minimum Tokens for a Project

| Token           | Permission | Env Variable            | Purpose                                                  |
| --------------- | ---------- | ----------------------- | -------------------------------------------------------- |
| `next-app-read` | Viewer     | `SANITY_API_READ_TOKEN` | Server-side data fetching (including drafts for preview) |

> Create additional tokens only when needed: an Editor token for server-side mutations, a separate token per deployment environment, etc. Start with one Viewer token.

### Token Security

- Store tokens in `.env.local` only — never in `.env` (committed) or client-side code
- Never prefix with `NEXT_PUBLIC_` — tokens must stay server-side
- Use descriptive names so you know which token to revoke if compromised
- Rotate tokens if a team member with access leaves

---

## Part 5: Webhook Setup

Webhooks notify your application when content changes in Sanity. The most common use: triggering Next.js on-demand revalidation when an editor publishes content.

> **The webhook handler route** (the Next.js API route that receives and processes the webhook) is NOT set up here — that is part of ADR-0032 (CMS Consumption). This step only configures the outgoing webhook in the Sanity dashboard.

### Generating a Revalidation Secret

Before creating the webhook, generate a cryptographically random secret:

```bash
# Generate a 32-byte random hex string
openssl rand -hex 32
```

Copy the output — this becomes `SANITY_REVALIDATE_SECRET` in your env vars and the webhook's secret field.

### Creating the Webhook

1. Go to [sanity.io/manage](https://www.sanity.io/manage) → your project
2. Navigate to **Settings** → **API** → **Webhooks**
3. Click **Create webhook**
4. Configure:

| Field            | Value                                                       | Notes                                                                            |
| ---------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Name**         | `Revalidate Next.js`                                        | Descriptive                                                                      |
| **Description**  | `Triggers on-demand revalidation when content is published` | Optional but recommended                                                         |
| **URL**          | `https://yourdomain.com/api/revalidate`                     | Your revalidation endpoint (update when known)                                   |
| **Trigger on**   | Create, Update, Delete                                      | All three — covers all content changes                                           |
| **Filter**       | _(leave empty)_                                             | Empty = triggers on all document types. Add a GROQ filter later to narrow scope. |
| **Projection**   | `{ _type, _id, slug }`                                      | Minimal payload — only what the handler needs                                    |
| **Status**       | Enabled                                                     |                                                                                  |
| **HTTP method**  | POST                                                        |                                                                                  |
| **HTTP headers** | _(none needed)_                                             | Secret is sent as a signature header automatically                               |
| **API version**  | `2021-03-25` (default)                                      |                                                                                  |
| **Drafts**       | Disabled                                                    | Only trigger on published content                                                |
| **Secret**       | _(paste the secret from above)_                             | Used to verify webhook authenticity                                              |

5. Click **Save**

### Webhook Notes

- **URL can be updated later.** If you don't have a production URL yet, you can set a placeholder and update it after deployment.
- **One concurrent request.** Sanity limits webhooks to 1 concurrent request with exponential backoff retry for 30 minutes.
- **Test with webhook.site.** During development, you can point the URL at [webhook.site](https://webhook.site/) to inspect payloads before building the handler.

---

## Part 6: Dataset Strategy

A dataset is a collection of JSON documents — essentially a database. Every Sanity project starts with one dataset.

### Default Dataset

The `production` dataset is created automatically with your project. This is the dataset editors publish to and the frontend reads from.

### When to Create Additional Datasets

| Dataset       | When                                                    | Purpose                                                  |
| ------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| `production`  | Always (auto-created)                                   | Live content                                             |
| `development` | When you need to test schema changes with real-ish data | Breaking schema experiments without affecting production |
| `staging`     | When you have a staging deployment                      | Content preview before production                        |

### Creating a Dataset

**Via CLI:**

```bash
pnpm sanity dataset create development
pnpm sanity dataset create staging
```

**Via Dashboard:**

1. Go to [sanity.io/manage](https://www.sanity.io/manage) → your project
2. Navigate to **Datasets** tab
3. Click **Create dataset**
4. Enter the name and choose visibility (public or private)

### Dataset Naming Rules

- 1–64 characters
- Lowercase letters (`a-z`), numbers (`0-9`), hyphens (`-`), underscores (`_`)
- Must begin and end with a lowercase letter or number

### Copying Data Between Datasets

```bash
# Export production content
pnpm sanity dataset export production production-backup.tar.gz

# Import into development
pnpm sanity dataset import production-backup.tar.gz development
```

> Start with just `production`. Create `development` and `staging` when the project needs them — not upfront.

---

## Part 7: Package Installation

### Core Packages

```bash
pnpm add sanity
pnpm add -D @sanity/vision
```

| Package          | Purpose                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sanity`         | Studio framework, schema DSL (`defineType`, `defineField`), CLI (`sanity typegen`, `sanity deploy`), `styled-components` is a peer dep — pnpm will warn if missing |
| `@sanity/vision` | GROQ query playground plugin for Studio (dev tool)                                                                                                                 |

### Peer Dependency Note

Sanity Studio's UI is built with `styled-components`. If pnpm reports a peer dependency warning:

```bash
pnpm add styled-components
```

This only affects Studio rendering. `styled-components` is NOT used in application code (per ADR-0002: Tailwind only).

### Consumption-Layer Packages (Later)

These packages are installed when building the data-access layer (ADR-0032):

| Package               | Purpose                                             | Install when                   |
| --------------------- | --------------------------------------------------- | ------------------------------ |
| `next-sanity`         | Sanity client for Next.js, Studio embedding helpers | Building the consumption layer |
| `@sanity/image-url`   | Sanity CDN URL builder                              | Rendering Sanity images        |
| `@portabletext/react` | Portable Text to React renderer                     | Rendering rich text content    |

Do NOT install these during bootstrap. Install them when you need them.

---

## Part 8: Project Files Bootstrap

Create the following files. Content follows the patterns established in ADR-0031 Part 2.

### 1. `sanity.config.ts` (project root)

```typescript
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'

import { schemaTypes } from '@/sanity/schemas'

export default defineConfig({
  name: 'studio',
  title: 'Project Studio',

  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,

  plugins: [
    structureTool(),
    visionTool({ defaultApiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION }),
  ],

  schema: {
    types: schemaTypes,
  },
})
```

### 2. `sanity.cli.ts` (project root)

```typescript
import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  },
  studioHost: 'project-name', // Used by `sanity deploy` for hosted Studio URL
})
```

### 3. `src/sanity/schemas/index.ts`

```typescript
// Schema type array — register all document and object types here
// See ADR-0031 Part 3 for naming and definition conventions

import type { SchemaTypeDefinition } from 'sanity'

export const schemaTypes: SchemaTypeDefinition[] = [
  // Document types (add as you create them):
  // project,
  // post,
  // category,
  // Object types (add as you create them):
  // portableText,
  // seoFields,
]
```

### 4. `src/app/studio/[[...tool]]/page.tsx`

```tsx
'use client'

import { NextStudio } from 'next-sanity/studio'

import config from '../../../../sanity.config'

const StudioPage = () => <NextStudio config={config} />

export default StudioPage
```

> **Note:** This file requires `next-sanity` to be installed. If you are deferring consumption-layer packages (Part 7), install `next-sanity` now for the embedded Studio:
>
> ```bash
> pnpm add next-sanity
> ```

### 5. Middleware Exclusion

Update `src/middleware.ts` to exclude the Studio route from application middleware:

```typescript
export const config = {
  matcher: ['/((?!studio|api|_next/static|_next/image|favicon.ico).*)'],
}
```

### 6. `src/sanity/env.ts`

```typescript
// Sanity-specific env re-exports
// Source of truth for env validation: src/lib/env.ts (per ADR-0006)

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-03-30'
```

### File Creation Summary

| File                                  | Creates                                          |
| ------------------------------------- | ------------------------------------------------ |
| `sanity.config.ts`                    | Studio config — plugins, schema, project binding |
| `sanity.cli.ts`                       | CLI config — project ID, dataset, deploy host    |
| `src/sanity/schemas/index.ts`         | Schema registry — empty, ready for first type    |
| `src/app/studio/[[...tool]]/page.tsx` | Embedded Studio route                            |
| `src/sanity/env.ts`                   | Sanity env re-exports                            |

---

## Part 9: First Schema & Typegen

### Creating a Test Schema

Create a minimal document type to verify the pipeline works end-to-end:

```typescript
// src/sanity/schemas/post.ts
import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
    }),
  ],
})
```

### Registering in Schema Index

```typescript
// src/sanity/schemas/index.ts
import type { SchemaTypeDefinition } from 'sanity'

import post from './post'

export const schemaTypes: SchemaTypeDefinition[] = [post]
```

### Running Typegen

Add the typegen config to `sanity.cli.ts` if not already present:

```typescript
import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  },
  studioHost: 'project-name',
})
```

Then generate types:

```bash
pnpm sanity typegen generate
```

This produces `sanity.types.ts` in the project root with TypeScript types derived from your schema. Verify the file exists and contains a type matching your document (e.g., `Post`).

> **Typegen requires GROQ queries to generate query result types.** Schema-only typegen produces document types. Full query result types require `defineQuery()` usage (see ADR-0031 Part 7).

---

## Part 10: Environment Variables

### `.env.local` (never committed)

```bash
# --- Sanity CMS ---
NEXT_PUBLIC_SANITY_PROJECT_ID=<your-project-id>
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-03-30

# Server-only
SANITY_API_READ_TOKEN=<your-viewer-robot-token>
SANITY_REVALIDATE_SECRET=<your-generated-secret>
```

### `.env.example` (committed — no secret values)

```bash
# --- Sanity CMS ---
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-03-30

# Server-only
SANITY_API_READ_TOKEN=
SANITY_REVALIDATE_SECRET=
```

### Update `src/lib/env.ts`

Add the Sanity variables to the Zod schema (per ADR-0006):

```typescript
const envSchema = z.object({
  // ... existing vars ...

  // --- Sanity CMS ---
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_SANITY_DATASET: z.string().default('production'),
  NEXT_PUBLIC_SANITY_API_VERSION: z.string().default('2026-03-30'),

  // Server-only
  SANITY_API_READ_TOKEN: z.string().min(1),
  SANITY_REVALIDATE_SECRET: z.string().min(32),
})
```

### Where Values Come From

| Variable                         | Source                                                       |
| -------------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`  | Part 2 — from project creation (dashboard URL or CLI output) |
| `NEXT_PUBLIC_SANITY_DATASET`     | Part 6 — dataset name (default: `production`)                |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Fixed date string — use `2026-03-30` or current date         |
| `SANITY_API_READ_TOKEN`          | Part 4 — robot token from manage dashboard                   |
| `SANITY_REVALIDATE_SECRET`       | Part 5 — `openssl rand -hex 32` output                       |

---

## Part 11: Verification Checklist

After completing all steps, verify the setup works:

| #   | Check                | How                                                         | Expected                                             |
| --- | -------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| 1   | Studio loads         | Run `pnpm dev`, navigate to `http://localhost:3000/studio`  | Studio login screen appears                          |
| 2   | Login works          | Click login (Google/GitHub/email)                           | Studio dashboard appears — no CORS errors in console |
| 3   | Schema visible       | Look at the Studio document list                            | Your registered types appear (e.g., "Post")          |
| 4   | Create a document    | Click "Post" → create a new document → fill title → publish | Document saves without errors                        |
| 5   | Vision works         | Open the Vision tool in Studio → run `*[_type == "post"]`   | Returns the document you created                     |
| 6   | Typegen works        | Run `pnpm sanity typegen generate`                          | `sanity.types.ts` file updated with document types   |
| 7   | Env vars load        | Check dev server startup — no Zod validation errors         | Server starts cleanly                                |
| 8   | Middleware exclusion | Navigate to `/studio` — no redirects or auth blocks         | Studio loads (not blocked by app middleware)         |

### Troubleshooting

| Problem                       | Likely Cause                                 | Fix                                                   |
| ----------------------------- | -------------------------------------------- | ----------------------------------------------------- |
| CORS error in browser console | Missing CORS origin for `localhost:3000`     | Part 3 — add origin with credentials                  |
| Studio shows blank page       | Missing `next-sanity` package                | `pnpm add next-sanity`                                |
| "Project not found"           | Wrong `NEXT_PUBLIC_SANITY_PROJECT_ID`        | Check value in `.env.local` against sanity.io/manage  |
| Typegen produces empty file   | No schemas registered in `schemaTypes` array | Part 9 — register schema in index                     |
| Studio route 404              | Catch-all route not created                  | Part 8 — create `src/app/studio/[[...tool]]/page.tsx` |
| Login redirects fail          | CORS credentials not allowed                 | Part 3 — ensure "Allow credentials" is checked        |

---

## Part 12: Order of Operations

The steps above must be executed in this order. Each step depends on outputs from previous steps.

```
Step 1:  Prerequisites & Account (Part 1)
         └─ Output: Sanity account, CLI authenticated

Step 2:  Project Creation (Part 2)
         └─ Output: Project ID, default dataset name

Step 3:  CORS Origins (Part 3)
         └─ Input: Project exists
         └─ Output: localhost:3000 allowed with credentials

Step 4:  API Tokens (Part 4)
         └─ Input: Project exists
         └─ Output: SANITY_API_READ_TOKEN value

Step 5:  Webhook Setup (Part 5)
         └─ Input: Project exists
         └─ Output: Webhook configured, SANITY_REVALIDATE_SECRET value
         └─ Note: URL can be placeholder — update after deployment

Step 6:  Package Installation (Part 7)
         └─ Output: sanity, @sanity/vision, next-sanity installed

Step 7:  Project Files Bootstrap (Part 8)
         └─ Input: Packages installed
         └─ Output: sanity.config.ts, sanity.cli.ts, schemas/index.ts,
                    Studio route, env re-exports, middleware exclusion

Step 8:  Environment Variables (Part 10)
         └─ Input: Project ID (Step 2), token (Step 4), secret (Step 5)
         └─ Output: .env.local populated, env.ts Zod schema updated

Step 9:  First Schema & Typegen (Part 9)
         └─ Input: Files bootstrapped, env vars loaded
         └─ Output: Document type registered, types generated

Step 10: Verification (Part 11)
         └─ Input: Everything above
         └─ Output: Studio loads, schema visible, GROQ query works
```

> **Steps 3, 4, and 5 can be done in parallel** — they all require only that the project exists (Step 2). Steps 6–10 are sequential.

---

## Anti-Patterns

| Anti-Pattern                                                       | Why It Fails                                                                           | Do Instead                                                                                                     |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Using `pnpm create sanity@latest` for embedded Studio              | Creates a standalone Studio in a new directory, separate from your Next.js app         | Install `sanity` directly, create config files manually (Part 7, 8)                                            |
| Using personal tokens in `.env.local`                              | Personal tokens expire on re-login and are tied to a specific user                     | Create robot tokens in manage dashboard (Part 4)                                                               |
| Skipping CORS setup                                                | Studio login fails silently with CORS errors                                           | Add origin with credentials before testing Studio (Part 3)                                                     |
| Installing all packages upfront                                    | Consumption-layer packages create unused dependencies                                  | Install `next-sanity`, `@sanity/image-url`, `@portabletext/react` only when building the data layer (ADR-0032) |
| Creating multiple datasets upfront                                 | Adds complexity before you need it                                                     | Start with `production` only. Add `development`/`staging` when the workflow requires it (Part 6)               |
| Committing `.env.local`                                            | Exposes API tokens and secrets in version control                                      | Add `.env.local` to `.gitignore` (should already be there for Next.js projects)                                |
| Using framework-specific templates (`sanity init --template next`) | Templates scaffold opinionated code that conflicts with project conventions (ADR-0031) | Use `--template clean` or manual setup                                                                         |
| Generating revalidation secret manually (e.g., typing a password)  | Weak entropy, guessable                                                                | Use `openssl rand -hex 32` for cryptographic randomness (Part 5)                                               |
| Putting `SANITY_API_READ_TOKEN` in `NEXT_PUBLIC_*`                 | Exposes read token to browser — anyone can read draft content                          | Keep server-only (no `NEXT_PUBLIC_` prefix)                                                                    |

---

## Cross-References

| ADR      | Relationship                                                                |
| -------- | --------------------------------------------------------------------------- |
| ADR-0031 | Parent — platform conventions, schema patterns, GROQ syntax, file structure |
| ADR-0032 | Next — Sanity CMS data consumption (client, fetching, rendering, caching)   |
| ADR-0006 | Env var validation with Zod                                                 |
| ADR-0008 | Middleware matcher exclusion for Studio route                               |
