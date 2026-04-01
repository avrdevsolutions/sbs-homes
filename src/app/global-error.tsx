'use client'

/**
 * Global error boundary for the root layout.
 *
 * This catches errors that occur in the root layout itself.
 * For route-level errors, use error.tsx in each route segment.
 *
 * MUST be a Client Component.
 * MUST render its own <html> and <body> tags.
 *
 * Note: We use <a> instead of <Link> here because global-error.tsx
 * renders outside the normal app context and Link may not work.
 */

import { useEffect } from 'react'

type GlobalErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log to error reporting service (Sentry, etc.)
    // TODO: Replace with actual error reporting when configured
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang='en'>
      <body>
        <div className='flex min-h-screen flex-col items-center justify-center bg-background px-4'>
          <div className='w-full max-w-md text-center'>
            <h1 className='mb-4 text-4xl font-bold text-foreground'>Something went wrong</h1>
            <p className='mb-6 text-secondary-600'>
              An unexpected error occurred. Our team has been notified.
            </p>
            {error.digest && (
              <p className='mb-6 font-mono text-sm text-secondary-400'>Error ID: {error.digest}</p>
            )}
            <div className='flex justify-center gap-4'>
              <button
                onClick={reset}
                className='rounded-md bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-500'
              >
                Try again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href='/'
                className='rounded-md border border-secondary-300 bg-background px-4 py-2 text-foreground transition-colors hover:bg-secondary-50'
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
