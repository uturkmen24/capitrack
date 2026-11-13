// Alış / satış formundaki yazıların kontrolü ve işleme çevrilmesi.

import { t } from './i18n'
import { amountToInput, parseAmount, today } from './format'

/** Formun boş hâli (fiyat verilirse son fiyatla dolu gelir). fxText: döviz cinsinden varlıkta o günün kuru. */
export function emptyTrade(price) {
  return { date: today(), quantity: '', price: amountToInput(price), fxText: '', fxAuto: true }
}

/** Formda hiçbir şey yazılmamış mı? (ilk alış isteğe bağlı olduğu için) */
export function isTradeEmpty(f) {
  return !String(f.quantity).trim() && !String(f.price).trim()
}

/**
 * Form alanlarını işleme çevirir. amountMode: mevduat gibi tutarla takip edilen varlık.
 * fx: { currency, currencyAsset } — döviz cinsinden varlıkta kur da okunur;
 *     döviz hesabında (currencyAsset) fiyat sorulmaz, 1 sayılır (değeri kur belirler).
 * Dönen değer: { tx: { date, kind, quantity, price, fx? } } ya da { error: "..." }
 */
export function readTrade(f, kind, amountMode, fx = { currency: 'TRY' }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return { error: t('Geçerli bir tarih seç.', 'Choose a valid date.') }
  if (f.date > today()) return { error: t('İleri bir tarih seçilemez.', 'The date cannot be in the future.') }
  const quantity = parseAmount(f.quantity)
  if (!(quantity > 0))
    return {
      error: amountMode
        ? t('Tutar sıfırdan büyük bir sayı olmalı.', 'Amount must be a number greater than zero.')
        : t('Adet sıfırdan büyük bir sayı olmalı.', 'Quantity must be a number greater than zero.'),
    }
  if (amountMode) return { tx: { date: f.date, kind, quantity, price: 1 } }

  let rate
  if (fx.currency !== 'TRY') {
    rate = parseAmount(f.fxText)
    if (!(rate > 0))
      return {
        error: t(
          'Kur alınamadı. İnternet bağlantını kontrol et ya da kuru elle yaz (1 birimin TL karşılığı).',
          'Could not get the exchange rate. Check your connection or type the rate yourself (lira per unit).',
        ),
      }
  }
  if (fx.currencyAsset) return { tx: { date: f.date, kind, quantity, price: 1, fx: rate } }

  const price = parseAmount(f.price)
  if (!(price > 0))
    return { error: t('Birim fiyat sıfırdan büyük bir sayı olmalı (ör. 312,50).', 'Unit price must be a number greater than zero (e.g. 312.50).') }
  return { tx: { date: f.date, kind, quantity, price, ...(rate ? { fx: rate } : {}) } }
}
