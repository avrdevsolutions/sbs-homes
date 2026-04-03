import { PlaceholderPanel, SectionBlockHeader } from '@/components/shared'
import { Section, Stack, Typography } from '@/components/ui'
import type { AssemblySequenceSectionContent } from '@/dictionaries/landing-page'

type AssemblySequenceSectionProps = {
  content: AssemblySequenceSectionContent
}

export const AssemblySequenceSection = ({ content }: AssemblySequenceSectionProps) => (
  <Section id={content.id} spacing='spacious' background='dark-deeper'>
    <SectionBlockHeader
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      descriptionOpacity={0.5}
      titleAs='h2'
      dark
    />
    <PlaceholderPanel label={content.placeholderLabel} dark viewport='animation' />

    {/* Step progress indicator — structure for animation integration */}
    <div className='mt-6 flex items-center gap-4 motion-reduce:hidden'>
      <div className='flex gap-1.5' role='img' aria-label={`Step 1 of ${content.steps.length}`}>
        {content.steps.map((step, i) => (
          <div
            key={step.name}
            className={
              i === 0 ? 'h-1 w-8 rounded-full bg-primary-600' : 'h-1 w-6 rounded-full bg-white/10'
            }
          />
        ))}
      </div>
      <div aria-live='polite' aria-atomic='true'>
        <Typography variant='caption' style={{ color: 'rgba(255,255,255,0.4)' }}>
          Step 1 of {content.steps.length}
        </Typography>
      </div>
    </div>

    {/* Reduced-motion fallback: numbered step list */}
    <div className='hidden motion-reduce:block'>
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
    </div>
  </Section>
)
