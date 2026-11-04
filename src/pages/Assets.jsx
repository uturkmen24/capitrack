import { useState } from 'react'
import AssetForm from '../components/AssetForm'
import TypeBadge from '../components/TypeBadge'
import { currentMonth, formatMonth, formatTL } from '../lib/format'
import { latestValue } from '../lib/usePortfolio'

// "Varlıklarım" ekranı: varlık listesi + ekleme/düzenleme/silme.
export default function Assets({ portfolio }) {
  const { data, addAsset, updateAsset, deleteAsset } = portfolio
  // editing: null = form kapalı, 'new' = yeni varlık, '<id>' = o varlığı düzenle
  const [editing, setEditing] = useState(null)

  const institutions = [...new Set(data.assets.map((a) => a.institution).filter(Boolean))]
  const editingAsset = data.assets.find((a) => a.id === editing)
  const month = currentMonth()

  function handleSave(fields, value) {
    if (editing === 'new') addAsset(fields, value)
    else updateAsset(editing, fields, value)
    setEditing(null)
  }

  function handleDelete(asset) {
    if (window.confirm(`"${asset.name}" ve tüm geçmiş kayıtları silinsin mi?`)) deleteAsset(asset.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Varlıklarım</h2>
          <p className="text-sm text-slate-500">{data.assets.length} varlık</p>
        </div>
        {editing === null && (
          <button
            onClick={() => setEditing('new')}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            + Varlık ekle
          </button>
        )}
      </div>

      {editing !== null && (
        <AssetForm
          key={editing}
          asset={editingAsset}
          currentValue={editingAsset ? data.records[month]?.[editingAsset.id]?.value : undefined}
          institutions={institutions}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {data.assets.length === 0 ? (
        editing === null && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-medium">Henüz varlık eklemedin</p>
            <p className="mt-1 text-sm text-slate-500">
              Altın, hisse, fon, mevduat… Hangi bankada ne varsa tek tek ekle. Değerlerini her ay güncelleyeceksin.
            </p>
          </div>
        )
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {data.assets.map((asset) => {
            const last = latestValue(data.records, asset.id)
            return (
              <li key={asset.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{asset.name}</span>
                    <TypeBadge type={asset.type} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {[asset.institution, asset.note].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{last ? formatTL(last.value) : '—'}</p>
                  <p className="text-xs text-slate-500">{last ? formatMonth(last.month) : 'Değer girilmedi'}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditing(asset.id)}
                    className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDelete(asset)}
                    className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sil
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
