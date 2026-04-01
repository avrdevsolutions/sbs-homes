import { forwardRef } from 'react'

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// ⚠️ Template styles — REPLACE with values from mockup CSS
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
        secondary:
          'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 active:bg-secondary-300',
        outline:
          'border border-primary-300 text-primary-700 hover:bg-primary-50 active:bg-primary-100',
        ghost: 'text-primary-700 hover:bg-primary-50 active:bg-primary-100',
        danger: 'bg-error-600 text-white hover:bg-error-700 active:bg-error-800',
        link: 'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'size-10',
        inline: 'text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
  }

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          className='inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent'
          aria-hidden='true'
        />
      )}
      {children}
    </button>
  ),
)

Button.displayName = 'Button'

export { Button, buttonVariants }
export type { ButtonProps }
