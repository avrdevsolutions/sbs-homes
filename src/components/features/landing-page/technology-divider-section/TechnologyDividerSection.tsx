import { Section, Separator, Typography } from '@/components/ui'
import type { DividerSectionContent } from '@/dictionaries/landing-page'

type TechnologyDividerSectionProps = {
  content: DividerSectionContent
}

export const TechnologyDividerSection = ({ content }: TechnologyDividerSectionProps) => (
  <Section
    id={content.id}
    spacing='none'
    background='dark'
    className='relative flex items-center justify-center overflow-hidden text-center'
    style={{ minHeight: '85vh' }}
  >
    <Typography
      variant='h1'
      as='span'
      className='pointer-events-none absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2'
      style={{
        fontSize: '16vw',
        letterSpacing: '0.1em',
        opacity: 0.02,
        textTransform: 'uppercase',
      }}
    >
      {content.backgroundWord}
    </Typography>
    <div className='relative z-10'>
      <Typography variant='section-number' as='p' className='mb-8 text-primary-600'>
        {content.sectionNumber}
      </Typography>
      <Typography variant='h1' as='h2' className='mx-auto' style={{ maxWidth: '16ch' }}>
        {content.title}
      </Typography>
      <Separator variant='accent' className='mx-auto mt-8 w-14 bg-primary-600 opacity-50' />
    </div>
  </Section>
)
