import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import BenchmarkCards from '../components/BenchmarkCards'
import GoalCard from '../components/GoalCard'
import TotalTile from '../components/TotalTile'
import TypeDistribution from '../components/TypeDistribution'
import { breakdown, timeline } from '../lib/analytics'
import { createDemoData } from '../lib/demoData'
import {
  formatCompactTL,
  formatMonth,
  formatMonthShort,
  formatPercent,
  formatShare,
  formatSignedTL,
  formatTL,
} from '../lib/format'

// Grafiklerin ortak "çerçeve" renkleri: ızgara, eksen, eksen yazıları. Veri öne çıksın diye soluk.
const GRID = '#e1e0d9'
const AXIS = '#c3c2b7'
const MUTED = '#898781'
const LINE = '#059669' // CapiTrack yeşili: toplam değer
const COST_LINE = '#94a3b8' // gri kesikli: maliyet (yatırılan para)

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'

// "Panel" ekranı: toplam varlık, hedef, zaman içindeki değişim ve dağılımlar.
export default function Dashboard({ portfolio, goTo }) {
  const { data, setGoal } = portfolio
  const series = timeline(data)

  if (data.assets.length === 0 || series.length === 0) {
    const noAssets = data.assets.length === 0
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-medium">{noAssets ? 'CapiTrack’e hoş geldin' : 'Henüz alış eklenmedi'}</p>
        <p className="mt-1 text-sm text-slate-500">
          {noAssets
            ? 'Başlamak için yatırımlarını ve alışlarını ekle. Panel, girdiğin bilgilerden otomatik oluşur.'
            : 'Varlıklarım ekranında “Al” ile ilk alışını eklediğinde grafikler burada belirecek.'}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => goTo('varliklar')}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {noAssets ? 'Varlık ekle' : 'Varlıklarıma git'}
          </button>
          {noAssets && (
            <button
              onClick={() => portfolio.replaceData(createDemoData())}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Örnek veriyle dene
            </button>
          )}
        </div>
      </div>
    )
  }

  const last = series[series.length - 1]
  const prev = series.length > 1 ? series[series.length - 2] : null
  const byType = breakdown(data, last.month, (a) => a.type)
  const byInstitution = breakdown(data, last.month, (a) => a.institution || 'Belirtilmemiş')

  // Bu ayki getiri: değerdeki artış − bu ay eklenen yeni para. Böylece yeni alım "kâr" gibi görünmez.
  const monthReturn = last.total - (prev?.total ?? 0) - last.flow
  const returnBase = prev?.total || last.flow // ilk ayda: yatırılan paraya göre

  return (
    <div className="space-y-4">
      {/* Üst özet kartları */}
      <div className="grid gap-4 sm:grid-cols-3">
        <TotalTile total={last.total} month={last.month} className={card} />
        <StatTile
          title="Bu ayki getiri"
          amount={monthReturn}
          ratio={returnBase > 0 ? monthReturn / returnBase : null}
          notes={[
            prev ? `${formatMonth(prev.month)} → ${formatMonth(last.month)}` : formatMonth(last.month),
            Math.abs(last.flow) > 0.5 &&
              `${last.flow > 0 ? 'Eklenen' : 'Çekilen'} ${formatTL(Math.abs(last.flow))} getiriye dahil değil`,
          ]}
        />
        <StatTile
          title="Kâr / Zarar"
          amount={last.total - last.cost}
          ratio={last.cost > 0 ? (last.total - last.cost) / last.cost : null}
          notes={[
            `Maliyet: ${formatTL(last.cost)}`,
            Math.abs(last.realized) > 0.5 && `Satışlardan gerçekleşen: ${formatSignedTL(last.realized)}`,
          ]}
        />
      </div>

      {/* Benchmark & fırsat maliyeti: enflasyona ve mevduata göre karşılaştırma */}
      <BenchmarkCards transactions={data.transactions} value={last.total} cardClass={card} />

      {/* Hedef */}
      <GoalCard goal={data.goal} current={last.total} onSave={setGoal} />

      {/* Zaman içinde toplam değer */}
      <section className={card}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Toplam değer ve maliyet</h3>
            <p className="text-sm text-slate-500">İki çizgi arasındaki fark kâr/zararındır</p>
          </div>
          {/* Açıklama (lejant): iki çizgi olduğu için hangisinin ne olduğu yazıyla da belirtilir */}
          <div className="flex gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ background: LINE }} /> Değer
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed" style={{ borderColor: COST_LINE }} /> Maliyet
            </span>
          </div>
        </div>
        {series.length < 2 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Grafik, en az iki aylık veri girdiğinde oluşur. Geçmiş ayları “Aylık Güncelleme” ekranından girebilirsin.
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 28, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthShort}
                  tickLine={false}
                  axisLine={{ stroke: AXIS }}
                  tick={{ fill: MUTED, fontSize: 12 }}
                  minTickGap={16}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatCompactTL(v)}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: MUTED, fontSize: 12 }}
                  width={72}
                />
                <Tooltip content={<TotalTooltip series={series} />} cursor={{ stroke: AXIS }} wrapperStyle={{ zIndex: 10 }} />
                <Line
                  type="linear"
                  dataKey="cost"
                  stroke={COST_LINE}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  isAnimationActive={false}
                  dot={false}
                  activeDot={{ r: 4, fill: COST_LINE, stroke: '#fff', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={LINE}
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={series.length <= 12 ? { r: 4, fill: LINE, stroke: '#fff', strokeWidth: 2 } : false}
                  activeDot={{ r: 6, fill: LINE, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Dağılımlar */}
      <div className="grid gap-4 md:grid-cols-2">
        <TypeDistribution rows={byType} subtitle={formatMonth(last.month)} className={card} />

        <section className={card}>
          <h3 className="font-semibold">Kuruma göre dağılım</h3>
          <p className="mb-4 text-sm text-slate-500">{formatMonth(last.month)}</p>
          <RankedBars rows={byInstitution} />
        </section>
      </div>
    </div>
  )
}

// Özet kartı: tutar + yüzde. Yön sadece renkle değil ▲/▼ işaretiyle de gösterilir.
function StatTile({ title, amount, ratio, notes }) {
  const up = amount >= 0
  const color = up ? 'text-emerald-700' : 'text-red-600'
  return (
    <div className={card}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>
        {up ? '▲' : '▼'} {formatSignedTL(amount)}
      </p>
      {ratio !== null && <p className={`text-sm font-medium ${color}`}>{formatPercent(ratio)}</p>}
      {notes.filter(Boolean).map((n) => (
        <p key={n} className="mt-1 text-xs text-slate-500">
          {n}
        </p>
      ))}
    </div>
  )
}

// Çizgi grafiğin üzerine gelince açılan bilgi kutusu: o ayın değeri, maliyeti ve getirisi.
function TotalTooltip({ active, payload, series }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const i = series.findIndex((s) => s.month === point.month)
  const before = i > 0 ? series[i - 1] : null
  const ret = before ? point.total - before.total - point.flow : null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="text-xs text-slate-500">{formatMonth(point.month)}</p>
      <p className="font-semibold tabular-nums">{formatTL(point.total)}</p>
      <p className="text-xs tabular-nums text-slate-500">Maliyet: {formatTL(point.cost)}</p>
      <p className="text-xs tabular-nums text-slate-600">
        K/Z: {formatSignedTL(point.total - point.cost)}
        {point.cost > 0 && ` (${formatPercent((point.total - point.cost) / point.cost)})`}
      </p>
      {ret !== null && (
        <p className="text-xs tabular-nums text-slate-600">
          Aylık getiri: {ret >= 0 ? '▲' : '▼'} {formatSignedTL(ret)}
        </p>
      )}
    </div>
  )
}

// Kuruma göre dağılım: büyükten küçüğe sıralı yatay çubuklar, tek renk.
function RankedBars({ rows }) {
  const max = rows[0]?.value ?? 1
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} title={`${r.key}: ${formatTL(r.value)} (${formatShare(r.share)})`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{r.key}</span>
            <span className="shrink-0 tabular-nums text-slate-600">
              {formatTL(r.value)} <span className="font-medium text-slate-800">· {formatShare(r.share)}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-slate-600" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
