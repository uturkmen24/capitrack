// Uygulamayı denemek için örnek portföy: 9 varlık, son 6 ayın alış/satış işlemleri ve aylık fiyatları.
// Aylar her zaman bugünden geriye hesaplanır, böylece örnek veri hiç eskimez.
// İçinde ek alımlar (THYAO, altın, fon, mevduat) ve bir kısmi satış (ASELS) var; ortalama maliyet bunlarla görülebilir.

import { DATA_VERSION } from './storage'
import { currentMonth, shiftMonth } from './format'

const ASSETS = [
  { id: 'demo-altin', name: 'Gram Altın', type: 'altin', institution: 'Ziraat Bankası', note: '' },
  { id: 'demo-thyao', name: 'THYAO', type: 'hisse', institution: 'Garanti BBVA Yatırım', note: 'Türk Hava Yolları' },
  { id: 'demo-bimas', name: 'BIMAS', type: 'hisse', institution: 'Garanti BBVA Yatırım', note: 'BİM Mağazalar' },
  { id: 'demo-asels', name: 'ASELS', type: 'hisse', institution: 'Midas', note: 'Aselsan' },
  { id: 'demo-etf', name: 'S&P 500 ETF', type: 'etf', institution: 'Midas', note: '' },
  { id: 'demo-ppf', name: 'Para Piyasası Fonu', type: 'fon', institution: 'İş Bankası', note: '' },
  { id: 'demo-tekfon', name: 'Teknoloji Fonu', type: 'fon', institution: 'İş Bankası', note: '' },
  { id: 'demo-usd', name: 'Dolar', type: 'doviz', institution: 'Garanti BBVA', note: 'Döviz hesabı' },
  { id: 'demo-mevduat', name: 'Vadeli Mevduat', type: 'mevduat', institution: 'Garanti BBVA', note: '32 gün vadeli' },
]

// [ay sırası (0 = 5 ay önce, 5 = bu ay), gün, varlık, işlem, adet (mevduatta tutar), birim fiyat]
const TRANSACTIONS = [
  [0, 3, 'demo-altin', 'buy', 15, 4200],
  [2, 10, 'demo-altin', 'buy', 10, 4390],
  [0, 4, 'demo-thyao', 'buy', 200, 280],
  [3, 12, 'demo-thyao', 'buy', 50, 296],
  [1, 6, 'demo-bimas', 'buy', 80, 520],
  [0, 4, 'demo-asels', 'buy', 500, 150],
  [4, 18, 'demo-asels', 'sell', 100, 185],
  [0, 5, 'demo-etf', 'buy', 2, 26000],
  [0, 2, 'demo-ppf', 'buy', 12000, 2.1],
  [3, 2, 'demo-ppf', 'buy', 3000, 2.21],
  [2, 15, 'demo-tekfon', 'buy', 5000, 3.4],
  [0, 8, 'demo-usd', 'buy', 1000, 47.6],
  [0, 1, 'demo-mevduat', 'buy', 100000, 1],
  [3, 1, 'demo-mevduat', 'buy', 20000, 1],
]

// Her ayın sonundaki birim fiyat (mevduatta bakiye). null = o ay girilmemiş.
const PRICES = {
  'demo-altin': [4210, 4350, 4400, 4480, 4560, 4650],
  'demo-thyao': [282, 290, 287, 298, 305, 312],
  'demo-bimas': [null, 525, 510, 530, 538, 545],
  'demo-asels': [152, 160, 168, 175, 186, 192],
  'demo-etf': [26200, 26900, 27300, 27100, 27800, 28400],
  'demo-ppf': [2.12, 2.15, 2.19, 2.22, 2.26, 2.3],
  'demo-tekfon': [null, null, 3.45, 3.38, 3.6, 3.72],
  'demo-usd': [47.8, 48.3, 48.7, 49.2, 49.6, 50.05],
  'demo-mevduat': [102800, 105700, 108600, 131800, 135400, 139200],
}

export function createDemoData() {
  const now = currentMonth()
  const monthAt = (i) => shiftMonth(now, i - 5)
  const createdAt = new Date().toISOString()

  const transactions = TRANSACTIONS.map(([i, day, assetId, kind, quantity, price], n) => ({
    id: `demo-tx-${n}`,
    assetId,
    date: `${monthAt(i)}-${String(day).padStart(2, '0')}`,
    kind,
    quantity,
    price,
  }))

  const prices = {}
  for (const [assetId, values] of Object.entries(PRICES)) {
    values.forEach((v, i) => {
      if (v == null) return
      const m = monthAt(i)
      prices[m] = { ...prices[m], [assetId]: v }
    })
  }

  const goal = { name: 'Ev peşinatı', target: 1500000, monthly: 15000, annualReturn: 0.1 }
  return { version: DATA_VERSION, assets: ASSETS.map((a) => ({ ...a, createdAt })), transactions, prices, goal }
}
