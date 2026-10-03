import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

/** Two-option segmented control: Français | العربية */
export default function LanguageSwitcher({ className }) {
  const { t, i18n } = useTranslation()
  const options = ['fr', 'ar']
  return (
    <div role="group" aria-label={t('language.label')} className={cn('inline-flex rounded-control border border-line bg-sunken p-0.5', className)}>
      {options.map((lng) => {
        const active = i18n.language === lng
        return (
          <button
            key={lng}
            type="button"
            lang={lng}
            style={lng === 'ar' ? { fontFamily: 'var(--font-arabic)' } : { fontFamily: 'var(--font-latin)' }}
            aria-pressed={active}
            onClick={() => i18n.changeLanguage(lng)}
            className={cn(
              'rounded-[6px] px-3 py-1 text-sm font-semibold transition-colors',
              active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {t(`language.${lng}`)}
          </button>
        )
      })}
    </div>
  )
}
