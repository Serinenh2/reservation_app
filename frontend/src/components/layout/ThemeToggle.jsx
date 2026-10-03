import { useTranslation } from 'react-i18next'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'
import { cn } from '@/lib/cn'

const OPTIONS = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
]

export default function ThemeToggle({ className }) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  return (
    <div role="group" aria-label={t('theme.label')} className={cn('inline-flex rounded-control border border-line bg-sunken p-0.5', className)}>
      {OPTIONS.map(({ value, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          title={t(`theme.${value}`)}
          onClick={() => setTheme(value)}
          className={cn(
            'grid h-7 w-8 place-items-center rounded-[6px] transition-colors',
            theme === value ? 'bg-surface text-ink shadow-sm' : 'text-subtle hover:text-ink',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          <span className="sr-only">{t(`theme.${value}`)}</span>
        </button>
      ))}
    </div>
  )
}
