import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getType } from '../lib/constants'
import { breakdown, timeline } from '../lib/analytics'
import { createDemoData } from '../lib/demoData'
import { formatMonth, formatMonthShort, formatPercent, formatSignedTL, formatTL } from '../lib/format'

// Grafiklerin ortak "çerçeve" renkleri: ızgara, eksen, eksen yazıları. Veri öne çıksın diye soluk.
const GRID = '#e1e0d9'
const AXIS = '#c3c2b7'
const MUTED = '#898781'
const LINE = '#059669' // CapiTrack yeşili

const compactTL = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'

// "Panel" ekranı: toplam varlık, zaman içindeki değişim ve dağılımlar.
export default function Dashboard({ portfolio, goTo }) {
  const { data } = portfolio
  const series = timeline(data)

  if (data.assets.length === 0 || series.length === 0) {
    const noAssets = data.assets.length === 0
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-medium">{noAssets ? 'CapiTrack’e hoş geldin' : 'Henüz değer girilmedi'}</p>
        <p className="mt-1 text-sm text-slate-500">
          {noAssets
            ? 'Başlamak için yatırımlarını ekle. Panel, girdiğin değerlerden otomatik oluşur.'
            : 'Varlıklarının bu ayki değerlerini girdiğinde grafikler burada belirecek.'}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => goTo(noAssets ? 'varliklar' : 'guncelleme')}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {noAssets ? 'Varlık ekle' : 'Aylık güncellemeye git'}
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
  const first = series[0]
  const byType = breakdown(data, last.month, (a) => a.type)
  const byInstitution = breakdown(data, last.month, (a) => a.institution || 'Belirtilmemiş')

  return (
    <div className="space-y-4">
      {/* Üst özet kartları */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`${card} sm:col-span-1`}>
          <p className="text-sm text-slate-500">Toplam varlık</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{formatTL(last.total)}</p>
          <p className="mt-1 text-xs text-slate-500">Son güncelleme: {formatMonth(last.month)}</p>
        </div>
        <ChangeTile
          title="Geçen aya göre"
          from={prev?.total}
          to={last.total}
          note={prev ? `${formatMonth(prev.month)} → ${formatMonth(last.month)}` : 'En az 2 aylık veri gerekiyor'}
        />
        <ChangeTile
          title="Başlangıçtan beri"
          from={series.length > 1 ? first.total : undefined}
          to={last.total}
          note={series.length > 1 ? `${formatMonth(first.month)}’dan bu yana` : 'En az 2 aylık veri gerekiyor'}
        />
      </div>

      {/* Zaman içinde toplam değer */}
      <section className={card}>
        <h3 className="font-semibold">Toplam değer</h3>
        <p className="mb-4 text-sm text-slate-500">Aylara göre tüm varlıklarının toplamı</p>
        {series.length < 2 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Grafik, en az iki aylık veri girdiğinde oluşur. Geçmiş ayları “Aylık Güncelleme” ekranından girebilirsin.
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
                  tickFormatter={(v) => compactTL.format(v)}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: MUTED, fontSize: 12 }}
                  width={72}
                />
                <Tooltip content={<TotalTooltip series={series} />} cursor={{ stroke: AXIS }} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={LINE}
                  strokeWidth={2}
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
        <section className={card}>
          <h3 className="font-semibold">Türe göre dağılım</h3>
          <p className="mb-4 text-sm text-slate-500">{formatMonth(last.month)}</p>
          <TypeSplit rows={byType} />
        </section>

        <section className={card}>
          <h3 className="font-semibold">Kuruma göre dağılım</h3>
          <p className="mb-4 text-sm text-slate-500">{formatMonth(last.month)}</p>
          <RankedBars rows={byInstitution} />
        </section>
      </div>
    </div>
  )
}

// Değişim kartı: tutar + yüzde. Yön sadece renkle değil ▲/▼ işaretiyle de gösterilir.
function ChangeTile({ title, from, to, note }) {
  const has = from != null
  const diff = has ? to - from : 0
  const up = diff >= 0
  return (
    <div className={card}>
      <p className="text-sm text-slate-500">{title}</p>
      {has ? (
        <>
          <p className={`mt-1 text-2xl font-bold ${up ? 'text-emerald-700' : 'text-red-600'}`}>
            {up ? '▲' : '▼'} {formatSignedTL(diff)}
          </p>
          {from > 0 && (
            <p className={`text-sm font-medium ${up ? 'text-emerald-700' : 'text-red-600'}`}>{formatPercent(diff / from)}</p>
          )}
        </>
      ) : (
        <p className="mt-1 text-2xl font-bold text-slate-300">—</p>
      )}
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  )
}

// Çizgi grafiğin üzerine gelince açılan bilgi kutusu.
function TotalTooltip({ active, payload, series }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const i = series.findIndex((s) => s.month === point.month)
  const before = i > 0 ? series[i - 1] : null
  const diff = before ? point.total - before.total : null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="text-xs text-slate-500">{formatMonth(point.month)}</p>
      <p className="font-semibold tabular-nums">{formatTL(point.total)}</p>
      {diff !== null && (
        <p className="text-xs tabular-nums text-slate-600">
          {diff >= 0 ? '▲' : '▼'} {formatSignedTL(diff)}
          {before.total > 0 && ` (${formatPercent(diff / before.total)})`}
        </p>
      )}
    </div>
  )
}

// Türe göre dağılım: üstte tek bir bölümlü çubuk (bütünün nasıl bölündüğü),
// altında her türün adı, tutarı ve yüzdesi (kesin rakamlar).
function TypeSplit({ rows }) {
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Türe göre dağılım çubuğu">
        {rows.map((r) => {
          const t = getType(r.key)
          return (
            <div
              key={r.key}
              style={{ width: `${r.share * 100}%`, background: t.color }}
              title={`${t.label}: ${formatTL(r.value)} (%${(r.share * 100).toFixed(1)})`}
              className="min-w-[3px] transition-opacity hover:opacity-80"
            />
          )
        })}
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map((r) => {
          const t = getType(r.key)
          return (
            <li key={r.key} className="flex items-center gap-3 text-sm">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: t.color }} />
              <span className="flex-1">{t.label}</span>
              <span className="tabular-nums text-slate-600">{formatTL(r.value)}</span>
              <span className="w-14 text-right font-medium tabular-nums">%{(r.share * 100).toFixed(1)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Kuruma göre dağılım: büyükten küçüğe sıralı yatay çubuklar, tek renk.
function RankedBars({ rows }) {
  const max = rows[0]?.value ?? 1
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} title={`${r.key}: ${formatTL(r.value)} (%${(r.share * 100).toFixed(1)})`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{r.key}</span>
            <span className="shrink-0 tabular-nums text-slate-600">
              {formatTL(r.value)} <span className="font-medium text-slate-800">· %{(r.share * 100).toFixed(1)}</span>
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
