import { Container, Section } from '@/components/ui'
import type { ExteriorViewsSectionContent } from '@/dictionaries/landing-page'

import { ExteriorViewsCarousel } from './ExteriorViewsCarousel'

type ExteriorViewsSectionProps = {
  content: ExteriorViewsSectionContent
}

export const ExteriorViewsSection = ({ content }: ExteriorViewsSectionProps) => (
  <Section id={content.id} spacing='none' fullBleed>
    <div className='h-dvh bg-background'>
      <Container size='xxl' padding='xxl' className='h-full'>
        <ExteriorViewsCarousel content={content} />
      </Container>
    </div>
  </Section>
)
