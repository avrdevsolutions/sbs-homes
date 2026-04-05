import { SectionBlockHeader } from '@/components/shared'
import { Container, Section } from '@/components/ui'
import type { InteriorLifestyleSectionContent } from '@/dictionaries/landing-page'

import { RoomPanel } from './RoomPanel'

type InteriorLifestyleSectionProps = {
  content: InteriorLifestyleSectionContent
}

export const InteriorLifestyleSection = ({ content }: InteriorLifestyleSectionProps) => {
  return (
    <Section id={content.id} spacing='none' background='warm-alt' fullBleed>
      {/* Section introduction */}
      <Container>
        <div className='pb-10 pt-26 md:pt-32 lg:pt-40'>
          <SectionBlockHeader
            eyebrow={content.eyebrow}
            title={content.title}
            description={content.description}
            titleAs='h2'
          />
        </div>
      </Container>

      {/* Room panels — full-bleed parallax image stack */}
      {content.rooms.map((room, i) => (
        <RoomPanel key={room.id} room={room} index={i} />
      ))}
    </Section>
  )
}
