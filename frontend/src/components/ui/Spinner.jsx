import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

export default function Spinner({ className }) {
  return (
    <svg className={cn('h-5 w-5 animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function FullPageSpinner() {
  const { t } = useTranslation()
  return (
    <div className="grid min-h-screen place-items-center text-gold" role="status">
      <Spinner className="h-8 w-8" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}
