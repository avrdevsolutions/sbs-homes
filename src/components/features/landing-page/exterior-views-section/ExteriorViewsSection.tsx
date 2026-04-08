import { Section } from '@/components/ui'
import type { ExteriorViewsSectionContent } from '@/dictionaries/landing-page'

import { ExteriorMobileGallery } from './ExteriorMobileGallery'
import { ExteriorViewsCarousel } from './ExteriorViewsCarousel'

type ExteriorViewsSectionProps = {
  content: ExteriorViewsSectionContent
}

export const ExteriorViewsSection = ({ content }: ExteriorViewsSectionProps) => (
  <Section id={content.id} spacing='none' background='warm' fullBleed>
    {/* Desktop: Scroll-reveal intro + carousel */}
    <div className='hidden md:block'>
      <ExteriorViewsCarousel content={content} />
    </div>

    {/* Mobile: Immersive stacked gallery */}
    <div className='md:hidden'>
      <ExteriorMobileGallery content={content} />
    </div>
  </Section>
)
