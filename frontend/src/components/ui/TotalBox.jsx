import { formatMoney } from '@/lib/format'

/**
 * The large "Total à payer" box from spec §10.
 * Gold double rule recalls fetla embroidery: this is the most important number.
 */
export default function TotalBox({ label, amount }) {
  return (
    <div className="rounded-panel border-2 border-double border-gold/70 bg-gold-soft/60 px-5 py-4">
      <p className="text-sm font-semibold text-gold-ink">{label}</p>
      <p className="tabular mt-1 text-3xl font-extrabold tracking-tight text-ink">{formatMoney(amount)}</p>
    </div>
  )
}
