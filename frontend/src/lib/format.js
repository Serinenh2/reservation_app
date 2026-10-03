/**
 * Formatting helpers. Algeria uses Western digits (0-9) in both languages.
 *   fr: 180 000 DA      ar: 180,000 دج
 */
import i18n, { LANGUAGES } from '@/i18n'

const locale = () => (LANGUAGES[i18n.language] || LANGUAGES.fr).locale

export function formatMoney(value, lng = i18n.language) {
  const amount = Number(value) || 0
  if (lng === 'ar') {
    const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)
    return `${n} دج`
  }
  const n = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
    .format(amount)
    .replace(/\u202f|\u00a0/g, ' ')
  return `${n} DA`
}

export function formatNumber(value) {
  return new Intl.NumberFormat(i18n.language === 'ar' ? 'en-US' : 'fr-FR')
    .format(Number(value) || 0)
    .replace(/\u202f|\u00a0/g, ' ')
}

export function formatDate(value, options = { dateStyle: 'long' }) {
  if (!value) return ''
  // Date-only strings ("2026-10-15") are local days, not UTC midnight.
  const date = typeof value !== 'string' ? value : /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISODate(value) : new Date(value)
  return new Intl.DateTimeFormat(locale(), { numberingSystem: 'latn', ...options }).format(date)
}

/** "19:00:00" -> "19:00" */
export function formatTime(value) {
  return value ? String(value).slice(0, 5) : ''
}

/** Date -> "2026-10-15" in local time (never via toISOString, which shifts to UTC). */
export function toISODate(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "2026-10-15" -> local Date at midnight (new Date('2026-10-15') would be UTC). */
export function parseISODate(value) {
  const [y, m, d] = String(value).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "Mariage · Dîner + thé": type of occasion + formule of a reservation. */
export function eventLabel(r) {
  return [localName(r, 'event_type'), localName(r, 'occasion')].filter(Boolean).join(' · ')
}

/** Catalog items have name_fr / name_ar: pick the one for the current language. */
export function localName(item, prefix = 'name') {
  if (!item) return ''
  return item[`${prefix}_${i18n.language}`] || item[`${prefix}_fr`] || ''
}
