/**
 * Amount in French words for receipts:
 *   25000    -> "vingt-cinq mille dinars algériens"
 *   1250000  -> "un million deux cent cinquante mille dinars algériens"
 *   80.5     -> "quatre-vingts dinars algériens et cinquante centimes"
 */
const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']

function below100(n, plural = true) {
  if (n < 17) return UNITS[n]
  if (n < 20) return `dix-${UNITS[n - 10]}`
  const t = Math.floor(n / 10)
  const u = n % 10
  if (t === 7) return u === 1 ? 'soixante et onze' : `soixante-${below100(10 + u)}`
  if (t === 9) return `quatre-vingt-${below100(10 + u)}`
  if (t === 8) return u === 0 ? (plural ? 'quatre-vingts' : 'quatre-vingt') : `quatre-vingt-${UNITS[u]}`
  return TENS[t] + (u === 0 ? '' : u === 1 ? ' et un' : `-${UNITS[u]}`)
}

/** `plural` = false before "mille": "deux cent mille", "quatre-vingt mille". */
function below1000(n, plural = true) {
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h === 0) return below100(r, plural)
  const hundreds = h === 1 ? 'cent' : `${UNITS[h]} cent${r === 0 && plural ? 's' : ''}`
  return r === 0 ? hundreds : `${hundreds} ${below100(r, plural)}`
}

export function numberInWords(n) {
  n = Math.floor(Math.abs(n))
  if (n === 0) return 'zéro'
  const parts = []
  const billions = Math.floor(n / 1e9)
  const millions = Math.floor((n % 1e9) / 1e6)
  const thousands = Math.floor((n % 1e6) / 1000)
  const rest = n % 1000
  if (billions) parts.push(billions === 1 ? 'un milliard' : `${below1000(billions)} milliards`)
  if (millions) parts.push(millions === 1 ? 'un million' : `${below1000(millions)} millions`)
  if (thousands) parts.push(thousands === 1 ? 'mille' : `${below1000(thousands, false)} mille`)
  if (rest) parts.push(below1000(rest))
  return parts.join(' ')
}

export function amountInWords(value) {
  const amount = Math.round((Number(value) || 0) * 100)
  const dinars = Math.floor(amount / 100)
  const centimes = amount % 100
  // "un million de dinars", but "un million deux cents dinars"
  const of = dinars >= 1e6 && dinars % 1e6 === 0 ? ' de' : ''
  let text = dinars <= 1 ? `${numberInWords(dinars)} dinar algérien` : `${numberInWords(dinars)}${of} dinars algériens`
  if (centimes) text += ` et ${numberInWords(centimes)} centime${centimes > 1 ? 's' : ''}`
  return text
}
