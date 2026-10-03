import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Accessible dialog built on the native <dialog> element:
 * focus is trapped, Escape closes, the page behind is inert.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useRef(null)
  const { t } = useTranslation()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // click on the dark backdrop closes
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className={cn(
        'w-[calc(100%-2rem)] rounded-overlay border border-line bg-surface p-0 text-ink shadow-overlay',
        'open:animate-dialog-in',
        size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl',
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold">
                {title}
              </h2>
              {description && <p className="mt-1 text-base text-muted">{description}</p>}
            </div>
            <button onClick={onClose} className="-me-2 rounded-control p-2 text-subtle hover:bg-sunken hover:text-ink" aria-label={t('common.close')}>
              <X className="h-5 w-5" aria-hidden />
            </button>
          </header>
          {children && <div className="overflow-y-auto px-6 py-3">{children}</div>}
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
