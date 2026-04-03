import { DM_Sans, Geist_Mono, Instrument_Sans } from 'next/font/google'

import { SiteFooter } from '@/components/layout'
import { BackToTopButton } from '@/components/layout/back-to-top-button'
import { SkipLink } from '@/components/layout/skip-link'
import { footerContent } from '@/dictionaries/layout'
import { MotionProvider } from '@/lib/motion'

import type { Metadata } from 'next'

import './globals.css'

const displayFont = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
})

const bodyFont = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '700'],
})

const monoFont = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'SBS Homes',
    template: '%s | SBS Homes',
  },
  description:
    'SBS Homes builds precision-manufactured timber homes with contemporary architecture and engineered off-site construction systems.',
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html
      lang='en'
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} antialiased`}
    >
      <body>
        <SkipLink />
        <MotionProvider>
          {/*<NavSpine content={navSpineContent} />*/}
          <main id='main-content'>{children}</main>
          <SiteFooter content={footerContent} />
        </MotionProvider>
        <BackToTopButton />
      </body>
    </html>
  )
}

export default RootLayout
