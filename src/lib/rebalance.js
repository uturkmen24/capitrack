// Kademeli portföy dengeleme: hedef yüzdelere göre ne kadar alınıp satılacağını hesaplar
// ve bunu N eşit adıma böler. Hepsi saf hesap; internet, yapay zeka veya sunucu kullanılmaz.

import { assetStateAt } from './analytics'
import { getType, groupByType } from './constants'
import { t } from './i18n'

export const STEP_OPTIONS = [2, 3, 4, 6, 12]

/**
 * Dengelemeye girecek kalemler. by = 'type' ise türler (Altın, Hisse…), 'asset' ise tek tek varlıklar (THYAO, PPF…).
 * Sadece bugün elde olan (değeri > 0) varlıklar alınır.
 * Her kalem: { key, label, color, value, amountMode, price, unit, note }
 *   price: birim fiyat (adet/gram karşılığını göstermek için); türe göre modda sadece türde tek varlık varsa bilinir.
 */
export function rebalanceRows(data, by, month) {
  const held = data.assets
    .map((asset) => ({ asset, type: getType(asset.type), state: assetStateAt(data, asset, month) }))
    .filter((r) => r.state && r.state.value > 0)

  if (by === 'asset') {
    return held
      .map(({ asset, type, state }) => ({
        key: asset.id,
        typeId: type.id,
        label: asset.name,
        color: type.color,
        value: state.value,
        amountMode: type.mode === 'amount',
        price: type.mode === 'unit' && state.price > 0 ? state.price : null,
        unit: type.unit,
        note: type.label,
      }))
      .sort((a, b) => b.value - a.value)
  }

  return groupByType(held, (r) => r.asset.type).map(({ type, items }) => {
    const single = items.length === 1 ? items[0] : null
    return {
      key: type.id,
      typeId: type.id,
      label: type.label,
      color: type.color,
      value: items.reduce((s, r) => s + r.state.value, 0),
      amountMode: type.mode === 'amount',
      price: single && type.mode === 'unit' && single.state.price > 0 ? single.state.price : null,
      unit: type.unit,
      note: single ? single.asset.name : t(`${items.length} varlık`, `${items.length} assets`),
    }
  })
}

/**
 * Bugünkü paylar, binde birlik (%0,1) hassasiyetle ve toplamı tam %100 olacak şekilde.
 * Yuvarlamadan kalan farkı, küsuratı en büyük olanlara dağıtır (en büyük kalan yöntemi).
 * Formu bu değerlerle doldurmak, "hiçbir şeyi değiştirmeyen" bir başlangıç planı demektir.
 */
export function currentShares(rows) {
  const total = rows.reduce((s, r) => s + r.value, 0)
  if (!(total > 0)) return {}
  const raw = rows.map((r) => (r.value / total) * 1000)
  const tenths = raw.map(Math.floor)
  const left = 1000 - tenths.reduce((s, x) => s + x, 0)
  raw
    .map((x, i) => [x - tenths[i], i])
    .sort((a, b) => b[0] - a[0])
    .slice(0, left)
    .forEach(([, i]) => tenths[i]++)
  return Object.fromEntries(rows.map((r, i) => [r.key, tenths[i] / 10]))
}

/** Yüzdelerin toplamı %100 mü? (kayan nokta hatalarına karşı kuruş hassasiyetinde karşılaştırılır) */
export function sumsTo100(percents) {
  return Math.round(percents.reduce((s, p) => s + p, 0) * 100) === 10000
}

/** Bundan küçük farklar işlem sayılmaz: toplam portföyün binde biri (en az ₺1). Yuvarlama gürültüsünü eler. */
export function minMove(total) {
  return Math.max(1, total * 0.001)
}

/**
 * Planın kalbi.
 *   Hedef  = Toplam portföy × hedef yüzde / 100
 *   Delta  = Hedef − bugünkü değer      (< 0 satılacak, > 0 alınacak)
 *   Adım   = |Delta| / N                (her adımda aynı tutar)
 * Hedef yüzdeler %100 ettiği için satılanların toplamı alınanların toplamına eşittir: plan dışarıdan para gerektirmez.
 */
export function buildPlan(rows, targets, steps) {
  const total = rows.reduce((s, r) => s + r.value, 0)
  let moves = rows
    .map((r) => {
      const targetPct = targets[r.key] ?? 0
      return { row: r, targetPct, delta: (total * targetPct) / 100 - r.value }
    })
    .filter((m) => Math.abs(m.delta) >= minMove(total))

  // Nakit dengesi: atılan küçük farklar (dokunulmayan satırların yuvarlama artıkları) yüzünden satışların toplamı
  // alışlarınkinden birkaç yüz lira sapabilir. Büyük taraf küçük tarafa eşitlenir; böylece plan ne dışarıdan para ister
  // ne de elde nakit bırakır. Sapma en fazla toplamın binde biri mertebesindedir.
  const sold = moves.filter((m) => m.delta < 0).reduce((s, m) => s - m.delta, 0)
  const bought = moves.filter((m) => m.delta > 0).reduce((s, m) => s + m.delta, 0)
  if (sold > 0 && bought > 0 && sold !== bought) {
    const scaleSide = bought > sold ? 1 : -1 // küçültülecek taraf: alışlar (1) ya da satışlar (-1)
    const factor = Math.min(sold, bought) / Math.max(sold, bought)
    moves = moves.map((m) => (Math.sign(m.delta) === scaleSide ? { ...m, delta: m.delta * factor } : m))
  }

  const full = moves.map(({ row: r, targetPct, delta }) => {
    const step = Math.abs(delta) / steps
    return {
      key: r.key,
      typeId: r.typeId ?? null, // ad ve birim ekranda bu kimlikten, seçili dile göre yazılır
      label: r.label,
      color: r.color,
      amountMode: r.amountMode,
      unit: r.unit,
      current: r.value,
      targetPct,
      delta,
      step,
      qty: r.price ? step / r.price : null,
    }
  })
  const byAbs = (a, b) => Math.abs(b.delta) - Math.abs(a.delta)
  return {
    total,
    sells: full.filter((m) => m.delta < 0).sort(byAbs),
    buys: full.filter((m) => m.delta > 0).sort(byAbs),
  }
}

/** i. adımın tarihi (0'dan başlar): haftalıkta 7'şer gün, aylıkta 1'er ay sonrası. "2026-11-06" biçiminde. */
export function stepDate(start, i, period) {
  const [y, m, d] = start.split('-').map(Number)
  const date = period === 'hafta' ? new Date(y, m - 1, d + 7 * i) : new Date(y, m - 1 + i, d)
  // Ay sonu taşması (31 Ocak + 1 ay = 3 Mart) olmasın: hedef ayın son gününe çek
  if (period !== 'hafta' && date.getDate() !== d) date.setDate(0)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Adet/gram karşılığını okunur yuvarla: 1234,6 → 1235; 24,04 → 24; 3,617 → 3,6; 0,01234 → 0,012 */
export function roundQty(q) {
  if (q >= 100) return Math.round(q)
  if (q >= 1) return Math.round(q * 10) / 10
  return Math.round(q * 1000) / 1000
}

/** LocalStorage'dan okunan plan bozuk değil mi? */
export function isValidPlan(p) {
  return Boolean(
    p &&
      typeof p.createdAt === 'string' &&
      STEP_OPTIONS.includes(p.steps) &&
      Array.isArray(p.sells) &&
      Array.isArray(p.buys) &&
      Array.isArray(p.done) &&
      p.done.length === p.steps &&
      Array.isArray(p.extras) &&
      p.targets &&
      typeof p.targets === 'object',
  )
}
