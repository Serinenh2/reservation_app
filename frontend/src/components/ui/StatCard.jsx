import { cn } from '@/lib/cn'

/**
 * A dashboard figure. `tone` adds a thin colored rule on the start side,
 * only for money states (paid = success, remaining = warning).
 */
export default function StatCard({ label, value, hint, icon: Icon, tone, loading }) {
  const rule = { success: 'before:bg-success', warning: 'before:bg-warning', gold: 'before:bg-gold' }[tone]
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-panel border border-line bg-surface p-4',
        rule && 'before:absolute before:inset-y-3 before:start-0 before:w-[3px] before:rounded-full',
        rule,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-subtle" aria-hidden />}
      </div>
      {loading ? (
        <div className="mt-3 h-7 w-24 animate-pulse rounded bg-sunken" />
      ) : (
        <p className="tabular mt-2 text-xl font-bold tracking-tight text-ink">{value}</p>
      )}
      {hint && <p className="mt-1 text-sm text-subtle">{hint}</p>}
    </div>
  )
}
