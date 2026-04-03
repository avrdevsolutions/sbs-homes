'use client'

import { useState } from 'react'

import { Typography } from '@/components/ui'
import type { FloorPlanTab } from '@/dictionaries/landing-page'
import { cn } from '@/lib/utils'

type FloorPlanTabsProps = {
  tabs: FloorPlanTab[]
}

export const FloorPlanTabs = ({ tabs }: FloorPlanTabsProps) => {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <div>
      <div
        role='radiogroup'
        aria-label='Floor plan level'
        className='mb-8 flex gap-0 border border-foreground/10'
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            type='button'
            role='radio'
            aria-checked={activeIndex === index}
            onClick={() => setActiveIndex(index)}
            className={cn(
              'flex-1 px-6 py-3 font-display text-button uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              activeIndex === index
                ? 'bg-foreground text-background'
                : 'bg-transparent text-foreground/60 hover:text-foreground/80',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div aria-live='polite'>
        <div
          className='flex aspect-[4/3] w-full items-center justify-center'
          style={{ backgroundColor: 'rgba(28, 28, 30, 0.06)' }}
        >
          <Typography variant='body-sm' className='opacity-40'>
            {tabs[activeIndex].placeholderLabel}
          </Typography>
        </div>
      </div>
    </div>
  )
}
