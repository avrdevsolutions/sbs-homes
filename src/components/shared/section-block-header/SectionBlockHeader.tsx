import { Separator, Stack, Typography } from '@/components/ui'
import { cn } from '@/lib/utils'

type SectionBlockHeaderProps = {
  eyebrow: string
  title: string
  description?: string
  descriptionOpacity?: 0.5 | 0.6
  centered?: boolean
  dark?: boolean
  titleAs?: 'h1' | 'h2' | 'h3'
}

export const SectionBlockHeader = ({
  eyebrow,
  title,
  description,
  descriptionOpacity = 0.6,
  centered = false,
  dark = false,
  titleAs = 'h2',
}: SectionBlockHeaderProps) => (
  <Stack gap='6' className={cn('mb-10', centered && 'mx-auto text-center')}>
    <Typography variant='overline' className='text-primary-600'>
      {eyebrow}
    </Typography>
    <Typography
      variant='h2'
      as={titleAs}
      className={cn(centered && 'mx-auto', dark && 'text-white')}
      style={{ maxWidth: '22ch' }}
    >
      {title}
    </Typography>
    {description ? (
      <Typography
        variant='body'
        className={cn('text-foreground', centered && 'mx-auto', dark && 'text-white')}
        style={{ maxWidth: centered ? '48ch' : '44ch', opacity: descriptionOpacity }}
      >
        {description}
      </Typography>
    ) : null}
    <Separator
      variant='accent'
      className={cn('w-12 bg-primary-600 opacity-50', centered && 'mx-auto')}
    />
  </Stack>
)
