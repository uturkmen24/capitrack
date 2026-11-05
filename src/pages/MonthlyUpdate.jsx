import { useState } from 'react'
import TypeBadge from '../components/TypeBadge'
import {
  amountsHidden,
  amountToInput,
  currentMonth,
  formatMonth,
  formatPercent,
  formatSignedTL,
  formatTL,
  parseAmount,
  shiftMonth,
} from '../lib/format'
import { latestValue } from '../lib/usePortfolio'

const inputClass =
  'w-36 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-sm tabular-nums outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

// "Aylık Güncelleme" ekranı: bir ay seç, tüm varlıklarının o ayki değerini tek seferde gir.
export default function MonthlyUpdate({ portfolio, goToAssets }) {
  const { data, saveMonth } = portfolio
  const [month, setMonth] = useState(currentMonth())
  const isCurrent = month === currentMonth()

  if (data.assets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-medium">Önce varlık eklemelisin</p>
        <p className="mt-1 text-sm text-slate-500">Aylık değer girmek için en az bir varlığın olmalı.</p>
        <button
          onClick={goToAssets}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Varlıklarıma git
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Aylık Güncelleme</h2>
          <p className="text-sm text-slate-500">
            Her varlığın o ayki toplam değerini yaz. Boş bırakılan varlık son bilinen değeriyle sayılır; elden
            çıkardığın bir varlık için 0 yaz.
          </p>
        </div>

        {/* Ay seçici: oklarla önceki/sonraki aya geç. Gelecek aylara gidilemez. */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="Önceki ay"
          >
            ‹
          </button>
          <span className="w-32 text-center text-sm font-medium">{formatMonth(month)}</span>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={isCurrent}
            className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Sonraki ay"
          >
            ›
          </button>
        </div>
      </div>

      {/* key={month}: ay değişince form sıfırdan, o ayın verisiyle açılır */}
      <MonthForm key={month} month={month} data={data} onSave={saveMonth} />
    </div>
  )
}

function MonthForm({ month, data, onSave }) {
  // Form ilk açıldığında her varlık için: o ayın kaydı varsa onu, yoksa önceki ayın değerini doldur.
  const [inputs, setInputs] = useState(() => {
    const initial = {}
    for (const a of data.assets) {
      const own = data.records[month]?.[a.id]?.value
      const prev = latestValue(data.records, a.id, month)?.value
      initial[a.id] = amountToInput(own ?? prev)
    }
    return initial
  })
  const [message, setMessage] = useState(null) // { ok: true/false, text }

  const hasSavedRecords = Boolean(data.records[month])
  const parsed = Object.fromEntries(Object.entries(inputs).map(([id, v]) => [id, parseAmount(v)]))
  const invalid = Object.values(parsed).some((v) => Number.isNaN(v))

  const total = Object.values(parsed).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0)
  const prevTotal = data.assets.reduce(
    (sum, a) => sum + (latestValue(data.records, a.id, month)?.value ?? 0),
    0,
  )

  function handleSubmit(e) {
    e.preventDefault()
    if (invalid) {
      setMessage({ ok: false, text: 'Kırmızı işaretli alanlara geçerli bir sayı yaz.' })
      return
    }
    onSave(month, parsed)
    setMessage({ ok: true, text: `${formatMonth(month)} kaydedildi.` })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!hasSavedRecords && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Bu ay için henüz kayıt yok. Alanlar bir önceki ayın değerleriyle dolduruldu; değişenleri düzeltip kaydet.
        </p>
      )}

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {data.assets.map((a) => {
          const prev = latestValue(data.records, a.id, month)
          const now = parsed[a.id]
          const bad = Number.isNaN(now)
          const diff = prev && Number.isFinite(now) ? now - prev.value : null
          return (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{a.name}</span>
                  <TypeBadge type={a.type} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {a.institution || '—'}
                  {prev && ` · ${formatMonth(prev.month)}: ${formatTL(prev.value)}`}
                </p>
              </div>

              {/* Önceki aya göre değişim: yazdıkça anlık hesaplanır */}
              {diff !== null && diff !== 0 && (
                <span className={`text-xs font-medium tabular-nums ${diff > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatSignedTL(diff)}
                  {prev.value > 0 && ` (${formatPercent(diff / prev.value)})`}
                </span>
              )}

              <input
                className={`${inputClass} ${bad ? 'border-red-400 ring-2 ring-red-400/20' : ''} ${
                  amountsHidden() ? 'blur-sm focus:blur-none' : ''
                }`}
                value={inputs[a.id] ?? ''}
                onChange={(e) => {
                  setInputs({ ...inputs, [a.id]: e.target.value })
                  setMessage(null)
                }}
                placeholder="—"
                inputMode="decimal"
                aria-label={`${a.name} değeri`}
              />
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm text-slate-500">{formatMonth(month)} toplamı</p>
          <p className="text-2xl font-bold tabular-nums">{formatTL(total)}</p>
          {prevTotal > 0 && (
            <p className={`text-sm font-medium tabular-nums ${total >= prevTotal ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatSignedTL(total - prevTotal)} ({formatPercent((total - prevTotal) / prevTotal)}) önceki aya göre
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-sm ${message.ok ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</span>
          )}
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Kaydet
          </button>
        </div>
      </div>
    </form>
  )
}
