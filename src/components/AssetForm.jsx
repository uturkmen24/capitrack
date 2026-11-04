import { useState } from 'react'
import SuggestInput from './SuggestInput'
import { ASSET_TYPES } from '../lib/constants'
import { amountToInput, currentMonth, formatMonth, parseAmount } from '../lib/format'

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

// Varlık ekleme ve düzenleme formu. "asset" verilirse düzenleme modunda açılır.
export default function AssetForm({ asset, currentValue, institutions, onSave, onCancel }) {
  const [name, setName] = useState(asset?.name ?? '')
  const [type, setType] = useState(asset?.type ?? 'altin')
  const [institution, setInstitution] = useState(asset?.institution ?? '')
  const [note, setNote] = useState(asset?.note ?? '')
  const [value, setValue] = useState(amountToInput(currentValue))
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault() // tarayıcının sayfayı yenilemesini engelle
    const amount = parseAmount(value)
    if (!name.trim()) return setError('Lütfen varlığa bir ad ver.')
    if (Number.isNaN(amount)) return setError('Değer bir sayı olmalı (ör. 45.000 veya 45000,50).')
    onSave({ name: name.trim(), type, institution: institution.trim(), note: note.trim() }, amount)
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
            placeholder="ör. Gram Altın, THYAO, Altın Fonu"
            autoFocus
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Tür</span>
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            {ASSET_TYPES.map((t) => (
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
          <span className="mb-1 block text-sm font-medium text-slate-600">
            {formatMonth(currentMonth())} değeri (₺)
          </span>
          <input
            className={inputClass}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ör. 45.000"
            inputMode="decimal"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-600">Not</span>
          <input
            className={inputClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="İsteğe bağlı, ör. 15 gram, vadesi Mart"
          />
        </label>
      </div>

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
