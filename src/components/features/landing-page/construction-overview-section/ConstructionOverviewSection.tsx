import { PlaceholderPanel, SectionBlockHeader } from '@/components/shared'
import { Section, Stack, Typography, buttonVariants } from '@/components/ui'
import type { ConstructionOverviewSectionContent } from '@/dictionaries/landing-page'
import { cn } from '@/lib/utils'

type ConstructionOverviewSectionProps = {
  content: ConstructionOverviewSectionContent
}

export const ConstructionOverviewSection = ({ content }: ConstructionOverviewSectionProps) => (
  <Section id={content.id} spacing='spacious' background='dark'>
    <SectionBlockHeader
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      descriptionOpacity={0.5}
      titleAs='h2'
      dark
    />
    <PlaceholderPanel label={content.placeholderLabel} dark viewport='animation' />

    {/* Reduced-motion fallback: static structural component list */}
    <div className='hidden motion-reduce:block'>
      <Stack gap='3' className='mt-10'>
        <Typography variant='overline' className='opacity-40'>
          Structural Components
        </Typography>
        <ol className='list-inside list-decimal' style={{ color: 'rgba(255,255,255,0.7)' }}>
          {content.structuralComponents.map((component) => (
            <li key={component} className='py-1.5'>
              <Typography variant='body-sm' as='span'>
                {component}
              </Typography>
            </li>
          ))}
        </ol>
      </Stack>
    </div>

    <div className='mt-8'>
      <a
        href={content.detailsLink.href}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'inline' }),
          'w-fit pb-1.5 text-white focus-visible:ring-offset-secondary-950',
        )}
      >
        {content.detailsLink.label}
      </a>
    </div>
  </Section>
)
