import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { getType } from '../lib/constants'
import { formatCompactTL, formatShare, formatTL } from '../lib/format'
import { usePref } from '../lib/prefs'

const VIEWS = [
  ['bar', 'Çubuk'],
  ['pie', 'Pasta'],
]

// "Türe göre dağılım" kartı. Sağ üstteki seçiciyle çubuk veya pasta görünümü seçilir (seçim hatırlanır).
// İki görünümde de altta her türün adı, tutarı ve yüzdesi listelenir; kesin rakamlar oradan okunur.
export default function TypeDistribution({ rows, subtitle, className }) {
  const [view, setView] = usePref('capitrack:typeView', 'bar')
  const total = rows.reduce((s, r) => s + r.value, 0)

  return (
    <section className={className}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Türe göre dağılım</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium" role="group" aria-label="Görünüm">
          {VIEWS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              aria-pressed={view === id}
              className={`rounded-md px-2.5 py-1 ${view === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">{view === 'pie' ? <Donut rows={rows} total={total} /> : <SegmentedBar rows={rows} />}</div>

      <ul className="mt-4 space-y-2">
        {rows.map((r) => {
          const t = getType(r.key)
          return (
            <li key={r.key} className="flex items-center gap-3 text-sm">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: t.color }} />
              <span className="flex-1">{t.label}</span>
              <span className="tabular-nums text-slate-600">{formatTL(r.value)}</span>
              <span className="w-14 text-right font-medium tabular-nums">{formatShare(r.share)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// Tek bir çubuk, türlere bölünmüş. Dilimler arasında 2px boşluk var ki komşu renkler birbirine karışmasın.
function SegmentedBar({ rows }) {
  return (
    <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Türe göre dağılım çubuğu">
      {rows.map((r) => {
        const t = getType(r.key)
        return (
          <div
            key={r.key}
            style={{ width: `${r.share * 100}%`, background: t.color }}
            title={`${t.label}: ${formatTL(r.value)} (${formatShare(r.share)})`}
            className="min-w-[3px] transition-opacity hover:opacity-80"
          />
        )
      })}
    </div>
  )
}

// Ortası boş pasta (halka) grafik. Ortada toplam tutar yazar; dilimin üzerine gelince ayrıntı çıkar.
function Donut({ rows, total }) {
  return (
    <div className="relative h-52">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="key"
            innerRadius="62%"
            outerRadius="95%"
            startAngle={90}
            endAngle={-270}
            stroke="#ffffff"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {rows.map((r) => (
              <Cell key={r.key} fill={getType(r.key).color} />
            ))}
          </Pie>
          <Tooltip content={<SliceTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Halkanın ortasındaki toplam. pointer-events-none: üzerine gelince grafiğin ipucunu engellemesin */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-slate-500">Toplam</span>
        <span className="text-lg font-bold">{formatCompactTL(total)}</span>
      </div>
    </div>
  )
}

function SliceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  const t = getType(r.key)
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: t.color }} />
        {t.label}
      </p>
      <p className="font-semibold tabular-nums">{formatTL(r.value)}</p>
      <p className="text-xs tabular-nums text-slate-600">{formatShare(r.share)}</p>
    </div>
  )
}
