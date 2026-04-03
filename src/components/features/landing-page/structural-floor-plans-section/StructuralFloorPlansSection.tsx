import { SectionBlockHeader } from '@/components/shared'
import { Section } from '@/components/ui'
import type { StructuralFloorPlansSectionContent } from '@/dictionaries/landing-page'

import { StructuralLayerToggles } from './StructuralLayerToggles'

type StructuralFloorPlansSectionProps = {
  content: StructuralFloorPlansSectionContent
}

export const StructuralFloorPlansSection = ({ content }: StructuralFloorPlansSectionProps) => (
  <Section id={content.id} spacing='standard' background='dark'>
    <SectionBlockHeader
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      descriptionOpacity={0.5}
      titleAs='h2'
      dark
    />
    <StructuralLayerToggles layers={content.layers} placeholderLabel={content.placeholderLabel} />
  </Section>
)
