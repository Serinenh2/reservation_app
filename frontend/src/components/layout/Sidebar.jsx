import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { NAV_SECTIONS } from './navigation'

export default function Sidebar({ open, onClose }) {
  const { t } = useTranslation()
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings/').then((r) => r.data),
  })

  return (
    <>
      {/* Mobile: dark overlay behind the open menu */}
      <div onClick={onClose} className={cn('fixed inset-0 z-30 bg-black/50 lg:hidden', open ? 'block' : 'hidden')} aria-hidden />

      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-40 flex w-64 flex-col overflow-hidden border-e border-white/5 bg-sidebar text-sidebar-ink transition-transform lg:translate-x-0 lg:rtl:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
        )}
      >
        <div className="relative flex items-center gap-3 px-5 pb-6 pt-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-md font-bold leading-tight">{settings?.company_name || '…'}</p>
            <p className="text-sm text-sidebar-muted">{t('app.tagline')}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-sidebar-muted hover:text-sidebar-ink lg:hidden" aria-label={t('nav.closeMenu')}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav aria-label={t('nav.main')} className="relative flex-1 overflow-y-auto px-3 pb-6">
          {NAV_SECTIONS.map((section, i) => (
            <div key={i} className={cn(i > 0 && 'mt-6')}>
              {section.title && <p className="mb-2 px-3 text-sm font-semibold text-sidebar-muted">{t(section.title)}</p>}
              <ul className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon, end, phase }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 rounded-control px-3 py-2 text-base font-medium transition-colors',
                          isActive ? 'bg-white/10 text-sidebar-active' : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-ink',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* gold thread marks the current page */}
                          {isActive && <span className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-gold" aria-hidden />}
                          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                          <span className="flex-1 truncate">{t(label)}</span>
                          {phase && (
                            <span className="rounded-full border border-white/15 px-1.5 text-xs text-sidebar-muted" title={t('common.comingInPhase', { phase })}>
                              P{phase}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
