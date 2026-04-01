# ADR-0008: Middleware

**Status**: Accepted
**Date**: 2026-02-27
**Supersedes**: Previous ADR-0008 (2026-02-26)

---

## Context

Next.js Middleware runs on the **Edge Runtime** before every matched request reaches a Route Handler or page. It's the single enforcement point for cross-cutting concerns: security headers, request tracing, auth guards, CORS, redirects, and rate limiting. Without middleware, each route must independently implement these concerns — leading to inconsistency and forgotten protections.

The Edge Runtime imposes constraints: no `fs`, no `path`, no Node.js streams, no native Node.js modules. Only Web Standard APIs and Edge-compatible libraries (like Zod) are available.

## Decision

**Use `src/middleware.ts` for all cross-cutting concerns. Compose middleware as chained functions. Set security headers by default.**

---

## Rules

| Rule | Level |
|------|-------|
| All middleware lives in `src/middleware.ts` (Next.js auto-discovers it) | **MUST** |
| Configure `matcher` to exclude static files | **MUST** |
| Set all security headers from the security headers table below | **MUST** |
| Generate a request ID (`X-Request-Id`) for every request | **MUST** |
| Wrap entire middleware in try/catch — never crash a request | **MUST** |
| Use `NextResponse.next()` to continue to route | **MUST** |
| Keep middleware fast — it runs on every matched request | **MUST** |
| Don't do heavy computation (Edge Runtime has CPU limits) | **MUST NOT** |
| Don't use Node.js-only APIs (`fs`, `path`, `crypto` node module) | **MUST NOT** |
| Don't make slow external HTTP calls (blocks the request) | **MUST NOT** |
| Don't access databases directly (use Edge-compatible clients only) | **MUST NOT** |
| Don't import large libraries (Edge bundle size limits) | **MUST NOT** |
| Use `env` from `@/lib/env` for config (Zod is Edge-compatible) | **SHOULD** |
| Use composition pattern when 3+ concerns exist | **SHOULD** |
| Log request method + path + duration for observability | **SHOULD** |

---

## Security Headers

These headers MUST be set on every response. This is the OWASP-recommended baseline:

| Header | Value | Why |
|--------|-------|-----|
| `X-Frame-Options` | `DENY` | Prevents clickjacking — page cannot be embedded in iframe |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing — browser respects declared content type |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer info sent to other origins — balances analytics and privacy |
| `X-DNS-Prefetch-Control` | `on` | Allows DNS prefetch for faster navigation (safe to enable) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS for 2 years. **Only set in production** — breaks localhost over HTTP |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables browser APIs you don't use — reduces attack surface |

### Content Security Policy (CSP) — Add When Needed

CSP is the most powerful security header but also the most complex. **Don't add it until the app has real content** — a wrong CSP breaks images, scripts, fonts, and embeds.

When ready, add CSP as a middleware function:

```typescript
// ✅ Only add CSP when you know your content sources
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Tighten with nonces later
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://api.example.com",
].join('; ')

response.headers.set('Content-Security-Policy', csp)
```

---

## Implementation

### Basic Middleware (Default — Ships With Template)

```typescript
// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

export const middleware = (request: NextRequest) => {
  try {
    const response = NextResponse.next()

    // --- Security Headers (OWASP baseline) ---
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-DNS-Prefetch-Control', 'on')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    // HSTS — only in production (breaks localhost HTTP)
    if (process.env.NODE_ENV === 'production') {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload',
      )
    }

    // --- Request ID (for tracing/debugging) ---
    const requestId = crypto.randomUUID()
    response.headers.set('X-Request-Id', requestId)
    // Pass request ID downstream so Route Handlers/Server Actions can log it
    request.headers.set('X-Request-Id', requestId)

    return response
  } catch (error) {
    // NEVER let middleware crash a request
    console.error('[Middleware Error]', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Public images
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## Middleware Composition Pattern

When middleware handles 3+ concerns, a single function becomes unreadable. Use a composition pattern:

```typescript
// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

// --- Types ---
type MiddlewareFn = (
  request: NextRequest,
  response: NextResponse,
) => NextResponse | Response | void

// --- Compose: run each function in order ---
const composeMiddleware = (...fns: MiddlewareFn[]) => {
  return (request: NextRequest): NextResponse | Response => {
    let response = NextResponse.next()

    for (const fn of fns) {
      const result = fn(request, response)
      if (result instanceof Response && result !== response) {
        return result // Early return (redirect, block, etc.)
      }
      if (result) response = result as NextResponse
    }

    return response
  }
}

// --- Individual concerns ---

const withSecurityHeaders: MiddlewareFn = (_request, response) => {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    )
  }

  return response
}

const withRequestId: MiddlewareFn = (request, response) => {
  const requestId = crypto.randomUUID()
  response.headers.set('X-Request-Id', requestId)
  request.headers.set('X-Request-Id', requestId)
  return response
}

const withRequestLogging: MiddlewareFn = (request, response) => {
  const start = Date.now()
  // Log after response is created (not after it's sent — middleware is sync)
  const { method } = request
  const { pathname } = request.nextUrl
  console.info(`[${method}] ${pathname} (${Date.now() - start}ms)`)
  return response
}

// --- Auth guard (uncomment when auth is added — ADR-0010) ---
// const withAuth: MiddlewareFn = (request, response) => {
//   const { pathname } = request.nextUrl
//   if (pathname.startsWith('/dashboard')) {
//     const token = request.cookies.get('auth-token')
//     if (!token) {
//       return NextResponse.redirect(new URL('/login', request.url))
//     }
//   }
//   return response
// }

// --- Compose all middleware ---
const composed = composeMiddleware(
  withSecurityHeaders,
  withRequestId,
  withRequestLogging,
  // withAuth,  // Uncomment when auth is added
)

export const middleware = (request: NextRequest) => {
  try {
    return composed(request)
  } catch (error) {
    console.error('[Middleware Error]', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## Path-Conditional Logic

Different paths often need different middleware behavior. Handle this inside individual middleware functions, not with multiple `config.matcher` entries:

```typescript
const withAuth: MiddlewareFn = (request, response) => {
  const { pathname } = request.nextUrl

  // Public paths — no auth needed
  const publicPaths = ['/login', '/signup', '/forgot-password', '/api/health']
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return response
  }

  // API routes — check Bearer token
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Missing Bearer token' },
        { status: 401 },
      )
    }
    return response
  }

  // Dashboard routes — check session cookie
  if (pathname.startsWith('/dashboard')) {
    const session = request.cookies.get('session')
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}
```

---

## CORS for API Routes

If your API routes are consumed by external origins (mobile apps, third-party frontends), handle CORS in middleware — not in each Route Handler:

```typescript
const withCors: MiddlewareFn = (request, response) => {
  const { pathname } = request.nextUrl

  // Only apply CORS to API routes
  if (!pathname.startsWith('/api/')) return response

  const origin = request.headers.get('Origin') ?? ''
  const allowedOrigins = ['https://myapp.com', 'https://staging.myapp.com']

  // Development: allow localhost
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:5173')
  }

  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400') // 24h preflight cache
  }

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers })
  }

  return response
}
```

---

## Rate Limiting Pattern

For basic rate limiting in middleware (per-IP, in-memory — suitable for single-server deploys):

```typescript
// ⚠️ In-memory rate limiting — works for single server only.
// For multi-server, use Redis (Upstash) or a CDN-level solution (Vercel, Cloudflare).

const rateLimit = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60_000  // 1 minute
const RATE_LIMIT_MAX = 100        // 100 requests per window

const withRateLimit: MiddlewareFn = (request, response) => {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/api/')) return response

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()
  const entry = rateLimit.get(ip)

  if (!entry || now > entry.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return response
  }

  entry.count++
  if (entry.count > RATE_LIMIT_MAX) {
    return NextResponse.json(
      { code: 'RATE_LIMITED', message: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  return response
}
```

**For production multi-server rate limiting**, use `@upstash/ratelimit` (Edge-compatible, Redis-backed):

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
})

const withRateLimit: MiddlewareFn = async (request, response) => {
  if (!request.nextUrl.pathname.startsWith('/api/')) return response

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success, limit, reset, remaining } = await ratelimit.limit(ip)

  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', reset.toString())

  if (!success) {
    return NextResponse.json(
      { code: 'RATE_LIMITED', message: 'Too many requests' },
      { status: 429, headers: response.headers },
    )
  }

  return response
}
```

---

## Edge Runtime Constraints

| Available ✅ | Not Available ❌ |
|-------------|-----------------|
| `fetch()` (Web Standard) | `fs`, `path`, `os` (Node.js modules) |
| `crypto.randomUUID()` | `crypto.createHash()` (Node.js crypto) |
| `URL`, `URLSearchParams` | Node.js `Buffer` (use `TextEncoder`) |
| `TextEncoder`, `TextDecoder` | Node.js streams |
| `Headers`, `Request`, `Response` | `child_process`, `net`, `dgram` |
| `setTimeout`, `setInterval` | Synchronous file I/O |
| `structuredClone` | Native Node.js addons |
| Zod (Edge-compatible) | Heavy ORMs (Prisma Node client) |
| `@upstash/redis` (Edge client) | `pg`, `mysql2` (TCP-based DB clients) |

**Rule**: If you need to check whether a library is Edge-compatible, look for `"edge"` in its `exports` field in `package.json`, or check if it's listed on the [Vercel Edge Runtime compatibility list](https://edge-runtime.vercel.app/packages).

---

## Anti-Patterns

```typescript
// ❌ No try/catch — middleware error crashes the entire request
export const middleware = (request: NextRequest) => {
  const response = NextResponse.next()
  response.headers.set('X-Custom', someFunction()) // if this throws, request dies
  return response
}

// ❌ Slow external API call — blocks every request
const withSlowCheck: MiddlewareFn = async (request, response) => {
  const user = await fetch('https://slow-api.com/verify')  // 200ms+ per request!
  return response
}

// ❌ Importing heavy Node.js library
import { readFileSync } from 'fs'  // Fails on Edge Runtime

// ❌ Forgetting HSTS only in production
response.headers.set('Strict-Transport-Security', 'max-age=63072000')
// ^ This breaks localhost over HTTP!

// ❌ Multiple matcher configs instead of path checks
// Don't do this — use conditional logic inside middleware functions
export const config = { matcher: ['/api/:path*', '/dashboard/:path*'] }

// ✅ Do this — single matcher, conditional logic inside
const withAuth: MiddlewareFn = (request, response) => {
  if (request.nextUrl.pathname.startsWith('/dashboard')) { ... }
  return response
}
```

---

## Rationale

### Why Middleware Over Alternatives

Next.js Middleware is the only mechanism that runs **before** the route handler for every matched request. This makes it the natural enforcement point for concerns that must apply globally. Setting security headers in `next.config.js` works for static values but can't handle dynamic logic (conditional HSTS, CORS per-origin, auth checks). Per-route headers require every route to remember — one forgotten route is a security gap.

### Key Factors
1. **Single enforcement point** — security headers, request IDs, and auth checks apply to every request without developer action per route.
2. **Edge Runtime** — runs at the CDN edge with sub-millisecond cold start, but limits available APIs. This is a tradeoff: speed and global distribution vs Node.js compatibility.
3. **Composition scales** — the `composeMiddleware` pattern keeps each concern in its own function, tested and reasoned about independently.
4. **Auth readiness** — `withAuth` is pre-structured with commented patterns for session cookies and Bearer tokens. Uncomment when auth is added (ADR-0010).
5. **CORS centralization** — handling CORS in one place prevents inconsistent headers across 20+ Route Handlers.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| Next.js Middleware (`middleware.ts`) | Edge-native, runs before every request | ✅ Chosen: framework-native, single enforcement point, composable |
| `next.config.js` headers | Static header config | ❌ Static only — can't do conditional HSTS, CORS per-origin, auth |
| Per-route headers (in Route Handlers) | Set headers in each handler | ❌ Easy to forget — one missed route is a security gap |
| Express middleware (custom server) | Node.js middleware in custom server | ❌ Loses Vercel edge deployment, adds server management complexity |
| Cloudflare Workers | Edge middleware at CDN level | ❌ Vendor-specific, requires separate deployment |

---

## Consequences

**Positive:**
- Security headers apply to every response by default — zero developer effort per route.
- Request IDs enable distributed tracing from day one.
- Composition pattern keeps middleware readable as concerns grow.
- CORS handled centrally — consistent across all API routes.
- Auth guard is pre-structured — uncomment when auth is added.
- Rate limiting pattern available for both single-server and multi-server deployments.
- Edge Runtime provides sub-millisecond latency at global CDN edge.

**Negative:**
- Edge Runtime limits available APIs — mitigated by keeping middleware thin and using Edge-compatible libraries.
- Adding slow logic impacts every request's latency — mitigated by rules prohibiting heavy computation and external API calls.
- Matcher regex can be confusing — mitigated by documenting the pattern with comments and using a single matcher with conditional logic inside functions.
- In-memory rate limiting doesn't work across multiple servers — mitigated by providing the Upstash Redis pattern for production multi-server deployments.
- HSTS must be conditional (production only) — mitigated by explicit `NODE_ENV` check with anti-pattern example.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (Edge Runtime context, Vercel deployment)
- [ADR-0006](./0006-environment.md) — Environment (env access in middleware — Zod is Edge-compatible)
- [ADR-0007](./0007-error-handling.md) — Error handling (middleware must never crash requests)
- [ADR-0010](./0010-authentication.md) — Authentication (middleware enforces auth guards)
- [ADR-0014](./0014-logging-observability.md) — Logging (X-Request-Id generated here, used in all downstream logs)


