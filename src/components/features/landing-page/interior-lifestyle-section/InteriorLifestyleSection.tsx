'use client'

import { SectionBlockHeader } from '@/components/shared'
import { Container, Section } from '@/components/ui'
import type { InteriorLifestyleSectionContent } from '@/dictionaries/landing-page'
import { useMotionEnabled } from '@/lib/motion'

import { InteriorRoomPanel } from './InteriorRoomPanel'
import { InteriorRoomStatic } from './InteriorRoomStatic'

type InteriorLifestyleSectionProps = {
  content: InteriorLifestyleSectionContent
}

export const InteriorLifestyleSection = ({ content }: InteriorLifestyleSectionProps) => {
  const motionEnabled = useMotionEnabled()

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

      {/* Room panels */}
      {motionEnabled
        ? content.rooms.map((room, i) => <InteriorRoomPanel key={room.id} room={room} index={i} />)
        : content.rooms.map((room, i) => (
            <InteriorRoomStatic key={room.id} room={room} index={i} />
          ))}
    </Section>
  )
}
