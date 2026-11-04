// Verinin tarayıcıya (LocalStorage) kaydedilip geri okunması.
// LocalStorage sadece yazı (string) saklar; bu yüzden veriyi JSON yazısına çevirip saklıyoruz.

const KEY = 'capitrack:data'

/**
 * Verinin şekli:
 * {
 *   version: 1,
 *   assets:  [{ id, name, type, institution, note, createdAt }],
 *   records: { "2026-11": { "<varlık id>": { value: 45000 } } }
 * }
 */
export function emptyData() {
  return { version: 1, assets: [], records: {} }
}

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw)
    return { ...emptyData(), ...parsed }
  } catch {
    // Gizli sekme, engellenmiş depolama ya da bozuk veri: boş başla, uygulama çökmesin.
    return emptyData()
  }
}

/**
 * Dışarıdan gelen (içe aktarılan) veriyi kontrol eder ve temizler.
 * Biçim yanlışsa açıklamalı bir hata fırlatır; doğruysa güvenli bir kopya döner.
 */
export function validateData(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.assets)) {
    throw new Error('Bu dosya bir CapiTrack yedeği değil ("assets" listesi bulunamadı).')
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

  const records = {}
  for (const [month, row] of Object.entries(input.records ?? {})) {
    if (!/^\d{4}-\d{2}$/.test(month) || !row || typeof row !== 'object') continue
    const clean = {}
    for (const [id, rec] of Object.entries(row)) {
      if (ids.has(id) && Number.isFinite(rec?.value) && rec.value >= 0) clean[id] = { value: rec.value }
    }
    if (Object.keys(clean).length > 0) records[month] = clean
  }
  return { version: 1, assets, records }
}

export function saveData(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}
