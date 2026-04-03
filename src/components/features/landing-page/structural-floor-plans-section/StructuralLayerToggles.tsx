'use client'

import { useState } from 'react'

import { Typography } from '@/components/ui'
import type { LayerTone, StructuralLayer } from '@/dictionaries/landing-page'
import { cn } from '@/lib/utils'

const toneColorMap: Record<LayerTone, string> = {
  primary: '#D4740E',
  annotation: '#D4453A',
  earth: '#8B7355',
  amber: '#D4A843',
  steel: '#556B7A',
  'steel-light': '#6E8B9E',
  stone: '#7A7A7A',
  'stone-dark': '#5A5A5A',
  sage: '#8BA8A0',
  tan: '#B5956E',
  porcelain: '#E8E4DF',
  charcoal: '#444444',
}

type StructuralLayerTogglesProps = {
  layers: StructuralLayer[]
  placeholderLabel: string
}

export const StructuralLayerToggles = ({
  layers,
  placeholderLabel,
}: StructuralLayerTogglesProps) => {
  const [activeLayers, setActiveLayers] = useState<Set<number>>(
    () => new Set(layers.map((_, i) => i)),
  )

  const toggleLayer = (index: number) => {
    setActiveLayers((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div>
      <div
        className='mb-8 flex gap-2 overflow-x-auto'
        role='group'
        aria-label='Structural layer visibility'
      >
        {layers.map((layer, index) => (
          <button
            key={layer.label}
            type='button'
            aria-pressed={activeLayers.has(index)}
            onClick={() => toggleLayer(index)}
            className={cn(
              'flex shrink-0 items-center gap-2 whitespace-nowrap border px-4 py-2.5 font-display text-button uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-secondary-950',
              activeLayers.has(index)
                ? 'border-white/20 text-white'
                : 'border-white/5 text-white/30',
            )}
          >
            <span
              className='size-2.5 rounded-full'
              style={{
                backgroundColor: toneColorMap[layer.tone],
                opacity: activeLayers.has(index) ? 1 : 0.3,
              }}
              aria-hidden='true'
            />
            {layer.label}
          </button>
        ))}
      </div>

      <div aria-live='polite'>
        <div
          className='flex aspect-[4/3] w-full items-center justify-center'
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
        >
          <Typography variant='body-sm' style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
            {placeholderLabel}
          </Typography>
        </div>
      </div>
    </div>
  )
}
