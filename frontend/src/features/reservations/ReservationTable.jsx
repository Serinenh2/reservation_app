import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Moon } from 'lucide-react'
import { eventLabel, formatDate, formatMoney, formatTime } from '@/lib/format'
import { StatusBadge, Table } from '@/components/ui'
import { endsNextDay } from './pricing'

/** Reservations table shared by the list page and the client page. */
export default function ReservationTable({ rows, empty, showClient = true }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const columns = [
    {
      key: 'event_date',
      header: t('reservations.date'),
      render: (r) => (
        <div className={r.status === 'cancelled' ? 'text-muted line-through decoration-1' : ''}>
          <p className="whitespace-nowrap font-semibold">{formatDate(r.event_date, { dateStyle: 'medium' })}</p>
          <p className="flex items-center gap-1 text-sm text-muted">
            <span dir="ltr" className="tabular">{formatTime(r.start_time)} → {formatTime(r.end_time)}</span>
            {endsNextDay(r.start_time, r.end_time) && <Moon className="h-3 w-3" aria-label={t('reservations.endsNextDay')} />}
          </p>
        </div>
      ),
    },
    showClient && {
      key: 'client',
      header: t('reservations.client'),
      render: (r) => (
        <div>
          <p className="font-medium">{r.client.full_name}</p>
          <p dir="ltr" className="tabular text-sm text-muted rtl:text-end">{r.client.phone}</p>
        </div>
      ),
    },
    { key: 'occasion', header: t('reservations.occasionColumn'), render: (r) => eventLabel(r) },
    { key: 'total', header: t('reservations.total'), align: 'end', render: (r) => formatMoney(r.total) },
    {
      key: 'remaining',
      header: t('reservations.remaining'),
      align: 'end',
      render: (r) => <span className={Number(r.remaining_amount) > 0 && r.status !== 'cancelled' ? 'font-semibold text-warning' : 'text-muted'}>{formatMoney(r.remaining_amount)}</span>,
    },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
  ].filter(Boolean)

  return <Table caption={t('reservations.title')} columns={columns} rows={rows} empty={empty} onRowClick={(r) => navigate(`/reservations/${r.id}`)} />
}
