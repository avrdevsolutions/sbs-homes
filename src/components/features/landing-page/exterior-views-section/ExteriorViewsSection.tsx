'use client'

import { SectionBlockHeader } from '@/components/shared'
import { Container, Section, Stack } from '@/components/ui'
import type { ExteriorViewsSectionContent } from '@/dictionaries/landing-page'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { MotionInView, useMotionEnabled } from '@/lib/motion'

import { ExteriorScrollScene } from './ExteriorScrollScene'
import { InfoLegend } from './InfoLegend'
import { PhotoStrip } from './PhotoStrip'
import { VantagePointCard } from './VantagePointCard'

type ExteriorViewsSectionProps = {
  content: ExteriorViewsSectionContent
}

export const ExteriorViewsSection = ({ content }: ExteriorViewsSectionProps) => {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const motionEnabled = useMotionEnabled()

  return (
    <Section id={content.id} spacing='none' background='warm' fullBleed>
      {/* Desktop: full-section scroll scene */}
      {motionEnabled && isDesktop && (
        <ExteriorScrollScene>
          {(progress) => (
            <>
              {/* Header row — section header left, legend right */}
              <Container>
                <div className='flex items-start justify-between gap-12 py-0'>
                  <div className='shrink-0'>
                    <SectionBlockHeader
                      eyebrow={content.eyebrow}
                      title={content.title}
                      description={content.description}
                      titleAs='h2'
                    />
                  </div>
                  <InfoLegend vantagePoints={[...content.vantagePoints]} progress={progress} />
                </div>
              </Container>

              {/* Photo cards — fills remaining viewport height */}
              <PhotoStrip vantagePoints={[...content.vantagePoints]} progress={progress} />
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
