import { SectionBlockHeader } from '@/components/shared'
import { Section } from '@/components/ui'
import type { FloorPlansSectionContent } from '@/dictionaries/landing-page'

import { FloorPlanTabs } from './FloorPlanTabs'

type FloorPlansSectionProps = {
  content: FloorPlansSectionContent
}

export const FloorPlansSection = ({ content }: FloorPlansSectionProps) => (
  <Section id={content.id} spacing='standard' background='warm'>
    <SectionBlockHeader
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      titleAs='h2'
    />
    <FloorPlanTabs tabs={content.tabs} />
  </Section>
)
