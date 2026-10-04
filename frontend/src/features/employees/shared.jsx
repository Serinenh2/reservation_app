import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { parseISODate, toISODate } from '@/lib/format'
import { useAuthedFile } from './api'

/** Whole years and months between the hire date and the end date (or today). */
export function seniority(hireDate, endDate) {
  const start = parseISODate(hireDate)
  const end = endDate && endDate < toISODate(new Date()) ? parseISODate(endDate) : new Date()
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (end.getDate() < start.getDate()) months -= 1
  months = Math.max(0, months)
  return { years: Math.floor(months / 12), months: months % 12 }
}

/** "2 ans et 3 mois", "5 mois", "moins d'un mois" */
export function useSeniorityText() {
  const { t } = useTranslation()
  return (hireDate, endDate) => {
    const { years, months } = seniority(hireDate, endDate)
    const parts = []
    if (years) parts.push(t('employees.years', { count: years }))
    if (months) parts.push(t('employees.months', { count: months }))
    return parts.length ? parts.join(t('employees.and')) : t('employees.lessThanMonth')
  }
}

/** The employee is still working here (no end date, or one in the future). */
export const isCurrent = (e) => !e.end_date || e.end_date >= toISODate(new Date())

/** Photo, loaded privately with the login token; initials when there is none. */
export function EmployeeAvatar({ employee, className }) {
  const url = useAuthedFile(employee.has_photo ? `/employees/${employee.id}/photo/` : null, employee.updated_at)
  const initials = `${employee.last_name?.[0] || ''}${employee.first_name?.[0] || ''}`.toUpperCase()
  return url ? (
    <img src={url} alt="" className={cn('shrink-0 rounded-full object-cover', className)} />
  ) : (
    <span className={cn('grid shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-brand dark:text-ink', className)} aria-hidden>
      {initials}
    </span>
  )
}
