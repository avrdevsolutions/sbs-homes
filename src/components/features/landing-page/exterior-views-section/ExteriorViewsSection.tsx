import { Container, Section } from '@/components/ui'
import type { ExteriorViewsSectionContent } from '@/dictionaries/landing-page'

import { ExteriorMobileGallery } from './ExteriorMobileGallery'
import { ExteriorViewsCarousel } from './ExteriorViewsCarousel'

type ExteriorViewsSectionProps = {
  content: ExteriorViewsSectionContent
}

export const ExteriorViewsSection = ({ content }: ExteriorViewsSectionProps) => (
  <Section id={content.id} spacing='none' fullBleed>
    {/* Desktop: Carousel */}
    <div className='hidden h-dvh bg-background md:block'>
      <Container size='xxl' padding='xxl' className='h-full'>
        <ExteriorViewsCarousel content={content} />
      </Container>
    </div>

    {/* Mobile: Immersive stacked gallery */}
    <div className='md:hidden'>
      <ExteriorMobileGallery content={content} />
    </div>
  </Section>
)
