import { SectionBlockHeader } from '@/components/shared'
import { Section } from '@/components/ui'
import type { ComponentDetailsSectionContent } from '@/dictionaries/landing-page'

import { CollapsibleDetailCard } from './CollapsibleDetailCard'

type ComponentDetailsSectionProps = {
  content: ComponentDetailsSectionContent
}

export const ComponentDetailsSection = ({ content }: ComponentDetailsSectionProps) => (
  <Section
    id={content.id}
    spacing='spacious'
    background='dark-deeper'
    containerSize='xxl'
    containerPadding='xxl'
  >
    <SectionBlockHeader
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      centered
      dark
      titleAs='h2'
    />
    <div className='grid grid-cols-1 gap-x-12 lg:grid-cols-2'>
      {content.cards.map((card) => (
        <CollapsibleDetailCard key={card.title} card={card} />
      ))}
    </div>
  </Section>
)
