/**
 * Next.js Middleware
 *
 * Runs before every request. Use for:
 * - Authentication checks
 * - Redirects
 * - Request/response modification
 * - A/B testing
 * - Geolocation-based routing
 *
 * See docs/adrs/0008-middleware.md for the full strategy.
 */

import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware function.
 * Runs on Edge Runtime for every matched request.
 */
export const middleware = (_request: NextRequest) => {
  // Uncomment to use pathname for redirects or route-specific logic
  // const { pathname } = _request.nextUrl

  // Example: Add security headers
  const response = NextResponse.next()

  // Security headers (customize as needed)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Example: Redirect /old-path to /new-path
  // if (pathname === '/old-path') {
  //   return NextResponse.redirect(new URL('/new-path', request.url))
  // }

  // Example: Protect dashboard routes (uncomment when auth is added)
  // if (pathname.startsWith('/dashboard')) {
  //   const token = request.cookies.get('auth-token')
  //   if (!token) {
  //     return NextResponse.redirect(new URL('/login', request.url))
  //   }
  // }

  // Example: Add request ID for tracing
  const requestId = crypto.randomUUID()
  response.headers.set('X-Request-Id', requestId)

  return response
}

/**
 * Configure which paths middleware runs on.
 *
 * Options:
 * - matcher: Array of path patterns
 * - Supports wildcards and named params
 *
 * Exclude:
 * - _next/static (static files)
 * - _next/image (image optimization)
 * - favicon.ico
 * - Public files
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images in public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
