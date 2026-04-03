import Image from 'next/image'

import { Container, Section, Stack, Typography, buttonVariants } from '@/components/ui'
import type { HeroSectionContent } from '@/dictionaries/landing-page'
import { cn } from '@/lib/utils'

type HeroSectionProps = {
  content: HeroSectionContent
}

export const HeroSection = ({ content }: HeroSectionProps) => (
  <Section
    id={content.id}
    spacing='none'
    background='dark'
    fullBleed
    className='relative min-h-screen overflow-hidden'
  >
    <Image
      src={content.image.src}
      alt={content.image.alt}
      width={content.image.width}
      height={content.image.height}
      className='absolute inset-0 size-full object-cover opacity-50'
      priority
    />
    <div
      className='absolute inset-0'
      style={{
        background:
          'linear-gradient(to top, rgba(20, 20, 22, 0.88) 0%, rgba(20, 20, 22, 0.35) 45%, rgba(20, 20, 22, 0.12) 100%)',
      }}
    />

    <Container className='relative z-10 flex min-h-screen items-end'>
      <Stack gap='10' className='pb-12 md:pb-18 lg:pb-20'>
        <Typography variant='section-number' className='text-primary-600'>
          {content.sectionNumber}
        </Typography>
        <Stack gap='4'>
          <Typography variant='h1' style={{ maxWidth: '15ch' }}>
            {content.title}
          </Typography>
          <Typography variant='body' style={{ maxWidth: '34ch', opacity: 0.65 }}>
            {content.subtitle}
          </Typography>
        </Stack>
        <a
          href={content.cta.href}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'inline' }),
            'w-fit pb-1.5 text-white focus-visible:ring-offset-secondary-950',
          )}
        >
          {content.cta.label}
        </a>
        <Stack direction='row' align='center' gap='3' className='mt-4' style={{ opacity: 0.35 }}>
          <div className='h-12 w-px bg-white' />
          <Typography variant='overline'>{content.scrollLabel}</Typography>
        </Stack>
      </Stack>
    </Container>
  </Section>
)
