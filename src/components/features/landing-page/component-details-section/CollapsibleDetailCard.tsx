'use client'

import { useState } from 'react'

import { ChevronDown } from 'lucide-react'

import { Stack, Typography } from '@/components/ui'
import type { ComponentCardContent } from '@/dictionaries/landing-page'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

import { LayerRow } from './LayerRow'

type CollapsibleDetailCardProps = {
  card: ComponentCardContent
}

export const CollapsibleDetailCard = ({ card }: CollapsibleDetailCardProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const expanded = isDesktop || isOpen

  return (
    <article className='border-t border-white/10 py-10'>
      {isDesktop ? (
        <div className='mb-6 flex flex-wrap items-start justify-between gap-3'>
          <Typography variant='h3' as='h3'>
            {card.title}
          </Typography>
          <div className='flex items-baseline gap-2'>
            <Typography variant='overline' className='opacity-40'>
              {card.metric.label}
            </Typography>
            <Typography
              variant='h4'
              className={cn(!card.metric.muted && 'text-primary-600')}
              style={card.metric.muted ? { color: 'rgba(255,255,255,0.6)' } : undefined}
            >
              {card.metric.value}
            </Typography>
          </div>
        </div>
      ) : (
        <button
          type='button'
          aria-expanded={expanded}
          onClick={() => setIsOpen((prev) => !prev)}
          className='mb-6 flex w-full flex-wrap items-start justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-secondary-950'
        >
          <div className='flex flex-1 flex-wrap items-start justify-between gap-3'>
            <Typography variant='h3' as='h3'>
              {card.title}
            </Typography>
            <div className='flex items-baseline gap-2'>
              <Typography variant='overline' className='opacity-40'>
                {card.metric.label}
              </Typography>
              <Typography
                variant='h4'
                className={cn(!card.metric.muted && 'text-primary-600')}
                style={card.metric.muted ? { color: 'rgba(255,255,255,0.6)' } : undefined}
              >
                {card.metric.value}
              </Typography>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'mt-1 size-4 shrink-0 text-white/40 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
            aria-hidden='true'
          />
        </button>
      )}
      {expanded && (
        <Stack gap='0'>
          {card.layers.map((layer, index) => (
            <LayerRow key={`${card.title}-${layer.name}-${index}`} layer={layer} />
          ))}
        </Stack>
      )}
    </article>
  )
}
