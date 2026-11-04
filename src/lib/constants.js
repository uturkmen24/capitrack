// Uygulamanın tanıdığı yatırım türleri.
// "badge": listedeki rozetin rengi (Tailwind sınıfları)
// "color": grafiklerdeki rengi. Her tür her grafikte hep aynı rengi alır.
// Bu renkler renk körlüğü testinden geçirilmiş bir paletten seçildi; "Diğer" bilinçli olarak gri.
export const ASSET_TYPES = [
  { id: 'altin', label: 'Altın', color: '#eda100', badge: 'bg-amber-100 text-amber-800' },
  { id: 'hisse', label: 'Hisse', color: '#2a78d6', badge: 'bg-blue-100 text-blue-800' },
  { id: 'etf', label: 'ETF', color: '#6250d6', badge: 'bg-violet-100 text-violet-800' },
  { id: 'fon', label: 'Yatırım Fonu', color: '#1baf7a', badge: 'bg-emerald-100 text-emerald-800' },
  { id: 'doviz', label: 'Döviz', color: '#008300', badge: 'bg-green-100 text-green-800' },
  { id: 'mevduat', label: 'Mevduat', color: '#e87ba4', badge: 'bg-pink-100 text-pink-800' },
  { id: 'kripto', label: 'Kripto', color: '#eb6834', badge: 'bg-orange-100 text-orange-800' },
  { id: 'diger', label: 'Diğer', color: '#898781', badge: 'bg-slate-200 text-slate-700' },
]

export function getType(id) {
  return ASSET_TYPES.find((t) => t.id === id) ?? ASSET_TYPES[ASSET_TYPES.length - 1]
}
