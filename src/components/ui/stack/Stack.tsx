import { cn } from '@/lib/utils'

type StackProps<T extends React.ElementType = 'div'> = {
  as?: T
  direction?: 'row' | 'col'
  gap?: '0' | '1' | '2' | '3' | '4' | '6' | '8' | '10' | '12' | '16' | '20' | '24' | '32'
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
  wrap?: boolean
  className?: string
  children: React.ReactNode
} & Omit<
  React.ComponentPropsWithoutRef<T>,
  'as' | 'direction' | 'gap' | 'align' | 'justify' | 'wrap' | 'className' | 'children'
>

// ✅ Static maps — safe for Tailwind JIT
const gapMap = {
  '0': 'gap-0',
  '1': 'gap-1',
  '2': 'gap-2',
  '3': 'gap-3',
  '4': 'gap-4',
  '6': 'gap-6',
  '8': 'gap-8',
  '10': 'gap-10',
  '12': 'gap-12',
  '16': 'gap-16',
  '20': 'gap-20',
  '24': 'gap-24',
  '32': 'gap-32',
} as const

const alignMap = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
} as const

const justifyMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
} as const

export const Stack = <T extends React.ElementType = 'div'>({
  as,
  direction = 'col',
  gap = '4',
  align,
  justify,
  wrap,
  className,
  children,
  ...props
}: StackProps<T>) => {
  const Comp = as ?? 'div'
  return (
    <Comp
      className={cn(
        'flex',
        direction === 'row' ? 'flex-row' : 'flex-col',
        gapMap[gap],
        align && alignMap[align],
        justify && justifyMap[justify],
        wrap && 'flex-wrap',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}
