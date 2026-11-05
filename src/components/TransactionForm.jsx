import { useState } from 'react'
import TradeFields from './TradeFields'
import { getType } from '../lib/constants'
import { formatPrice, formatQty, formatSignedTL, formatTL, parseAmount } from '../lib/format'
import { emptyTrade, readTrade } from '../lib/trade'

// "Al / Sat" (mevduatta "Yatır / Çek") formu.
// state: varlığın bugünkü durumu (adet, ortalama maliyet, son fiyat…)
// onSubmit(tx): işlemi kaydeder; sorun varsa (ör. elde olandan fazla satış) hata metni döner.
export default function TransactionForm({ asset, state, onSubmit, onCancel }) {
  const type = getType(asset.type)
  const amountMode = type.mode === 'amount'
  const [kind, setKind] = useState('buy')
  const [trade, setTrade] = useState(emptyTrade(amountMode ? null : state?.price))
  const [error, setError] = useState('')
  const labels = amountMode ? { buy: 'Para yatır', sell: 'Para çek' } : { buy: 'Alış', sell: 'Satış' }

  // Satışta tahmini gerçekleşen kâr/zarar: (satış fiyatı − ortalama maliyet) × adet
  const q = parseAmount(trade.quantity)
  const p = parseAmount(trade.price)
  const estimate = kind === 'sell' && !amountMode && state?.qty > 0 && q > 0 && p > 0 ? (p - state.avg) * Math.min(q, state.qty) : null

  function handleSubmit(e) {
    e.preventDefault()
    const r = readTrade(trade, kind, amountMode)
    if (r.error) return setError(r.error)
    const problem = onSubmit({ assetId: asset.id, ...r.tx })
    if (problem) setError(problem)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 px-5 py-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg bg-white p-0.5 text-sm font-medium shadow-sm ring-1 ring-slate-200" role="group" aria-label="İşlem türü">
          {['buy', 'sell'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k)
                setError('')
              }}
              aria-pressed={kind === k}
              className={`rounded-md px-3 py-1.5 ${
                kind === k ? (k === 'buy' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white') : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {labels[k]}
            </button>
          ))}
        </div>
        {state && (
          <p className="text-xs text-slate-500">
            {amountMode
              ? `Bakiye: ${formatTL(state.value)} · Yatırılan: ${formatTL(state.cost)}`
              : `Elde: ${formatQty(state.qty)} ${type.unit} · Ort. maliyet: ${state.qty > 0 ? formatPrice(state.avg) : '—'}`}
          </p>
        )}
      </div>

      <TradeFields type={type} value={trade} onChange={setTrade} />

      {estimate !== null && (
        <p className="mt-3 text-sm text-slate-600">
          Tahmini gerçekleşen kâr/zarar:{' '}
          <strong className={estimate >= 0 ? 'text-emerald-700' : 'text-red-600'}>{formatSignedTL(estimate)}</strong>
          <span className="text-slate-400"> (ortalama maliyet değişmez, sadece adet azalır)</span>
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
          Vazgeç
        </button>
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          {labels[kind]} kaydet
        </button>
      </div>
    </form>
  )
}
