import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { describeError, fieldError } from '@/lib/api'
import { Button, Field, Input, Modal, Textarea, useToast } from '@/components/ui'
import { useSaveClient } from './api'

const EMPTY = { full_name: '', phone: '', phone_alt: '', email: '', address: '', id_card_number: '', id_card_issued_on: '', id_card_issued_at: '', notes: '' }

/**
 * Create or edit a client. Also used from the reservation form
 * ("new client" without leaving the page): onSaved receives the client.
 */
export default function ClientFormModal({ open, onClose, client, onSaved }) {
  const { t } = useTranslation()
  const toast = useToast()
  const save = useSaveClient()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  // Reset only when the dialog opens (the `client` prop may be a new object on every render).
  useEffect(() => {
    if (open) {
      setForm(client ? { ...EMPTY, ...client, id_card_issued_on: client.id_card_issued_on || '' } : EMPTY)
      setErrors({})
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const onSubmit = (e) => {
    e.preventDefault()
    const missing = {}
    if (!form.full_name.trim()) missing.full_name = ['required']
    if (!form.phone.trim()) missing.phone = ['required']
    if (Object.keys(missing).length) return setErrors(missing)

    const { id, full_name, phone, phone_alt, email, address, id_card_number, id_card_issued_on, id_card_issued_at, notes } = form
    save.mutate(
      { id, full_name, phone, phone_alt, email, address, id_card_number, id_card_issued_on: id_card_issued_on || null, id_card_issued_at, notes },
      {
        onSuccess: (saved) => {
          toast.success(t('clients.saved'))
          onSaved?.(saved)
          onClose()
        },
        onError: (error) => {
          const { messageKey, fieldErrors } = describeError(error)
          setErrors(fieldErrors)
          toast.error(t(messageKey))
        },
      },
    )
  }

  const err = (key) => fieldError(t, errors, key)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client?.id ? t('clients.edit') : t('clients.new')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>{t('common.cancel')}</Button>
          <Button type="submit" form="client-form" loading={save.isPending}>{t('common.save')}</Button>
        </>
      }
    >
      <form id="client-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label={t('clients.fullName')} error={err('full_name')} className="sm:col-span-2">
          <Input value={form.full_name} onChange={set('full_name')} autoFocus autoComplete="off" />
        </Field>
        <Field label={t('clients.phone')} error={err('phone')}>
          <Input type="tel" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label={t('clients.phoneAlt')} optional error={err('phone_alt')}>
          <Input type="tel" value={form.phone_alt} onChange={set('phone_alt')} />
        </Field>
        <Field label={t('clients.email')} optional error={err('email')}>
          <Input type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label={t('clients.address')} optional>
          <Input value={form.address} onChange={set('address')} />
        </Field>
        {/* ID card: printed on the commitment document */}
        <fieldset className="grid gap-4 rounded-control border border-line p-4 sm:col-span-2 sm:grid-cols-3">
          <legend className="px-1 text-sm font-semibold text-ink">{t('clients.idCard')} <span className="font-normal text-subtle">({t('common.optional')})</span></legend>
          <Field label={t('clients.idCardNumber')}>
            <Input value={form.id_card_number} onChange={set('id_card_number')} dir="ltr" autoComplete="off" />
          </Field>
          <Field label={t('clients.idCardIssuedOn')} error={err('id_card_issued_on')}>
            <Input type="date" value={form.id_card_issued_on} onChange={set('id_card_issued_on')} />
          </Field>
          <Field label={t('clients.idCardIssuedAt')}>
            <Input value={form.id_card_issued_at} onChange={set('id_card_issued_at')} />
          </Field>
        </fieldset>
        <Field label={t('clients.notes')} optional className="sm:col-span-2">
          <Textarea value={form.notes} onChange={set('notes')} />
        </Field>
      </form>
    </Modal>
  )
}
