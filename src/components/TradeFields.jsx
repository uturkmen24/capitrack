import { amountsHidden, formatTL, parseAmount, today } from '../lib/format'

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

// Alış / satış alanları: tarih + adet + birim fiyat (mevduatta: tarih + tutar).
// Hem "Yeni varlık" formunda (ilk alış) hem de "Al / Sat" formunda kullanılır.
export default function TradeFields({ type, value, onChange }) {
  const amountMode = type.mode === 'amount'
  const blur = amountsHidden() ? 'blur-sm focus:blur-none' : ''
  const q = parseAmount(value.quantity)
  const p = parseAmount(value.price)
  const total = q > 0 && p > 0 ? q * p : null
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value })

  return (
    <div className={`grid gap-4 ${amountMode ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600">Tarih</span>
        <input type="date" className={inputClass} value={value.date} max={today()} onChange={set('date')} />
      </label>

      {amountMode ? (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Tutar (₺)</span>
          <input className={`${inputClass} ${blur}`} value={value.quantity} onChange={set('quantity')} placeholder="ör. 100.000" inputMode="decimal" />
        </label>
      ) : (
        <>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Miktar ({type.unit})</span>
            <input className={`${inputClass} ${blur}`} value={value.quantity} onChange={set('quantity')} placeholder="ör. 250" inputMode="decimal" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">{type.priceLabel} (₺)</span>
            <input className={inputClass} value={value.price} onChange={set('price')} placeholder="ör. 312,50" inputMode="decimal" />
            {total !== null && <span className="mt-1 block text-xs text-slate-500">Toplam: {formatTL(total)}</span>}
          </label>
        </>
      )}
    </div>
  )
}
