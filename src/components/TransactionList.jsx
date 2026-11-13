import { getType } from '../lib/constants'
import { assetCurrency, isCurrencyAsset } from '../lib/currency'
import { formatPrice, formatPriceIn, formatQty, formatShortDate, formatTL } from '../lib/format'
import { t } from '../lib/i18n'

// Bir varlığın işlem geçmişi (en yeni üstte). Her satırın yanında silme düğmesi var.
// transactions: kaydedildiği hâliyle işlemler (döviz cinsinden varlıkta fiyat kendi para birimiyle + o günün kuru).
export default function TransactionList({ asset, transactions, onDelete }) {
  const type = getType(asset.type)
  const amountMode = type.mode === 'amount'
  const currency = amountMode ? 'TRY' : assetCurrency(asset)
  const currencyAsset = isCurrencyAsset(asset)
  const rows = transactions.filter((tr) => tr.assetId === asset.id).sort((a, b) => b.date.localeCompare(a.date))

  if (rows.length === 0)
    return <p className="bg-slate-50 px-5 py-4 text-sm text-slate-500">{t('Henüz işlem yok.', 'No transactions yet.')}</p>

  /** "250 adet × ₺312,00 = ₺78.000" · "2 adet × $545,00 × ₺47,70 = ₺52.000" · "1.000 USD × ₺47,60 = ₺47.600" */
  function describe(tr) {
    if (amountMode) return formatTL(tr.quantity)
    if (currencyAsset) {
      const rate = tr.fx ?? tr.price // eski kayıtlarda fiyat zaten kurdur
      return `${formatQty(tr.quantity)} ${currency} × ${formatPrice(rate)} = ${formatTL(tr.quantity * rate)}`
    }
    if (currency !== 'TRY' && tr.fx)
      return `${formatQty(tr.quantity)} ${type.unit} × ${formatPriceIn(tr.price, currency)} × ${formatPrice(tr.fx)} = ${formatTL(tr.quantity * tr.price * tr.fx)}`
    return `${formatQty(tr.quantity)} ${type.unit} × ${formatPrice(tr.price)} = ${formatTL(tr.quantity * tr.price)}`
  }

  return (
    <ul className="divide-y divide-slate-100 bg-slate-50 px-5 py-2">
      {rows.map((tr) => {
        const buy = tr.kind === 'buy'
        return (
          <li key={tr.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
            <span className="w-28 text-slate-500 tabular-nums">{formatShortDate(tr.date)}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${buy ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}
            >
              {amountMode
                ? buy
                  ? t('Yatırma', 'Deposit')
                  : t('Çekme', 'Withdrawal')
                : buy
                  ? t('Alış', 'Buy')
                  : t('Satış', 'Sell')}
            </span>
            <span className="flex-1 tabular-nums text-slate-700">{describe(tr)}</span>
            <button
              onClick={() => onDelete(tr)}
              className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              aria-label={t('İşlemi sil', 'Delete transaction')}
            >
              {t('Sil', 'Delete')}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
