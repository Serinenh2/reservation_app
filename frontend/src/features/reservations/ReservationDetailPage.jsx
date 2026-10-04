import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Ban, CalendarDays, Clock, FileText, Moon, Pencil, Phone, Plus, RotateCcw, Trash2, Users, Wallet } from 'lucide-react'
import { api, describeError, fieldError } from '@/lib/api'
import { eventLabel, formatDate, formatMoney, formatNumber, formatTime, localName, toISODate } from '@/lib/format'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Field, FullPageSpinner, Input, Modal, PageHeader,
  Select, StatCard, StatusBadge, useToast,
} from '@/components/ui'
import { useAddPayment, useDeletePayment, useDeleteReservation, useReservation, useReservationAction } from './api'
import { endsNextDay } from './pricing'

export const PAYMENT_TONES = { unpaid: 'neutral', partial: 'warning', paid: 'success' }

export default function ReservationDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: r, isLoading, isError } = useReservation(id)
  const { user } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [paying, setPaying] = useState(false)
  const action = useReservationAction(id)
  const remove = useDeleteReservation(id)
  const toast = useToast()

  if (isLoading) return <FullPageSpinner />
  if (isError || !r) {
    return (
      <Card>
        <EmptyState icon={CalendarDays} title={t('reservations.notFound')} action={<Link to="/reservations" className="font-semibold text-brand underline dark:text-gold">{t('reservations.backToList')}</Link>} />
      </Card>
    )
  }

  const cancelled = r.status === 'cancelled'
  const run = (name) =>
    action.mutate(name, {
      onSuccess: () => toast.success(t(name === 'cancel' ? 'reservations.cancelled' : 'reservations.restored')),
      onError: (e) => {
        const { messageKey, fieldErrors } = describeError(e)
        toast.error(fieldError(t, fieldErrors, 'event_date') || t(messageKey))
      },
      onSettled: () => setConfirming(false),
    })

  const onDelete = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('reservations.deleted'))
        navigate('/reservations', { replace: true })
      },
      onError: (e) => {
        toast.error(t(describeError(e).messageKey))
        setDeleting(false)
      },
    })

  // Permanent delete: administrators only (the server checks it too).
  const deleteButton = user?.is_staff && (
    <Button variant="ghost" icon={Trash2} className="!text-danger hover:!bg-danger-soft" onClick={() => setDeleting(true)}>
      {t('common.delete')}
    </Button>
  )

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {r.client.full_name}
            <StatusBadge status={r.status} />
          </span>
        }
        description={`${eventLabel(r)} · ${formatDate(r.event_date, { dateStyle: 'full' })}`}
        actions={
          cancelled ? (
            <>
              {deleteButton}
              <Button variant="secondary" icon={RotateCcw} loading={action.isPending} onClick={() => run('restore')}>{t('reservations.restore')}</Button>
            </>
          ) : (
            <>
              {deleteButton}
              <Button variant="secondary" icon={FileText} onClick={() => navigate(`/documents?reservation=${r.id}`)}>{t('nav.documents')}</Button>
              <Button variant="secondary" icon={Ban} onClick={() => setConfirming(true)}>{t('reservations.cancel')}</Button>
              <Button icon={Pencil} onClick={() => navigate(`/reservations/${r.id}/edit`)}>{t('common.edit')}</Button>
            </>
          )
        }
      />

      {/* Money: the three numbers the owner looks at first */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t('reservations.total')} value={formatMoney(r.total)} tone="gold" />
        <StatCard label={t('reservations.paid')} value={formatMoney(r.paid_amount)} tone="success" />
        <StatCard
          label={t('reservations.remaining')}
          value={formatMoney(r.remaining_amount)}
          tone="warning"
          hint={<Badge tone={PAYMENT_TONES[r.payment_state]}>{t(`payment.${r.payment_state}`)}</Badge>}
        />
      </div>
      {!cancelled && <ConfirmationProgress paid={r.paid_amount} status={r.status} />}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <Card.Header title={t('reservations.event')} />
            <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
              <Info icon={CalendarDays} label={t('reservations.date')}>{formatDate(r.event_date, { dateStyle: 'full' })}</Info>
              <Info icon={Clock} label={t('reservations.hours')}>
                <span dir="ltr" className="tabular">{formatTime(r.start_time)} → {formatTime(r.end_time)}</span>
                {endsNextDay(r.start_time, r.end_time) && (
                  <span className="ms-2 inline-flex items-center gap-1 text-sm text-muted"><Moon className="h-3.5 w-3.5" aria-hidden />{t('reservations.endsNextDay')}</span>
                )}
              </Info>
              <Info icon={Users} label={t('reservations.guests')}>
                {r.guests ? (
                  <>
                    {formatNumber(r.guests)}
                    <span className="ms-2 text-sm font-normal text-muted">
                      ({t('reservations.womenCount', { count: r.guests_women })} · {t('reservations.menCount', { count: r.guests_men })}
                      {r.guests_children > 0 && <> · {t('reservations.childrenCount', { count: r.guests_children })}</>})
                    </span>
                  </>
                ) : '—'}
              </Info>
              <Info icon={Phone} label={t('clients.phone')}>
                <Link to={`/clients/${r.client.id}`} className="hover:underline"><span dir="ltr" className="tabular">{r.client.phone}</span></Link>
              </Info>
              {r.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted">{t('reservations.notes')}</dt>
                  <dd className="mt-1 whitespace-pre-line">{r.notes}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <Card.Header title={t('reservations.priceDetail')} />
            <dl className="divide-y divide-line">
              <Line label={localName(r, 'occasion')} value={formatMoney(r.base_price)} />
              {r.services.map((s) => (
                <Line
                  key={`${s.service}-${s.option}`}
                  label={
                    <>
                      {localName(s)}
                      {s.option && <span className="text-muted"> · {localName(s, 'option')}</span>}
                      {s.quantity > 1 && <span className="tabular text-muted"> × {s.quantity}</span>}
                    </>
                  }
                  value={formatMoney(s.line_total)}
                />
              ))}
              {Number(r.discount_amount) > 0 && (
                <Line
                  label={`${t('reservations.discount')}${r.discount_type === 'percent' ? ` (${formatNumber(r.discount_value)} %)` : ''}`}
                  value={`− ${formatMoney(r.discount_amount)}`}
                />
              )}
              <Line label={<strong>{t('reservations.totalToPay')}</strong>} value={<strong className="text-md">{formatMoney(r.total)}</strong>} />
            </dl>
          </Card>
        </div>

        <Payments reservation={r} onAdd={() => setPaying(true)} />
      </div>

      <PaymentModal open={paying} onClose={() => setPaying(false)} reservation={r} />
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => run('cancel')}
        loading={action.isPending}
        title={t('reservations.cancelTitle')}
        description={t('reservations.cancelText')}
        confirmLabel={t('reservations.cancel')}
        cancelLabel={t('reservations.keep')}
      />
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={onDelete}
        loading={remove.isPending}
        title={t('reservations.deleteTitle')}
        description={t('reservations.deleteText', { count: r.payments.length })}
        confirmLabel={t('reservations.deleteConfirm')}
        cancelLabel={t('reservations.keep')}
      />
    </>
  )
}

function Info({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
      <div>
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="mt-0.5 font-medium">{children}</dd>
      </div>
    </div>
  )
}

function Line({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <dt>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  )
}

/** "12 000 DA more to confirm": makes the confirmation rule visible. */
function ConfirmationProgress({ paid, status }) {
  const { t } = useTranslation()
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings/').then((r) => r.data) })
  const minimum = Number(settings?.min_confirmation_payment || 0)
  if (!settings || status === 'confirmed' || minimum <= 0) return null
  const pct = Math.min(100, (Number(paid) / minimum) * 100)
  return (
    <div className="mt-3 rounded-panel border border-warning/30 bg-warning-soft/60 px-4 py-3">
      <p className="text-sm font-medium text-warning">
        {t('reservations.toConfirm', { amount: formatMoney(minimum - Number(paid)), minimum: formatMoney(minimum) })}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-warning/20" aria-hidden>
        <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Payments({ reservation: r, onAdd }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const toast = useToast()
  const remove = useDeletePayment(r.id)
  const [deleting, setDeleting] = useState(null)
  const canAdd = r.status !== 'cancelled' && Number(r.remaining_amount) > 0

  return (
    <Card className="self-start">
      <Card.Header
        title={t('payments.title')}
        actions={canAdd && <Button size="sm" icon={Plus} onClick={onAdd}>{t('payments.add')}</Button>}
      />
      {r.payments.length === 0 ? (
        <EmptyState icon={Wallet} title={t('payments.empty')} description={t('payments.emptyText')} className="py-8" />
      ) : (
        <ul className="divide-y divide-line">
          {r.payments.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="tabular font-semibold">{formatMoney(p.amount)}</p>
                <p className="text-sm text-muted">
                  {formatDate(p.paid_on, { dateStyle: 'medium' })} · {t(`payments.methods.${p.method}`)}
                </p>
                {p.note && <p className="mt-0.5 text-sm text-subtle">{p.note}</p>}
              </div>
              {user?.is_staff && (
                <Button size="icon" variant="ghost" icon={Trash2} aria-label={t('payments.delete')} onClick={() => setDeleting(p)} />
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(deleting.id, {
            onSuccess: () => toast.success(t('payments.deleted')),
            onError: (e) => toast.error(t(describeError(e).messageKey)),
            onSettled: () => setDeleting(null),
          })
        }
        title={t('payments.deleteTitle', { amount: formatMoney(deleting?.amount) })}
        description={t('payments.deleteText')}
        confirmLabel={t('payments.delete')}
        cancelLabel={t('payments.keep')}
      />
    </Card>
  )
}

function PaymentModal({ open, onClose, reservation: r }) {
  const { t } = useTranslation()
  const toast = useToast()
  const add = useAddPayment(r.id)
  const blank = () => ({ amount: '', paid_on: toISODate(new Date()), method: 'cash', note: '' })
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState({})
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const remaining = Number(r.remaining_amount)

  const close = () => {
    setForm(blank())
    setErrors({})
    onClose()
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!(amount > 0)) return setErrors({ amount: ['min_value'] })
    if (amount > remaining) return setErrors({ amount: ['exceeds_remaining'] })
    if (!form.paid_on) return setErrors({ paid_on: ['required'] })
    add.mutate(
      { ...form, amount },
      {
        onSuccess: (saved) => {
          toast.success(saved.status === 'confirmed' && r.status !== 'confirmed' ? t('payments.addedConfirmed') : t('payments.added'))
          close()
        },
        onError: (error) => {
          const { messageKey, fieldErrors } = describeError(error)
          setErrors(fieldErrors)
          toast.error(t(messageKey))
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title={t('payments.add')}
      description={t('payments.remainingHint', { amount: formatMoney(remaining) })}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={add.isPending}>{t('common.cancel')}</Button>
          <Button type="submit" form="payment-form" loading={add.isPending}>{t('payments.save')}</Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={onSubmit} noValidate className="grid gap-4">
        <Field label={t('payments.amount')} error={fieldError(t, errors, 'amount')}>
          <Input type="number" min="1" max={remaining} step="1000" suffix={t('common.currency')} value={form.amount} onChange={set('amount')} autoFocus />
        </Field>
        <button type="button" onClick={() => setForm({ ...form, amount: String(remaining) })} className="-mt-2 justify-self-start text-sm font-semibold text-brand hover:underline dark:text-gold">
          {t('payments.payAll', { amount: formatMoney(remaining) })}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('payments.date')} error={fieldError(t, errors, 'paid_on')}>
            <Input type="date" value={form.paid_on} onChange={set('paid_on')} />
          </Field>
          <Field label={t('payments.method')}>
            <Select value={form.method} onChange={set('method')}>
              {['cash', 'transfer', 'cheque', 'other'].map((m) => (
                <option key={m} value={m}>{t(`payments.methods.${m}`)}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t('payments.note')} optional>
          <Input value={form.note} onChange={set('note')} />
        </Field>
      </form>
    </Modal>
  )
}
