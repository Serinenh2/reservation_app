import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Clock, Plus, BarChart3, Database, Workflow } from 'lucide-react'
import { api } from '@/lib/api'
import { eventLabel, formatMoney, formatNumber, formatDate, formatTime } from '@/lib/format'
import { Button, Card, EmptyState, PageHeader, Spinner, StatCard, StatusBadge, Badge } from '@/components/ui'

// recharts is heavy: only downloaded when the dashboard shows the chart.
const RevenueChart = lazy(() => import('@/features/dashboard/RevenueChart'))

/** The figures from spec §3, from GET /api/dashboard/ (cancelled reservations never count). */
export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [year, setYear] = useState(() => new Date().getFullYear())
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', year],
    queryFn: () => api.get('/dashboard/', { params: { year } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
  const value = (key, format = formatNumber) => (stats ? format(stats[key]) : '')
  const hasYearData = stats?.months.some((m) => m.count > 0)

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        description={<span className="first-letter:uppercase inline-block">{formatDate(new Date(), { dateStyle: 'full' })}</span>}
        actions={
          <Button icon={Plus} onClick={() => navigate('/reservations/new')}>
            {t('dashboard.createFirst')}
          </Button>
        }
      />

      {/* Activity */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard loading={isLoading} label={t('dashboard.todayReservations')} value={value('today')} icon={Clock} />
        <StatCard loading={isLoading} label={t('dashboard.upcomingReservations')} value={value('upcoming')} icon={CalendarDays} />
        <StatCard loading={isLoading} label={t('dashboard.reservationCount')} value={value('count')} icon={ClipboardList} />
        <StatCard loading={isLoading} label={t('dashboard.reservedDates')} value={value('reserved_dates')} icon={CalendarCheck} />
      </div>

      {/* Money: the three amounts the owner checks every day */}
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <StatCard loading={isLoading} label={t('dashboard.totalAmount')} value={value('total', formatMoney)} tone="gold" />
        <StatCard loading={isLoading} label={t('dashboard.paidAmount')} value={value('paid', formatMoney)} tone="success" />
        <StatCard loading={isLoading} label={t('dashboard.remainingAmount')} value={value('remaining', formatMoney)} tone="warning" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Card.Header
            title={t('dashboard.revenueChart')}
            description={t('dashboard.revenueChartHint')}
            actions={
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" icon={ChevronLeft} className="rtl:[&>svg]:-scale-x-100" aria-label={t('dashboard.previousYear')} onClick={() => setYear(year - 1)} />
                <span className="tabular min-w-[3.5rem] text-center font-semibold" aria-live="polite">{year}</span>
                <Button size="icon" variant="ghost" icon={ChevronRight} className="rtl:[&>svg]:-scale-x-100" aria-label={t('dashboard.nextYear')} onClick={() => setYear(year + 1)} />
              </div>
            }
          />
          {hasYearData ? (
            <div className="p-5">
              <Suspense fallback={<div className="grid h-72 place-items-center text-gold"><Spinner /></div>}>
                <RevenueChart months={stats.months} year={stats.year} />
              </Suspense>
              <MonthTable months={stats.months} year={stats.year} />
            </div>
          ) : (
            <EmptyState icon={BarChart3} title={t('dashboard.noData')} description={t('dashboard.noDataText')} />
          )}
        </Card>
        <div className="space-y-6">
          <Card>
            <Card.Header title={t('dashboard.upcomingReservations')} actions={<Link to="/calendar" className="text-sm font-semibold text-brand hover:underline dark:text-gold">{t('nav.calendar')}</Link>} />
            {stats?.next.length ? (
              <ul className="divide-y divide-line">
                {stats.next.map((r) => (
                  <li key={r.id}>
                    <Link to={`/reservations/${r.id}`} className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-sunken/60">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{r.client.full_name}</p>
                        <p className="text-sm text-muted">
                          {formatDate(r.event_date, { weekday: 'short', day: 'numeric', month: 'short' })} · <span dir="ltr" className="tabular">{formatTime(r.start_time)}</span> · {eventLabel(r)}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-base text-muted">{t('dashboard.upcomingEmpty')}</p>
            )}
          </Card>
          <SystemStatus />
        </div>
      </div>
    </>
  )
}

/** The chart's numbers as a table (screen readers, exact amounts). */
function MonthTable({ months, year }) {
  const { t, i18n } = useTranslation()
  const fmt = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ', { month: 'long' })
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer font-semibold text-muted hover:text-ink">{t('dashboard.showTable')}</summary>
      <table className="mt-2 w-full">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="py-1.5 text-start font-semibold">{t('dashboard.month')}</th>
            <th className="py-1.5 text-end font-semibold">{t('dashboard.totalAmount')}</th>
            <th className="py-1.5 text-end font-semibold">{t('dashboard.paidAmount')}</th>
          </tr>
        </thead>
        <tbody>
          {months.filter((m) => m.count > 0).map((m) => (
            <tr key={m.month} className="border-b border-line last:border-0">
              <td className="py-1.5 first-letter:uppercase">{fmt.format(new Date(year, m.month - 1, 1))}</td>
              <td className="tabular py-1.5 text-end">{formatMoney(m.total)}</td>
              <td className="tabular py-1.5 text-end">{formatMoney(m.paid)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

/** Live check of the backend (database + Celery/Redis queue). */
function SystemStatus() {
  const { t } = useTranslation()
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/health/').then((r) => r.data),
    refetchInterval: 30000,
  })
  const label = (value) =>
    value === 'ok' ? (
      <Badge tone="success" dot>{t('dashboard.statusOk')}</Badge>
    ) : value === 'inline' ? (
      <Badge tone="gold" dot>{t('dashboard.statusInline')}</Badge>
    ) : (
      <Badge tone="danger" dot>{t('dashboard.statusError')}</Badge>
    )

  return (
    <Card>
      <Card.Header title={t('dashboard.systemStatus')} />
      <dl className="divide-y divide-line">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <dt className="flex items-center gap-2 text-base text-muted"><Database className="h-4 w-4" aria-hidden />{t('dashboard.database')}</dt>
          <dd>{data ? label(data.database) : isError ? label('error') : '…'}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <dt className="flex items-center gap-2 text-base text-muted"><Workflow className="h-4 w-4" aria-hidden />{t('dashboard.queue')}</dt>
          <dd>{data ? label(data.queue) : isError ? label('error') : '…'}</dd>
        </div>
      </dl>
    </Card>
  )
}
