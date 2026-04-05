import Image from 'next/image'

import { SectionBlockHeader } from '@/components/shared'
import { Container, Section, Stack } from '@/components/ui'
import type { InteriorLifestyleSectionContent } from '@/dictionaries/landing-page'

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

      {/* Mobile: Static room cards */}
      <div className='md:hidden'>
        <Container>
          <div className='pb-10 pt-26'>
            <SectionBlockHeader
              eyebrow={content.eyebrow}
              title={content.title}
              description={content.description}
              titleAs='h2'
            />
          </div>
        </Container>
        <Stack gap='0'>
          {content.rooms.map((room) => (
            <div key={room.id} className='relative aspect-video w-full'>
              <Image
                src={room.image.src}
                alt={room.image.alt}
                fill
                sizes='100vw'
                className='object-cover'
              />
              <div
                className='absolute inset-0'
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)',
                }}
              />
              <div className='absolute bottom-5 left-5'>
                <span className='font-display text-eyebrow uppercase tracking-widest text-white/60'>
                  {room.title}
                </span>
                <h3 className='mt-1 font-display text-h2-sm uppercase tracking-wider text-white md:text-h2-md'>
                  {room.subtitle}
                </h3>
              </div>
            </div>
          ))}
        </Stack>
      </div>
    </Section>
  )
}
