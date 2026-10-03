import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

/** Previous / next for Django paginated lists ({count, next, previous}). */
export default function Pagination({ page, count, pageSize = 25, onChange }) {
  const { t } = useTranslation()
  const pages = Math.max(1, Math.ceil(count / pageSize))
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-sm text-muted">{t('common.pageOf', { page, pages })}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" icon={ChevronLeft} className="rtl:[&>svg]:-scale-x-100" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          {t('common.previous')}
        </Button>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          {t('common.next')}
          <ChevronRight className="h-[1.1em] w-[1.1em] rtl:-scale-x-100" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
