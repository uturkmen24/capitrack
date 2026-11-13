// Döviz cinsinden varlıklar (ör. dolarla alınan ETF, dolar/euro hesabı).
//
// SAKLAMA: Bu varlıkların fiyatları kendi para birimiyle saklanır (ETF: $545). Her işlemin yanına o günün kuru da
// yazılır (fx: 1 $ = ₺47,70). Böylece alış maliyetinin TL karşılığı alış günündeki kurla sabit kalır.
// Döviz varlıklarında (USD hesabı) fiyat hep 1'dir; değerini doğrudan kur belirler, kullanıcı kur girmez.
//
// HESAP: Uygulamanın hesap motoru (analytics.js) her şeyi TL bekler. normalize() veriyi motora vermeden önce
// TL'ye çevirir: işlem fiyatı × işlem günündeki kur, aylık fiyat × o ayın sonundaki kur (bu ay için canlı kur).
// Panel, grafikler, enflasyon/mevduat kartları, dengeleme ve Excel bu çevrilmiş veriyle aynen çalışır.

import { monthRange } from './analytics'
import { currentMonth, shiftMonth } from './format'

export const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP']
export const FOREIGN = ['USD', 'EUR', 'GBP']

/** Yeni bir varlık için önerilen para birimi */
export function defaultCurrency(typeId) {
  if (typeId === 'doviz' || typeId === 'etf') return 'USD'
  return 'TRY'
}

/**
 * Varlığın fiyat para birimi. Bu özellikten önce eklenmiş varlıklarda alan yoktur:
 * onlar TL sayılır (eski davranış aynen sürer); sadece döviz varlıkları dolar sayılır, çünkü kaydedilmiş fiyatları zaten kurdu.
 */
export function assetCurrency(asset) {
  if (CURRENCIES.includes(asset.currency)) return asset.currency
  return asset.type === 'doviz' ? 'USD' : 'TRY'
}

export const isFxAsset = (asset) => assetCurrency(asset) !== 'TRY'
export const isCurrencyAsset = (asset) => asset.type === 'doviz'

/**
 * 1 birim dövizin o ayki TL karşılığı. rates: { months: { "2026-06": { USD: 46.1, … } }, latest: { USD: 50.2, … } }
 * Bu ay için canlı kur; geçmiş aylar için ay sonu kuru; o ayın kuru yoksa ondan önceki bilinen ilk ay.
 */
export function rateAt(rates, currency, month) {
  if (currency === 'TRY') return 1
  if (!rates) return null
  if (month >= currentMonth() && rates.latest?.[currency]) return rates.latest[currency]
  const known = Object.keys(rates.months ?? {})
    .filter((m) => m <= month && rates.months[m][currency])
    .sort()
  if (known.length) return rates.months[known[known.length - 1]][currency]
  return rates.latest?.[currency] ?? null
}

/** Döviz varlığının her ay sonundaki adedi (sadece elde olduğu aylara otomatik kur yazmak için) */
function heldMonths(transactions, assetId, lastMonth) {
  const txs = transactions.filter((x) => x.assetId === assetId).sort((a, b) => a.date.localeCompare(b.date))
  if (!txs.length) return []
  const out = []
  let qty = 0
  let i = 0
  for (let m = txs[0].date.slice(0, 7); m <= lastMonth; m = shiftMonth(m, 1)) {
    let traded = false
    while (i < txs.length && txs[i].date.slice(0, 7) <= m) {
      qty += txs[i].kind === 'buy' ? txs[i].quantity : -txs[i].quantity
      i++
      traded = true
    }
    if (qty > 1e-9 || traded) out.push(m)
  }
  return out
}

/** Saklanan veriyi (döviz fiyatlarıyla) hesap motorunun beklediği TL'li veriye çevirir. */
export function normalize(data, rates) {
  const fxAssets = data.assets.filter(isFxAsset)
  if (fxAssets.length === 0) return data
  const byId = new Map(fxAssets.map((a) => [a.id, a]))

  const transactions = data.transactions.map((x) => {
    const a = byId.get(x.assetId)
    if (!a) return x
    // Döviz hesabı: TL fiyatı = o günün kuru. Eski kayıtlarda kur ayrı tutulmadığı için fiyat zaten kurdur.
    if (isCurrencyAsset(a)) return { ...x, price: x.fx ?? x.price }
    const fx = x.fx ?? rateAt(rates, assetCurrency(a), x.date.slice(0, 7))
    return fx ? { ...x, price: x.price * fx } : x
  })

  const prices = {}
  for (const [m, row] of Object.entries(data.prices)) prices[m] = { ...row }
  // Döviz cinsinden girilen aylık fiyatlar → TL (o ayın kuru yoksa kayıt kullanılmaz; motor son işlem fiyatına döner)
  for (const m of Object.keys(prices)) {
    for (const a of fxAssets) {
      if (isCurrencyAsset(a) || prices[m][a.id] == null) continue
      const r = rateAt(rates, assetCurrency(a), m)
      if (r) prices[m][a.id] *= r
      else delete prices[m][a.id]
    }
  }
  // Döviz hesapları: elde olduğu her ay (bugüne kadar) için fiyat = o ayın kuru. Kur yoksa eski kayıt kalır.
  const last = [...monthRange(data), currentMonth()].sort().pop()
  for (const a of fxAssets.filter(isCurrencyAsset)) {
    for (const m of heldMonths(data.transactions, a.id, last)) {
      const r = rateAt(rates, assetCurrency(a), m)
      if (r) prices[m] = { ...prices[m], [a.id]: r }
    }
  }
  for (const m of Object.keys(prices)) if (Object.keys(prices[m]).length === 0) delete prices[m]

  return { ...data, transactions, prices }
}

/**
 * İşlemi olan bir varlığın fiyat para birimini değiştirir (ör. TL girilmiş ETF → dolar).
 * rateOn(currency, "2026-06-10"): o günün (ya da öncesindeki son iş gününün) kuru, 1 birim = ₺x.
 *   İşlemler: her biri kendi tarihindeki kurla çevrilir. TL maliyet aynen korunur (fiyat × kur = eski TL fiyatı).
 *   Aylık fiyatlar: o ayın son kuruyla çevrilir.
 * Döviz hesapları (fiyatı zaten kur olan) bu yolla çevrilmez.
 */
export function convertAssetCurrency(raw, assetId, from, to, rateOn) {
  if (from === to) return raw
  // Sente yuvarla ($759,36); 1'in altındaki çok küçük fiyatlarda (kripto) 6 anlamlı basamak kalsın
  const round4 = (n) => (n >= 1 ? Math.round(n * 100) / 100 : Number(n.toPrecision(6)))
  const toTL = (price, date, fx) => (from === 'TRY' ? price : price * (fx ?? rateOn(from, date)))

  const transactions = raw.transactions.map((x) => {
    if (x.assetId !== assetId) return x
    const tl = toTL(x.price, x.date, x.fx)
    const { fx: _old, ...rest } = x
    if (to === 'TRY') return { ...rest, price: tl }
    const price = round4(tl / rateOn(to, x.date))
    return { ...rest, price, fx: tl / price } // kur, yuvarlanmış fiyatla çarpınca TL maliyeti tam tutacak şekilde
  })

  const prices = {}
  for (const [m, row] of Object.entries(raw.prices)) {
    if (row[assetId] == null) {
      prices[m] = row
      continue
    }
    const monthEnd = `${m}-31` // "o ayın son günü veya öncesindeki son kur"
    const tl = from === 'TRY' ? row[assetId] : row[assetId] * rateOn(from, monthEnd)
    prices[m] = { ...row, [assetId]: to === 'TRY' ? tl : round4(tl / rateOn(to, monthEnd)) }
  }

  const assets = raw.assets.map((a) => (a.id === assetId ? { ...a, currency: to } : a))
  return { ...raw, assets, transactions, prices }
}

/**
 * Döviz cinsinden varlığın o aya kadarki son fiyatı, kendi para birimiyle ($545).
 * Formları doldurmak için: önce girilmiş aylık fiyat, yoksa son işlem fiyatı.
 */
export function lastRawPrice(raw, asset, month) {
  const fromPrices = Object.keys(raw.prices)
    .filter((m) => m <= month && raw.prices[m][asset.id] != null)
    .sort()
    .pop()
  const txs = raw.transactions.filter((x) => x.assetId === asset.id && x.date.slice(0, 7) <= month).sort((a, b) => a.date.localeCompare(b.date))
  const lastTx = txs[txs.length - 1]
  if (fromPrices && (!lastTx || lastTx.date.slice(0, 7) <= fromPrices)) return raw.prices[fromPrices][asset.id]
  return lastTx?.price ?? (fromPrices ? raw.prices[fromPrices][asset.id] : null)
}
