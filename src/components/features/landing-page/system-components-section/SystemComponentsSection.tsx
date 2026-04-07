import { Container, Section } from '@/components/ui'
import type { SystemComponentsSectionContent } from '@/dictionaries/landing-page'

import { SystemComponentsCarousel } from './SystemComponentsCarousel'

type SystemComponentsSectionProps = {
  content: SystemComponentsSectionContent
}

export const SystemComponentsSection = ({ content }: SystemComponentsSectionProps) => (
  <Section id={content.id} spacing='none' background='dark' fullBleed className='h-dvh'>
    <Container size='xxl' padding='xxl' className='h-full'>
      <SystemComponentsCarousel content={content} />
    </Container>
  </Section>
)
