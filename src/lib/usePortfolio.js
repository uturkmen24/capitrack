// Uygulamanın tüm verisini tutan ve değiştiren tek yer ("hook").
// Ekranlar veriyi buradan okur ve değişiklikleri buradaki fonksiyonlarla yapar.
// Veri her değiştiğinde otomatik olarak LocalStorage'a kaydedilir.

import { useEffect, useState } from 'react'
import { loadData, saveData } from './storage'
import { currentMonth } from './format'

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/** Bir varlığın bu ayki değerini yazar (value null ise dokunmaz). */
function withValue(records, assetId, value) {
  if (value == null) return records
  const m = currentMonth()
  return { ...records, [m]: { ...records[m], [assetId]: { value } } }
}

/** Bir varlığın en son girilen değerini bulur: { month, value } ya da null. */
export function latestValue(records, assetId) {
  const months = Object.keys(records).sort().reverse()
  for (const m of months) {
    const rec = records[m]?.[assetId]
    if (rec) return { month: m, value: rec.value }
  }
  return null
}

export function usePortfolio() {
  // Sayfa açılınca veri LocalStorage'dan bir kez okunur.
  const [data, setData] = useState(loadData)

  // Veri her değiştiğinde kaydet.
  useEffect(() => {
    saveData(data)
  }, [data])

  function addAsset(fields, value) {
    const asset = { id: newId(), ...fields, createdAt: new Date().toISOString() }
    setData((d) => ({
      ...d,
      assets: [...d.assets, asset],
      records: withValue(d.records, asset.id, value),
    }))
  }

  function updateAsset(id, fields, value) {
    setData((d) => ({
      ...d,
      assets: d.assets.map((a) => (a.id === id ? { ...a, ...fields } : a)),
      records: withValue(d.records, id, value),
    }))
  }

  function deleteAsset(id) {
    setData((d) => {
      // Varlığı silerken geçmiş aylardaki kayıtlarını da temizle.
      const records = {}
      for (const [month, row] of Object.entries(d.records)) {
        const rest = { ...row }
        delete rest[id]
        if (Object.keys(rest).length > 0) records[month] = rest
      }
      return { ...d, assets: d.assets.filter((a) => a.id !== id), records }
    })
  }

  return { data, addAsset, updateAsset, deleteAsset }
}
