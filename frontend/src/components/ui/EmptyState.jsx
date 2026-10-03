import { cn } from '@/lib/cn'

/** Shown when a list is empty. Always offer the next action when possible. */
export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full border border-gold/40 bg-gold-soft text-gold-ink">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      )}
      <h3 className="text-md font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-base text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
