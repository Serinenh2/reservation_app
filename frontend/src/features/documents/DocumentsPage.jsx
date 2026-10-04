import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { FileDown, FileText, FileType2, Search, X } from 'lucide-react'
import { api } from '@/lib/api'
import { eventLabel, formatDate, formatMoney, toISODate } from '@/lib/format'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { Button, Card, EmptyState, Field, Input, PageHeader, Segmented, Select, Spinner, StatusBadge, useToast } from '@/components/ui'
import { useReservation, useReservations } from '@/features/reservations/api'
import { useClient } from '@/features/clients/api'
import EngagementSheet from './EngagementSheet'
import { buildEngagement, downloadEngagementWord } from './engagement'
import ReceiptSheet from './ReceiptSheet'
import { buildReceipt, downloadPdf, downloadWord } from './receipt'

/**
 * Documents filled from a reservation and its client, downloaded as PDF or
 * Word to print:
 *   receipt     "Bon pour / وصل استلام"  (A5 landscape)
 *   engagement  "تعهد و إلتزام"          (A4 portrait)
 * /documents?doc=engagement&reservation=12 opens it with both selected.
 */
export default function DocumentsPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const reservationId = params.get('reservation')
  const doc = params.get('doc') === 'engagement' ? 'engagement' : 'receipt'
  const update = (changes) => {
    const next = { doc, reservation: reservationId, ...changes }
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true })
  }
  const select = (id) => update({ reservation: id ? String(id) : null })

  return (
    <>
      <PageHeader title={t('documents.title')} description={t('documents.subtitle')} />
      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <Card className="self-start">
          <Card.Header title={t('documents.choose')} description={t('documents.receiptHint')} />
          <Card.Body className="space-y-4">
            <Segmented
              label={t('documents.choose')}
              options={[['receipt', t('documents.receipt')], ['engagement', t('documents.engagement')]]}
              value={doc}
              onChange={(value) => update({ doc: value })}
            />
            {reservationId ? <SelectedReservation id={reservationId} onClear={() => select(null)} /> : <ReservationSearch onPick={select} />}
          </Card.Body>
        </Card>
        {reservationId ? (
          doc === 'engagement' ? <EngagementPanel id={reservationId} /> : <ReceiptPanel id={reservationId} />
        ) : (
          <Card><EmptyState icon={FileText} title={t('documents.pickFirst')} description={t('documents.pickFirstText')} /></Card>
        )}
      </div>
    </>
  )
}

/** Search by client name or phone; without a search, the next reservations. */
function ReservationSearch({ onPick }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search.trim())
  const filters = debounced
    ? { search: debounced, status: 'pending,confirmed' }
    : { date_from: toISODate(new Date()), ordering: 'date', status: 'pending,confirmed' }
  const { data, isFetching } = useReservations(filters)
  const rows = (data?.results || []).slice(0, 10)

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute z-10 start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
        <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('clients.searchPlaceholder')} aria-label={t('common.search')} className="ps-9" />
        {isFetching && <Spinner className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />}
      </div>
      {!debounced && <p className="text-sm font-semibold text-muted">{t('documents.upcoming')}</p>}
      {rows.length === 0 && !isFetching ? (
        <p className="py-4 text-center text-base text-muted">{t('reservations.noMatch')}</p>
      ) : (
        <ul className="divide-y divide-line rounded-control border border-line">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onPick(r.id)} className="w-full px-3 py-2.5 text-start hover:bg-sunken focus:bg-sunken focus:outline-none">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{r.client.full_name}</span>
                  <StatusBadge status={r.status} />
                </span>
                <span className="block truncate text-sm text-muted">{formatDate(r.event_date, { dateStyle: 'medium' })} · {eventLabel(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SelectedReservation({ id, onClear }) {
  const { t } = useTranslation()
  const { data: r } = useReservation(id)
  if (!r) return <div className="h-16 animate-pulse rounded-control bg-sunken" />
  return (
    <div className="flex items-start justify-between gap-3 rounded-control border border-line bg-sunken/50 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate font-semibold">{r.client.full_name}</p>
        <p className="text-sm text-muted">{formatDate(r.event_date, { dateStyle: 'medium' })} · {eventLabel(r)}</p>
      </div>
      <Button size="sm" variant="ghost" icon={X} onClick={onClear}>{t('clients.change')}</Button>
    </div>
  )
}

function ReceiptPanel({ id }) {
  const { t } = useTranslation()
  const toast = useToast()
  const sheet = useRef(null)
  const { data: r, isLoading } = useReservation(id)
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings/').then((res) => res.data) })
  const [choice, setChoice] = useState('total') // 'total' or a payment id
  const [busy, setBusy] = useState(null)
  useEffect(() => setChoice('total'), [id])

  const amount = useMemo(() => {
    if (!r) return 0
    if (choice === 'total') return Number(r.paid_amount)
    return Number(r.payments.find((p) => String(p.id) === choice)?.amount || 0)
  }, [r, choice])
  const data = useMemo(() => (r ? buildReceipt(r, amount, settings?.company_name) : null), [r, amount, settings])

  if (isLoading || !data) return <Card><div className="grid h-80 place-items-center text-gold"><Spinner className="h-6 w-6" /></div></Card>

  const run = (kind) => async () => {
    setBusy(kind)
    try {
      if (kind === 'pdf') await downloadPdf(sheet.current, data.fileName)
      else await downloadWord(data, data.fileName)
    } catch {
      toast.error(t('documents.downloadFailed'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-4">
        <Field label={t('documents.amountFor')} className="min-w-[16rem] flex-1">
          <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="total">{t('documents.totalPaid', { amount: formatMoney(r.paid_amount) })}</option>
            {r.payments.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {formatDate(p.paid_on, { dateStyle: 'medium' })} · {formatMoney(p.amount)} · {t(`payments.methods.${p.method}`)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex gap-2">
          <Button icon={FileDown} loading={busy === 'pdf'} disabled={Boolean(busy)} onClick={run('pdf')}>PDF</Button>
          <Button variant="secondary" icon={FileType2} loading={busy === 'word'} disabled={Boolean(busy)} onClick={run('word')}>Word</Button>
        </div>
      </div>
      {amount <= 0 && <p className="border-b border-line bg-warning-soft px-4 py-2 text-sm font-medium text-warning">{t('documents.noPayment')}</p>}

      {/* Preview: the real sheet, scaled down to fit; the PDF uses it at full size. */}
      <div className="overflow-x-auto bg-sunken/60 p-4">
        <div className="mx-auto w-fit shadow-overlay">
          <ReceiptSheet ref={sheet} data={data} />
        </div>
      </div>
    </Card>
  )
}

/** "تعهد و إلتزام": needs the full client record (address, ID card). */
function EngagementPanel({ id }) {
  const { t } = useTranslation()
  const toast = useToast()
  const sheet = useRef(null)
  const { data: r } = useReservation(id)
  const { data: client } = useClient(r?.client.id)
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings/').then((res) => res.data) })
  const [busy, setBusy] = useState(null)
  const data = useMemo(() => (r && client ? buildEngagement(r, client, settings) : null), [r, client, settings])

  if (!data) return <Card><div className="grid h-80 place-items-center text-gold"><Spinner className="h-6 w-6" /></div></Card>

  const missing = [!client.id_card_number && t('clients.idCardNumber'), !client.address && t('clients.address'), !settings?.company_name_ar && t('settings.companyNameAr')].filter(Boolean)
  const run = (kind) => async () => {
    setBusy(kind)
    try {
      if (kind === 'pdf') await downloadPdf(sheet.current, data.fileName, { format: 'a4', orientation: 'portrait' })
      else await downloadEngagementWord(data)
    } catch {
      toast.error(t('documents.downloadFailed'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <p className="text-base text-muted">{t('documents.engagementHint')}</p>
        <div className="flex gap-2">
          <Button icon={FileDown} loading={busy === 'pdf'} disabled={Boolean(busy)} onClick={run('pdf')}>PDF</Button>
          <Button variant="secondary" icon={FileType2} loading={busy === 'word'} disabled={Boolean(busy)} onClick={run('word')}>Word</Button>
        </div>
      </div>
      {missing.length > 0 && (
        <p className="border-b border-line bg-warning-soft px-4 py-2 text-sm font-medium text-warning">
          {t('documents.missingInfo', { fields: missing.join(', ') })}
        </p>
      )}
      <div className="overflow-x-auto bg-sunken/60 p-4">
        <div className="mx-auto w-fit shadow-overlay">
          <EngagementSheet ref={sheet} data={data} />
        </div>
      </div>
    </Card>
  )
}
