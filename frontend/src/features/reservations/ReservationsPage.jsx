import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Plus, Search } from 'lucide-react'
import { toISODate } from '@/lib/format'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { Button, Card, EmptyState, Input, PageHeader, Pagination, Segmented, Spinner } from '@/components/ui'
import ReservationTable from './ReservationTable'
import { useReservations } from './api'

const PERIODS = ['upcoming', 'past', 'all']
const STATUSES = ['', 'pending', 'confirmed', 'cancelled']

export default function ReservationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('upcoming')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const debounced = useDebouncedValue(search.trim())

  const today = toISODate(new Date())
  const filters = {
    page,
    search: debounced || undefined,
    status: status || undefined,
    ...(period === 'upcoming' && { date_from: today, ordering: 'date' }),
    ...(period === 'past' && { date_to: today }),
  }
  const { data, isLoading, isFetching } = useReservations(filters)
  const change = (setter) => (value) => {
    setter(value)
    setPage(1)
  }
  const filtered = debounced || status || period !== 'all'

  return (
    <>
      <PageHeader
        title={t('reservations.title')}
        description={data ? t('reservations.count', { count: data.count }) : t('common.loading')}
        actions={<Button icon={Plus} onClick={() => navigate('/reservations/new')}>{t('dashboard.createFirst')}</Button>}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative min-w-[14rem] max-w-md flex-1">
            <Search className="pointer-events-none absolute z-10 start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(e) => change(setSearch)(e.target.value)}
              placeholder={t('clients.searchPlaceholder')}
              aria-label={t('common.search')}
              className="ps-9"
            />
          </div>
          <Segmented label={t('reservations.period')} options={PERIODS.map((p) => [p, t(`reservations.periods.${p}`)])} value={period} onChange={change(setPeriod)} />
          <Segmented label={t('common.status')} options={STATUSES.map((s) => [s, s ? t(`status.${s}`) : t('reservations.allStatuses')])} value={status} onChange={change(setStatus)} />
          {isFetching && <Spinner className="h-4 w-4 text-subtle" />}
        </div>
        {isLoading ? (
          <div className="grid place-items-center py-16 text-gold"><Spinner className="h-6 w-6" /></div>
        ) : (
          <>
            <ReservationTable
              rows={data?.results || []}
              empty={
                <EmptyState
                  icon={ClipboardList}
                  title={filtered ? t('reservations.noMatch') : t('dashboard.noData')}
                  description={filtered ? t('reservations.noMatchText') : undefined}
                  action={!filtered && <Button icon={Plus} onClick={() => navigate('/reservations/new')}>{t('dashboard.createFirst')}</Button>}
                />
              }
            />
            <Pagination page={page} count={data?.count || 0} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  )
}
