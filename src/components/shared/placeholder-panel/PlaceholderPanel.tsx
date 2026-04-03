import { Typography } from '@/components/ui'
import { cn } from '@/lib/utils'

type PlaceholderPanelProps = {
  label: string
  dark?: boolean
  viewport?: 'content' | 'animation'
}

type PlaceholderViewport = NonNullable<PlaceholderPanelProps['viewport']>

const minHeightMap: Record<PlaceholderViewport, string> = {
  content: '30vh',
  animation: '55vh',
}

const panelOpacityMap: Record<PlaceholderViewport, number> = {
  content: 0.08,
  animation: 0.1,
}

const labelOpacityMap: Record<PlaceholderViewport, number> = {
  content: 0.8,
  animation: 1,
}

export const PlaceholderPanel = ({
  label,
  dark = false,
  viewport = 'animation',
}: PlaceholderPanelProps) => (
  <div
    style={{ minHeight: minHeightMap[viewport], opacity: panelOpacityMap[viewport] }}
    className={cn(
      'mt-10 flex items-center justify-center border border-dashed',
      dark ? 'border-white/10 text-white' : 'border-foreground/10 text-foreground',
    )}
  >
    <Typography variant='overline' style={{ opacity: labelOpacityMap[viewport] }}>
      {label}
    </Typography>
  </div>
)
