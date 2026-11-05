// Uygulamanın tüm verisini tutan ve değiştiren tek yer ("hook").
// Ekranlar veriyi buradan okur ve değişiklikleri buradaki fonksiyonlarla yapar.
// Veri her değiştiğinde otomatik olarak LocalStorage'a kaydedilir.

import { useEffect, useState } from 'react'
import { loadData, saveData } from './storage'
import { createDemoData } from './demoData'

export function newId() {
  return globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/** Bir kayıt tablosundan (ay → varlık → değer) bir varlığın tüm satırlarını siler. */
function withoutAsset(prices, assetId) {
  const out = {}
  for (const [month, row] of Object.entries(prices)) {
    const rest = { ...row }
    delete rest[assetId]
    if (Object.keys(rest).length > 0) out[month] = rest
  }
  return out
}

export function usePortfolio() {
  // Sayfa açılınca veri LocalStorage'dan bir kez okunur.
  // Adres "?demo" ile açılırsa ve kayıtlı veri yoksa örnek veriyle başlar (paylaşılabilir demo linki).
  const [data, setData] = useState(() => {
    const saved = loadData()
    const wantsDemo = new URLSearchParams(window.location.search).has('demo')
    return wantsDemo && saved.assets.length === 0 ? createDemoData() : saved
  })

  // Veri her değiştiğinde kaydet.
  useEffect(() => {
    saveData(data)
  }, [data])

  /** Yeni varlık ekler. firstTx verilirse (ilk alış) onu da kaydeder. */
  function addAsset(fields, firstTx) {
    const asset = { id: newId(), ...fields, createdAt: new Date().toISOString() }
    setData((d) => ({
      ...d,
      assets: [...d.assets, asset],
      transactions: firstTx ? [...d.transactions, { id: newId(), assetId: asset.id, ...firstTx }] : d.transactions,
    }))
  }

  function updateAsset(id, fields) {
    setData((d) => ({ ...d, assets: d.assets.map((a) => (a.id === id ? { ...a, ...fields } : a)) }))
  }

  /** Varlığı, tüm işlemlerini ve aylık fiyatlarını siler. */
  function deleteAsset(id) {
    setData((d) => ({
      ...d,
      assets: d.assets.filter((a) => a.id !== id),
      transactions: d.transactions.filter((t) => t.assetId !== id),
      prices: withoutAsset(d.prices, id),
    }))
  }

  /** Alış / satış işlemi ekler: { assetId, date, kind, quantity, price } */
  function addTransaction(tx) {
    setData((d) => ({ ...d, transactions: [...d.transactions, { id: newId(), ...tx }] }))
  }

  function deleteTransaction(id) {
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }))
  }

  /**
   * Bir ayın tüm fiyatlarını (mevduatta bakiyelerini) tek seferde kaydeder.
   * values: { "<varlık id>": 312.5, "<başka id>": null }  (null = o ay için kaydı sil)
   */
  function saveMonth(month, values) {
    setData((d) => {
      const row = { ...d.prices[month] }
      for (const [id, value] of Object.entries(values)) {
        if (value == null) delete row[id]
        else row[id] = value
      }
      const prices = { ...d.prices }
      if (Object.keys(row).length > 0) prices[month] = row
      else delete prices[month]
      return { ...d, prices }
    })
  }

  /** Hedefi kaydeder; null verilirse hedefi kaldırır. */
  function setGoal(goal) {
    setData((d) => ({ ...d, goal }))
  }

  /** Tüm veriyi değiştirir (yedekten geri yükleme, örnek veri, sıfırlama). */
  function replaceData(next) {
    setData(next)
  }

  return { data, addAsset, updateAsset, deleteAsset, addTransaction, deleteTransaction, saveMonth, setGoal, replaceData }
}
