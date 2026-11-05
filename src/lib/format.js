// Sayı, para ve tarih biçimlendirme yardımcıları.

const tl = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})
const usd = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const compactTL = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  notation: 'compact',
  maximumFractionDigits: 1,
})

// --- Gizlilik modu ---
// Açıkken bütün tutar fonksiyonları rakam yerine yıldız döndürür. Tutarlar uygulamanın her yerinde
// bu fonksiyonlarla yazıldığı için tek bir anahtar hepsini birden gizler.
// Anahtarı App.jsx yönetir: göz ikonuna basılınca setAmountsHidden çağrılır ve ekran yeniden çizilir.
let hidden = false
export function setAmountsHidden(value) {
  hidden = value
}
export function amountsHidden() {
  return hidden
}
const MASK = '***,**'

/** 45000 -> "₺45.000" */
export function formatTL(n) {
  return hidden ? `₺${MASK}` : tl.format(n)
}

/** 900 -> "$900" */
export function formatUSD(n) {
  return hidden ? `$${MASK}` : usd.format(n)
}

/** 1250000 -> "₺1,3 Mn" (grafik eksenleri için kısa biçim) */
export function formatCompactTL(n) {
  return hidden ? '₺***' : compactTL.format(n)
}

/** 5000 -> "+₺5.000", -5000 -> "−₺5.000" (değişimleri göstermek için) */
export function formatSignedTL(n) {
  if (hidden) return `₺${MASK}`
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return sign + tl.format(Math.abs(n))
}

/** 312.5 -> "₺312,50" (birim fiyatlar için kuruşlu biçim). Fiyat piyasa bilgisidir, gizlenmez. */
export function formatPrice(n) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

/** 1250.5 -> "1.250,5" (adet / gram / pay). Adet, elindeki miktarı ele verdiği için gizlilik modunda gizlenir. */
export function formatQty(n) {
  return hidden ? '***' : n.toLocaleString('tr-TR', { maximumFractionDigits: 4 })
}

/** Bugünün tarihi "2026-11-05" biçiminde */
export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "2026-11-05" -> "5 Kasım 2026" */
export function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** 50.047 -> "50,05" */
export function formatRate(n) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

/** 45000.5 -> "45.000,5" (form alanına geri yazmak için; parseAmount bu yazımı geri okuyabilir) */
export function amountToInput(n) {
  return n == null ? '' : n.toLocaleString('tr-TR', { maximumFractionDigits: 6 })
}
