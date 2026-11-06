// Uygulamanın tanıdığı yatırım türleri.
// "badge": listedeki rozetin rengi (Tailwind sınıfları)
// "color": grafiklerdeki rengi. Her tür her grafikte hep aynı rengi alır.
//          Renkler renk körlüğü testinden geçirilmiş bir paletten seçildi; "Diğer" bilinçli olarak gri.
// "mode":  nasıl takip edildiği
//   'unit'   → adet × birim fiyat (hisse, fon, altın…). Alış/satış adet ve fiyatla girilir,
//              her ay birim fiyat güncellenir.
//   'amount' → toplam tutar (mevduat…). Para yatırma/çekme tutarla girilir, her ay bakiye güncellenir.
// "unit":  adedin birimi, "priceLabel": aylık girilen fiyatın adı
export const ASSET_TYPES = [
  { id: 'altin', label: 'Altın', color: '#eda100', badge: 'bg-amber-100 text-amber-800', mode: 'unit', unit: 'gr', priceLabel: 'Gram fiyatı' },
  { id: 'hisse', label: 'Hisse', color: '#2a78d6', badge: 'bg-blue-100 text-blue-800', mode: 'unit', unit: 'adet', priceLabel: 'Hisse fiyatı' },
  { id: 'etf', label: 'ETF', color: '#6250d6', badge: 'bg-violet-100 text-violet-800', mode: 'unit', unit: 'adet', priceLabel: 'Birim fiyat' },
  { id: 'fon', label: 'Yatırım Fonu', color: '#1baf7a', badge: 'bg-emerald-100 text-emerald-800', mode: 'unit', unit: 'pay', priceLabel: 'Pay fiyatı' },
  { id: 'doviz', label: 'Döviz', color: '#008300', badge: 'bg-green-100 text-green-800', mode: 'unit', unit: 'birim', priceLabel: 'Kur' },
  { id: 'mevduat', label: 'Mevduat', color: '#e87ba4', badge: 'bg-pink-100 text-pink-800', mode: 'amount' },
  { id: 'kripto', label: 'Kripto', color: '#eb6834', badge: 'bg-orange-100 text-orange-800', mode: 'unit', unit: 'adet', priceLabel: 'Birim fiyat' },
  { id: 'diger', label: 'Diğer', color: '#898781', badge: 'bg-slate-200 text-slate-700', mode: 'amount' },
]

export function getType(id) {
  return ASSET_TYPES.find((t) => t.id === id) ?? ASSET_TYPES[ASSET_TYPES.length - 1]
}

/** Varlıkları türe göre gruplar; gruplar her zaman aynı sırada (Altın, Hisse, ETF…) gelir. */
export function groupByType(items, typeOf = (x) => x.type) {
  return ASSET_TYPES.map((type) => ({ type, items: items.filter((x) => typeOf(x) === type.id) })).filter(
    (g) => g.items.length > 0,
  )
}

/**
 * Ekranlar için gruplama: aynı türden en az 2 varlık varsa grup olur ve en üstte gösterilir.
 * Türünde tek olan varlıklar gruplanmaz, alttaki düz listede (tür sırasıyla) kalır.
 * Ör. 3 hisse + 1 altın → { groups: [Hisse(3)], singles: [altın] }. İkinci altın eklenince Altın da grup olur.
 */
export function splitByType(items, typeOf = (x) => x.type) {
  const all = groupByType(items, typeOf)
  return {
    groups: all.filter((g) => g.items.length > 1),
    singles: all.filter((g) => g.items.length === 1).map((g) => g.items[0]),
  }
}

/** Varlık tutarla mı (mevduat gibi) takip ediliyor? Değilse adet × fiyat ile takip edilir. */
export function isAmountMode(asset) {
  return getType(asset.type).mode === 'amount'
}
