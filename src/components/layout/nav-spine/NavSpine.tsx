import { Separator, Typography } from '@/components/ui'
import type { NavSpineContent } from '@/dictionaries/layout'
import { cn } from '@/lib/utils'

import { NavSpineClient } from './NavSpineClient'

type NavSpineProps = {
  content: NavSpineContent
}

export const NavSpine = ({ content }: NavSpineProps) => (
  <NavSpineClient>
    <header
      aria-label={content.ariaLabel}
      className='group fixed right-0 top-0 z-50 hidden h-screen w-14 overflow-hidden border-l border-white/30 bg-secondary-100/45 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-500 ease-out hover:w-60 lg:block'
      style={{
        backgroundColor: 'rgba(245, 243, 240, 0.45)',
        borderLeftColor: 'rgba(255, 255, 255, 0.30)',
      }}
    >
      <div className='flex h-full flex-col py-8'>
        <a
          href={content.wordmark.href}
          aria-label={content.wordmark.ariaLabel}
          className='mb-10 flex justify-center px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'
        >
          <Typography
            variant='caption'
            className='-rotate-90 whitespace-nowrap opacity-50 transition-all duration-300 group-hover:rotate-0 group-hover:opacity-70'
          >
            {content.wordmark.label}
          </Typography>
        </a>

        <nav aria-label='Page sections' className='flex flex-1 flex-col'>
          {content.groups.map((group, groupIndex) => (
            <div key={group.label} className='flex flex-col'>
              <Typography
                variant='caption'
                className='px-3 pb-2 text-primary-600 opacity-0 transition-opacity delay-150 duration-300 group-hover:opacity-60'
              >
                {group.label}
              </Typography>
              {group.links.map((link) => (
                <a
                  key={link.number}
                  href={link.href}
                  aria-label={link.ariaLabel}
                  className={cn(
                    'group/link flex items-center gap-3 border-l-2 border-transparent px-3 py-2 opacity-40 transition-all duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                    link.active && 'border-primary-600 opacity-100',
                  )}
                >
                  <Typography
                    variant='h4'
                    className={cn('w-6 text-center', link.active && 'text-primary-600')}
                  >
                    {link.number}
                  </Typography>
                  <Typography
                    variant='caption'
                    className='translate-x-[-4px] whitespace-nowrap opacity-0 transition-all delay-100 duration-300 group-hover:translate-x-0 group-hover:opacity-100'
                  >
                    {link.label}
                  </Typography>
                </a>
              ))}
              {groupIndex < content.groups.length - 1 ? (
                <Separator
                  variant='default'
                  className='mx-3 my-2 bg-current'
                  style={{ opacity: 0.06 }}
                />
              ) : null}
            </div>
          ))}
        </nav>

        <div className='mt-auto border-t border-white/30 px-3 pt-3 opacity-0 transition-opacity delay-200 duration-300 group-hover:opacity-35'>
          <Typography variant='caption'>{content.contactEmail}</Typography>
        </div>
      </div>
    </header>
  </NavSpineClient>
)
