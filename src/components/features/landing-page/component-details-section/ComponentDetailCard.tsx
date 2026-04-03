import { Stack, Typography } from '@/components/ui'
import type { ComponentCardContent } from '@/dictionaries/landing-page'
import { cn } from '@/lib/utils'

import { LayerRow } from './LayerRow'

type ComponentDetailCardProps = {
  card: ComponentCardContent
}

export const ComponentDetailCard = ({ card }: ComponentDetailCardProps) => (
  <article className='border-t border-white/10 py-10'>
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
    <Stack gap='0'>
      {card.layers.map((layer, index) => (
        <LayerRow key={`${card.title}-${layer.name}-${index}`} layer={layer} />
      ))}
    </Stack>
  </article>
)
