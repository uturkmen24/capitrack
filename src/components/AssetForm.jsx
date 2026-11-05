import { useState } from 'react'
import SuggestInput from './SuggestInput'
import TradeFields, { inputClass } from './TradeFields'
import { ASSET_TYPES, getType } from '../lib/constants'
import { emptyTrade, isTradeEmpty, readTrade } from '../lib/trade'

// Varlık ekleme ve düzenleme formu. "asset" verilirse düzenleme modunda açılır.
// Yeni varlık eklerken isteğe bağlı olarak ilk alış da girilir (maliyet hesabı buradan başlar).
// lockedMode: varlığın işlemleri varsa, takip şekli farklı bir türe (ör. hisse → mevduat) geçilemez.
export default function AssetForm({ asset, lockedMode, institutions, onSave, onCancel }) {
  const [name, setName] = useState(asset?.name ?? '')
  const [type, setType] = useState(asset?.type ?? 'hisse')
  const [institution, setInstitution] = useState(asset?.institution ?? '')
  const [note, setNote] = useState(asset?.note ?? '')
  const [trade, setTrade] = useState(emptyTrade())
  const [error, setError] = useState('')
  const typeInfo = getType(type)
  const typeOptions = lockedMode ? ASSET_TYPES.filter((t) => t.mode === lockedMode) : ASSET_TYPES

  function handleSubmit(e) {
    e.preventDefault() // tarayıcının sayfayı yenilemesini engelle
    if (!name.trim()) return setError('Lütfen varlığa bir ad ver.')
    let firstTx = null
    if (!asset && !isTradeEmpty(trade)) {
      const r = readTrade(trade, 'buy', typeInfo.mode === 'amount')
      if (r.error) return setError(r.error)
      firstTx = r.tx
    }
    onSave({ name: name.trim(), type, institution: institution.trim(), note: note.trim() }, firstTx)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold">{asset ? 'Varlığı düzenle' : 'Yeni varlık'}</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Ad *</span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ör. THYAO, Gram Altın, Altın Fonu"
            autoFocus
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Tür</span>
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            {typeOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Kurum / Banka</span>
          {/* Daha önce yazılan kurumları öneri olarak sunar */}
          <SuggestInput
            className={inputClass}
            value={institution}
            onChange={setInstitution}
            suggestions={institutions}
            placeholder="ör. Ziraat Bankası"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Not</span>
          <input
            className={inputClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="İsteğe bağlı, ör. Türk Hava Yolları"
          />
        </label>
      </div>

      {!asset && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="mb-3 text-sm font-medium">
            {typeInfo.mode === 'amount' ? 'İlk yatırılan para' : 'İlk alış'}{' '}
            <span className="font-normal text-slate-500">(isteğe bağlı, sonra “Al / Sat” ile de ekleyebilirsin)</span>
          </p>
          <TradeFields type={typeInfo} value={trade} onChange={setTrade} />
        </div>
      )}
      {lockedMode && (
        <p className="mt-3 text-xs text-slate-500">
          Bu varlığın işlemleri olduğu için sadece aynı şekilde takip edilen türler arasında değişiklik yapılabilir.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Vazgeç
        </button>
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Kaydet
        </button>
      </div>
    </form>
  )
}
