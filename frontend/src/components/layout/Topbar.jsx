import { useTranslation } from 'react-i18next'
import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'

export default function Topbar({ onOpenMenu }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const initials = (user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()

  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMenu} aria-label={t('nav.openMenu')} icon={Menu} />
      <div className="flex-1" />
      <LanguageSwitcher />
      <ThemeToggle className="hidden sm:inline-flex" />
      <div className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand dark:text-ink" aria-hidden>
          {initials}
        </span>
        <span className="hidden text-base font-semibold text-ink md:block">{user?.first_name || user?.username}</span>
      </div>
      <Button variant="ghost" size="icon" onClick={logout} title={t('auth.logout')} aria-label={t('auth.logout')} icon={LogOut} className="rtl:[&>svg]:-scale-x-100" />
    </header>
  )
}
