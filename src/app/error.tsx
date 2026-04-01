'use client'

import { useEffect } from 'react'

type ErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global error boundary for the app.
 * MUST be a Client Component (required by Next.js).
 *
 * EXAMPLE — Replace with branded error UI using your project's design tokens.
 * Replace the inline button with your project's Button component once created.
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // TODO: Replace console.error with error reporting service (e.g. Sentry).
    console.error(error)
  }, [error])

  return (
    <main className='flex min-h-screen flex-col items-center justify-center px-4'>
      <div className='max-w-md space-y-6 text-center'>
        <h1 className='text-2xl font-bold'>Something went wrong</h1>
        <p className='text-foreground/60'>An unexpected error occurred. Please try again.</p>
        {process.env.NODE_ENV === 'development' && (
          <details className='text-left text-sm'>
            <summary className='cursor-pointer font-medium'>Error details</summary>
            <pre className='mt-2 overflow-auto rounded-md bg-foreground/5 p-4 text-xs'>
              {error.message}
            </pre>
          </details>
        )}
        {/* EXAMPLE: Replace with your project's Button component */}
        <button
          onClick={reset}
          className='rounded-md bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-500'
        >
          Try again
        </button>
      </div>
    </main>
  )
}
