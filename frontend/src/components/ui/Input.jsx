import { forwardRef } from 'react'
import { cn } from '@/lib/cn'

export const controlClass = (invalid) =>
  cn(
    'w-full rounded-control border bg-surface px-3 text-base text-ink placeholder:text-subtle',
    'transition-colors focus:outline-none focus:ring-2 focus:ring-gold/40',
    'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted',
    invalid ? 'border-danger focus:border-danger' : 'border-line focus:border-gold',
  )

/**
 * Text input. Use `suffix` for a unit like "DA".
 * Numbers, phones and emails stay left-to-right even in Arabic (dir="ltr").
 */
export const Input = forwardRef(function Input({ invalid, suffix, className, type = 'text', ...props }, ref) {
  const forceLtr = ['number', 'tel', 'email', 'time', 'date'].includes(type)
  return (
    <div className="relative">
      <input
        ref={ref}
        type={type}
        dir={forceLtr ? 'ltr' : undefined}
        aria-invalid={invalid || undefined}
        className={cn(controlClass(invalid), 'h-10 tabular', forceLtr && 'rtl:text-right', suffix && 'pe-12', className)}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm font-semibold text-subtle">
          {suffix}
        </span>
      )}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea({ invalid, className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={cn(controlClass(invalid), 'py-2', className)} {...props} />
})

export const Select = forwardRef(function Select({ invalid, className, children, ...props }, ref) {
  return (
    <select ref={ref} aria-invalid={invalid || undefined} className={cn(controlClass(invalid), 'h-10 pe-8', className)} {...props}>
      {children}
    </select>
  )
})
