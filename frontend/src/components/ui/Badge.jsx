import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

const tones = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-neutral-soft text-neutral',
  brand: 'bg-brand-soft text-brand dark:text-ink',
  gold: 'bg-gold-soft text-gold-ink',
}

export default function Badge({ tone = 'neutral', dot = false, className, children }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

/**
 * The ONE place that maps a reservation status to a color.
 * Spec: confirmed = green, pending = orange, blocked = red, cancelled = grey.
 */
export const STATUS_TONES = {
  confirmed: 'success',
  pending: 'warning',
  blocked: 'danger',
  cancelled: 'neutral',
  available: 'brand',
}

export function StatusBadge({ status, className }) {
  const { t } = useTranslation()
  return (
    <Badge tone={STATUS_TONES[status] || 'neutral'} dot className={className}>
      {t(`status.${status}`)}
    </Badge>
  )
}
