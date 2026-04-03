'use client'

import { useEffect, useState } from 'react'

import { ArrowUp } from 'lucide-react'

import { cn } from '@/lib/utils'

export const BackToTopButton = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > window.innerHeight)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type='button'
      aria-label='Back to top'
      onClick={scrollToTop}
      className={cn(
        'fixed z-50 flex size-11 items-center justify-center rounded-full border border-secondary-300 bg-secondary-100/80 text-secondary-700 backdrop-blur-sm transition-all duration-300 hover:bg-secondary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'bottom-6 left-6 lg:bottom-8 lg:left-8',
        'max-lg:left-auto max-lg:right-6',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <ArrowUp className='size-4' aria-hidden='true' />
    </button>
  )
}
