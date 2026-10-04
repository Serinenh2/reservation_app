import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Ban, CalendarCheck, Clock, IdCard, Mail, MapPin, Moon, Phone, Search, UserRound, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { eventLabel, formatDate, formatMoney, formatNumber, formatTime } from '@/lib/format'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { Badge, Card, EmptyState, Input, PageHeader, Spinner, StatCard, StatusBadge } from '@/components/ui'
import ReservationTable from '@/features/reservations/ReservationTable'
import { endsNextDay } from '@/features/reservations/pricing'

const EXAMPLES = ['15/10/2026', '10/2026', 'Benali', '0550']

/**
 * One box to find anything. The server decides what the text is:
 * a day (15/10/2026), a month (10/2026), or a client / worker.
 * ?q= keeps the search in the address (back button, bookmarks).
 */
export default function SearchPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [text, setText] = useState(params.get('q') || '')
  const q = useDebouncedValue(text.trim(), 350)

  useEffect(() => {
    setParams(q ? { q } : {}, { replace: true })
  }, [q, setParams])

  const { data, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.get('/search/', { params: { q } }).then((r) => r.data),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader title={t('search.title')} description={t('search.subtitle')} />
      <Card className="mb-6">
        <Card.Body>
          <div className="relative">
            <Search className="pointer-events-none absolute z-10 start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle" aria-hidden />
            <Input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('search.placeholder')}
              aria-label={t('search.title')}
              className="h-12 ps-12 text-md"
              autoFocus
            />
            {isFetching && <Spinner className="absolute end-4 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle" />}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{t('search.examples')}</span>
            {EXAMPLES.map((example) => (
              <button key={example} type="button" onClick={() => setText(example)} className="rounded-full border border-line px-2.5 py-0.5 font-medium text-ink hover:bg-sunken" dir="ltr">
                {example}
              </button>
            ))}
          </div>
        </Card.Body>
      </Card>

      {q.length < 2 || !data ? (
        <Card><EmptyState icon={Search} title={t('search.start')} description={t('search.startText')} /></Card>
      ) : data.kind === 'day' ? (
        <DayResults data={data} />
      ) : data.kind === 'month' ? (
        <MonthResults data={data} />
      ) : (
        <TextResults data={data} />
      )}
    </>
  )
}

function Totals({ totals }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard label={t('reservations.total')} value={formatMoney(totals.total)} tone="gold" />
      <StatCard label={t('reservations.paid')} value={formatMoney(totals.paid)} tone="success" />
      <StatCard label={t('reservations.remaining')} value={formatMoney(totals.remaining)} tone="warning" />
    </div>
  )
}

/** Everything known about a client, compact. */
function ClientInfo({ client }) {
  const { t } = useTranslation()
  const items = [
    [Phone, <span key="p" dir="ltr" className="tabular">{client.phone}</span>],
    client.phone_alt && [Phone, <span key="p2" dir="ltr" className="tabular">{client.phone_alt}</span>],
    client.email && [Mail, <span key="m" className="break-all">{client.email}</span>],
    client.address && [MapPin, client.address],
    client.id_card_number && [IdCard, <span key="id"><span dir="ltr" className="tabular">{client.id_card_number}</span>{client.id_card_issued_at && <span className="text-muted"> · {client.id_card_issued_at}</span>}</span>],
  ].filter(Boolean)
  return (
    <div>
      <Link to={`/clients/${client.id}`} className="text-md font-semibold hover:underline">{client.full_name}</Link>
      <ul className="mt-2 space-y-1.5 text-base">
        {items.map(([Icon, content], i) => (
          <li key={i} className="flex items-start gap-2.5">
            <Icon className="mt-1 h-4 w-4 shrink-0 text-subtle" aria-hidden />
            <span className="min-w-0">{content}</span>
          </li>
        ))}
      </ul>
      {client.notes && <p className="mt-2 whitespace-pre-line text-sm text-muted">{client.notes}</p>}
      <p className="mt-2 text-sm text-muted">{t('clients.since', { count: client.reservation_count })}</p>
    </div>
  )
}

/** A date: free, blocked, or booked (each booking with the full client). */
function DayResults({ data }) {
  const { t } = useTranslation()
  const blocked = data.blocked[0]
  const state = blocked ? 'blocked' : data.reservations.some((r) => r.status !== 'cancelled') ? 'booked' : 'free'
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <h2 className="text-xl font-bold first-letter:uppercase">{formatDate(data.date, { dateStyle: 'full' })}</h2>
          {state === 'blocked' ? (
            <Badge tone="danger" dot>{t('status.blocked')}{blocked.reason ? ` · ${blocked.reason}` : ''}</Badge>
          ) : state === 'booked' ? (
            <Badge tone="warning" dot>{t('search.booked', { count: data.totals.count })}</Badge>
          ) : (
            <Badge tone="success" dot>{t('search.free')}</Badge>
          )}
        </div>
      </Card>
      {data.reservations.length > 0 && <Totals totals={data.totals} />}
      {data.reservations.map((r) => (
        <Card key={r.id}>
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_1.2fr]">
            <ClientInfo client={data.clients[r.client.id]} />
            <div className="space-y-3 md:border-s md:border-line md:ps-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to={`/reservations/${r.id}`} className="font-semibold hover:underline">{eventLabel(r)}</Link>
                <StatusBadge status={r.status} />
              </div>
              <p className="flex items-center gap-2 text-base text-muted">
                <Clock className="h-4 w-4" aria-hidden />
                <span dir="ltr" className="tabular">{formatTime(r.start_time)} → {formatTime(r.end_time)}</span>
                {endsNextDay(r.start_time, r.end_time) && <Moon className="h-3.5 w-3.5" aria-label={t('reservations.endsNextDay')} />}
              </p>
              {r.guests > 0 && (
                <p className="flex items-center gap-2 text-base text-muted">
                  <Users className="h-4 w-4" aria-hidden />
                  {formatNumber(r.guests)} ({t('reservations.womenCount', { count: r.guests_women })} · {t('reservations.menCount', { count: r.guests_men })})
                </p>
              )}
              <dl className="grid grid-cols-3 gap-2 rounded-control bg-sunken/60 p-3 text-center">
                <Money label={t('reservations.total')} value={r.total} />
                <Money label={t('reservations.paid')} value={r.paid_amount} className="text-success" />
                <Money label={t('reservations.remaining')} value={r.remaining_amount} className={Number(r.remaining_amount) > 0 ? 'text-warning' : ''} />
              </dl>
            </div>
          </div>
        </Card>
      ))}
      {data.reservations.length === 0 && !blocked && (
        <Card><EmptyState icon={CalendarCheck} title={t('search.freeTitle')} description={t('search.freeText')} /></Card>
      )}
      {blocked && data.reservations.length === 0 && (
        <Card><EmptyState icon={Ban} title={t('status.blocked')} description={blocked.reason || t('search.blockedText')} /></Card>
      )}
    </div>
  )
}

function Money({ label, value, className }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`tabular font-semibold ${className || ''}`}>{formatMoney(value)}</dd>
    </div>
  )
}

/** A month: totals + all reservations of the month. */
function MonthResults({ data }) {
  const { t, i18n } = useTranslation()
  const [y, m] = data.start.split('-').map(Number)
  const label = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ', { month: 'long', year: 'numeric', numberingSystem: 'latn' }).format(new Date(y, m - 1, 1))
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold first-letter:uppercase">{label}</h2>
      <Totals totals={data.totals} />
      <Card>
        <Card.Header title={t('search.monthReservations', { count: data.reservations.length })} />
        <ReservationTable rows={data.reservations} empty={<EmptyState icon={CalendarCheck} title={t('search.noReservations')} />} />
      </Card>
      {data.blocked.length > 0 && (
        <Card>
          <Card.Header title={t('blocked.title')} />
          <ul className="divide-y divide-line">
            {data.blocked.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="font-medium">{formatDate(b.date, { dateStyle: 'full' })}</span>
                <span className="text-muted">{b.reason || '—'}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

/** A name / phone / ID number: each client with money and reservations; workers for admins. */
function TextResults({ data }) {
  const { t } = useTranslation()
  if (data.clients.length === 0 && data.employees.length === 0) {
    return <Card><EmptyState icon={Search} title={t('search.nothing')} description={t('search.nothingText')} /></Card>
  }
  return (
    <div className="space-y-6">
      {data.clients.map(({ client, reservations, totals }) => (
        <Card key={client.id}>
          <div className="grid items-start gap-6 p-5 lg:grid-cols-[1fr_2fr]">
            <ClientInfo client={client} />
            <Totals totals={totals} />
          </div>
          <div className="border-t border-line">
            <ReservationTable rows={reservations} showClient={false} empty={<p className="px-5 py-6 text-center text-muted">{t('clients.noReservations')}</p>} />
          </div>
        </Card>
      ))}
      {data.employees.length > 0 && (
        <Card>
          <Card.Header title={t('nav.employees')} />
          <ul className="divide-y divide-line">
            {data.employees.map((e) => (
              <li key={e.id}>
                <Link to={`/employees/${e.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-sunken/60">
                  <UserRound className="h-4 w-4 text-subtle" aria-hidden />
                  <span className="font-semibold">{e.full_name}</span>
                  <span className="text-muted">{e.position}</span>
                  {e.phone && <span dir="ltr" className="tabular ms-auto text-muted">{e.phone}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
