import { Stack, Typography } from '@/components/ui'
import type { ComponentLayer, LayerTone } from '@/dictionaries/landing-page'

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

type LayerRowProps = {
  layer: ComponentLayer
}

export const LayerRow = ({ layer }: LayerRowProps) => (
  <Stack
    direction='row'
    align='center'
    justify='between'
    gap='3'
    className='border-b py-2 last:border-b-0'
    style={{ borderBottomColor: 'rgba(255, 255, 255, 0.04)' }}
  >
    <Stack direction='row' align='center' gap='3'>
      <span
        className='rounded-full'
        style={{ width: '6px', height: '6px', backgroundColor: toneColorMap[layer.tone] }}
        aria-hidden='true'
      />
      <Typography variant='body-sm' style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
        {layer.name}
      </Typography>
    </Stack>
    <Typography variant='caption' style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
      {layer.dimension}
    </Typography>
  </Stack>
)
