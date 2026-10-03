import { forwardRef } from 'react'
import { cn } from '@/lib/cn'
import Spinner from './Spinner'

const variants = {
  primary: 'bg-brand text-brand-fg hover:bg-brand-hover shadow-sm',
  secondary: 'bg-surface text-ink border border-line hover:bg-sunken',
  ghost: 'text-muted hover:text-ink hover:bg-sunken',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
  gold: 'bg-gold text-white hover:bg-gold/90 shadow-sm',
}

const sizes = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-12 px-5 text-md gap-2',
  icon: 'h-10 w-10 justify-center',
}

/**
 * <Button variant="primary|secondary|ghost|danger|gold" size="sm|md|lg|icon"
 *         loading icon={Plus}>Label</Button>
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center rounded-control font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : Icon ? <Icon className="h-[1.1em] w-[1.1em]" aria-hidden /> : null}
      {children}
    </button>
  )
})

export default Button
