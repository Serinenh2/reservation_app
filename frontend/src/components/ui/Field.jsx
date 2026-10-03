import { cloneElement, isValidElement, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

/**
 * Label + control + hint + error, wired for screen readers.
 * <Field label="Nom complet" error={err} hint="..." optional>
 *   <Input />
 * </Field>
 */
export default function Field({ label, hint, error, optional, className, children }) {
  const { t } = useTranslation()
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const control = isValidElement(children)
    ? cloneElement(children, { id, invalid: Boolean(error), 'aria-describedby': describedBy })
    : children

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-semibold text-ink">
        {label}
        {optional && <span className="font-normal text-subtle">({t('common.optional')})</span>}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
