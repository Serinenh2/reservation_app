/**
 * Toast notifications.
 *   const toast = useToast()
 *   toast.success(t('settings.saved'))
 *   toast.error(t('errors.generic'))
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/cn'

const ToastContext = createContext(null)
let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const { t } = useTranslation()

  const dismiss = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (tone, message) => {
      const id = nextId++
      setToasts((list) => [...list.slice(-3), { id, tone, message }])
      setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4000)
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live: screen readers announce new messages */}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 end-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = toast.tone === 'success' ? CheckCircle2 : XCircle
          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-panel border border-line bg-surface p-3.5 shadow-overlay"
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', toast.tone === 'success' ? 'text-success' : 'text-danger')} aria-hidden />
              <p className="flex-1 text-base text-ink">{toast.message}</p>
              <button onClick={() => dismiss(toast.id)} className="rounded p-0.5 text-subtle hover:text-ink" aria-label={t('common.close')}>
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
