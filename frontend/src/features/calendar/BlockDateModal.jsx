import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { describeError, fieldError } from '@/lib/api'
import { Button, Field, Input, Modal, useToast } from '@/components/ui'
import { useBlockDate } from '@/features/reservations/api'

/** Block a day (no reservation possible). `date` pre-fills the field. */
export default function BlockDateModal({ open, onClose, date = '' }) {
  const { t } = useTranslation()
  const toast = useToast()
  const block = useBlockDate()
  const [form, setForm] = useState({ date, reason: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm({ date, reason: '' })
      setErrors({})
    }
  }, [open, date])

  const onSubmit = (e) => {
    e.preventDefault()
    if (!form.date) return setErrors({ date: ['required'] })
    block.mutate(form, {
      onSuccess: () => {
        toast.success(t('blocked.saved'))
        onClose()
      },
      onError: (error) => {
        const { messageKey, fieldErrors } = describeError(error)
        setErrors(fieldErrors)
        toast.error(fieldError(t, fieldErrors, 'date') || t(messageKey))
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={t('blocked.add')}
      description={t('blocked.addHint')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={block.isPending}>{t('common.cancel')}</Button>
          <Button type="submit" form="block-form" variant="danger" loading={block.isPending}>{t('blocked.confirm')}</Button>
        </>
      }
    >
      <form id="block-form" onSubmit={onSubmit} noValidate className="grid gap-4">
        <Field label={t('reservations.date')} error={fieldError(t, errors, 'date')}>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label={t('blocked.reason')} optional hint={t('blocked.reasonHint')}>
          <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </Field>
      </form>
    </Modal>
  )
}
