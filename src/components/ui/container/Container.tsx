import { cn } from '@/lib/utils'

type ContainerProps<T extends React.ElementType = 'div'> = {
  as?: T
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'xxl'
  /** Horizontal padding preset */
  padding?: 'none' | 'tight' | 'default' | 'wide' | 'xxl'
  className?: string
  children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'size' | 'padding' | 'className' | 'children'>

const sizeMap = {
  sm: 'max-w-narrow',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-content',
  xxl: 'max-w-xxl',
  full: 'max-w-full',
} as const

const paddingMap = {
  none: '',
  tight: 'px-5 md:px-10 lg:px-14',
  default: 'px-5 md:px-10 lg:px-14',
  wide: 'px-6 md:px-12 lg:px-18',
  xxl: 'px-5 md:px-10 lg:px-24',
} as const

export const Container = <T extends React.ElementType = 'div'>({
  as,
  size = 'xl',
  padding = 'default',
  className,
  children,
  ...props
}: ContainerProps<T>) => {
  const Comp = as ?? 'div'
  return (
    <Comp
      className={cn('mx-auto w-full', paddingMap[padding], sizeMap[size], className)}
      {...props}
    >
      {children}
    </Comp>
  )
}
