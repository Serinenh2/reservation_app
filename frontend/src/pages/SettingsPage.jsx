import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { api, describeError } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button, Card, Field, Input, PageHeader, Switch, useToast } from '@/components/ui'

/**
 * Real, working page (reference example for later phases):
 * React Query loads data, a form edits a copy, a mutation saves it,
 * field errors from Django are shown under the right field.
 */
export default function SettingsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const canEdit = Boolean(user?.is_staff)

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings/').then((r) => r.data),
  })

  const [form, setForm] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const save = useMutation({
    mutationFn: (payload) => api.patch('/settings/', payload).then((r) => r.data),
    onSuccess: (saved) => {
      queryClient.setQueryData(['settings'], saved)
      setFieldErrors({})
      toast.success(t('settings.saved'))
    },
    onError: (error) => {
      const { messageKey, fieldErrors } = describeError(error)
      setFieldErrors(fieldErrors)
      toast.error(t(messageKey))
    },
  })

  if (isLoading || !form) return <PageHeader title={t('settings.title')} description={t('common.loading')} />

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  // Frontend check for instant feedback; Django validates again (never trust the browser alone).
  const minNegative = Number(form.min_confirmation_payment) < 0
  const errorFor = (key) => {
    if (key === 'min_confirmation_payment' && minNegative) return t('errors.minValue')
    return fieldErrors[key] ? t(key.includes('email') ? 'errors.invalidEmail' : 'errors.validation') : undefined
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (minNegative) return
    const { updated_at, ...payload } = form
    save.mutate({ ...payload, min_confirmation_payment: Number(payload.min_confirmation_payment) || 0 })
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={t('settings.title')}
        description={canEdit ? t('settings.subtitle') : t('settings.readOnly')}
        actions={canEdit && <Button type="submit" loading={save.isPending}>{save.isPending ? t('common.saving') : t('common.save')}</Button>}
      />

      <fieldset disabled={!canEdit} className="space-y-6">
        <Card>
          <Card.Header title={t('settings.company')} description={t('settings.companyHint')} />
          <Card.Body className="grid gap-4 md:grid-cols-2">
            <Field label={t('settings.companyName')} error={errorFor('company_name')}>
              <Input value={form.company_name} onChange={set('company_name')} required />
            </Field>
            <Field label={t('settings.companyPhone')} optional>
              <Input type="tel" value={form.company_phone} onChange={set('company_phone')} />
            </Field>
            <Field label={t('settings.companyEmail')} optional error={errorFor('company_email')}>
              <Input type="email" value={form.company_email} onChange={set('company_email')} />
            </Field>
            <Field label={t('settings.companyAddress')} optional>
              <Input value={form.company_address} onChange={set('company_address')} />
            </Field>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header title={t('settings.rules')} description={t('settings.rulesHint')} />
          <Card.Body className="grid gap-6 md:grid-cols-2">
            <Field label={t('settings.minPayment')} hint={t('settings.minPaymentHint')} error={errorFor('min_confirmation_payment')}>
              <Input type="number" min="0" step="1000" suffix={t('common.currency')} value={form.min_confirmation_payment} onChange={set('min_confirmation_payment')} />
            </Field>
            <div className="flex items-start justify-between gap-4">
              <div>
                <label htmlFor="multi" className="text-sm font-semibold">{t('settings.multipleEvents')}</label>
                <p className="mt-1 text-sm text-muted">{t('settings.multipleEventsHint')}</p>
              </div>
              <Switch id="multi" checked={form.allow_multiple_events_per_day} onChange={(v) => setForm({ ...form, allow_multiple_events_per_day: v })} />
            </div>
          </Card.Body>
        </Card>
      </fieldset>

      {canEdit && <TestEmailCard />}
    </form>
  )
}

function TestEmailCard() {
  const { t } = useTranslation()
  const toast = useToast()
  const [to, setTo] = useState('')
  const send = useMutation({
    mutationFn: () => api.post('/system/test-email/', { to }),
    onSuccess: () => toast.success(t('settings.testQueued')),
    onError: (e) => toast.error(t(describeError(e).fieldErrors.to ? 'errors.invalidEmail' : describeError(e).messageKey)),
  })
  return (
    <Card className="mt-6">
      <Card.Header title={t('settings.email')} description={t('settings.emailHint')} />
      <Card.Body className="flex flex-wrap items-end gap-3">
        <Field label={t('settings.testEmailTo')} className="min-w-[16rem] flex-1">
          <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Button variant="secondary" icon={Send} loading={send.isPending} disabled={!to} onClick={() => send.mutate()} className="rtl:[&>svg]:-scale-x-100">
          {t('settings.sendTest')}
        </Button>
      </Card.Body>
    </Card>
  )
}
