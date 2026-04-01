# ADR-0011: Database

**Status**: Accepted (opt-in — implement when needed)
**Date**: 2026-02-27
**Supersedes**: Previous ADR-0011 (2026-02-26)

---

## Context

Most applications need persistent data storage for users, content, transactions, and application state. The database strategy must address: which database engine, which ORM, how to manage schema changes (migrations), how to handle connection pooling in serverless environments (Vercel), and how to seed data for development. The database is opt-in — static marketing sites and API-proxy projects don't need one.

## Decision

**PostgreSQL with Prisma ORM. Connection pooling via Prisma Accelerate or PgBouncer for serverless. Migrations tracked in git. Database singleton to prevent connection exhaustion in development.**

---

## Why PostgreSQL

| Factor | PostgreSQL | MySQL | MongoDB | SQLite |
|--------|-----------|-------|---------|--------|
| Type safety with Prisma | ✅ Full | ✅ Full | ⚠️ Partial | ✅ Full |
| JSON support | ✅ Native (`jsonb`) | ⚠️ Basic | ✅ Native | ❌ Text only |
| Full-text search | ✅ Built-in | ✅ Built-in | ✅ Atlas Search | ❌ Basic |
| Relational integrity | ✅ Strong | ✅ Strong | ❌ No joins | ✅ Strong |
| Serverless pooling | ✅ PgBouncer, Accelerate | ⚠️ PlanetScale | ✅ Atlas | ⚠️ Limited |
| Hosting options | Vercel Postgres, Supabase, Neon, Railway, AWS RDS | PlanetScale | Atlas | Local/Turso |
| Community/ecosystem | Largest | Large | Large | Small |

**PostgreSQL wins because**: it's the most versatile general-purpose database, with native JSON, full-text search, strong relational integrity, and the broadest hosting ecosystem. Every major hosting provider offers managed PostgreSQL.

---

## Why Prisma

| Factor | Prisma | Drizzle | TypeORM | Knex |
|--------|--------|---------|---------|------|
| TypeScript type safety | ⭐⭐⭐⭐⭐ Generated from schema | ⭐⭐⭐⭐ Schema-as-code | ⭐⭐⭐ Decorators | ⭐⭐ Manual |
| DX (migrations, studio) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Auth.js adapter | ✅ Official | ✅ Official | ❌ None | ❌ None |
| Edge Runtime | ❌ Node.js only | ✅ Edge-compatible | ❌ Node.js only | ❌ Node.js only |
| Learning curve | Low | Medium | High | High |

**Prisma wins because**: it generates a fully typed client from a declarative schema, has the best DX (migrations, studio, introspection), and has a first-class Auth.js adapter. The tradeoff is no Edge Runtime support — mitigated by keeping DB queries in Server Components and Route Handlers (which run on Node.js, not Edge).

**If you need edge-compatible DB access**: Drizzle ORM is the approved alternative. It's listed in approved-libraries.md as a pre-approved option.

---

## Rules

| Rule | Level |
|------|-------|
| Use the Prisma client singleton from `@/lib/db` — never instantiate `new PrismaClient()` | **MUST** |
| Track all migrations in git (`prisma/migrations/`) | **MUST** |
| Use `DATABASE_URL` from validated env (`@/lib/env`) | **MUST** |
| Add `prisma generate` to the `postinstall` script | **MUST** |
| Use connection pooling in production (Accelerate, PgBouncer, or Supabase pooler) | **MUST** |
| Don't import Prisma client in middleware (Edge Runtime) | **MUST NOT** |
| Don't use `prisma.$queryRaw` unless Prisma's query API can't express the query | **MUST NOT** |
| Don't run migrations in production with `prisma migrate dev` — use `prisma migrate deploy` | **MUST NOT** |
| Use `prisma.$transaction` for operations that must succeed or fail together | **SHOULD** |
| Create reusable query functions in `src/lib/db/queries/` for complex/shared queries | **SHOULD** |
| Seed development data via `prisma/seed.ts` | **SHOULD** |

---

## File Structure

```
prisma/
  schema.prisma                # Database schema (models, enums, relations)
  migrations/                  # Generated migration SQL files (git-tracked)
  seed.ts                      # Seed script for development data
src/lib/db/
  index.ts                     # Prisma client singleton
  queries/                     # Reusable query functions
    users.ts                   # User-related queries
    posts.ts                   # Post-related queries
```

---

## Implementation

### Step 1: Install

```bash
pnpm add @prisma/client
pnpm add -D prisma
```

### Step 2: Initialize

```bash
npx prisma init
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`.

### Step 3: Add Postinstall Script

```json
// package.json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

This ensures the Prisma client is regenerated after every `pnpm install` — critical for CI/CD.

### Step 4: Environment Variable

Already in `src/lib/env.ts` (see ADR-0006):

```typescript
DATABASE_URL: z.string().url().optional(),
```

In `.env.local`:

```dotenv
DATABASE_URL=postgresql://user:password@localhost:5432/mydb?schema=public
```

### Step 5: Prisma Client Singleton

```typescript
// src/lib/db/index.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
```

**Why the singleton?** Next.js hot reloads in development create a new module context on every change. Without the singleton, each reload creates a new `PrismaClient`, exhausting the database connection pool within minutes.

### Step 6: Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// --- Auth models (see ADR-0010) ---
// User, Account, Session, VerificationToken

// --- App models ---
model Post {
  id        String   @id @default(cuid())
  title     String
  slug      String   @unique
  content   String   @db.Text
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([slug])
  @@index([authorId])
  @@index([published, createdAt])
}
```

---

## Migration Workflow

```bash
# Development — create migration from schema changes
npx prisma migrate dev --name add_posts_table

# Production — apply pending migrations (no interactive prompts)
npx prisma migrate deploy

# Reset database (development only — drops all data)
npx prisma migrate reset

# View database in browser
npx prisma studio
```

| Command | When | Safe for Production? |
|---------|------|---------------------|
| `prisma migrate dev` | Development — interactive, creates migration file | ❌ Never |
| `prisma migrate deploy` | CI/CD, production — applies pending migrations | ✅ Yes |
| `prisma migrate reset` | Development — nuke and rebuild | ❌ Never |
| `prisma db push` | Prototyping — push schema without migration | ❌ Never |
| `prisma studio` | Development — visual database browser | ❌ Never |
| `prisma generate` | After schema changes — regenerate client | ✅ Yes (via postinstall) |

---

## Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const main = async () => {
  console.info('[Seed] Starting...')

  // Clear existing data (order matters — respect foreign keys)
  await prisma.post.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@example.com',
      role: 'ADMIN',
    },
  })

  // Create sample posts
  await prisma.post.createMany({
    data: [
      { title: 'First Post', slug: 'first-post', content: 'Hello world', authorId: admin.id, published: true },
      { title: 'Draft Post', slug: 'draft-post', content: 'Work in progress', authorId: admin.id },
    ],
  })

  console.info('[Seed] Complete')
}

main()
  .catch((e) => {
    console.error('[Seed] Failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Install `tsx` for TypeScript execution:

```bash
pnpm add -D tsx
```

Run seed:

```bash
npx prisma db seed
```

**Seeding runs automatically** after `prisma migrate reset` and `prisma migrate dev` (on fresh database).

---

## Connection Pooling (Serverless / Vercel)

Serverless functions (Vercel) create a new process per request. Without pooling, each request opens a new database connection — exhausting the pool under load.

### Option 1: Prisma Accelerate (Recommended for Vercel)

```bash
# No extra install — use Prisma Accelerate connection string
DATABASE_URL=prisma://accelerate.prisma-data.net/?api_key=YOUR_KEY
```

Prisma Accelerate acts as a managed connection pooler + global cache.

### Option 2: Supabase Pooler

```dotenv
# Direct connection (for migrations)
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres

# Pooled connection (for the app)
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:6543/postgres?pgbouncer=true
```

### Option 3: Neon Serverless

```bash
pnpm add @neondatabase/serverless @prisma/adapter-neon
```

```typescript
// src/lib/db/index.ts — Neon adapter
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool } from '@neondatabase/serverless'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaNeon(pool)

export const db = new PrismaClient({ adapter })
```

### Which Pooling Option?

| Option | Best For | Cost |
|--------|---------|------|
| Prisma Accelerate | Vercel + any Postgres | Free tier, then usage-based |
| Supabase pooler | Supabase-hosted Postgres | Included with Supabase |
| Neon serverless | Neon-hosted Postgres | Included with Neon |
| PgBouncer (self-hosted) | Self-managed infrastructure | Free (your ops time) |

---

## Reusable Query Functions

For complex or frequently-used queries, create dedicated query functions:

```typescript
// src/lib/db/queries/posts.ts
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

/** Get published posts with author, paginated. */
export const getPublishedPosts = async (
  page = 1,
  limit = 20,
) => {
  const [posts, total] = await db.$transaction([
    db.post.findMany({
      where: { published: true },
      include: { author: { select: { name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.post.count({ where: { published: true } }),
  ])

  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/** Get single post by slug — returns null if not found or not published. */
export const getPostBySlug = async (slug: string) => {
  return db.post.findUnique({
    where: { slug, published: true },
    include: { author: { select: { name: true, image: true } } },
  })
}

/** Admin: get all posts (including drafts) for the CMS. */
export const getAdminPosts = async () => {
  return db.post.findMany({
    include: { author: { select: { name: true } } },
    orderBy: { updatedAt: 'desc' },
  })
}
```

Usage in Server Components:

```tsx
// src/app/blog/page.tsx
import { getPublishedPosts } from '@/lib/db/queries/posts'

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams
  const { posts, pagination } = await getPublishedPosts(Number(page) || 1)

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <Pagination {...pagination} />
    </div>
  )
}
```

---

## Anti-Patterns

```typescript
// ❌ Instantiating PrismaClient directly — connection pool exhaustion
const db = new PrismaClient()  // New client on every import/hot reload

// ✅ Import singleton
import { db } from '@/lib/db'

// ❌ Importing Prisma in middleware — Edge Runtime crash
// src/middleware.ts
import { db } from '@/lib/db'  // Prisma can't run on Edge!

// ✅ Keep DB queries in Server Components and Route Handlers (Node.js runtime)

// ❌ Using migrate dev in production
npx prisma migrate dev  // Interactive, can drop data!

// ✅ Use migrate deploy in production
npx prisma migrate deploy  // Non-interactive, safe

// ❌ N+1 query — fetching relations in a loop
const posts = await db.post.findMany()
for (const post of posts) {
  const author = await db.user.findUnique({ where: { id: post.authorId } })  // N queries!
}

// ✅ Include relations in the original query
const posts = await db.post.findMany({
  include: { author: true },  // 1 query with JOIN
})

// ❌ No index on filtered/sorted columns
model Post {
  slug String @unique  // ✅ Unique creates index
  authorId String      // ❌ No index — slow JOIN
}

// ✅ Add indexes for foreign keys and commonly filtered columns
model Post {
  slug     String @unique
  authorId String
  @@index([authorId])
  @@index([published, createdAt])
}
```

---

## Testing with Database

For unit/component tests, **mock the database** — don't connect to a real DB:

```typescript
// In tests — mock the db module
vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    post: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
  },
}))
```

For integration tests that need a real database, use a test database:

```dotenv
# .env.test
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb_test
```

```bash
# Reset test database before test suite
DATABASE_URL=postgresql://...test npx prisma migrate reset --force
```

See ADR-0009 for full testing patterns.

---

## Rationale

### Why PostgreSQL Over Other Databases

PostgreSQL is the most versatile general-purpose database — supporting relational data, JSON (`jsonb`), full-text search, and advanced indexing in a single engine. MongoDB requires a separate indexing solution for relational queries. SQLite doesn't scale to multi-server production deploys. MySQL is viable but lacks PostgreSQL's JSON and full-text search capabilities.

### Why Prisma Over Drizzle

Prisma's declarative schema (`schema.prisma`) generates a fully typed client with zero manual type definitions. Drizzle uses "schema-as-code" which is more flexible but requires more boilerplate. Prisma's migration workflow, Studio GUI, and Auth.js adapter make it the better choice for most projects. Drizzle is the approved alternative when Edge Runtime compatibility is required.

### Why Singleton Pattern

Next.js development mode hot-reloads modules on every code change. Without the `globalForPrisma` singleton, each reload creates a new `PrismaClient` with its own connection pool, exhausting the database's connection limit within minutes. The singleton stores the client on `globalThis`, surviving hot reloads.

### Key Factors
1. **Type safety** — Prisma generates types from the schema; no manual type definitions for queries.
2. **Migration workflow** — `prisma migrate dev` creates versioned SQL files tracked in git.
3. **Auth.js adapter** — sessions, accounts, and users stored in the same database (ADR-0010).
4. **Connection pooling** — serverless environments need pooling; Prisma Accelerate, Supabase pooler, and Neon are all documented.
5. **Edge caveat** — Prisma is Node.js-only; documented with Drizzle as the edge alternative.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| PostgreSQL + Prisma | Relational DB with typed ORM | ✅ Chosen: best type safety, migration workflow, Auth.js adapter |
| PostgreSQL + Drizzle | Relational DB with edge-compatible ORM | ❌ Deferred: pre-approved alternative for edge-heavy apps |
| MongoDB + Mongoose | Document DB with ODM | ❌ Relational model better fits most structured apps |
| SQLite + Prisma | Embedded DB | ❌ Not suitable for multi-server production |
| Supabase (hosted Postgres) | Managed PostgreSQL | Hosting option — compatible with this decision |
| Neon (hosted Postgres) | Serverless PostgreSQL | Hosting option — compatible with this decision |

---

## Consequences

**Positive:**
- Database is opt-in — zero overhead for static or API-only projects.
- Prisma client singleton prevents connection exhaustion during development.
- All queries are typed — no raw SQL with `string` types.
- Migrations are version-controlled — every schema change is traceable and reviewable.
- Connection pooling options documented for serverless (Vercel) deployment.
- Reusable query functions prevent N+1 queries and promote consistency.
- Seeding script provides consistent development data.

**Negative:**
- Prisma adds a build step (`prisma generate`) — mitigated by `postinstall` script.
- Prisma does not run on Edge Runtime — mitigated by Drizzle as documented alternative.
- Prisma abstracts SQL — mitigated by `$queryRaw` escape hatch for complex queries.
- Connection pooling requires external service in serverless — mitigated by documenting three options with tradeoffs.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (server-first data fetching)
- [ADR-0005](./0005-data-fetching.md) — Data fetching (queries in Server Components)
- [ADR-0006](./0006-environment.md) — Environment (DATABASE_URL)
- [ADR-0009](./0009-testing.md) — Testing (mocking database in tests)
- [ADR-0010](./0010-authentication.md) — Authentication (Prisma adapter for Auth.js, User/Session/Account models)

