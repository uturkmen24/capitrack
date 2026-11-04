// Panel ekranının hesapları: aylık toplamlar ve dağılımlar.
//
// Önemli kural ("son bilinen değer"): Bir varlığın bir ay için kaydı yoksa, en son girilen değeri
// geçerli sayılır. Böylece sadece değişen varlıkları güncellemek yeterli olur.
// Elden çıkarılan bir varlık için o aya 0 yazılır.

import { shiftMonth } from './format'
import { latestValue } from './usePortfolio'

/** Bir varlığın verilen aydaki (veya öncesindeki son) değeri. */
export function valueAt(records, assetId, month) {
  return latestValue(records, assetId, shiftMonth(month, 1))?.value ?? 0
}

/** İlk kayıtlı aydan son kayıtlı aya kadar tüm aylar (arada boş ay olsa bile). */
export function monthRange(records) {
  const months = Object.keys(records).sort()
  if (months.length === 0) return []
  const out = []
  for (let m = months[0]; m <= months[months.length - 1]; m = shiftMonth(m, 1)) out.push(m)
  return out
}

/** Her ay için toplam değer: [{ month: "2026-10", total: 120000 }, ...] */
export function timeline(data) {
  return monthRange(data.records).map((month) => ({
    month,
    total: data.assets.reduce((sum, a) => sum + valueAt(data.records, a.id, month), 0),
  }))
}

/**
 * Verilen aydaki değerleri bir özelliğe göre gruplar (ör. türe veya kuruma göre).
 * Büyükten küçüğe sıralı döner: [{ key: "altin", value: 45000, share: 0.37 }, ...]
 */
export function breakdown(data, month, keyOf) {
  const groups = new Map()
  for (const a of data.assets) {
    const v = valueAt(data.records, a.id, month)
    if (v <= 0) continue
    const k = keyOf(a)
    groups.set(k, (groups.get(k) ?? 0) + v)
  }
  const total = [...groups.values()].reduce((s, v) => s + v, 0)
  return [...groups.entries()]
    .map(([key, value]) => ({ key, value, share: total ? value / total : 0 }))
    .sort((x, y) => y.value - x.value)
}
