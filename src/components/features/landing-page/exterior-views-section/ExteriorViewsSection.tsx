'use client'

import { SectionBlockHeader } from '@/components/shared'
import { Container, Section, Stack } from '@/components/ui'
import type { ExteriorViewsSectionContent } from '@/dictionaries/landing-page'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { MotionInView, useMotionEnabled } from '@/lib/motion'

import { ExteriorScrollScene } from './ExteriorScrollScene'
import { ImageCrossfade } from './ImageCrossfade'
import { InfoLegend } from './InfoLegend'
import { VantagePointCard } from './VantagePointCard'

type ExteriorViewsSectionProps = {
  content: ExteriorViewsSectionContent
}

export const ExteriorViewsSection = ({ content }: ExteriorViewsSectionProps) => {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const motionEnabled = useMotionEnabled()

  return (
    <Section id={content.id} spacing='none' background='warm' fullBleed>
      {/* Desktop: cinematic full-viewport gallery */}
      {motionEnabled && isDesktop && (
        <ExteriorScrollScene>
          {(progress) => (
            <>
              {/* Full-bleed crossfading images */}
              <ImageCrossfade vantagePoints={[...content.vantagePoints]} progress={progress} />

              {/* Floating content layer — on top of images */}
              <div className='relative z-10 flex size-full flex-col justify-between'>
                {/* Top — section header, white text on dark radial */}
                <div className='px-5 pt-12 md:px-10 md:pt-16 lg:px-14 lg:pt-20'>
                  <SectionBlockHeader
                    eyebrow={content.eyebrow}
                    title={content.title}
                    description={content.description}
                    titleAs='h2'
                    dark
                  />
                </div>

                {/* Bottom-left — light frosted legend */}
                <div className='px-5 pb-10 md:px-10 md:pb-14 lg:px-14 lg:pb-16'>
                  <InfoLegend vantagePoints={[...content.vantagePoints]} progress={progress} />
                </div>
              </div>
            </>
          )}
        </ExteriorScrollScene>
      )}

      {/* Mobile: static header + MotionInView card stack */}
      {motionEnabled && !isDesktop && (
        <>
          <Container>
            <div className='pb-10 pt-26 md:pt-32'>
              <SectionBlockHeader
                eyebrow={content.eyebrow}
                title={content.title}
                description={content.description}
                titleAs='h2'
              />
            </div>
          </Container>
          <Container>
            <Stack gap='10' className='pb-26 md:pb-32'>
              {content.vantagePoints.map((vp, i) => (
                <MotionInView key={vp.id} direction='up' distance={30} delay={i * 0.1} once>
                  <VantagePointCard
                    vantagePoint={vp}
                    index={i}
                    total={content.vantagePoints.length}
                  />
                </MotionInView>
              ))}
            </Stack>
          </Container>
        </>
      )}

      {/* Reduced motion: static */}
      {!motionEnabled && (
        <>
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
          <Container>
            <Stack gap='10' className='pb-26 md:pb-32 lg:pb-40'>
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
        </>
      )}
    </Section>
  )
}
