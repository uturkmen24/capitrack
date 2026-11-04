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

export function saveData(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}
