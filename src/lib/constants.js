// Uygulamanın tanıdığı yatırım türleri.
// "badge" rozetin rengini belirler (Tailwind sınıfları).
export const ASSET_TYPES = [
  { id: 'altin', label: 'Altın', badge: 'bg-amber-100 text-amber-800' },
  { id: 'hisse', label: 'Hisse', badge: 'bg-sky-100 text-sky-800' },
  { id: 'etf', label: 'ETF', badge: 'bg-violet-100 text-violet-800' },
  { id: 'fon', label: 'Yatırım Fonu', badge: 'bg-emerald-100 text-emerald-800' },
  { id: 'doviz', label: 'Döviz', badge: 'bg-teal-100 text-teal-800' },
  { id: 'mevduat', label: 'Mevduat', badge: 'bg-indigo-100 text-indigo-800' },
  { id: 'kripto', label: 'Kripto', badge: 'bg-orange-100 text-orange-800' },
  { id: 'diger', label: 'Diğer', badge: 'bg-slate-200 text-slate-700' },
]

export function getType(id) {
  return ASSET_TYPES.find((t) => t.id === id) ?? ASSET_TYPES[ASSET_TYPES.length - 1]
}
