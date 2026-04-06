import { SectionBlockHeader } from '@/components/shared'
import { Section, Stack, Typography } from '@/components/ui'
import type { AssemblySequenceSectionContent } from '@/dictionaries/landing-page'

import { AssemblyMobileList } from './AssemblyMobileList'
import { AssemblyScrollScene } from './AssemblyScrollScene'

type AssemblySequenceSectionProps = {
  content: AssemblySequenceSectionContent
}

export const AssemblySequenceSection = ({ content }: AssemblySequenceSectionProps) => (
  <>
    {/* Desktop: scroll-driven assembly animation */}
    <div className='hidden md:block'>
      <section id={content.id} aria-label={content.title}>
        {/* Sticky header inside the scroll scene */}
        <AssemblyScrollScene
          steps={content.steps}
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
        />
      </section>
    </div>

    {/* Mobile: vertical card list */}
    <div className='md:hidden'>
      <Section id={`${content.id}-mobile`} spacing='spacious' background='dark-deeper'>
        <SectionBlockHeader
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
          descriptionOpacity={0.5}
          titleAs='h2'
          dark
        />
        <AssemblyMobileList steps={content.steps} />
      </Section>
    </div>

    {/* Reduced-motion fallback: numbered step list */}
    <div className='hidden motion-reduce:block'>
      <Section id={`${content.id}-fallback`} spacing='spacious' background='dark-deeper'>
        <SectionBlockHeader
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
          descriptionOpacity={0.5}
          titleAs='h2'
          dark
        />
        <Stack gap='0' className='mt-10'>
          <Typography variant='overline' className='mb-4 opacity-40'>
            Assembly Steps
          </Typography>
          <ol className='list-none' role='list'>
            {content.steps.map((step, index) => (
              <li
                key={step.name}
                className='flex items-baseline gap-4 border-t py-4 last:border-b'
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <Typography variant='h4' className='w-8 shrink-0 text-primary-600'>
                  {String(index + 1).padStart(2, '0')}
                </Typography>
                <div>
                  <Typography variant='body-sm' style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {step.name}
                  </Typography>
                  <Typography variant='caption' style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {step.description}
                  </Typography>
                </div>
              </li>
            ))}
          </ol>
        </Stack>
      </Section>
    </div>
  </>
)
