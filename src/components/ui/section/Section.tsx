import { cn } from '@/lib/utils'

import { Container } from '../container'

type SectionProps = {
  /** Vertical spacing preset */
  spacing?: 'none' | 'compact' | 'standard' | 'hero'
  /** Background style — maps to project tokens */
  background?: 'default' | 'alt' | 'primary' | 'inverse'
  /** Container size override (defaults to 'xl') */
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Container padding override (defaults to 'default') */
  containerPadding?: 'none' | 'tight' | 'default' | 'wide'
  /** Skip Container wrapper — for full-bleed content that manages its own width */
  fullBleed?: boolean
  className?: string
  children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'section'>, 'className' | 'children'>

// ⚠️ Template defaults — replace with values from your mockup
const spacingMap = {
  none: '',
  compact: 'py-8 lg:py-12',
  standard: 'py-16 lg:py-24',
  hero: 'py-20 lg:py-32',
} as const

// ⚠️ Template defaults — replace with values from your mockup
const backgroundMap = {
  default: '',
  alt: 'bg-secondary-50',
  primary: 'bg-primary-600 text-white',
  inverse: 'bg-foreground text-background',
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
