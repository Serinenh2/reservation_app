import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Moon } from 'lucide-react'
import { describeError, fieldError } from '@/lib/api'
import { formatDate, formatMoney, formatNumber, localName } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useCatalog } from '@/features/catalog/api'
import ClientPicker from '@/features/clients/ClientPicker'
import { useClient } from '@/features/clients/api'
import { Button, Card, Field, FullPageSpinner, Input, PageHeader, Select, Textarea, TotalBox, useToast } from '@/components/ui'
import { useReservation, useSaveReservation } from './api'
import { endsNextDay, occasionPrice, previewTotals } from './pricing'

const EMPTY = {
  client: null,
  event_type: '',
  occasion: '',
  event_date: '',
  start_time: '19:00',
  end_time: '01:00',
  guests_women: '',
  guests_men: '',
  guests_children: '',
  base_price: '',
  discount_type: 'none',
  discount_value: '',
  notes: '',
  services: {}, // { [serviceId]: { quantity, option } }
}

/** /reservations/new (?date=2026-10-15 from the calendar) and /reservations/:id/edit */
export default function ReservationFormPage() {
  const { id } = useParams()
  const { data: existing, isLoading } = useReservation(id)
  if (id && (isLoading || !existing)) return <FullPageSpinner />
  return <ReservationForm key={id || 'new'} existing={existing} />
}

function ReservationForm({ existing }) {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const save = useSaveReservation()
  const { data: eventTypes = [] } = useCatalog('event-types')
  const { data: occasions = [] } = useCatalog('occasions')
  const { data: allServices = [] } = useCatalog('services')

  const [form, setForm] = useState(() =>
    existing
      ? {
          client: existing.client,
          event_type: existing.event_type ? String(existing.event_type) : '',
          occasion: String(existing.occasion),
          event_date: existing.event_date,
          start_time: existing.start_time.slice(0, 5),
          end_time: existing.end_time.slice(0, 5),
          guests_women: existing.guests_women || '',
          guests_men: existing.guests_men || '',
          guests_children: existing.guests_children || '',
          base_price: existing.base_price,
          discount_type: existing.discount_type,
          discount_value: existing.discount_value || '',
          notes: existing.notes,
          services: Object.fromEntries(existing.services.map((s) => [s.service, { quantity: s.quantity, option: s.option }])),
        }
      : { ...EMPTY, event_date: params.get('date') || '' },
  )
  const [errors, setErrors] = useState({})
  const [conflicts, setConflicts] = useState([])

  // "New reservation" from a client page: ?client=12 pre-selects the client.
  const { data: presetClient } = useClient(!existing && params.get('client'))
  useEffect(() => {
    if (presetClient) setForm((f) => (f.client ? f : { ...f, client: presetClient }))
  }, [presetClient])
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const bind = (key) => ({ value: form[key], onChange: (e) => set(key, e.target.value) })

  // Inactive items stay visible only if this reservation already uses them.
  const occasionOptions = occasions.filter((o) => o.is_active || String(o.id) === form.occasion)
  const eventTypeOptions = eventTypes.filter((o) => o.is_active || String(o.id) === form.event_type)
  const serviceOptions = allServices.filter((s) => s.is_active || form.services[s.id])

  // Existing reservations keep the price they were booked at.
  // A service with options takes the chosen option's price.
  const priceOf = (service, optionId = form.services[service.id]?.option) => {
    const kept = existing?.services.find((l) => l.service === service.id && (l.option ?? null) === (optionId ?? null))
    if (kept) return kept.unit_price
    const option = service.options.find((o) => o.id === optionId)
    return option ? option.price : service.price
  }

  // The occasion price follows the number of guests (tier grid) until the
  // user types a price by hand. Existing reservations keep their saved price.
  const [priceTouched, setPriceTouched] = useState(Boolean(existing))
  const totalGuests = (Number(form.guests_women) || 0) + (Number(form.guests_men) || 0)
  const occasion = occasions.find((o) => String(o.id) === form.occasion)
  const suggested = occasion ? occasionPrice(occasion, totalGuests) : null
  useEffect(() => {
    if (suggested && !priceTouched) setForm((f) => ({ ...f, base_price: suggested.price }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested?.price, priceTouched])

  const onOccasion = (value) => {
    setPriceTouched(false)
    setForm((f) => ({ ...f, occasion: value }))
  }

  const lines = serviceOptions
    .filter((s) => form.services[s.id])
    .map((s) => ({ price: priceOf(s), quantity: form.services[s.id].quantity }))
  const totals = useMemo(
    () => previewTotals({ basePrice: form.base_price, lines, discountType: form.discount_type, discountValue: form.discount_value }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.base_price, JSON.stringify(lines), form.discount_type, form.discount_value],
  )
  const paid = Number(existing?.paid_amount || 0)

  useEffect(() => {
    if (conflicts.length) setConflicts([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.event_date, form.start_time, form.end_time])

  const validate = () => {
    const e = {}
    if (!form.client) e.client_id = ['required']
    if (!form.event_type) e.event_type = ['required']
    if (!form.occasion) e.occasion = ['required']
    if (!form.event_date) e.event_date = ['required']
    if (!form.start_time) e.start_time = ['required']
    if (!form.end_time) e.end_time = ['required']
    if (form.start_time && form.start_time === form.end_time) e.end_time = ['same_as_start']
    if (form.base_price === '' || Number(form.base_price) < 0) e.base_price = ['min_value']
    if (Number(form.guests_women) < 0) e.guests_women = ['min_value']
    if (Number(form.guests_men) < 0) e.guests_men = ['min_value']
    if (Number(form.guests_children) < 0) e.guests_children = ['min_value']
    if (totals.discountTooHigh) e.discount_value = ['discount_too_high']
    else if (totals.total < paid) e.discount_value = ['total_below_paid']
    return e
  }

  const onSubmit = (ev) => {
    ev.preventDefault()
    const local = validate()
    setErrors(local)
    if (Object.keys(local).length) {
      toast.error(t('errors.validation'))
      return
    }
    const payload = {
      id: existing?.id,
      client_id: form.client.id,
      event_type: Number(form.event_type),
      occasion: Number(form.occasion),
      event_date: form.event_date,
      start_time: form.start_time,
      end_time: form.end_time,
      guests_women: Number(form.guests_women) || 0,
      guests_men: Number(form.guests_men) || 0,
      guests_children: Number(form.guests_children) || 0,
      base_price: Number(form.base_price),
      discount_type: form.discount_type,
      discount_value: form.discount_type === 'none' ? 0 : Number(form.discount_value) || 0,
      notes: form.notes,
      services: Object.entries(form.services).map(([service, { quantity, option }]) => ({ service: Number(service), quantity, option: option ?? null })),
    }
    save.mutate(payload, {
      onSuccess: (saved) => {
        toast.success(t(existing ? 'reservations.updated' : 'reservations.created'))
        navigate(`/reservations/${saved.id}`, { replace: true })
      },
      onError: (error) => {
        const { messageKey, fieldErrors } = describeError(error)
        setErrors(fieldErrors)
        setConflicts(fieldErrors.conflicts || [])
        const firstCode = Object.values(fieldErrors).flat()[0]
        toast.error(t(`errors.codes.${firstCode}`, { defaultValue: t(messageKey) }))
      },
    })
  }

  const err = (key) => fieldError(t, errors, key)
  const toggleService = (sid, on) =>
    setForm((f) => {
      const services = { ...f.services }
      // Services with options start on their first (cheapest) option.
      if (on) services[sid] = { quantity: 1, option: allServices.find((s) => s.id === sid)?.options[0]?.id ?? null }
      else delete services[sid]
      return { ...f, services }
    })

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={existing ? t('reservations.editTitle') : t('reservations.newTitle')}
        description={existing ? `${existing.client.full_name} · ${formatDate(existing.event_date)}` : t('reservations.newSubtitle')}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={save.isPending}>{t('common.save')}</Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <Card.Header title={t('reservations.client')} />
            <Card.Body>
              <Field label={t('reservations.client')} error={err('client_id')}>
                <ClientPicker value={form.client} onChange={(c) => set('client', c)} />
              </Field>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header title={t('reservations.event')} />
            <Card.Body className="grid gap-4 sm:grid-cols-2">
              <Field label={t('reservations.eventType')} error={err('event_type')}>
                <Select {...bind('event_type')}>
                  <option value="">{t('reservations.chooseEventType')}</option>
                  {eventTypeOptions.map((o) => (
                    <option key={o.id} value={o.id}>{localName(o)}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('reservations.occasion')} hint={t('reservations.occasionHint')} error={err('occasion')}>
                <Select value={form.occasion} onChange={(e) => onOccasion(e.target.value)}>
                  <option value="">{t('reservations.chooseOccasion')}</option>
                  {occasionOptions.map((o) => (
                    <option key={o.id} value={o.id}>{localName(o)}</option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                <Field label={t('reservations.guestsWomen')} optional error={err('guests_women')}>
                  <Input type="number" min="0" step="10" {...bind('guests_women')} />
                </Field>
                <Field label={t('reservations.guestsMen')} optional error={err('guests_men')}>
                  <Input type="number" min="0" step="10" {...bind('guests_men')} />
                </Field>
                <Field label={t('reservations.guestsChildren')} optional error={err('guests_children')}>
                  <Input type="number" min="0" step="5" {...bind('guests_children')} />
                </Field>
              </div>
              <p className="-mt-2 text-sm text-muted sm:col-span-2">
                {t('reservations.guestsTotal')} : <span className="tabular font-semibold text-ink">{formatNumber(totalGuests)}</span>
                {Number(form.guests_children) > 0 && <> · {t('reservations.childrenCount', { count: Number(form.guests_children) })}</>}
                <span className="block text-subtle">{t('reservations.childrenNotInTotal')}</span>
              </p>
              <Field label={t('reservations.date')} error={err('event_date')} className="sm:col-span-2">
                <Input type="date" {...bind('event_date')} />
              </Field>
              <Field label={t('reservations.startTime')} error={err('start_time')}>
                <Input type="time" {...bind('start_time')} />
              </Field>
              <Field
                label={t('reservations.endTime')}
                error={err('end_time')}
                hint={endsNextDay(form.start_time, form.end_time) ? (
                  <span className="inline-flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" aria-hidden />{t('reservations.endsNextDay')}</span>
                ) : undefined}
              >
                <Input type="time" {...bind('end_time')} />
              </Field>
              {conflicts.length > 0 && <ConflictBox conflicts={conflicts} className="sm:col-span-2" />}
            </Card.Body>
          </Card>

          <Card>
            <Card.Header title={t('reservations.services')} description={t('reservations.servicesHint')} />
            {serviceOptions.length === 0 ? (
              <p className="px-5 py-6 text-base text-muted">{t('reservations.noServices')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {serviceOptions.map((s) => {
                  const checked = Boolean(form.services[s.id])
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleService(s.id, e.target.checked)}
                          className="h-4 w-4 rounded accent-[rgb(var(--c-brand))]"
                        />
                        <span className="truncate font-medium">{localName(s)}</span>
                        <span className="tabular text-sm text-muted">{formatMoney(priceOf(s))}</span>
                      </label>
                      {checked && s.options.length > 0 && (
                        <div className="min-w-[12rem]">
                          <Select
                            aria-label={t('reservations.option')}
                            value={form.services[s.id].option ?? ''}
                            onChange={(e) => set('services', { ...form.services, [s.id]: { ...form.services[s.id], option: Number(e.target.value) } })}
                          >
                            {s.options.map((o) => (
                              <option key={o.id} value={o.id}>{localName(o)} · {formatMoney(priceOf(s, o.id))}</option>
                            ))}
                          </Select>
                        </div>
                      )}
                      {checked && (
                        <div className="flex items-center gap-2">
                          <label htmlFor={`qty-${s.id}`} className="text-sm text-muted">{t('reservations.quantity')}</label>
                          <div className="w-20">
                            <Input
                              id={`qty-${s.id}`}
                              type="number"
                              min="1"
                              value={form.services[s.id].quantity}
                              onChange={(e) => set('services', { ...form.services, [s.id]: { ...form.services[s.id], quantity: Math.max(1, parseInt(e.target.value, 10) || 1) } })}
                            />
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {err('services') && <p className="px-5 pb-4 text-sm font-medium text-danger" role="alert">{err('services')}</p>}
          </Card>

          <Card>
            <Card.Header title={t('reservations.notes')} />
            <Card.Body>
              <Textarea aria-label={t('reservations.notes')} rows={3} {...bind('notes')} />
            </Card.Body>
          </Card>
        </div>

        {/* Price: sticky on large screens so the total is always visible */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <Card.Header title={t('reservations.price')} />
            <Card.Body className="space-y-4">
              <Field label={t('reservations.basePrice')} hint={<TierHint suggested={suggested} guests={totalGuests} />} error={err('base_price')}>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  suffix={t('common.currency')}
                  value={form.base_price}
                  onChange={(e) => {
                    setPriceTouched(true)
                    set('base_price', e.target.value)
                  }}
                />
              </Field>
              {suggested && Number(suggested.price) !== Number(form.base_price) && (
                <button
                  type="button"
                  onClick={() => setPriceTouched(false)}
                  className="-mt-2 text-sm font-semibold text-brand hover:underline dark:text-gold"
                >
                  {t('reservations.useTierPrice', { amount: formatMoney(suggested.price) })}
                </button>
              )}
              <div className="grid gap-3">
                <Field label={t('reservations.discount')}>
                  <Select value={form.discount_type} onChange={(e) => set('discount_type', e.target.value)}>
                    <option value="none">{t('reservations.discountNone')}</option>
                    <option value="fixed">{t('reservations.discountFixed')}</option>
                    <option value="percent">{t('reservations.discountPercent')}</option>
                  </Select>
                </Field>
                {form.discount_type !== 'none' && (
                  <Field label={t('reservations.discountValue')} error={err('discount_value')}>
                    <Input
                      type="number"
                      min="0"
                      max={form.discount_type === 'percent' ? 100 : undefined}
                      suffix={form.discount_type === 'percent' ? '%' : t('common.currency')}
                      {...bind('discount_value')}
                    />
                  </Field>
                )}
              </div>
              {form.discount_type === 'none' && err('discount_value') && (
                <p className="text-sm font-medium text-danger" role="alert">{err('discount_value')}</p>
              )}

              <dl className="space-y-2 border-t border-line pt-4 text-base">
                <Row label={t('reservations.basePrice')} value={formatMoney(form.base_price)} />
                <Row label={t('reservations.services')} value={formatMoney(totals.servicesTotal)} />
                {totals.discount > 0 && <Row label={t('reservations.discount')} value={`− ${formatMoney(totals.discount)}`} />}
              </dl>
              <TotalBox label={t('reservations.totalToPay')} amount={totals.total} />
              <p className="text-sm text-subtle">{t('reservations.previewNote')}</p>
            </Card.Body>
          </Card>
        </div>
      </div>
    </form>
  )
}

/** Which tier gives the price, so the user understands where it comes from. */
function TierHint({ suggested, guests }) {
  const { t } = useTranslation()
  if (!suggested?.tier) return t('reservations.basePriceHint')
  if (!Number(guests)) return t('reservations.tierNoGuests', { count: suggested.tier.max_guests })
  if (suggested.overLast) return <span className="text-warning">{t('reservations.tierOverLast', { count: suggested.tier.max_guests })}</span>
  return t('reservations.tierApplied', { count: suggested.tier.max_guests })
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular font-medium">{value}</dd>
    </div>
  )
}

/** Shown when the server finds overlapping reservations. */
export function ConflictBox({ conflicts, className }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className={cn('rounded-control border border-danger/40 bg-danger-soft p-4 text-danger', className)}>
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        {t('errors.codes.time_conflict')}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {conflicts.map((c) => (
          <li key={c.id}>
            <Link to={`/reservations/${c.id}`} className="font-semibold underline underline-offset-2">{c.client}</Link>
            {' · '}
            {formatDate(c.event_date, { dateStyle: 'medium' })} · <span dir="ltr" className="tabular">{c.start_time} → {c.end_time}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
