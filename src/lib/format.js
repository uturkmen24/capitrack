// Sayı, para ve tarih biçimlendirme yardımcıları. Hepsi seçili dile göre çalışır:
// Türkçe: ₺45.000 · %5,1 · 5 Kasım 2026      İngilizce: ₺45,000 · 5.1% · November 5, 2026

import { getLang, locale } from './i18n'

// Intl biçimlendiricileri oluşturmak pahalı olduğu için dil başına bir kez oluşturulup saklanır.
const cache = new Map()
function nf(key, options) {
  const id = `${locale()}|${key}`
  if (!cache.has(id)) cache.set(id, new Intl.NumberFormat(locale(), options))
  return cache.get(id)
}
const tl = () => nf('tl', { style: 'currency', currency: 'TRY', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 })
const usd = () => nf('usd', { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 })
const compactTL = () =>
  nf('ctl', { style: 'currency', currency: 'TRY', currencyDisplay: 'narrowSymbol', notation: 'compact', maximumFractionDigits: 1 })

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
const mask = () => (getLang() === 'en' ? '***.**' : '***,**')

/** 45000 -> "₺45.000" (İng. "₺45,000") */
export function formatTL(n) {
  return hidden ? `₺${mask()}` : tl().format(n)
}

/** 900 -> "$900" */
export function formatUSD(n) {
  return hidden ? `$${mask()}` : usd().format(n)
}

/** 1250000 -> "₺1,3 Mn" (İng. "₺1.3M") (grafik eksenleri için kısa biçim) */
export function formatCompactTL(n) {
  return hidden ? '₺***' : compactTL().format(n)
}

/** 5000 -> "+₺5.000", -5000 -> "−₺5.000" (değişimleri göstermek için) */
export function formatSignedTL(n) {
  if (hidden) return `₺${mask()}`
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return sign + tl().format(Math.abs(n))
}

/** 312.5 -> "₺312,50" (birim fiyatlar için kuruşlu biçim). Fiyat piyasa bilgisidir, gizlenmez. */
export function formatPrice(n) {
  return n.toLocaleString(locale(), {
    style: 'currency',
    currency: 'TRY',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

/** 1250.5 -> "1.250,5" (adet / gram / pay). Adet, elindeki miktarı ele verdiği için gizlilik modunda gizlenir. */
export function formatQty(n) {
  return hidden ? '***' : n.toLocaleString(locale(), { maximumFractionDigits: 4 })
}

/** Bugünün tarihi "2026-11-05" biçiminde */
export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "2026-11-05" -> "5 Kasım 2026" (İng. "November 5, 2026") */
export function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })
}

/** "2026-11-05" -> "5 Kas 2026" (İng. "Nov 5, 2026") */
export function formatShortDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })
}

/** 50.047 -> "50,05" */
export function formatRate(n) {
  return n.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

/** "2026-11" -> "Kas 26" (İng. "Nov 26") (grafik eksenleri için kısa biçim) */
export function formatMonthShort(key) {
  const [y, m] = key.split('-').map(Number)
  const label = new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: 'short' })
  return `${label} ${String(y).slice(2)}`
}

/** "2026-11" -> "Kasım 2026" (İng. "November 2026") */
export function formatMonth(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: 'long', year: 'numeric' })
}

/** Yüzde işaretini dile göre koyar: Türkçede başa (%40), İngilizcede sona (40%) */
function withPercent(numberText) {
  return getLang() === 'en' ? `${numberText}%` : `%${numberText}`
}

/** 40 -> "%40" (İng. "40%"). Zaten yüzde olarak tutulan sayılar için (hedef payı, faiz oranı…) */
export function formatPctValue(n, maxDigits = 2) {
  return withPercent(n.toLocaleString(locale(), { maximumFractionDigits: maxDigits }))
}

/** 0.0512 -> "+%5,1" (İng. "+5.1%"). digits verilirse ondalık sabitlenir: formatPercent(0.28, 1) -> "+%28,0" */
export function formatPercent(ratio, digits) {
  const sign = ratio > 0 ? '+' : ratio < 0 ? '−' : ''
  const opts = digits == null ? { maximumFractionDigits: 1 } : { minimumFractionDigits: digits, maximumFractionDigits: digits }
  return sign + withPercent(Math.abs(ratio * 100).toLocaleString(locale(), opts))
}

/** 0.338 -> "%33,8" (İng. "33.8%") (pay / oran, işaretsiz) */
export function formatShare(ratio) {
  return withPercent((ratio * 100).toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
}

/**
 * Kullanıcının yazdığı tutarı sayıya çevirir. Seçili dilin yazımını anlar:
 *   Türkçe:   "45.000" -> 45000, "45000,50" -> 45000.5, "1.250.000 ₺" -> 1250000
 *   İngilizce: "45,000" -> 45000, "45000.50" -> 45000.5, "1,250,000" -> 1250000
 * Boşsa null, geçersizse NaN döner.
 */
export function parseAmount(input) {
  let s = String(input ?? '').trim().replace(/\s|₺|tl|try/gi, '')
  if (!s) return null
  if (getLang() === 'en') {
    s = s.replace(/,/g, '')
  } else if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '')
  }
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

/** 45000.5 -> "45.000,5" (İng. "45,000.5") (form alanına geri yazmak için; parseAmount bu yazımı geri okuyabilir) */
export function amountToInput(n) {
  return n == null ? '' : n.toLocaleString(locale(), { maximumFractionDigits: 6 })
}
