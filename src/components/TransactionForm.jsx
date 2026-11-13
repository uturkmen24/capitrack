import { useState } from 'react'
import TradeFields from './TradeFields'
import { getType } from '../lib/constants'
import { assetCurrency, isCurrencyAsset } from '../lib/currency'
import { formatPrice, formatQty, formatSignedTL, formatTL, parseAmount } from '../lib/format'
import { t } from '../lib/i18n'
import { emptyTrade, readTrade } from '../lib/trade'

// "Al / Sat" (mevduatta "Yatır / Çek") formu.
// state: varlığın bugünkü durumu (adet, ortalama maliyet, son fiyat…)
// onSubmit(tx): işlemi kaydeder; sorun varsa (ör. elde olandan fazla satış) hata metni döner.
// rawPrice: döviz cinsinden varlıkta son fiyat kendi para birimiyle (form bununla dolu gelir).
export default function TransactionForm({ asset, state, rawPrice, onSubmit, onCancel }) {
  const type = getType(asset.type)
  const amountMode = type.mode === 'amount'
  const currency = amountMode ? 'TRY' : assetCurrency(asset)
  const currencyAsset = isCurrencyAsset(asset)
  const [kind, setKind] = useState('buy')
  const [trade, setTrade] = useState(emptyTrade(amountMode || currencyAsset ? null : currency === 'TRY' ? state?.price : rawPrice))
  const [error, setError] = useState('')
  const labels = amountMode
    ? { buy: t('Para yatır', 'Deposit'), sell: t('Para çek', 'Withdraw') }
    : { buy: t('Alış', 'Buy'), sell: t('Satış', 'Sell') }
  const saveLabels = amountMode
    ? { buy: t('Para yatır kaydet', 'Save deposit'), sell: t('Para çek kaydet', 'Save withdrawal') }
    : { buy: t('Alış kaydet', 'Save purchase'), sell: t('Satış kaydet', 'Save sale') }

  // Satışta tahmini gerçekleşen kâr/zarar: (satış fiyatı − ortalama maliyet) × adet
  // Döviz cinsinden varlıkta satış fiyatı önce o günün kuruyla TL'ye çevrilir (ortalama maliyet TL'dir).
  const q = parseAmount(trade.quantity)
  const rate = currency === 'TRY' ? 1 : parseAmount(trade.fxText)
  const p = (currencyAsset ? 1 : parseAmount(trade.price)) * rate
  const estimate = kind === 'sell' && !amountMode && state?.qty > 0 && q > 0 && p > 0 ? (p - state.avg) * Math.min(q, state.qty) : null

  function handleSubmit(e) {
    e.preventDefault()
    const r = readTrade(trade, kind, amountMode, { currency, currencyAsset })
    if (r.error) return setError(r.error)
    const problem = onSubmit({ assetId: asset.id, ...r.tx })
    if (problem) setError(problem)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 px-5 py-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex rounded-lg bg-white p-0.5 text-sm font-medium shadow-sm ring-1 ring-slate-200"
          role="group"
          aria-label={t('İşlem türü', 'Transaction type')}
        >
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
                kind === k
                  ? k === 'buy'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-white dark:bg-slate-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {labels[k]}
            </button>
          ))}
        </div>
        {state && (
          <p className="text-xs text-slate-500">
            {amountMode
              ? `${t('Bakiye', 'Balance')}: ${formatTL(state.value)} · ${t('Yatırılan', 'Deposited')}: ${formatTL(state.cost)}`
              : `${t('Elde', 'Held')}: ${formatQty(state.qty)} ${currencyAsset ? currency : type.unit} · ${
                  currencyAsset ? t('Ort. kur', 'Avg. rate') : t('Ort. maliyet', 'Avg. cost')
                }: ${state.qty > 0 ? formatPrice(state.avg) : '—'}`}
          </p>
        )}
      </div>

      <TradeFields type={type} currency={currency} currencyAsset={currencyAsset} value={trade} onChange={setTrade} />

      {estimate !== null && (
        <p className="mt-3 text-sm text-slate-600">
          {t('Tahmini gerçekleşen kâr/zarar', 'Estimated realized profit/loss')}:{' '}
          <strong className={estimate >= 0 ? 'text-emerald-700' : 'text-red-600'}>{formatSignedTL(estimate)}</strong>
          <span className="text-slate-400">
            {' '}
            {t('(ortalama maliyet değişmez, sadece adet azalır)', '(average cost stays the same, only the quantity goes down)')}
          </span>
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
          {t('Vazgeç', 'Cancel')}
        </button>
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          {saveLabels[kind]}
        </button>
      </div>
    </form>
  )
}
