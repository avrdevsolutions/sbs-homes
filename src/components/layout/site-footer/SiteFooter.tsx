import { Section, Stack, Typography } from '@/components/ui'
import type { FooterContent } from '@/dictionaries/layout'

type SiteFooterProps = {
  content: FooterContent
}

export const SiteFooter = ({ content }: SiteFooterProps) => (
  <Section spacing='compact' background='dark-deeper'>
    <div className='grid gap-10 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]'>
      <Stack gap='6'>
        <Typography variant='h2' as='h2'>
          {content.title}
        </Typography>
        <Typography variant='body' style={{ maxWidth: '36ch', opacity: 0.55 }}>
          {content.description}
        </Typography>
      </Stack>

      <Stack gap='3'>
        <div>
          <Typography variant='overline' className='mb-1 opacity-40'>
            {content.contact.nameLabel}
          </Typography>
          <Typography variant='body'>{content.contact.name}</Typography>
        </div>
        <div>
          <Typography variant='overline' className='mb-1 opacity-40'>
            {content.contact.phoneLabel}
          </Typography>
          <Typography variant='body'>{content.contact.phone}</Typography>
        </div>
        <div>
          <Typography variant='overline' className='mb-1 opacity-40'>
            {content.contact.emailLabel}
          </Typography>
          <a
            href={content.contact.email.href}
            className='border-b border-white/20 pb-px hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-secondary-950'
          >
            <Typography variant='body'>{content.contact.email.label}</Typography>
          </a>
        </div>
        <div>
          <Typography variant='overline' className='mb-1 opacity-40'>
            {content.contact.webLabel}
          </Typography>
          <a
            href={content.contact.web.href}
            target='_blank'
            rel='noopener noreferrer'
            className='border-b border-white/20 pb-px hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-secondary-950'
          >
            <Typography variant='body'>{content.contact.web.label}</Typography>
            <span className='sr-only'>(opens in new tab)</span>
          </a>
        </div>
      </Stack>
    </div>

    <div className='mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6'>
      <Typography variant='body-sm' className='opacity-35'>
        {content.bottom.copyright}
      </Typography>
      <Typography variant='caption' className='opacity-25'>
        {content.bottom.brand}
      </Typography>
    </div>
  </Section>
)
