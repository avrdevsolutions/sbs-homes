import { Section } from '@/components/ui'
import type { SystemComponentsSectionContent } from '@/dictionaries/landing-page'

import { SystemComponentsCarousel } from './SystemComponentsCarousel'

type SystemComponentsSectionProps = {
  content: SystemComponentsSectionContent
}

export const SystemComponentsSection = ({ content }: SystemComponentsSectionProps) => (
  <Section id={content.id} spacing='none' background='dark' fullBleed className='h-dvh'>
    <SystemComponentsCarousel content={content} />
  </Section>
)
