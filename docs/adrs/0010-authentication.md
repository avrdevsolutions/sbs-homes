# ADR-0010: Authentication & Authorization

**Status**: Accepted (opt-in — implement when needed)
**Date**: 2026-02-27
**Supersedes**: Previous ADR-0010 (2026-02-26)

---

## Context

Authentication (who are you?) and authorization (what can you do?) are needed for any project that has user-specific data, admin panels, CMS areas, API protection, or role-based access. Even "simple" marketing sites often need a hidden CMS panel for content management. The auth system must integrate cleanly with the full Next.js stack: middleware (route protection), Server Components (session access), Route Handlers (API auth), and Server Actions (mutation auth).

This ADR covers the complete auth architecture — from OAuth provider config to role-based access control to the hidden-admin-panel pattern. Auth is opt-in (not installed by default) but when adopted, every pattern must be followed exactly.

## Decision

**Auth.js (NextAuth.js v5) for authentication. Database sessions (not JWT). Role-based access control via a `role` field on the User model. Middleware for route-level protection. Server-side session checks in every context.**

---

## Why Auth.js

| Factor | Auth.js | Clerk | Auth0 | Custom JWT |
|--------|---------|-------|-------|------------|
| Self-hosted | ✅ Full control | ❌ Managed service | ❌ Managed service | ✅ Full control |
| Cost | Free | $25+/mo at scale | Complex pricing | Free (your time) |
| Vendor lock-in | None | High | High | None |
| OAuth providers | 50+ built-in | 30+ | Unlimited | Manual per provider |
| Next.js App Router | Native (`auth()` everywhere) | Good (SDK) | Decent (SDK) | Manual |
| Database sessions | ✅ Prisma adapter | N/A (managed) | N/A (managed) | Manual |
| Setup complexity | Medium | Low | Medium | Very High |
| Security risk | Low (community-audited) | Low (managed) | Low (managed) | **High** (DIY) |

**Auth.js wins because**: self-hosted (no vendor lock-in, no recurring cost), native Next.js integration (`auth()` works in Server Components, middleware, Route Handlers, and Server Actions), and the Prisma adapter stores sessions/accounts in your own database.

---

## Session Strategy: Database Sessions Over JWT

| Factor | Database Sessions | JWT Sessions |
|--------|------------------|--------------|
| Revocation | ✅ Delete session row → instant logout | ❌ Token valid until expiry (can't revoke) |
| Session data | ✅ Can store arbitrary data server-side | ❌ Limited by token size (4KB cookie limit) |
| Scalability | Needs DB query per request | Stateless — no DB needed |
| Security | Session ID in cookie → data on server | All data in cookie → exposed to client |
| Admin "kick user" | ✅ Delete their session row | ❌ Can't force logout until token expires |

**We use database sessions because**: the ability to instantly revoke sessions (admin kick, password change, suspicious activity) outweighs the cost of one DB query per request. For most applications, the DB query is <5ms with connection pooling.

**If you need stateless auth** (e.g., microservices, API-to-API): use JWT with short expiry (15 min) + refresh tokens. But for user-facing web apps, database sessions are safer.

---

## File Structure

```
src/
  lib/
    auth/
      config.ts              # Auth.js configuration (providers, callbacks, adapter)
      index.ts               # Re-exports auth(), signIn(), signOut()
  app/
    api/auth/[...nextauth]/
      route.ts               # Auth.js route handler (GET + POST)
    (auth)/                   # Public auth pages (no session required)
      login/
        page.tsx
      signup/                 # Optional — for email/password flows
        page.tsx
    (protected)/              # Protected route group — all pages require session
      layout.tsx              # Checks session, redirects to /login if missing
      dashboard/
        page.tsx
      settings/
        page.tsx
    (admin)/                  # Admin-only route group — requires admin role
      layout.tsx              # Checks session + role === 'ADMIN'
      cms/
        page.tsx
        posts/
          page.tsx
          new/
            page.tsx
          [id]/
            edit/
              page.tsx
  middleware.ts               # Route-level protection (see ADR-0008)
prisma/
  schema.prisma               # User, Account, Session models (Auth.js adapter)
```

---

## Rules

### General

| Rule | Level |
|------|-------|
| Check session server-side — never trust client-only checks | **MUST** |
| Use `auth()` from `@/lib/auth` — never access cookies/headers directly for auth | **MUST** |
| Use database sessions, not JWT | **MUST** |
| Restrict OAuth to specific emails/domains when building admin panels | **MUST** |
| Define roles in the Prisma schema as an enum | **MUST** |
| Check role in the layout of protected route groups | **MUST** |
| Never expose session secrets or user passwords in API responses | **MUST NOT** |
| Never check auth only on the client — always verify server-side | **MUST NOT** |
| Log auth events (sign-in, sign-out, failed attempts) | **SHOULD** |

### Route Protection

| Rule | Level |
|------|-------|
| Protect routes in middleware for fast rejection (before rendering) | **MUST** |
| Double-check session in protected layout (defense in depth) | **MUST** |
| Check role in admin layouts — not just "is authenticated" | **MUST** |
| Use route groups `(protected)/`, `(admin)/` for organized protection | **SHOULD** |
| Public pages in `(auth)/` group (login, signup, forgot-password) | **SHOULD** |

### API Protection

| Rule | Level |
|------|-------|
| Check `await auth()` in every protected Route Handler | **MUST** |
| Check `await auth()` in every protected Server Action | **MUST** |
| Return `ErrorCode.UNAUTHORIZED` (401) for missing session | **MUST** |
| Return `ErrorCode.FORBIDDEN` (403) for insufficient role | **MUST** |
| Support Bearer token auth for API-to-API calls | **SHOULD** |

---

## Implementation

### Step 1: Install

```bash
pnpm add next-auth@beta @auth/prisma-adapter
```

### Step 2: Environment Variables

Add to `src/lib/env.ts` schema:

```typescript
// Add to envSchema in src/lib/env.ts
AUTH_SECRET: z.string().min(32),                    // Required — session encryption
AUTH_URL: z.string().url().optional(),              // Set in production (e.g., https://myapp.com)
GOOGLE_CLIENT_ID: z.string().min(1).optional(),     // For Google OAuth
GOOGLE_CLIENT_SECRET: z.string().min(1).optional(), // For Google OAuth
```

Add to `.env.local`:

```dotenv
# Generate with: openssl rand -base64 32
AUTH_SECRET=your-generated-secret-here

# Google OAuth — get from https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Step 3: Prisma Schema

```prisma
// prisma/schema.prisma

enum Role {
  USER
  ADMIN
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          Role      @default(USER)
  accounts      Account[]
  sessions      Session[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

### Step 4: Auth.js Configuration

```typescript
// src/lib/auth/config.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'

import { db } from '@/lib/db'
import { env } from '@/lib/env'

import type { Role } from '@prisma/client'

// Extend the session type to include role
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: Role
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'database' },    // Database sessions — not JWT
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    // Add more providers as needed:
    // GitHub({ clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET }),
  ],
  callbacks: {
    session: ({ session, user }) => {
      // Add user ID and role to the session object
      session.user.id = user.id
      session.user.role = (user as { role: Role }).role
      return session
    },
    signIn: async ({ user, account }) => {
      // --- OPTIONAL: Restrict sign-in to specific emails/domains ---
      // Uncomment and customize for admin-only panels:
      //
      // const allowedEmails = ['vlad@avrdevsolutions.com']
      // const allowedDomains = ['avrdevsolutions.com']
      //
      // const email = user.email?.toLowerCase()
      // if (!email) return false
      //
      // const isAllowed =
      //   allowedEmails.includes(email) ||
      //   allowedDomains.some((d) => email.endsWith(`@${d}`))
      //
      // if (!isAllowed) {
      //   console.warn(`[Auth] Rejected sign-in: ${email}`)
      //   return false
      // }

      return true
    },
  },
  pages: {
    signIn: '/login',          // Custom login page
    error: '/login',           // Redirect auth errors to login
  },
  events: {
    signIn: ({ user }) => {
      console.info(`[Auth] Sign in: ${user.email}`)
    },
    signOut: ({ session }) => {
      console.info(`[Auth] Sign out: ${session?.userId}`)
    },
  },
})
```

### Step 5: Auth Barrel Export

```typescript
// src/lib/auth/index.ts
export { auth, signIn, signOut, handlers } from './config'
```

### Step 6: Route Handler

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

---

## Auth Checks Per Context

### Server Component

```tsx
// src/app/(protected)/dashboard/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <p>Role: {session.user.role}</p>
    </div>
  )
}
```

### Protected Layout (Route Group)

```tsx
// src/app/(protected)/layout.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return <>{children}</>
}
```

### Admin Layout (Role Check)

```tsx
// src/app/(admin)/layout.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') notFound()  // Don't reveal admin routes exist

  return <>{children}</>
}
```

**Why `notFound()` instead of `redirect('/login')`?** An authenticated user who isn't an admin shouldn't know the admin route exists. Returning 404 is more secure than redirecting to an "access denied" page — it reveals nothing about the app's structure.

### Route Handler

```typescript
// src/app/api/posts/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ErrorCode, ErrorHttpStatus } from '@contracts/common'
import type { ApiError } from '@contracts/common'

export const POST = async (request: Request) => {
  const session = await auth()

  if (!session) {
    return NextResponse.json(
      { code: ErrorCode.UNAUTHORIZED, message: 'Authentication required' } satisfies ApiError,
      { status: ErrorHttpStatus[ErrorCode.UNAUTHORIZED] },
    )
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { code: ErrorCode.FORBIDDEN, message: 'Admin access required' } satisfies ApiError,
      { status: ErrorHttpStatus[ErrorCode.FORBIDDEN] },
    )
  }

  // ... proceed with creation
}
```

### Server Action

```typescript
// src/app/(admin)/cms/posts/_actions/createPost.ts
'use server'

import { auth } from '@/lib/auth'
import { ErrorCode } from '@contracts/common'
import type { ServerActionResult } from '@contracts/common'

export const createPost = async (input: unknown): ServerActionResult<{ id: string }> => {
  const session = await auth()

  if (!session) {
    return { ok: false, error: { code: ErrorCode.UNAUTHORIZED, message: 'Not authenticated' } }
  }

  if (session.user.role !== 'ADMIN') {
    return { ok: false, error: { code: ErrorCode.FORBIDDEN, message: 'Admin access required' } }
  }

  // ... validate input, create post
}
```

### Client Component

```tsx
// src/components/features/user-menu/UserMenu.tsx
'use client'

import { useSession, signOut } from 'next-auth/react'

export const UserMenu = () => {
  const { data: session, status } = useSession()

  if (status === 'loading') return <UserMenuSkeleton />
  if (!session) return <LoginButton />

  return (
    <div>
      <span>{session.user.name}</span>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  )
}
```

**Note**: Client-side `useSession()` is for UI rendering only. It is NOT a security check. Always verify the session server-side.

### Middleware (Route-Level Protection)

```typescript
// In src/middleware.ts — add to composition chain (see ADR-0008)
import { auth } from '@/lib/auth'

const withAuth: MiddlewareFn = async (request, response) => {
  const { pathname } = request.nextUrl

  // Public paths — no auth needed
  const publicPaths = ['/login', '/signup', '/api/auth', '/api/health']
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return response
  }

  // Protected paths — require session
  const protectedPaths = ['/dashboard', '/settings', '/cms', '/api/posts']
  const needsAuth = protectedPaths.some((p) => pathname.startsWith(p))

  if (!needsAuth) return response

  const session = await auth()

  if (!session) {
    // API routes → 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    // Pages → redirect to login with callback
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin paths — require ADMIN role
  const adminPaths = ['/cms']
  const needsAdmin = adminPaths.some((p) => pathname.startsWith(p))

  if (needsAdmin && session.user.role !== 'ADMIN') {
    return NextResponse.rewrite(new URL('/not-found', request.url))  // Hide admin routes
  }

  return response
}
```

---

## The CMS Admin Panel Pattern

A common pattern: marketing site is public, but there's a hidden `/cms` area for content management, only accessible by specific Google accounts.

### Architecture

```
myapp.com/             → Public (marketing pages)
myapp.com/login        → Google OAuth (anyone can try)
myapp.com/cms/         → Admin panel (only allowed emails)
myapp.com/cms/posts    → Content management
myapp.com/api/posts    → API (admin-write, public-read)
```

### Email Restriction in Auth.js

```typescript
// src/lib/auth/config.ts — in the signIn callback
signIn: async ({ user }) => {
  const email = user.email?.toLowerCase()
  if (!email) return false

  // Option 1: Specific email whitelist
  const allowedEmails = ['vlad@avrdevsolutions.com', 'admin@avrdevsolutions.com']
  if (allowedEmails.includes(email)) return true

  // Option 2: Domain whitelist (any @avrdevsolutions.com email)
  const allowedDomains = ['avrdevsolutions.com']
  if (allowedDomains.some((d) => email.endsWith(`@${d}`))) return true

  // Option 3: Check database for allowed users
  // const user = await db.user.findUnique({ where: { email } })
  // if (user) return true

  console.warn(`[Auth] Rejected sign-in: ${email}`)
  return false  // Reject — user sees error page
},
```

### Auto-Assign Admin Role

```typescript
// In Auth.js events — auto-admin first allowed user
events: {
  createUser: async ({ user }) => {
    // First user gets ADMIN, or check against an allow-list
    const adminEmails = ['vlad@avrdevsolutions.com']
    if (user.email && adminEmails.includes(user.email.toLowerCase())) {
      await db.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      })
      console.info(`[Auth] Auto-assigned ADMIN role to ${user.email}`)
    }
  },
},
```

### CMS Page Example

```tsx
// src/app/(admin)/cms/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CmsPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const postCount = await db.post.count()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Management</h1>
      <div className="grid grid-cols-3 gap-4">
        <Link href="/cms/posts" className="rounded-lg border p-6 hover:bg-primary-50">
          <h2 className="font-semibold">Posts</h2>
          <p className="text-gray-600">{postCount} posts</p>
        </Link>
        {/* Add more CMS sections */}
      </div>
    </div>
  )
}
```

---

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
ADMIN → Can do everything (CMS, user management, content CRUD)
USER  → Authenticated user (own profile, own data, read public content)
(anonymous) → Public content only
```

### Extend Roles When Needed

```prisma
enum Role {
  USER
  EDITOR    // Can manage content but not users
  ADMIN     // Full access
}
```

### Auth Helper Functions

```typescript
// src/lib/auth/helpers.ts
import { auth } from './config'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { ErrorCode } from '@contracts/common'
import type { Session } from 'next-auth'
import type { Role } from '@prisma/client'

/**
 * Get session or redirect to login.
 * Use in Server Components and Server Actions.
 */
export const requireAuth = async (): Promise<Session> => {
  const session = await auth()
  if (!session) redirect('/login')
  return session
}

/**
 * Get session and verify role, or 404.
 * Use in admin pages.
 */
export const requireRole = async (role: Role): Promise<Session> => {
  const session = await requireAuth()
  if (session.user.role !== role) notFound()
  return session
}

/**
 * Get session for Route Handlers — returns null instead of redirecting.
 * Use in Route Handlers and Server Actions.
 */
export const getAuthOrNull = async (): Promise<Session | null> => {
  return auth()
}
```

Usage:

```tsx
// In a Server Component — redirects to login if not authenticated
const session = await requireAuth()

// In an admin page — returns 404 if not admin
const session = await requireRole('ADMIN')

// In a Route Handler — manual error handling
const session = await getAuthOrNull()
if (!session) return unauthorizedResponse()
```

---

## Login Page

```tsx
// src/app/(auth)/login/page.tsx
import { signIn } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const session = await auth()
  const { callbackUrl, error } = await searchParams

  // Already logged in — redirect
  if (session) redirect(callbackUrl || '/dashboard')

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-lg border p-8">
        <h1 className="text-center text-2xl font-bold">Sign In</h1>

        {error && (
          <p className="rounded-md bg-error-50 p-3 text-sm text-error-700" role="alert">
            {error === 'AccessDenied'
              ? 'You are not authorized to access this application.'
              : 'An error occurred during sign in. Please try again.'}
          </p>
        )}

        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: callbackUrl || '/dashboard' })
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 hover:bg-gray-50"
          >
            <GoogleIcon className="h-5 w-5" />
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  )
}
```

---

## SessionProvider (Client Components)

```tsx
// src/providers/SessionProvider.tsx
'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

export const SessionProvider = ({ children }: { children: React.ReactNode }) => (
  <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
)
```

Add to root layout:

```tsx
// src/app/layout.tsx
import { SessionProvider } from '@/providers/SessionProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

---

## Sign Out

```tsx
// Server-side sign out (Server Action)
import { signOut } from '@/lib/auth'

export const handleSignOut = async () => {
  'use server'
  await signOut({ redirectTo: '/' })
}

// Client-side sign out
import { signOut } from 'next-auth/react'

<button onClick={() => signOut({ callbackUrl: '/' })}>Sign out</button>
```

---

## Security Checklist

When implementing auth, verify:

- [ ] `AUTH_SECRET` is 32+ characters, generated with `openssl rand -base64 32`
- [ ] `AUTH_SECRET` is NOT committed to git (in `.env.local` only)
- [ ] Session strategy is `'database'` (not `'jwt'`)
- [ ] Protected routes check session in both middleware AND layout (defense in depth)
- [ ] Admin routes return `notFound()` for non-admins (don't reveal existence)
- [ ] Route Handlers return `ErrorCode.UNAUTHORIZED` / `ErrorCode.FORBIDDEN` (not redirect)
- [ ] Server Actions check session before processing mutations
- [ ] `useSession()` is only used for UI — never as a security check
- [ ] Email restriction is in the `signIn` callback (not just the middleware)
- [ ] Auth events are logged (sign-in, sign-out, rejected attempts)
- [ ] OAuth redirect URIs are configured correctly in provider console
- [ ] CSRF protection is enabled (Auth.js handles this by default)
- [ ] Session cookies are `httpOnly`, `secure`, `sameSite: 'lax'` (Auth.js defaults)

---

## Anti-Patterns

```typescript
// ❌ Client-only auth check — can be bypassed
'use client'
export const AdminPage = () => {
  const { data: session } = useSession()
  if (session?.user.role !== 'ADMIN') return <AccessDenied />
  return <AdminPanel />  // Client still has the code — just hidden
}

// ✅ Server-side auth check — code never reaches client
export default async function AdminPage() {
  const session = await requireRole('ADMIN')  // Redirects or 404 before render
  return <AdminPanel />
}

// ❌ Revealing admin routes to non-admins
if (session.user.role !== 'ADMIN') redirect('/access-denied')

// ✅ Hiding admin routes
if (session.user.role !== 'ADMIN') notFound()  // Looks like page doesn't exist

// ❌ Checking auth in component but not in Server Action
export const deletePost = async (id: string): ServerActionResult<void> => {
  // Anyone can call this! No auth check!
  await db.post.delete({ where: { id } })
}

// ✅ Auth check in every Server Action
export const deletePost = async (id: string): ServerActionResult<void> => {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return { ok: false, error: { code: ErrorCode.FORBIDDEN, message: 'Not authorized' } }
  }
  await db.post.delete({ where: { id } })
}

// ❌ Hardcoded secret in code
const secret = 'my-secret-key'

// ✅ Secret from validated env
const secret = env.AUTH_SECRET
```

---

## Rationale

### Why Auth.js Over Managed Services

Managed services (Clerk, Auth0) provide excellent DX but create vendor dependency: your users, sessions, and auth logic live on someone else's infrastructure. Auth.js is self-hosted, free, and your data stays in your database. For a template that builds any project, vendor independence is non-negotiable.

### Why Database Sessions Over JWT

JWT sessions can't be revoked. If an admin account is compromised, you can't force logout — the JWT is valid until it expires. Database sessions let you delete the session row for instant revocation. The cost is one DB query per request, which is <5ms with connection pooling — negligible for user-facing web apps.

### Why `notFound()` for Unauthorized Admin Access

Returning "Access Denied" confirms the route exists. An attacker now knows there's an admin panel at `/cms`. Returning 404 reveals nothing — the route looks like it doesn't exist. This is a standard security practice called "security through obscurity" used as a defense layer (not the sole protection).

### Why Defense in Depth (Middleware + Layout + Action)

Auth checks at three levels prevent bypasses:
1. **Middleware** — fast rejection before rendering (Edge Runtime, sub-ms)
2. **Layout** — server-side check before the page component runs
3. **Server Action / Route Handler** — verify before every mutation

If middleware has a bug, the layout catches it. If both fail, the Server Action rejects the mutation. No single point of failure.

### Key Factors
1. **Self-hosted** — no vendor lock-in, no recurring cost, full data control.
2. **Database sessions** — instant revocation, arbitrary session data, admin "kick user" capability.
3. **Role field on User** — simple RBAC that covers 90% of use cases without a complex permissions table.
4. **CMS pattern** — hidden admin panels with OAuth email restriction are a common real-world need.
5. **Defense in depth** — three layers of auth checks prevent single-point-of-failure bypasses.
6. **Typed sessions** — `session.user.role` is typed as `Role` via module augmentation.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| Auth.js (NextAuth v5) | Self-hosted auth for Next.js | ✅ Chosen: self-hosted, 50+ providers, native App Router, Prisma adapter |
| Clerk | Managed auth service | ❌ Vendor lock-in, recurring cost at scale, less control |
| Auth0 | Managed auth platform | ❌ Vendor lock-in, complex pricing, heavier SDK |
| Supabase Auth | Auth with Supabase | ❌ Couples auth to Supabase ecosystem |
| Custom JWT | Build from scratch | ❌ High security risk, significant development effort |
| Database sessions | Server-side session storage | ✅ Chosen: instant revocation, unlimited session data |
| JWT sessions | Stateless tokens | ❌ Can't revoke, limited by cookie size, all data exposed to client |

---

## Consequences

**Positive:**
- Auth is opt-in — zero overhead for projects that don't need it.
- When added, defense-in-depth (middleware + layout + action) prevents auth bypasses.
- Database sessions enable instant revocation and unlimited session data.
- CMS admin panel pattern is documented with email restriction and auto-admin assignment.
- Typed sessions with role via module augmentation — `session.user.role` is `Role`, not `string`.
- Auth helpers (`requireAuth`, `requireRole`) reduce boilerplate in every protected page.
- Auth events are logged for audit trail.

**Negative:**
- Auth.js v5 is still in beta — mitigated by pinning version and monitoring releases.
- Database sessions require a DB query per request — mitigated by connection pooling (<5ms).
- Self-hosted auth requires more initial setup than managed services — mitigated by step-by-step implementation guide.
- Email restriction in `signIn` callback is a manual list — mitigated by offering domain-based and DB-based options.
- `notFound()` for non-admins may confuse legitimate users — mitigated by being intentional (security > convenience for admin routes).

## Related ADRs

- [ADR-0005](./0005-data-fetching.md) — Data fetching (auth headers on fetch calls)
- [ADR-0006](./0006-environment.md) — Environment (AUTH_SECRET, OAuth client IDs)
- [ADR-0007](./0007-error-handling.md) — Error handling (UNAUTHORIZED, FORBIDDEN error codes)
- [ADR-0008](./0008-middleware.md) — Middleware (withAuth composition, route-level protection)
- [ADR-0009](./0009-testing.md) — Testing (mocking auth in tests)
- [ADR-0011](./0011-database.md) — Database (Prisma schema for User, Session, Account models)

