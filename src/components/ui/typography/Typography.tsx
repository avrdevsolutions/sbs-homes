import { cn } from '@/lib/utils'

type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'overline'
  | 'section-number'

type TypographyProps<C extends React.ElementType = 'p'> = {
  /** Visual style variant */
  variant?: TypographyVariant
  /** HTML element to render — defaults to semantic mapping */
  as?: C
  children: React.ReactNode
  className?: string
} & Omit<React.ComponentProps<C>, 'as' | 'className' | 'children'>

const variantStyles: Record<TypographyVariant, string> = {
  h1: 'font-display text-display-sm uppercase md:text-display-md lg:text-display-lg xl:text-display-xl',
  h2: 'font-display text-h1-sm uppercase md:text-h1-md lg:text-h1-lg',
  h3: 'font-display text-h2-sm uppercase md:text-h2-md lg:text-h2-lg',
  h4: 'font-display text-h4-sm uppercase lg:text-h4-lg',
  body: 'font-body text-body-base',
  'body-sm': 'font-body text-body-sm',
  caption: 'font-display text-caption uppercase',
  overline: 'font-display text-eyebrow uppercase',
  'section-number':
    'font-display text-section-number-sm md:text-section-number-md lg:text-section-number-lg xl:text-section-number-xl',
}

const defaultElementMap: Record<TypographyVariant, React.ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'p',
  'body-sm': 'p',
  caption: 'span',
  overline: 'span',
  'section-number': 'span',
}

export const Typography = <C extends React.ElementType = 'p'>({
  variant = 'body',
  as,
  children,
  className,
  ...props
}: TypographyProps<C>) => {
  const Component = as || defaultElementMap[variant]
  return (
    <Component className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </Component>
  )
}
