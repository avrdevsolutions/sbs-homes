import { SectionBlockHeader } from '@/components/shared'
import { Container, Section, Stack } from '@/components/ui'
import type { ExteriorViewsSectionContent } from '@/dictionaries/landing-page'

import { ExteriorScrollGallery } from './ExteriorScrollGallery'
import { VantagePointCard } from './VantagePointCard'

type ExteriorViewsSectionProps = {
  content: ExteriorViewsSectionContent
}

export const ExteriorViewsSection = ({ content }: ExteriorViewsSectionProps) => (
  <Section id={content.id} spacing='none' fullBleed>
    {/* Desktop: Horizontal card gallery with focal scaling driven by GSAP scroll */}
    <div className='hidden md:block'>
      <ExteriorScrollGallery
        vantagePoints={content.vantagePoints}
        header={{
          eyebrow: content.eyebrow,
          title: content.title,
          description: content.description,
        }}
      />
    </div>

    {/* Mobile: Static card stack on warm background */}
    <div className='bg-secondary-100 md:hidden'>
      <Container size='xxl' padding='xxl'>
        <div className='pb-10 pt-26'>
          <SectionBlockHeader
            eyebrow={content.eyebrow}
            title={content.title}
            description={content.description}
            titleAs='h2'
          />
        </div>
      </Container>
      <Container size='xxl' padding='xxl'>
        <Stack gap='10' className='pb-26'>
          {content.vantagePoints.map((vp, i) => (
            <VantagePointCard
              key={vp.id}
              vantagePoint={vp}
              index={i}
              total={content.vantagePoints.length}
            />
          ))}
        </Stack>
      </Container>
    </div>
  </Section>
)
