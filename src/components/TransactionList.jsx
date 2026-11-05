import { getType } from '../lib/constants'
import { formatPrice, formatQty, formatTL } from '../lib/format'

const shortDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })

// Bir varlığın işlem geçmişi (en yeni üstte). Her satırın yanında silme düğmesi var.
export default function TransactionList({ asset, transactions, onDelete }) {
  const type = getType(asset.type)
  const amountMode = type.mode === 'amount'
  const rows = transactions.filter((t) => t.assetId === asset.id).sort((a, b) => b.date.localeCompare(a.date))

  if (rows.length === 0) return <p className="bg-slate-50 px-5 py-4 text-sm text-slate-500">Henüz işlem yok.</p>

  return (
    <ul className="divide-y divide-slate-100 bg-slate-50 px-5 py-2">
      {rows.map((t) => {
        const buy = t.kind === 'buy'
        return (
          <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
            <span className="w-28 text-slate-500 tabular-nums">{shortDate(t.date)}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${buy ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}
            >
              {amountMode ? (buy ? 'Yatırma' : 'Çekme') : buy ? 'Alış' : 'Satış'}
            </span>
            <span className="flex-1 tabular-nums text-slate-700">
              {amountMode ? formatTL(t.quantity) : `${formatQty(t.quantity)} ${type.unit} × ${formatPrice(t.price)} = ${formatTL(t.quantity * t.price)}`}
            </span>
            <button
              onClick={() => onDelete(t)}
              className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              aria-label="İşlemi sil"
            >
              Sil
            </button>
          </li>
        )
      })}
    </ul>
  )
}
