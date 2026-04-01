import Link from 'next/link'

/**
 * 404 Not Found page.
 *
 * EXAMPLE — Replace with branded 404 UI using your project's design tokens.
 * Replace the inline link/button with your project's Button component once created.
 */
export default function NotFound() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center px-4'>
      <div className='space-y-6 text-center'>
        <h1 className='text-6xl font-bold'>404</h1>
        <h2 className='text-2xl font-semibold text-foreground/70'>Page Not Found</h2>
        <p className='max-w-md text-foreground/60'>The page you are looking for does not exist.</p>
        {/* EXAMPLE: Replace with your project's Button component */}
        <Link
          href='/'
          className='inline-block rounded-md bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-500'
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
