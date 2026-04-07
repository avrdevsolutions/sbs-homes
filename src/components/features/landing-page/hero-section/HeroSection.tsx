import { Section, Typography, buttonVariants } from '@/components/ui'
import type { HeroSectionContent } from '@/dictionaries/landing-page'
import { cn } from '@/lib/utils'

type HeroSectionProps = {
  content: HeroSectionContent
}

export const HeroSection = ({ content }: HeroSectionProps) => (
  <Section
    id={content.id}
    spacing='none'
    background='warm'
    fullBleed
    className='relative min-h-dvh overflow-hidden'
  >
    {/* Grain texture */}
    <div
      aria-hidden='true'
      className='pointer-events-none absolute inset-0 opacity-20'
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '128px 128px',
      }}
    />

    {/* SBS watermark — ghosted texture filling the viewport */}
    <div
      aria-hidden='true'
      className='hero-fade pointer-events-none absolute inset-0 flex select-none items-center justify-center'
      style={{ animationDelay: '0.05s' }}
    >
      <span
        className='font-display text-foreground'
        style={{
          fontSize: 'clamp(16rem, 30vw, 32rem)',
          lineHeight: 0.85,
          letterSpacing: '0.08em',
          fontWeight: 600,
          opacity: 0.045,
        }}
      >
        {content.watermark}
      </span>
    </div>

    {/* Content — centered composition */}
    <div className='relative z-10 flex min-h-screen flex-col items-center justify-center px-6'>
      {/* Eyebrow */}
      <Typography
        variant='overline'
        className='hero-reveal text-primary-700'
        style={{ animationDelay: '0.3s', letterSpacing: '0.3em', textIndent: '0.3em' }}
      >
        {content.eyebrow}
      </Typography>

      {/* Headline */}
      <h1
        className='hero-reveal mt-5 text-center font-display uppercase text-foreground md:mt-8'
        style={{
          animationDelay: '0.5s',
          fontSize: 'clamp(1.75rem, 3.5vw, 3rem)',
          lineHeight: 1.15,
          fontWeight: 400,
          letterSpacing: '0.06em',
          textIndent: '0.06em',
        }}
      >
        {content.headline}
        <br />
        <span className='text-primary-700'>{content.headlineAccent}</span>
      </h1>

      {/* Body copy */}
      <Typography
        variant='body'
        className='hero-reveal mx-auto mt-8 text-center text-secondary-600 md:mt-10'
        style={{ animationDelay: '0.7s', maxWidth: '56ch' }}
      >
        {content.subtitle}
      </Typography>

      {/* CTA */}
      <div className='hero-reveal mt-10 md:mt-12' style={{ animationDelay: '0.9s' }}>
        <a
          href={content.cta.href}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'inline' }),
            'pb-1.5 text-foreground focus-visible:ring-offset-secondary-100',
          )}
        >
          {content.cta.label}
        </a>
      </div>
    </div>
  </Section>
)
