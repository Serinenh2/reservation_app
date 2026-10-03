import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney, formatNumber } from '@/lib/format'
import { LANGUAGES } from '@/i18n'

/**
 * Reserved amount per month (one series, gold = money in the design system).
 * Loaded lazily: recharts is heavy and only this card needs it.
 */
export default function RevenueChart({ months, year }) {
  const { t, i18n } = useTranslation()
  const rtl = i18n.language === 'ar'
  const locale = (LANGUAGES[i18n.language] || LANGUAGES.fr).locale
  const monthName = (m, style) => new Intl.DateTimeFormat(locale, { month: style }).format(new Date(year, m - 1, 1))
  const data = months.map((row) => ({ ...row, label: monthName(row.month, 'short') }))

  return (
    <div className="h-72" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgb(var(--c-line))" />
          {/* Arabic reads right-to-left, so the time axis is reversed */}
          <XAxis dataKey="label" reversed={rtl} tickLine={false} axisLine={false} interval={0} tick={{ fill: 'rgb(var(--c-muted))', fontSize: 12 }} />
          <YAxis
            orientation={rtl ? 'right' : 'left'}
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: 'rgb(var(--c-muted))', fontSize: 12 }}
            tickFormatter={(v) => (v >= 1000 ? `${formatNumber(v / 1000)}k` : formatNumber(v))}
          />
          <Tooltip
            cursor={{ fill: 'rgb(var(--c-sunken))' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload
              return (
                <div dir={rtl ? 'rtl' : 'ltr'} className="rounded-control border border-line bg-surface px-3 py-2 text-sm shadow-overlay">
                  <p className="mb-1 font-semibold text-ink first-letter:uppercase">{monthName(row.month, 'long')} {year}</p>
                  <p className="text-muted">{t('dashboard.totalAmount')} : <span className="tabular font-semibold text-ink">{formatMoney(row.total)}</span></p>
                  <p className="text-muted">{t('dashboard.paidAmount')} : <span className="tabular font-semibold text-ink">{formatMoney(row.paid)}</span></p>
                  <p className="text-muted">{t('reservations.count', { count: row.count })}</p>
                </div>
              )
            }}
          />
          <Bar dataKey="total" fill="rgb(var(--c-gold))" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
