import { Section } from '@/components/ui'
import type { InteriorLifestyleSectionContent } from '@/dictionaries/landing-page'

import { InteriorMobileGallery } from './InteriorMobileGallery'
import { InteriorScrollGallery } from './InteriorScrollGallery'

type InteriorLifestyleSectionProps = {
  content: InteriorLifestyleSectionContent
}

export const InteriorLifestyleSection = ({ content }: InteriorLifestyleSectionProps) => {
  return (
    <Section id={content.id} spacing='none' background='warm-alt' fullBleed>
      {/* Desktop: Pinned crossfade gallery — header starts centered, moves to top */}
      <div className='hidden md:block'>
        <InteriorScrollGallery
          rooms={content.rooms}
          header={{
            eyebrow: content.eyebrow,
            title: content.title,
            description: content.description,
          }}
        />
      </div>

      {/* Mobile: Static room cards with lightbox */}
      <div className='md:hidden'>
        <InteriorMobileGallery
          rooms={content.rooms}
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
        />
      </div>
    </Section>
  )
}
