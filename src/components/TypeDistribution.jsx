import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { getType } from '../lib/constants'
import { formatCompactTL, formatShare, formatTL } from '../lib/format'
import { t } from '../lib/i18n'
import { usePref } from '../lib/prefs'
import { chartColors } from '../lib/theme'

// "Türe göre dağılım" kartı. Sağ üstteki seçiciyle çubuk veya pasta görünümü seçilir (seçim hatırlanır).
// İki görünümde de altta her türün adı, tutarı ve yüzdesi listelenir; kesin rakamlar oradan okunur.
export default function TypeDistribution({ rows, subtitle, className }) {
  const [view, setView] = usePref('capitrack:typeView', 'bar')
  // Üzerine gelinen tür. Pasta ile liste bunu paylaşır: birinde bir türe gelince diğerinde de öne çıkar.
  const [activeKey, setActiveKey] = useState(null)
  const total = rows.reduce((s, r) => s + r.value, 0)
  const views = [
    ['bar', t('Çubuk', 'Bar')],
    ['pie', t('Pasta', 'Pie')],
  ]

  return (
    <section className={className}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{t('Türe göre dağılım', 'Allocation by type')}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium" role="group" aria-label={t('Görünüm', 'View')}>
          {views.map(([id, label]) => (
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

      <div className="mt-4">
        {view === 'pie' ? (
          <Donut rows={rows} total={total} activeKey={activeKey} onActive={setActiveKey} />
        ) : (
          <SegmentedBar rows={rows} />
        )}
      </div>

      <ul className="mt-4 space-y-0.5" onMouseLeave={() => setActiveKey(null)}>
        {rows.map((r) => {
          const t = getType(r.key)
          return (
            <li
              key={r.key}
              onMouseEnter={() => setActiveKey(r.key)}
              className={`-mx-2 flex items-center gap-3 rounded-md px-2 py-1 text-sm transition-colors ${
                activeKey === r.key ? 'bg-slate-100' : ''
              }`}
            >
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
    <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={t('Türe göre dağılım çubuğu', 'Allocation by type bar')}>
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

// Ortası boş pasta (halka) grafik.
// Ayrı bir ipucu kutusu açmak yerine halkanın ortası değişir: normalde toplam yazar, bir dilimin üzerine
// gelince (telefonda dokununca) o türün adı, tutarı ve yüzdesi yazar. Böylece yazılar asla üst üste binmez.
function Donut({ rows, total, activeKey, onActive }) {
  const active = rows.find((r) => r.key === activeKey)
  const t = active && getType(active.key)

  return (
    <div className="relative h-52" onMouseLeave={() => onActive(null)}>
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
            stroke={chartColors().surface} // dilimler arası boşluk: kart zemini rengi (karanlık temada koyu)
            strokeWidth={2}
            isAnimationActive={false}
            onMouseEnter={(_, index) => onActive(rows[index]?.key ?? null)}
            onClick={(_, index) => onActive(rows[index]?.key ?? null)}
          >
            {rows.map((r) => (
              <Cell
                key={r.key}
                fill={getType(r.key).color}
                // Bir dilim seçiliyken diğerleri soluklaşır
                fillOpacity={activeKey && activeKey !== r.key ? 0.35 : 1}
                style={{ cursor: 'pointer', transition: 'fill-opacity 150ms' }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Halkanın ortası. pointer-events-none: fare bu yazının değil, alttaki grafiğin üzerinde sayılsın */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {active ? (
          <>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: t.color }} />
              {t.label}
            </span>
            <span className="text-lg font-bold tabular-nums">{formatTL(active.value)}</span>
            <span className="text-xs font-medium tabular-nums text-slate-600">{formatShare(active.share)}</span>
          </>
        ) : (
          <>
            <span className="text-xs text-slate-500">{t('Toplam', 'Total')}</span>
            <span className="text-lg font-bold">{formatCompactTL(total)}</span>
          </>
        )}
      </div>
    </div>
  )
}
