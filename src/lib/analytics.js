// CapiTrack'in hesap motoru: adet, ağırlıklı ortalama maliyet, değer ve kâr/zarar.
//
// Her varlığın geçmişi ay ay baştan "oynatılır". Her ay için sırayla:
//   1) O aya ait alış/satış işlemleri tarih sırasıyla uygulanır (adet ve maliyet değişir)
//   2) O ayın sonu için girilmiş fiyat (veya mevduatta bakiye) varsa uygulanır
//   3) Değer = adet × son bilinen fiyat (mevduatta: son bilinen bakiye + sonradan yatırılan/çekilen)
//
// AĞIRLIKLI ORTALAMA MALİYET (AOM)
//   Alış:  maliyet += adet × fiyat              → ortalama = toplam maliyet / toplam adet
//   Satış: ortalama DEĞİŞMEZ; maliyet −= satılan adet × ortalama
//          gerçekleşen kâr/zarar += satılan adet × (satış fiyatı − ortalama)
//   Kâr/zarar (açık pozisyon) = güncel değer − kalan maliyet
//
// Böylece yeni alım "kâr", satış "zarar" gibi görünmez: ikisi de maliyeti değiştirir, kârı değil.
//
// Tutarla takip edilen varlıklar (mevduat) için aynı mantık TL üzerinden çalışır:
//   Para yatırma: maliyet += tutar. Para çekme: maliyetten, çekilen tutarın bakiyeye oranı kadar düşülür.

import { isAmountMode } from './constants'
import { formatDate, formatQty, shiftMonth } from './format'
import { t as tx } from './i18n' // "t" adı aşağıda işlemler için kullanıldığından çeviri fonksiyonu "tx"

const monthOf = (date) => date.slice(0, 7)
const EPS = 1e-9

/** Verideki ilk aydan son aya (işlem veya fiyat kaydı olan) kadar tüm aylar. */
export function monthRange(data) {
  const months = [...Object.keys(data.prices), ...data.transactions.map((t) => monthOf(t.date))].sort()
  if (months.length === 0) return []
  const out = []
  for (let m = months[0]; m <= months[months.length - 1]; m = shiftMonth(m, 1)) out.push(m)
  return out
}

/**
 * Bir varlığın ilk hareketinden endMonth'a kadar her ayki durumu:
 * [{ month, qty, cost, avg, price, value, realized, flow, hasRecord }]
 *   qty:      elde kalan adet (mevduatta kullanılmaz)
 *   cost:     kalan maliyet (₺)        avg: ortalama birim maliyet
 *   price:    son bilinen birim fiyat   value: o ayki değer (₺)
 *   realized: o aya kadar satışlardan gerçekleşen toplam kâr/zarar
 *   flow:     o ay eklenen (+) veya çekilen (−) para
 */
export function assetTimeline(data, asset, endMonth) {
  const amount = isAmountMode(asset)
  const txs = data.transactions.filter((t) => t.assetId === asset.id).sort((a, b) => a.date.localeCompare(b.date))
  const recordMonths = Object.keys(data.prices).filter((m) => data.prices[m][asset.id] != null)
  const starts = [...recordMonths, ...txs.map((t) => monthOf(t.date))].sort()
  if (starts.length === 0 || starts[0] > endMonth) return []

  const out = []
  let qty = 0
  let cost = 0
  let realized = 0
  let price = null
  let balance = 0
  let i = 0

  for (let m = starts[0]; m <= endMonth; m = shiftMonth(m, 1)) {
    let flow = 0

    // 1) Bu ayın işlemleri
    while (i < txs.length && monthOf(txs[i].date) <= m) {
      const t = txs[i++]
      if (amount) {
        if (t.kind === 'buy') {
          balance += t.quantity
          cost += t.quantity
          flow += t.quantity
        } else {
          const share = balance > EPS ? Math.min(t.quantity / balance, 1) : 1
          const costOut = Math.min(cost * share, cost)
          cost -= costOut
          realized += t.quantity - costOut
          balance = Math.max(0, balance - t.quantity)
          flow -= t.quantity
        }
      } else {
        if (t.kind === 'buy') {
          cost += t.quantity * t.price
          qty += t.quantity
          flow += t.quantity * t.price
        } else {
          const sold = Math.min(t.quantity, qty)
          const avg = qty > EPS ? cost / qty : 0
          cost -= avg * sold
          qty -= sold
          realized += (t.price - avg) * sold
          flow -= t.price * sold
        }
        price = t.price // son işlem fiyatı, o ay fiyat girilmezse yaklaşık değer için kullanılır
      }
    }

    // 2) Bu ayın sonu için girilen fiyat / bakiye
    const record = data.prices[m]?.[asset.id]
    if (record != null) {
      if (amount) balance = record
      else price = record
    }

    // Küsurat hatalarını temizle (ör. 0,1 + 0,2 ≠ 0,3 sorunu)
    if (qty < EPS) qty = 0
    if (Math.abs(cost) < 1e-6 || (!amount && qty === 0)) cost = 0

    const value = amount ? balance : qty * (price ?? 0)
    out.push({ month: m, qty, cost, avg: qty > 0 ? cost / qty : 0, price, value, realized, flow, hasRecord: record != null })
  }
  return out
}

/** Bir varlığın verilen aydaki durumu (o aya kadar hiç hareketi yoksa null). */
export function assetStateAt(data, asset, month) {
  const tl = assetTimeline(data, asset, month)
  return tl.length ? tl[tl.length - 1] : null
}

/** Varlığın o ay listelerde görünmesi gerekiyor mu? (henüz alınmamış veya tamamen satılmışsa hayır) */
export function isHeld(state) {
  return Boolean(state) && (state.value > 0 || state.qty > 0 || state.cost > 0 || state.hasRecord || state.flow !== 0)
}

/**
 * Tüm portföyün aylık özeti:
 * [{ month, total, cost, realized, flow }]
 *   total: toplam değer   cost: toplam kalan maliyet   flow: o ay eklenen net para
 */
export function timeline(data) {
  const months = monthRange(data)
  if (months.length === 0) return []
  const end = months[months.length - 1]
  const perAsset = data.assets.map((a) => new Map(assetTimeline(data, a, end).map((s) => [s.month, s])))
  return months.map((month) => {
    const row = { month, total: 0, cost: 0, realized: 0, flow: 0 }
    for (const map of perAsset) {
      const s = map.get(month)
      if (!s) continue
      row.total += s.value
      row.cost += s.cost
      row.realized += s.realized
      row.flow += s.flow
    }
    return row
  })
}

/**
 * Verilen aydaki değerleri bir özelliğe göre gruplar (ör. türe veya kuruma göre).
 * Büyükten küçüğe sıralı döner: [{ key: "altin", value: 45000, share: 0.37 }, ...]
 */
export function breakdown(data, month, keyOf) {
  const groups = new Map()
  for (const a of data.assets) {
    const v = assetStateAt(data, a, month)?.value ?? 0
    if (v <= 0) continue
    const k = keyOf(a)
    groups.set(k, (groups.get(k) ?? 0) + v)
  }
  const total = [...groups.values()].reduce((s, v) => s + v, 0)
  return [...groups.entries()]
    .map(([key, value]) => ({ key, value, share: total ? value / total : 0 }))
    .sort((x, y) => y.value - x.value)
}

/**
 * Yeni bir işlem eklendiğinde (veya biri silindiğinde) geçmişte elde olandan fazla satış olup olmadığını kontrol eder.
 * Sorun yoksa null, varsa açıklayıcı bir hata metni döner.
 */
export function checkTransactions(data, asset, transactions) {
  const amount = isAmountMode(asset)
  const txs = transactions.filter((t) => t.assetId === asset.id).sort((a, b) => a.date.localeCompare(b.date))
  if (amount) {
    // Mevduatta bakiye fiyat kayıtlarına bağlı; kabaca, çekilen toplam yatırılanı ve bilinen bakiyeyi aşmasın.
    const trial = { ...data, transactions }
    for (const t of txs) {
      if (t.kind !== 'sell') continue
      const before = assetStateAt(trial, asset, shiftMonth(monthOf(t.date), -1))
      const sameMonthIn = txs
        .filter((x) => x.kind === 'buy' && monthOf(x.date) === monthOf(t.date) && x.date <= t.date)
        .reduce((s, x) => s + x.quantity, 0)
      const available = (before?.value ?? 0) + sameMonthIn
      if (t.quantity > available + 0.005)
        return tx(
          `${formatDate(t.date)} tarihinde bakiyeden fazla para çekilmiş görünüyor.`,
          `On ${formatDate(t.date)} more money would be withdrawn than the balance.`,
        )
    }
    return null
  }
  let qty = 0
  for (const t of txs) {
    qty += t.kind === 'buy' ? t.quantity : -t.quantity
    if (qty < -EPS) {
      const had = formatQty(Math.max(0, qty + t.quantity))
      return tx(
        `${formatDate(t.date)} tarihinde elde olandan fazla satış oluyor. O tarihte elde ${had} birim vardı.`,
        `On ${formatDate(t.date)} you would sell more than you hold. You held ${had} units on that date.`,
      )
    }
  }
  return null
}
