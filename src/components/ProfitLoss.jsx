import { formatPercent, formatSignedTL } from '../lib/format'

// Kâr / zarar gösterimi: "▲ +₺7.900 (+%11,3)". Yön sadece renkle değil ▲/▼ işaretiyle de anlatılır.
// value: güncel değer, cost: kalan maliyet.
export default function ProfitLoss({ value, cost, className = '', showAmount = true }) {
  const pl = value - cost
  if (cost <= 0 && Math.abs(pl) < 0.5) return <span className={`text-slate-400 ${className}`}>—</span>
  const pct = cost > 0 ? pl / cost : null
  const color = pl > 0.5 ? 'text-emerald-700' : pl < -0.5 ? 'text-red-600' : 'text-slate-500'
  const arrow = pl > 0.5 ? '▲' : pl < -0.5 ? '▼' : ''
  return (
    <span className={`tabular-nums ${color} ${className}`}>
      {arrow} {showAmount && formatSignedTL(pl)}
      {pct !== null && (showAmount ? ` (${formatPercent(pct)})` : formatPercent(pct))}
    </span>
  )
}
