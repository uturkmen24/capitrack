// Alış / satış formundaki yazıların kontrolü ve işleme çevrilmesi.

import { amountToInput, parseAmount, today } from './format'

/** Formun boş hâli (fiyat verilirse son fiyatla dolu gelir) */
export function emptyTrade(price) {
  return { date: today(), quantity: '', price: amountToInput(price) }
}

/** Formda hiçbir şey yazılmamış mı? (ilk alış isteğe bağlı olduğu için) */
export function isTradeEmpty(f) {
  return !String(f.quantity).trim() && !String(f.price).trim()
}

/**
 * Form alanlarını işleme çevirir. amountMode: mevduat gibi tutarla takip edilen varlık.
 * Dönen değer: { tx: { date, kind, quantity, price } } ya da { error: "..." }
 */
export function readTrade(f, kind, amountMode) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return { error: 'Geçerli bir tarih seç.' }
  if (f.date > today()) return { error: 'İleri bir tarih seçilemez.' }
  const quantity = parseAmount(f.quantity)
  if (!(quantity > 0)) return { error: amountMode ? 'Tutar sıfırdan büyük bir sayı olmalı.' : 'Adet sıfırdan büyük bir sayı olmalı.' }
  if (amountMode) return { tx: { date: f.date, kind, quantity, price: 1 } }
  const price = parseAmount(f.price)
  if (!(price > 0)) return { error: 'Birim fiyat sıfırdan büyük bir sayı olmalı (ör. 312,50).' }
  return { tx: { date: f.date, kind, quantity, price } }
}
