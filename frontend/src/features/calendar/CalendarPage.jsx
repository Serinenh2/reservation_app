import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Ban, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDate, formatTime, toISODate } from '@/lib/format'
import { LANGUAGES } from '@/i18n'
import { useCalendar } from '@/features/reservations/api'
import { Button, Card, PageHeader, Spinner, STATUS_TONES } from '@/components/ui'

// Algeria (CLDR "DZ") starts the week on Saturday.
const WEEK_START = 6

/** Chip colors per status tone. Status -> tone comes from STATUS_TONES (one place). */
const CHIP = {
  // White chips so they stand out on the colored cell.
  success: 'border-success/40 bg-surface text-success',
  warning: 'border-warning/40 bg-surface text-warning',
  danger: 'border-danger/40 bg-surface text-danger',
  neutral: 'border-line bg-surface text-neutral line-through decoration-1',
}
const DOT = { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', neutral: 'bg-neutral' }

/** Whole-cell background: the day takes the color of its reservations. */
const CELL = { success: 'bg-success-soft', warning: 'bg-warning-soft', danger: 'bg-danger-soft', neutral: 'bg-neutral-soft' }

/**
 * One status for the whole day when it has several reservations:
 * confirmed first, then pending; cancelled only if everything is cancelled.
 */
function dayStatus(reservations) {
  for (const status of ['confirmed', 'pending', 'cancelled']) {
    if (reservations.some((r) => r.status === status)) return status
  }
  return null
}

/** The 5 or 6 weeks shown for a month, as Date objects. */
function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() - WEEK_START + 7) % 7
  const start = new Date(year, month, 1 - offset)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks = Math.ceil((offset + daysInMonth) / 7)
  return Array.from({ length: weeks * 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

export default function CalendarPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const today = toISODate(new Date())
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState(today)

  const days = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])
  const start = toISODate(days[0])
  const end = toISODate(days[days.length - 1])
  const { data, isFetching } = useCalendar(start, end)

  // Index by date for fast lookup in the grid.
  const byDate = useMemo(() => {
    const map = {}
    for (const r of data?.reservations || []) (map[r.event_date] ||= []).push(r)
    return map
  }, [data])
  const blocked = useMemo(() => Object.fromEntries((data?.blocked || []).map((b) => [b.date, b])), [data])

  const locale = (LANGUAGES[i18n.language] || LANGUAGES.fr).locale
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', numberingSystem: 'latn' }).format(new Date(cursor.year, cursor.month, 1))
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const weekdays = days.slice(0, 7).map((d) => ({ short: weekdayFmt.format(d), long: d.toLocaleDateString(locale, { weekday: 'long' }) }))

  const move = (delta) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  const goToday = () => {
    const now = new Date()
    setCursor({ year: now.getFullYear(), month: now.getMonth() })
    setSelected(today)
  }

  return (
    <>
      <PageHeader
        title={t('calendar.title')}
        actions={<Button icon={Plus} onClick={() => navigate(`/reservations/new?date=${selected}`)}>{t('dashboard.createFirst')}</Button>}
      />

      <Card className="overflow-hidden">
        {/* Toolbar: month navigation + legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="icon" variant="ghost" icon={ChevronLeft} className="rtl:[&>svg]:-scale-x-100" aria-label={t('calendar.previous')} onClick={() => move(-1)} />
            <h2 className="text-center text-md font-semibold first-letter:uppercase sm:min-w-[10rem]" aria-live="polite">{monthLabel}</h2>
            <Button size="icon" variant="ghost" icon={ChevronRight} className="rtl:[&>svg]:-scale-x-100" aria-label={t('calendar.next')} onClick={() => move(1)} />
            <Button size="sm" variant="secondary" onClick={goToday}>{t('common.today')}</Button>
            {isFetching && <Spinner className="h-4 w-4 text-subtle" />}
          </div>
          <Legend />
        </div>

        <div className="grid grid-cols-7 border-b border-line bg-sunken/60">
          {weekdays.map((w) => (
            <div key={w.long} className="px-2 py-2 text-center text-sm font-semibold text-muted">
              <abbr title={w.long} className="no-underline">{w.short}</abbr>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const iso = toISODate(d)
            return (
              <DayCell
                key={iso}
                iso={iso}
                day={d.getDate()}
                inMonth={d.getMonth() === cursor.month}
                isToday={iso === today}
                isSelected={iso === selected}
                isPast={iso < today}
                reservations={byDate[iso] || []}
                blocked={blocked[iso]}
                onSelect={() => setSelected(iso)}
              />
            )
          })}
        </div>
      </Card>
    </>
  )
}

function Legend() {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted" aria-label={t('calendar.legend')}>
      {['confirmed', 'pending', 'blocked', 'cancelled'].map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={cn('h-2.5 w-2.5 rounded-full', DOT[STATUS_TONES[s]])} aria-hidden />
          {t(`status.${s}`)}
        </li>
      ))}
    </ul>
  )
}

function DayCell({ iso, day, inMonth, isToday, isSelected, isPast, reservations, blocked, onSelect }) {
  const { t } = useTranslation()
  const visible = reservations.slice(0, 3)
  const more = reservations.length - visible.length
  const active = reservations.filter((r) => r.status !== 'cancelled').length
  const status = blocked ? 'blocked' : dayStatus(reservations)
  const canBook = !blocked && !isPast

  return (
    <div
      className={cn(
        'group relative min-h-[5.5rem] border-b border-e border-line p-1 text-start transition-colors md:min-h-[8.5rem] md:p-1.5 [&:nth-child(7n)]:border-e-0',
        status ? CELL[STATUS_TONES[status]] : !inMonth && 'bg-sunken/40',
        status && !inMonth && 'opacity-60',
        isSelected && 'ring-2 ring-inset ring-gold',
      )}
    >
      {/* Clicking the cell selects the day; chips and the + inside stay clickable. */}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className="absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
        aria-label={`${formatDate(iso, { dateStyle: 'full' })}${blocked ? ` · ${t('status.blocked')}` : ''}${active ? ` · ${t('calendar.eventCount', { count: active })}` : ''}`}
      />
      <div className="pointer-events-none relative flex items-center justify-between gap-1">
        <span
          className={cn(
            'tabular grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold',
            isToday ? 'bg-brand text-brand-fg' : inMonth ? (isPast ? 'text-muted' : 'text-ink') : 'text-subtle',
          )}
        >
          {day}
        </span>
        {blocked && <Ban className="h-3.5 w-3.5 text-danger" aria-hidden />}
      </div>

      {/* "+" appears on the selected day (and on hover with a mouse): book this date.
          Phones: bottom corner, so it doesn't squeeze the day number. */}
      {canBook && (
        <Link
          to={`/reservations/new?date=${iso}`}
          aria-label={`${t('calendar.bookThisDay')} · ${formatDate(iso, { dateStyle: 'long' })}`}
          title={t('calendar.bookThisDay')}
          className={cn(
            'absolute bottom-1 end-1 z-10 grid h-7 w-7 place-items-center rounded-full bg-brand text-brand-fg shadow-sm transition-opacity hover:bg-brand-hover focus-visible:opacity-100 md:bottom-auto md:end-1.5 md:top-1.5',
            isSelected ? 'opacity-100' : 'pointer-events-none opacity-0 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100',
          )}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </Link>
      )}

      <ul className="pointer-events-none relative mt-1 space-y-1">
        {blocked && reservations.length === 0 && (
          <li className="hidden truncate px-1 text-xs font-semibold text-danger md:block">{blocked.reason || t('status.blocked')}</li>
        )}
        {visible.map((r) => (
          <li key={r.id}>
            <Link
              to={`/reservations/${r.id}`}
              className={cn('pointer-events-auto block truncate rounded-[6px] border px-0.5 py-0.5 text-center text-[10px] font-semibold hover:brightness-95 md:px-1.5 md:text-start md:text-xs', CHIP[STATUS_TONES[r.status]])}
              title={`${formatTime(r.start_time)}–${formatTime(r.end_time)} · ${r.client.full_name} · ${t(`status.${r.status}`)}`}
            >
              <span dir="ltr" className="tabular">{formatTime(r.start_time)}</span>
              {/* Phones: time only (cells are narrow); larger screens: time + name */}
              <span className="hidden md:inline"> {r.client.full_name}</span>
            </Link>
          </li>
        ))}
        {more > 0 && <li className="px-1 text-xs font-semibold text-muted">{t('calendar.more', { count: more })}</li>}
      </ul>
    </div>
  )
}
