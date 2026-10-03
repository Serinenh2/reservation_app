import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Field, Input } from '@/components/ui'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { useAuth } from './AuthProvider'

export default function LoginPage() {
  const { t } = useTranslation()
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorKey, setErrorKey] = useState(() => (sessionStorage.getItem('auth.expired') ? 'auth.sessionExpired' : null))

  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorKey(null)
    sessionStorage.removeItem('auth.expired')
    try {
      await login(form.username.trim(), form.password)
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      setErrorKey(err.response?.status === 401 ? 'auth.invalid' : 'errors.network')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-sidebar text-sidebar-ink lg:flex lg:flex-col lg:justify-end lg:p-12">
        <div className="relative max-w-md">
          <p className="text-3xl font-bold leading-tight">{t('auth.panelTitle')}</p>
          <p className="mt-4 text-md leading-relaxed text-sidebar-muted">{t('auth.panelText')}</p>
          <div className="mt-8 h-px w-24 bg-gold/70" />
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-col">
        <div className="flex items-center justify-end gap-2 p-4 sm:p-6">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <form onSubmit={onSubmit} className="w-full max-w-sm" noValidate>
            <h1 className="text-2xl font-bold tracking-tight">{t('auth.title')}</h1>
            <p className="mt-1 text-base text-muted">{t('auth.subtitle')}</p>

            {errorKey && (
              <div role="alert" className="mt-6 rounded-control border border-danger/30 bg-danger-soft px-3 py-2.5 text-base text-danger">
                {t(errorKey)}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <Field label={t('auth.username')}>
                <Input autoComplete="username" autoFocus required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </Field>
              <Field label={t('auth.password')}>
                <PasswordInput
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  visible={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  t={t}
                />
              </Field>
            </div>

            <Button type="submit" size="lg" className="mt-6 w-full justify-center" loading={submitting} disabled={!form.username || !form.password}>
              {submitting ? t('auth.submitting') : t('auth.submit')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

function PasswordInput({ visible, onToggle, t, id, invalid, ...props }) {
  return (
    <div className="relative">
      <Input id={id} invalid={invalid} type={visible ? 'text' : 'password'} autoComplete="current-password" required className="pe-11" {...props} />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 end-0 grid w-10 place-items-center text-subtle hover:text-ink"
        aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  )
}
