import { PlaceholderPanel, SectionBlockHeader } from '@/components/shared'
import { Section, Typography } from '@/components/ui'
import type { PlaceholderSectionContent } from '@/dictionaries/landing-page'

type InteriorLifestyleSectionProps = {
  content: PlaceholderSectionContent
}

export const InteriorLifestyleSection = ({ content }: InteriorLifestyleSectionProps) => (
  <Section id={content.id} spacing='spacious' background='warm-alt'>
    <SectionBlockHeader
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      titleAs='h2'
    />
    {/* Animation area — hidden when reduced motion is preferred */}
    <div className='motion-reduce:hidden'>
      <PlaceholderPanel label={content.placeholderLabel} viewport='animation' />
    </div>
    {/* Reduced-motion fallback — static photo placeholder */}
    <div
      className='hidden aspect-video w-full items-center justify-center rounded-lg motion-reduce:flex'
      style={{ backgroundColor: 'rgba(28, 28, 30, 0.06)' }}
      role='img'
      aria-label='Representative interior photograph — living area and kitchen spaces'
    >
      <Typography variant='body-sm' className='opacity-40'>
        Static interior photograph placeholder
      </Typography>
    </div>
  </Section>
)
