import { useState } from 'react'
import AssetGroup, { SingleList } from '../components/AssetGroup'
import ProfitLoss from '../components/ProfitLoss'
import TypeBadge from '../components/TypeBadge'
import { assetStateAt, isHeld } from '../lib/analytics'
import { getType, splitByType } from '../lib/constants'
import {
  amountsHidden,
  amountToInput,
  currentMonth,
  formatMonth,
  formatPercent,
  formatQty,
  formatSignedTL,
  formatTL,
  parseAmount,
  shiftMonth,
} from '../lib/format'
import { usePref } from '../lib/prefs'

const inputClass =
  'w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-sm tabular-nums outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

// "Aylık Güncelleme" ekranı: bir ay seç, o ay elinde olan varlıkların fiyatlarını (mevduatta bakiyesini) gir.
// Değer = adet × fiyat otomatik hesaplanır. Adetler Varlıklarım'daki alış/satış işlemlerinden gelir.
export default function MonthlyUpdate({ portfolio, goToAssets }) {
  const { data, saveMonth } = portfolio
  const [month, setMonth] = useState(currentMonth())
  const isCurrent = month === currentMonth()

  if (data.transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-medium">Önce bir alış eklemelisin</p>
        <p className="mt-1 text-sm text-slate-500">
          Aylık fiyat girebilmek için Varlıklarım ekranında en az bir varlığın ve alış işleminin olması gerekiyor.
        </p>
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
            Her varlığın ay sonundaki birim fiyatını (mevduatta bakiyesini) yaz. Adetler alış/satış işlemlerinden gelir.
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
  const [collapsed, setCollapsed] = usePref('capitrack:collapsed:monthly', [])

  // O ay elinde olan varlıklar ve o ayki durumları
  const rows = data.assets
    .map((asset) => ({
      asset,
      type: getType(asset.type),
      state: assetStateAt(data, asset, month),
      prev: assetStateAt(data, asset, shiftMonth(month, -1)),
    }))
    .filter((r) => isHeld(r.state))

  // Form ilk açıldığında: o ay girilmiş fiyat varsa o, yoksa son bilinen fiyat / bakiye
  const [inputs, setInputs] = useState(() =>
    Object.fromEntries(
      rows.map((r) => [r.asset.id, amountToInput(r.type.mode === 'amount' ? r.state.value : r.state.price)]),
    ),
  )
  const [message, setMessage] = useState(null) // { ok: true/false, text }

  const hasSavedPrices = Boolean(data.prices[month])
  const parsed = Object.fromEntries(Object.entries(inputs).map(([id, v]) => [id, parseAmount(v)]))
  const invalid = Object.values(parsed).some((v) => Number.isNaN(v))

  /** Formdaki fiyata göre o ayki değer (fiyat boşsa son bilinen değer) */
  function liveValue(r) {
    const v = parsed[r.asset.id]
    if (!Number.isFinite(v)) return r.state.value
    return r.type.mode === 'amount' ? v : r.state.qty * v
  }

  const total = rows.reduce((s, r) => s + liveValue(r), 0)
  const prevTotal = data.assets.reduce((s, a) => s + (assetStateAt(data, a, shiftMonth(month, -1))?.value ?? 0), 0)
  const flow = rows.reduce((s, r) => s + r.state.flow, 0)
  const monthReturn = total - prevTotal - flow // yeni eklenen para getiri sayılmaz

  function handleSubmit(e) {
    e.preventDefault()
    if (invalid) {
      setMessage({ ok: false, text: 'Kırmızı işaretli alanlara geçerli bir sayı yaz.' })
      return
    }
    onSave(month, parsed)
    setMessage({ ok: true, text: `${formatMonth(month)} kaydedildi.` })
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        {formatMonth(month)} ayında elinde bir varlık görünmüyor (henüz alınmamış veya tamamen satılmış).
      </p>
    )
  }

  const toggle = (typeId) =>
    setCollapsed(collapsed.includes(typeId) ? collapsed.filter((x) => x !== typeId) : [...collapsed, typeId])

  // Aynı türden birden fazla varlık varsa grup (üstte), türünde tek olanlar düz liste (altta)
  const { groups, singles } = splitByType(rows, (r) => r.asset.type)

  const renderRow = (r, showType) => (
    <MonthRow
      key={r.asset.id}
      row={r}
      showType={showType}
      input={inputs[r.asset.id] ?? ''}
      parsedValue={parsed[r.asset.id]}
      value={liveValue(r)}
      onChange={(v) => {
        setInputs({ ...inputs, [r.asset.id]: v })
        setMessage(null)
      }}
    />
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!hasSavedPrices && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Bu ay için henüz fiyat girilmedi. Alanlar son bilinen fiyatlarla dolduruldu; değişenleri düzeltip kaydet.
        </p>
      )}

      {groups.map(({ type, items }) => (
        <AssetGroup
          key={type.id}
          type={type}
          count={items.length}
          value={items.reduce((s, r) => s + liveValue(r), 0)}
          cost={items.reduce((s, r) => s + r.state.cost, 0)}
          collapsed={collapsed.includes(type.id)}
          onToggle={() => toggle(type.id)}
        >
          {items.map((r) => renderRow(r, false))}
        </AssetGroup>
      ))}

      {singles.length > 0 && <SingleList>{singles.map((r) => renderRow(r, true))}</SingleList>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm text-slate-500">{formatMonth(month)} toplamı</p>
          <p className="text-2xl font-bold tabular-nums">{formatTL(total)}</p>
          {prevTotal > 0 && (
            <p className={`text-sm font-medium tabular-nums ${monthReturn >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {monthReturn >= 0 ? '▲' : '▼'} Bu ayki getiri: {formatSignedTL(monthReturn)} ({formatPercent(monthReturn / prevTotal)})
            </p>
          )}
          {Math.abs(flow) > 0.5 && (
            <p className="text-xs text-slate-500">
              Bu ay {flow > 0 ? 'eklenen' : 'çekilen'} para: {formatTL(Math.abs(flow))} (getiriye dahil değil)
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {message && <span className={`text-sm ${message.ok ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</span>}
          <button type="submit" className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
            Kaydet
          </button>
        </div>
      </div>
    </form>
  )
}

// Tek bir varlığın aylık satırı: "250 adet × [312,00] = ₺78.000" veya "Bakiye [139.200]"
function MonthRow({ row, showType, input, parsedValue, value, onChange }) {
  const { asset, type, state, prev } = row
  const amountMode = type.mode === 'amount'
  const bad = Number.isNaN(parsedValue)
  const blur = amountsHidden() ? 'blur-sm focus:blur-none' : ''
  // Fiyatın geçen aya göre değişimi (sadece adetli varlıklarda)
  const priceChange =
    !amountMode && prev?.price > 0 && Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue / prev.price - 1 : null

  // Düzen: telefonda iki kat (üstte ad + değer, altta giriş), bilgisayarda tek satır (ad | giriş | değer).
  // "order" sınıfları, aynı parçaların ekran genişliğine göre farklı sırada dizilmesini sağlar.
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3 sm:grid-cols-[1fr_auto_auto]">
      <div className="order-1 min-w-0">
        <p className="flex min-w-0 items-center gap-2 font-medium">
          <span className="truncate">{asset.name}</span>
          {showType && <TypeBadge type={asset.type} />}
        </p>
        <p className="truncate text-xs text-slate-500">
          {asset.institution || '—'}
          {priceChange !== null && Math.abs(priceChange) > 0.0005 && (
            <span className={priceChange > 0 ? 'text-emerald-700' : 'text-red-600'}> · fiyat {formatPercent(priceChange)}</span>
          )}
        </p>
      </div>

      <div className="order-3 col-span-2 flex items-center gap-2 text-sm sm:order-2 sm:col-span-1 sm:justify-end">
        <span className="whitespace-nowrap tabular-nums text-slate-500">
          {amountMode ? 'Bakiye' : `${formatQty(state.qty)} ${type.unit} ×`}
        </span>
        <input
          className={`${inputClass} ${bad ? 'border-red-400 ring-2 ring-red-400/20' : ''} ${amountMode ? blur : ''}`}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          inputMode="decimal"
          aria-label={`${asset.name} ${amountMode ? 'bakiyesi' : type.priceLabel.toLowerCase()}`}
        />
      </div>

      <div className="order-2 whitespace-nowrap text-right sm:order-3 sm:min-w-36">
        <span className="block font-semibold tabular-nums">{formatTL(value)}</span>
        <ProfitLoss value={value} cost={state.cost} className="block text-xs font-medium" />
      </div>
    </div>
  )
}
