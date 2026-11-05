// Sayı, para ve tarih biçimlendirme yardımcıları.

const tl = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})

/** 45000 -> "₺45.000" */
export function formatTL(n) {
  return tl.format(n)
}

/** 5000 -> "+₺5.000", -5000 -> "−₺5.000" (değişimleri göstermek için) */
export function formatSignedTL(n) {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return sign + tl.format(Math.abs(n))
}

/** Bugünün ayı, "2026-11" biçiminde. Aylık kayıtların anahtarı budur. */
export function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "2026-11" + 1 -> "2026-12", "2026-01" + -1 -> "2025-12" */
export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "2026-11" -> "Kas 26" (grafik eksenleri için kısa biçim) */
export function formatMonthShort(key) {
  const [y, m] = key.split('-').map(Number)
  const label = new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { month: 'short' })
  return `${label} ${String(y).slice(2)}`
}

/** 0.0512 -> "+%5,1" */
export function formatPercent(ratio) {
  const sign = ratio > 0 ? '+' : ratio < 0 ? '−' : ''
  return `${sign}%${Math.abs(ratio * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`
}

/** 0.338 -> "%33,8" (pay / oran, işaretsiz) */
export function formatShare(ratio) {
  return `%${(ratio * 100).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
}

/** "2026-11" -> "Kasım 2026" */
export function formatMonth(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
}

/**
 * Kullanıcının yazdığı tutarı sayıya çevirir. Türkçe yazımı anlar:
 * "45.000" -> 45000, "45000,50" -> 45000.5, "1.250.000 ₺" -> 1250000
 * Boşsa null, geçersizse NaN döner.
 */
export function parseAmount(input) {
  let s = String(input ?? '').trim().replace(/\s|₺|tl/gi, '')
  if (!s) return null
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '')
  }
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

/** 45000.5 -> "45000,5" (form alanına geri yazmak için) */
export function amountToInput(n) {
  return n == null ? '' : String(n).replace('.', ',')
}
