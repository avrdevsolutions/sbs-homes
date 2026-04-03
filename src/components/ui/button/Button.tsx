import { forwardRef } from 'react'

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none font-display text-button uppercase transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
        secondary:
          'bg-secondary-200 text-foreground hover:bg-secondary-300 active:bg-secondary-400',
        outline:
          'border border-foreground/20 text-foreground hover:border-foreground/35 hover:bg-secondary-100',
        ghost:
          "relative px-0 hover:opacity-70 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-current after:opacity-40 after:content-['']",
        danger: 'bg-error-600 text-white hover:bg-error-700 active:bg-error-800',
        link: 'px-0 text-primary-600 underline underline-offset-4 hover:text-primary-700',
      },
      size: {
        sm: 'h-10 px-6',
        md: 'h-12 px-8',
        lg: 'h-14 px-10',
        icon: 'size-10 p-0',
        inline: 'h-auto p-0',
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
