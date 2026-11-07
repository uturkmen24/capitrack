// Uygulamanın tanıdığı yatırım türleri.
// "badge": listedeki rozetin rengi (Tailwind sınıfları; karanlık temada index.css ayarlar)
// "color": grafiklerdeki rengi. Her tür her grafikte hep aynı rengi alır.
//          Renkler renk körlüğü testinden geçirilmiş bir paletten seçildi; "Diğer" bilinçli olarak gri.
//          Karanlık temada aynı renklerin koyu zemin için seçilmiş tonları kullanılır (darkColor).
// "mode":  nasıl takip edildiği
//   'unit'   → adet × birim fiyat (hisse, fon, altın…). Alış/satış adet ve fiyatla girilir,
//              her ay birim fiyat güncellenir.
//   'amount' → toplam tutar (mevduat…). Para yatırma/çekme tutarla girilir, her ay bakiye güncellenir.
// "unit":  adedin birimi, "priceLabel": aylık girilen fiyatın adı
//
// label / unit / priceLabel / color "getter"dır: her okunduğunda seçili dile ve temaya göre değer döner.

import { t } from './i18n'
import { isDark } from './theme'

function type(id, tr, en, light, dark, badge, mode, unit, priceLabel) {
  return {
    id,
    mode,
    badge,
    lightColor: light,
    darkColor: dark,
    get label() {
      return t(tr, en)
    },
    get color() {
      return isDark() ? dark : light
    },
    get unit() {
      return unit ? t(unit[0], unit[1]) : undefined
    },
    get priceLabel() {
      return priceLabel ? t(priceLabel[0], priceLabel[1]) : undefined
    },
  }
}

export const ASSET_TYPES = [
  type('altin', 'Altın', 'Gold', '#eda100', '#c98500', 'bg-amber-100 text-amber-800', 'unit', ['gr', 'g'], ['Gram fiyatı', 'Price per gram']),
  type('hisse', 'Hisse', 'Stocks', '#2a78d6', '#3987e5', 'bg-blue-100 text-blue-800', 'unit', ['adet', 'shares'], ['Hisse fiyatı', 'Share price']),
  type('etf', 'ETF', 'ETF', '#6250d6', '#9085e9', 'bg-violet-100 text-violet-800', 'unit', ['adet', 'shares'], ['Birim fiyat', 'Unit price']),
  type('fon', 'Yatırım Fonu', 'Mutual Fund', '#1baf7a', '#199e70', 'bg-emerald-100 text-emerald-800', 'unit', ['pay', 'units'], ['Pay fiyatı', 'Unit price']),
  type('doviz', 'Döviz', 'Currency', '#008300', '#008300', 'bg-green-100 text-green-800', 'unit', ['birim', 'units'], ['Kur', 'Exchange rate']),
  type('mevduat', 'Mevduat', 'Deposit', '#e87ba4', '#d55181', 'bg-pink-100 text-pink-800', 'amount'),
  type('kripto', 'Kripto', 'Crypto', '#eb6834', '#d95926', 'bg-orange-100 text-orange-800', 'unit', ['adet', 'units'], ['Birim fiyat', 'Unit price']),
  type('diger', 'Diğer', 'Other', '#898781', '#8f8e88', 'bg-slate-200 text-slate-700', 'amount'),
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
