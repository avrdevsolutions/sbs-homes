import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const separatorVariants = cva('shrink-0 border-none', {
  variants: {
    orientation: {
      horizontal: 'w-full',
      vertical: 'h-full',
    },
    thickness: {
      thin: '',
      medium: '',
      thick: '',
    },
    variant: {
      default: 'bg-secondary-200',
      muted: 'bg-secondary-100',
      primary: 'bg-primary-500',
      inverse: 'bg-white/20',
    },
  },
  compoundVariants: [
    { orientation: 'horizontal', thickness: 'thin', class: 'h-px' },
    { orientation: 'horizontal', thickness: 'medium', class: 'h-0.5' },
    { orientation: 'horizontal', thickness: 'thick', class: 'h-1' },
    { orientation: 'vertical', thickness: 'thin', class: 'w-px' },
    { orientation: 'vertical', thickness: 'medium', class: 'w-0.5' },
    { orientation: 'vertical', thickness: 'thick', class: 'w-1' },
  ],
  defaultVariants: {
    orientation: 'horizontal',
    thickness: 'thin',
    variant: 'default',
  },
})

type SeparatorProps = React.ComponentProps<'hr'> &
  VariantProps<typeof separatorVariants> & {
    decorative?: boolean
    thickness?: 'thin' | 'medium' | 'thick'
  }

export const Separator = ({
  orientation = 'horizontal',
  thickness,
  variant,
  decorative = true,
  className,
  ...props
}: SeparatorProps) => (
  <hr
    role={decorative ? 'none' : 'separator'}
    aria-orientation={!decorative && orientation ? orientation : undefined}
    className={cn(separatorVariants({ orientation, thickness, variant }), className)}
    {...props}
  />
)

export { separatorVariants }
