import { cn } from '@/lib/utils'

type TypographyVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'body-sm' | 'caption' | 'overline'

type TypographyProps<C extends React.ElementType = 'p'> = {
  /** Visual style variant */
  variant?: TypographyVariant
  /** HTML element to render — defaults to semantic mapping */
  as?: C
  children: React.ReactNode
  className?: string
} & Omit<React.ComponentProps<C>, 'as' | 'className' | 'children'>

// ⚠️ Template defaults — REPLACE with values from the chosen mockup's CSS
const variantStyles: Record<TypographyVariant, string> = {
  h1: 'text-4xl font-bold tracking-tight lg:text-5xl',
  h2: 'text-3xl font-semibold tracking-tight',
  h3: 'text-2xl font-semibold',
  h4: 'text-xl font-semibold',
  body: 'text-base leading-relaxed',
  'body-sm': 'text-sm leading-relaxed',
  caption: 'text-xs',
  overline: 'text-xs font-semibold uppercase tracking-wider',
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
