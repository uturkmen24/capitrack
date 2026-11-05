// Dolar/TL kurunu internetten alır.
//
// - Önce Frankfurter (Avrupa Merkez Bankası'nın günlük referans kuru), cevap gelmezse ExchangeRate-API denenir.
//   İkisi de ücretsizdir, anahtar (API key) istemez.
// - Alınan kur 6 saat boyunca LocalStorage'da saklanır; sayfa her açıldığında tekrar internete gidilmez.
// - İnternet yoksa en son alınan kur kullanılır. Hiç kur alınamadıysa uygulama TL ile çalışmaya devam eder.
//
// Not: Bunlar günlük referans kurlardır, bankanın anlık alış/satış kuru değildir.

import { useEffect, useState } from 'react'

const KEY = 'capitrack:usdtry'
const MAX_AGE = 6 * 60 * 60 * 1000 // 6 saat (milisaniye)

async function fromFrankfurter(signal) {
  const res = await fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=TRY', { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return { rate: json?.rates?.TRY, date: json?.date, source: 'Avrupa Merkez Bankası' }
}

async function fromErApi(signal) {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const date = new Date(json.time_last_update_unix * 1000).toISOString().slice(0, 10)
  return { rate: json?.rates?.TRY, date, source: 'ExchangeRate-API' }
}

function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY))
    return Number.isFinite(c?.rate) ? c : null
  } catch {
    return null
  }
}

/**
 * Kuru getiren "hook". Dönen değer:
 * { fx: { rate: 50.05, date: "2026-11-05", source: "…" } | null, status: 'loading' | 'ok' | 'error' }
 */
export function useUsdTry() {
  const [state, setState] = useState(() => {
    const cached = readCache()
    return { fx: cached, status: cached ? 'ok' : 'loading' }
  })

  useEffect(() => {
    const cached = readCache()
    if (cached && Date.now() - cached.fetchedAt < MAX_AGE) return // hafızadaki kur hâlâ taze

    // Ekran kapanırsa yarım kalan isteği iptal etmek için
    const controller = new AbortController()
    const cancelled = () => controller.signal.aborted
    ;(async () => {
      for (const source of [fromFrankfurter, fromErApi]) {
        if (cancelled()) return
        try {
          const fx = await source(controller.signal)
          if (!Number.isFinite(fx.rate) || fx.rate <= 0) throw new Error('Geçersiz kur')
          const entry = { ...fx, fetchedAt: Date.now() }
          try {
            localStorage.setItem(KEY, JSON.stringify(entry))
          } catch {
            // Depolama kapalıysa kur sadece bu oturumda kullanılır.
          }
          if (!cancelled()) setState({ fx: entry, status: 'ok' })
          return
        } catch {
          // Bu kaynak çalışmadı, sıradakini dene.
        }
      }
      // Hiçbiri çalışmadı: elde eski bir kur varsa onunla devam et.
      if (!cancelled()) setState((s) => (s.fx ? s : { fx: null, status: 'error' }))
    })()

    return () => controller.abort()
  }, [])

  return state
}
