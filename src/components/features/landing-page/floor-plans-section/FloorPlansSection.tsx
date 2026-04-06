import { SectionBlockHeader } from '@/components/shared'
import { Section } from '@/components/ui'
import type { FloorPlansSectionContent } from '@/dictionaries/landing-page'

import { FloorPlanTabs } from './FloorPlanTabs'

type FloorPlansSectionProps = {
  content: FloorPlansSectionContent
  background?: 'default' | 'warm' | 'warm-alt' | 'dark' | 'dark-deeper'
  className?: string
}

export const FloorPlansSection = ({
  content,
  background = 'warm',
  className,
}: FloorPlansSectionProps) => (
  <Section id={content.id} spacing='standard' background={background} className={className}>
    <SectionBlockHeader
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      titleAs='h2'
    />
    <FloorPlanTabs tabs={content.tabs} />
  </Section>
)
