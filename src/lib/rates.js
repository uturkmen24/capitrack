// Döviz kurları (TL karşılığı): ay sonu kurları geçmişi + belirli bir günün kuru.
// Kaynak: Frankfurter (Avrupa Merkez Bankası referans kurları; ücretsiz, anahtar istemez, tarayıcıdan erişime izin verir).
// Yedek: ExchangeRate-API (sadece güncel kur). İnternet yoksa en son saklanan kurlar kullanılır.

import { useEffect, useState } from 'react'
import { monthRange } from './analytics'
import { FOREIGN, assetCurrency } from './currency'
import { today } from './format'

const KEY = 'capitrack:fxhist'
const MAX_AGE = 6 * 60 * 60 * 1000 // 6 saat
const API = 'https://api.frankfurter.dev/v1'

/**
 * Frankfurter'in günlük kur listesinden ay sonu kurlarını çıkarır.
 * Liste dolar bazlıdır (1 $ = ₺50,2 ve 1 $ = €0,89); euro ve sterlinin TL karşılığı bunlardan hesaplanır.
 */
function toMonthly(json) {
  const months = {}
  let latest = null
  for (const date of Object.keys(json.rates ?? {}).sort()) {
    const r = json.rates[date]
    if (!r.TRY) continue
    const row = { USD: r.TRY, EUR: r.EUR ? r.TRY / r.EUR : undefined, GBP: r.GBP ? r.TRY / r.GBP : undefined }
    months[date.slice(0, 7)] = row // aynı ayın sonraki günü öncekinin üzerine yazar → ay sonu kuru kalır
    latest = { ...row, date }
  }
  return { months, latest }
}

async function fetchHistory(startMonth, signal) {
  const res = await fetch(`${API}/${startMonth}-01..?from=USD&to=TRY,EUR,GBP`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return { ...toMonthly(await res.json()), source: 'Avrupa Merkez Bankası' }
}

async function fetchLatestFallback(signal) {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const r = (await res.json()).rates
  return { months: {}, latest: { USD: r.TRY, EUR: r.TRY / r.EUR, GBP: r.TRY / r.GBP, date: today() }, source: 'ExchangeRate-API' }
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(KEY))
    if (cached) return cached
    // Kur geçmişi henüz hiç alınmadıysa (ör. ilk dolarlı varlık az önce eklendi), toplam varlık kartının sakladığı
    // güncel dolar kuruyla başla; geçmiş birkaç saniye içinde gelir. Böylece arada yanlış değer görünmez.
    const usd = JSON.parse(localStorage.getItem('capitrack:usdtry'))
    return usd?.rate ? { months: {}, latest: { USD: usd.rate, date: usd.date }, start: '9999-12', fetchedAt: 0 } : null
  } catch {
    return null
  }
}

/**
 * Verideki döviz cinsinden varlıklar için ay sonu kurları. Döviz varlığı yoksa hiç istek atılmaz.
 * Dönen: { months, latest, source } ya da (henüz yoksa) null
 */
export function useFxRates(raw) {
  const needed = raw.assets.some((a) => assetCurrency(a) !== 'TRY')
  const start = monthRange(raw)[0] ?? today().slice(0, 7)
  const [rates, setRates] = useState(() => readCache())

  useEffect(() => {
    if (!needed) return
    const cached = readCache()
    if (cached && cached.start <= start && Date.now() - cached.fetchedAt < MAX_AGE) return
    const ctrl = new AbortController()
    fetchHistory(start, ctrl.signal)
      .catch((err) => {
        if (ctrl.signal.aborted) throw err
        return fetchLatestFallback(ctrl.signal)
      })
      .then((fresh) => {
        // Yedek kaynak geçmiş vermez: varsa eski geçmişi koru, sadece güncel kuru yenile
        const next = { months: cached?.months ?? {}, ...fresh, start, fetchedAt: Date.now() }
        if (!Object.keys(fresh.months).length) next.months = cached?.months ?? {}
        try {
          localStorage.setItem(KEY, JSON.stringify(next))
        } catch {
          // depolama kapalıysa kurlar sadece bu oturumda kullanılır
        }
        setRates(next)
      })
      .catch(() => {}) // internet yok: saklanan (eski) kurlarla devam
    return () => ctrl.abort()
  }, [needed, start])

  return needed ? rates : null
}

/**
 * Bir varlığın para birimini değiştirirken gereken kurlar: verilen günden bugüne günlük kur listesi (tek istek).
 * Dönen fonksiyon rateOn(currency, "2026-06-10") o günün ya da öncesindeki son iş gününün kurunu verir.
 */
export async function fetchRateLookup(currencies, fromDate) {
  const series = {}
  for (const cur of currencies.filter((c) => c !== 'TRY')) {
    const res = await fetch(`${API}/${fromDate}..?from=${cur}&to=TRY`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    series[cur] = Object.keys(json.rates)
      .sort()
      .map((d) => [d, json.rates[d].TRY])
    if (!series[cur].length) throw new Error('kur yok')
  }
  return (cur, date) => {
    const list = series[cur]
    let found = list[0][1] // ilk iş gününden önceki bir tarih (ör. 1 Ocak tatili): ilk bilinen kur
    for (const [d, r] of list) {
      if (d > date) break
      found = r
    }
    return found
  }
}

// Belirli bir günün kuru (işlem formu için). Aynı gün/döviz için tekrar istek atılmasın diye hafızada tutulur.
const dayCache = new Map()

async function fetchRateOn(currency, date, signal) {
  const key = `${currency}|${date}`
  if (dayCache.has(key)) return dayCache.get(key)
  const path = date >= today() ? 'latest' : date
  try {
    const res = await fetch(`${API}/${path}?from=${currency}&to=TRY`, { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const out = { rate: json.rates.TRY, date: json.date, source: 'Avrupa Merkez Bankası' }
    dayCache.set(key, out)
    return out
  } catch (err) {
    if (signal.aborted || path !== 'latest') throw err
    const fb = await fetchLatestFallback(signal) // bugünün kuru için yedek kaynak
    return { rate: fb.latest[currency], date: fb.latest.date, source: fb.source }
  }
}

/**
 * Formdaki tarih için kur: { status: 'idle' | 'loading' | 'ok' | 'error', rate, date, source }
 * Hafta sonu / tatil seçilirse kaynak bir önceki iş gününün kurunu verir (date alanında yazar).
 */
export function useRateOn(currency, date) {
  const active = FOREIGN.includes(currency) && /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') && date <= today()
  const key = `${currency}|${date}`
  // Sonuç hangi isteğe aitse onunla saklanır; tarih değişip yeni sonuç gelene kadar durum "loading" sayılır.
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!active) return
    const ctrl = new AbortController()
    fetchRateOn(currency, date, ctrl.signal)
      .then((r) => setResult({ key, status: 'ok', ...r }))
      .catch(() => !ctrl.signal.aborted && setResult({ key, status: 'error' }))
    return () => ctrl.abort()
  }, [active, currency, date, key])

  if (!active) return { status: 'idle' }
  return result?.key === key ? result : { status: 'loading' }
}
