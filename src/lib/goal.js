// Hedef hesapları: bileşik getiriyle hedefe kaç ayda ulaşılır?
//
// Her ay iki şey olur: (1) mevcut birikim aylık getiri kadar büyür, (2) üstüne aylık ekleme yapılır.
// n ay sonraki birikim (gelecek değer formülü):
//
//   FV(n) = P·(1+r)^n + C·((1+r)^n − 1) / r
//
//   P = bugünkü portföy, C = aylık ekleme, r = aylık getiri oranı
//
// FV(n) = Hedef denklemini n için çözünce:
//
//   n = ln((Hedef·r + C) / (P·r + C)) / ln(1+r)

import { t } from './i18n'

/** Yıllık oranı aylığa çevirir: %10 yıllık → yaklaşık %0,797 aylık (basitçe 10/12 değil!) */
export function monthlyRate(annual) {
  return Math.pow(1 + annual, 1 / 12) - 1
}

/** Hedefe kaç ay kaldığını döner. 0 = ulaşıldı, Infinity = bu koşullarla hiç ulaşılamıyor. */
export function monthsToGoal(current, target, monthly, annualReturn) {
  if (current >= target) return 0
  const r = monthlyRate(annualReturn)
  if (r === 0) return monthly > 0 ? Math.ceil((target - current) / monthly) : Infinity
  const num = target * r + monthly
  const den = current * r + monthly
  if (den <= 0 || num / den <= 0) return Infinity
  const n = Math.log(num / den) / Math.log(1 + r)
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : Infinity
}

/** n ay sonra birikimin ne kadar olacağı (kontrol ve grafikler için) */
export function futureValue(current, monthly, annualReturn, n) {
  const r = monthlyRate(annualReturn)
  if (r === 0) return current + monthly * n
  const g = Math.pow(1 + r, n)
  return current * g + (monthly * (g - 1)) / r
}

/** 62 → "5 yıl 2 ay" (İng. "5 years 2 months"), 8 → "8 ay", 24 → "2 yıl" */
export function formatDuration(months) {
  const y = Math.floor(months / 12)
  const m = months % 12
  const years = (n) => t(`${n} yıl`, `${n} ${n === 1 ? 'year' : 'years'}`)
  const mons = (n) => t(`${n} ay`, `${n} ${n === 1 ? 'month' : 'months'}`)
  return [y && years(y), m && mons(m)].filter(Boolean).join(' ') || mons(0)
}
