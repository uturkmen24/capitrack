// Verinin tarayıcıya (LocalStorage) kaydedilip geri okunması.
// LocalStorage sadece yazı (string) saklar; bu yüzden veriyi JSON yazısına çevirip saklıyoruz.

import { t } from './i18n'

const KEY = 'capitrack:data'
const OLD_BACKUP_KEY = 'capitrack:data:v1-yedek'
export const DATA_VERSION = 2

/**
 * Verinin şekli (sürüm 2):
 * {
 *   version: 2,
 *   assets:       [{ id, name, type, institution, note, createdAt }],
 *   transactions: [{ id, assetId, date: "2026-11-05", kind: "buy" | "sell", quantity, price }],
 *                 (mevduat gibi tutarla takip edilenlerde quantity = tutar, price = 1)
 *   prices:       { "2026-11": { "<varlık id>": 312.5 } }
 *                 (ay sonu birim fiyatı; mevduatta o ayın bakiyesi)
 *   goal:         { name, target, monthly, annualReturn } | null
 * }
 */
export function emptyData() {
  return { version: DATA_VERSION, assets: [], transactions: [], prices: {}, goal: null }
}

/** Hedef nesnesini kontrol eder; geçersizse null döner. */
function validateGoal(g) {
  if (!g || typeof g !== 'object' || !(g.target > 0)) return null
  return {
    name: typeof g.name === 'string' ? g.name : '',
    target: g.target,
    monthly: Number.isFinite(g.monthly) && g.monthly >= 0 ? g.monthly : 0,
    annualReturn: Number.isFinite(g.annualReturn) ? g.annualReturn : 0,
  }
}

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw)
    if (parsed?.version !== DATA_VERSION) {
      // Eski sürümün verisi (adet / maliyet bilgisi yok). Kararımız: yeni sistemle sıfırdan başla.
      // Yine de silmiyoruz; ayrı bir anahtara yedekliyoruz ki gerekirse kurtarılabilsin.
      localStorage.setItem(OLD_BACKUP_KEY, raw)
      return emptyData()
    }
    return validateData(parsed)
  } catch {
    // Gizli sekme, engellenmiş depolama ya da bozuk veri: boş başla, uygulama çökmesin.
    return emptyData()
  }
}

const isMonth = (m) => /^\d{4}-\d{2}$/.test(m)
const isDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
const positive = (n) => Number.isFinite(n) && n > 0

/**
 * Dışarıdan gelen (içe aktarılan) veriyi kontrol eder ve temizler.
 * Biçim yanlışsa açıklamalı bir hata fırlatır; doğruysa güvenli bir kopya döner.
 */
export function validateData(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.assets)) {
    throw new Error(
      t('Bu dosya bir CapiTrack yedeği değil ("assets" listesi bulunamadı).', 'This file is not a CapiTrack backup (no "assets" list found).'),
    )
  }
  if (input.version !== DATA_VERSION) {
    throw new Error(
      t(
        'Bu yedek CapiTrack’in eski sürümüne ait; içinde adet ve alış maliyeti bilgisi yok. Yeni sürümde varlıkları alış işlemleriyle yeniden eklemen gerekiyor.',
        'This backup is from an older version of CapiTrack and has no quantity or purchase cost data. Please add your assets again with their purchases.',
      ),
    )
  }

  const assets = input.assets
    .filter((a) => a && typeof a.id === 'string' && typeof a.name === 'string')
    .map((a) => ({
      id: a.id,
      name: a.name,
      type: typeof a.type === 'string' ? a.type : 'diger',
      institution: typeof a.institution === 'string' ? a.institution : '',
      note: typeof a.note === 'string' ? a.note : '',
      createdAt: typeof a.createdAt === 'string' ? a.createdAt : new Date().toISOString(),
    }))
  const ids = new Set(assets.map((a) => a.id))

  const transactions = (Array.isArray(input.transactions) ? input.transactions : [])
    .filter(
      (t) =>
        t &&
        typeof t.id === 'string' &&
        ids.has(t.assetId) &&
        isDate(t.date) &&
        (t.kind === 'buy' || t.kind === 'sell') &&
        positive(t.quantity) &&
        positive(t.price),
    )
    .map((t) => ({ id: t.id, assetId: t.assetId, date: t.date, kind: t.kind, quantity: t.quantity, price: t.price }))

  const prices = {}
  for (const [month, row] of Object.entries(input.prices ?? {})) {
    if (!isMonth(month) || !row || typeof row !== 'object') continue
    const clean = {}
    for (const [id, v] of Object.entries(row)) {
      if (ids.has(id) && Number.isFinite(v) && v >= 0) clean[id] = v
    }
    if (Object.keys(clean).length > 0) prices[month] = clean
  }

  return { version: DATA_VERSION, assets, transactions, prices, goal: validateGoal(input.goal) }
}

export function saveData(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}
