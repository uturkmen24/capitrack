// Uygulamayı denemek için örnek portföy: 5 varlık, son 6 ayın değerleri.
// Aylar her zaman bugünden geriye hesaplanır, böylece örnek veri hiç eskimez.

import { currentMonth, shiftMonth } from './format'

const ASSETS = [
  { id: 'demo-altin', name: 'Gram Altın', type: 'altin', institution: 'Ziraat Bankası', note: '25 gram' },
  { id: 'demo-hisse', name: 'BIST Hisseleri', type: 'hisse', institution: 'Garanti BBVA', note: 'THYAO, ASELS, BIMAS' },
  { id: 'demo-etf', name: 'S&P 500 ETF', type: 'etf', institution: 'Midas', note: '' },
  { id: 'demo-fon', name: 'Para Piyasası Fonu', type: 'fon', institution: 'İş Bankası', note: '' },
  { id: 'demo-mevduat', name: 'Vadeli Mevduat', type: 'mevduat', institution: 'Garanti BBVA', note: '32 gün vadeli' },
]

// Her varlığın en eskiden en yeniye 6 aylık değeri (₺)
const VALUES = {
  'demo-altin': [72000, 75500, 74000, 79000, 83500, 86000],
  'demo-hisse': [54000, 58500, 52000, 61000, 66500, 64000],
  'demo-etf': [38000, 39500, 41000, 40000, 43500, 46000],
  'demo-fon': [30000, 30900, 31800, 32700, 33600, 34500],
  'demo-mevduat': [100000, 103500, 107000, 110500, 114000, 117500],
}

export function createDemoData() {
  const now = currentMonth()
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(now, i - 5))

  const records = {}
  months.forEach((month, i) => {
    records[month] = {}
    for (const [id, values] of Object.entries(VALUES)) records[month][id] = { value: values[i] }
  })

  const createdAt = new Date().toISOString()
  return { version: 1, assets: ASSETS.map((a) => ({ ...a, createdAt })), records }
}
