import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

/**
 * Ask before anything destructive (cancel, delete, restore backup).
 * Button labels must say exactly what happens: "Annuler la réservation",
 * not "OK".
 */
export default function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, cancelLabel, loading, tone = 'danger' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2.5">
          <span className={tone === 'danger' ? 'text-danger' : 'text-warning'}>
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          {title}
        </span>
      }
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
