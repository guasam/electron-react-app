import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * The playground's own button, tuned to the demo's design language: coral for the primary action,
 * warm neutrals for the quiet ones. Kept here rather than in `app/components/ui/button.tsx` so the
 * shadcn component stays stock (and CLI-updatable) and this whole folder stays deletable.
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-[13.5px] font-medium tracking-[-0.01em] whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:translate-y-px',
    'outline-none focus-visible:ring-[3px] focus-visible:ring-brand/35',
    'disabled:pointer-events-none disabled:opacity-45',
  ],
  {
    variants: {
      variant: {
        // Primary action: the same coral-tint treatment the active sidebar item wears, so the
        // accent stays in its usual thin register instead of filling a slab.
        default:
          'border border-brand/30 bg-brand-soft text-foreground [&_svg]:text-brand hover:border-brand/55 hover:bg-brand/15',
        solid: 'bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-hover',
        outline: 'border border-border bg-transparent text-foreground hover:border-border-bright hover:bg-muted',
        secondary: 'border border-border bg-muted text-foreground/90 hover:border-border-bright hover:text-foreground',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
      },
      size: {
        default: 'h-9 px-3.5 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 rounded-[7px] px-3 text-[13px] has-[>svg]:px-2.5',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
