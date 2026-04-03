import { cn } from '@/lib/utils'

import { Container } from '../container'

type SectionProps = {
  /** Vertical spacing preset */
  spacing?: 'none' | 'compact' | 'standard' | 'spacious' | 'hero'
  /** Background style — maps to project tokens */
  background?: 'default' | 'warm' | 'warm-alt' | 'dark' | 'dark-deeper'
  /** Container size override (defaults to 'xl') */
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Container padding override (defaults to 'default') */
  containerPadding?: 'none' | 'tight' | 'default' | 'wide'
  /** Skip Container wrapper — for full-bleed content that manages its own width */
  fullBleed?: boolean
  className?: string
  children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'section'>, 'className' | 'children'>

const spacingMap = {
  none: '',
  compact: 'py-12 md:py-16 lg:py-20',
  standard: 'py-20 md:py-26 lg:py-30',
  spacious: 'py-26 md:py-32 lg:py-40',
  hero: 'py-24 md:py-34 lg:py-46',
} as const

const backgroundMap = {
  default: 'bg-background text-foreground',
  warm: 'bg-secondary-100 text-foreground',
  'warm-alt': 'bg-secondary-200 text-foreground',
  dark: 'bg-surface-dark text-white',
  'dark-deeper': 'bg-surface-darker text-white',
} as const

export const Section = ({
  spacing = 'standard',
  background = 'default',
  containerSize = 'xl',
  containerPadding = 'default',
  fullBleed = false,
  className,
  children,
  ...props
}: SectionProps) => (
  <section className={cn(spacingMap[spacing], backgroundMap[background], className)} {...props}>
    {fullBleed ? (
      children
    ) : (
      <Container size={containerSize} padding={containerPadding}>
        {children}
      </Container>
    )}
  </section>
)
