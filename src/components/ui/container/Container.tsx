import { cn } from '@/lib/utils'

type ContainerProps<T extends React.ElementType = 'div'> = {
  as?: T
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Horizontal padding preset */
  padding?: 'none' | 'tight' | 'default' | 'wide'
  className?: string
  children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'size' | 'padding' | 'className' | 'children'>

const sizeMap = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  full: 'max-w-full',
} as const

const paddingMap = {
  none: '',
  tight: 'px-3 sm:px-4 lg:px-6',
  default: 'px-4 sm:px-6 lg:px-8',
  wide: 'px-6 sm:px-10 lg:px-16',
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
