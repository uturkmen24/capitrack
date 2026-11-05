import { useState } from 'react'
import AssetForm from '../components/AssetForm'
import AssetGroup from '../components/AssetGroup'
import ProfitLoss from '../components/ProfitLoss'
import TransactionForm from '../components/TransactionForm'
import TransactionList from '../components/TransactionList'
import { assetStateAt, checkTransactions } from '../lib/analytics'
import { getType, groupByType } from '../lib/constants'
import { currentMonth, formatPrice, formatQty, formatSignedTL, formatTL } from '../lib/format'
import { usePref } from '../lib/prefs'

const btn = 'rounded-lg px-3 py-1.5 text-sm hover:bg-slate-100'

// "Varlıklarım" ekranı: varlıklar türe göre gruplanır; her varlığın adedi, ortalama maliyeti,
// değeri ve kâr/zararı görünür. Al / Sat, işlem geçmişi, düzenleme ve silme buradan yapılır.
export default function Assets({ portfolio }) {
  const { data, addAsset, updateAsset, deleteAsset, addTransaction, deleteTransaction } = portfolio
  const [adding, setAdding] = useState(false)
  // Hangi varlığın altında hangi panel açık: { id, kind: 'trade' | 'history' | 'edit' }
  const [panel, setPanel] = useState(null)
  const [collapsed, setCollapsed] = usePref('capitrack:collapsed:assets', [])

  const month = currentMonth()
  const institutions = [...new Set(data.assets.map((a) => a.institution).filter(Boolean))]
  const rows = data.assets.map((asset) => ({ asset, state: assetStateAt(data, asset, month) }))
  const total = rows.reduce((s, r) => s + (r.state?.value ?? 0), 0)
  const totalCost = rows.reduce((s, r) => s + (r.state?.cost ?? 0), 0)

  const toggle = (typeId) =>
    setCollapsed(collapsed.includes(typeId) ? collapsed.filter((x) => x !== typeId) : [...collapsed, typeId])
  const togglePanel = (id, kind) => setPanel(panel?.id === id && panel.kind === kind ? null : { id, kind })

  function handleTrade(asset, tx) {
    const problem = checkTransactions(data, asset, [...data.transactions, tx])
    if (problem) return problem
    addTransaction(tx)
    setPanel({ id: asset.id, kind: 'history' }) // eklenen işlemi geçmişte göster
    return null
  }

  function handleDeleteTx(asset, tx) {
    const rest = data.transactions.filter((t) => t.id !== tx.id)
    const problem = checkTransactions(data, asset, rest)
    if (problem) return window.alert(`Bu işlem silinemez: ${problem}`)
    if (window.confirm('Bu işlem silinsin mi? Ortalama maliyet ve kâr/zarar yeniden hesaplanır.')) deleteTransaction(tx.id)
  }

  function handleDelete(asset) {
    if (window.confirm(`"${asset.name}", tüm işlemleri ve fiyat geçmişiyle birlikte silinsin mi?`)) deleteAsset(asset.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Varlıklarım</h2>
          <p className="text-sm text-slate-500">
            {data.assets.length} varlık
            {data.assets.length > 0 && (
              <>
                {' · '}
                {formatTL(total)} · <ProfitLoss value={total} cost={totalCost} className="font-medium" />
              </>
            )}
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            + Varlık ekle
          </button>
        )}
      </div>

      {adding && (
        <AssetForm
          institutions={institutions}
          onSave={(fields, firstTx) => {
            addAsset(fields, firstTx)
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {data.assets.length === 0 && !adding && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-medium">Henüz varlık eklemedin</p>
          <p className="mt-1 text-sm text-slate-500">
            Her hisseyi, fonu veya hesabı ayrı ayrı ekle (ör. THYAO, BIMAS). Aynı türdekiler otomatik olarak bir başlık altında
            toplanır.
          </p>
        </div>
      )}

      {groupByType(rows, (r) => r.asset.type).map(({ type, items }) => {
        const value = items.reduce((s, r) => s + (r.state?.value ?? 0), 0)
        const cost = items.reduce((s, r) => s + (r.state?.cost ?? 0), 0)
        const sorted = [...items].sort((x, y) => (y.state?.value ?? 0) - (x.state?.value ?? 0))
        return (
          <AssetGroup
            key={type.id}
            type={type}
            count={items.length}
            value={value}
            cost={cost}
            collapsed={collapsed.includes(type.id)}
            onToggle={() => toggle(type.id)}
          >
            {sorted.map(({ asset, state }) => (
              <div key={asset.id}>
                <AssetRow
                  asset={asset}
                  state={state}
                  txCount={data.transactions.filter((t) => t.assetId === asset.id).length}
                  onPanel={(kind) => togglePanel(asset.id, kind)}
                  activePanel={panel?.id === asset.id ? panel.kind : null}
                  onDelete={() => handleDelete(asset)}
                />
                {panel?.id === asset.id && panel.kind === 'trade' && (
                  <TransactionForm
                    asset={asset}
                    state={state}
                    onSubmit={(tx) => handleTrade(asset, tx)}
                    onCancel={() => setPanel(null)}
                  />
                )}
                {panel?.id === asset.id && panel.kind === 'history' && (
                  <TransactionList asset={asset} transactions={data.transactions} onDelete={(tx) => handleDeleteTx(asset, tx)} />
                )}
                {panel?.id === asset.id && panel.kind === 'edit' && (
                  <div className="bg-slate-50 p-4">
                    <AssetForm
                      key={asset.id}
                      asset={asset}
                      lockedMode={data.transactions.some((t) => t.assetId === asset.id) ? getType(asset.type).mode : null}
                      institutions={institutions}
                      onSave={(fields) => {
                        updateAsset(asset.id, fields)
                        setPanel(null)
                      }}
                      onCancel={() => setPanel(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </AssetGroup>
        )
      })}
    </div>
  )
}

// Grup içindeki tek bir varlık satırı
function AssetRow({ asset, state, txCount, onPanel, activePanel, onDelete }) {
  const type = getType(asset.type)
  const amountMode = type.mode === 'amount'
  const soldOut = state && state.value === 0 && state.cost === 0 && txCount > 0
  const active = (kind) => (activePanel === kind ? 'bg-slate-100 font-medium' : '')

  let detail
  if (!state) detail = 'Henüz alış yok. “Al” ile ilk alışı ekle.'
  else if (soldOut) detail = `Tamamı satıldı · Gerçekleşen: ${formatSignedTL(state.realized)}`
  else if (amountMode) detail = `Yatırılan: ${formatTL(state.cost)}`
  else
    detail = `${formatQty(state.qty)} ${type.unit} · Ort. maliyet ${formatPrice(state.avg)} · Son fiyat ${
      state.price != null ? formatPrice(state.price) : '—'
    }`

  return (
    <div className="px-5 py-3">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{asset.name}</p>
          <p className="truncate text-xs text-slate-500">{[asset.institution, asset.note].filter(Boolean).join(' · ') || '—'}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums">{state ? formatTL(state.value) : '—'}</p>
          {state && !soldOut && <ProfitLoss value={state.value} cost={state.cost} className="text-xs font-medium" />}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-600 tabular-nums">
        {detail}
        {state && !soldOut && state.realized !== 0 && ` · Gerçekleşen: ${formatSignedTL(state.realized)}`}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        <button onClick={() => onPanel('trade')} className={`${btn} text-emerald-700 ${active('trade')}`}>
          {amountMode ? 'Yatır / Çek' : 'Al / Sat'}
        </button>
        <button onClick={() => onPanel('history')} className={`${btn} text-slate-600 ${active('history')}`}>
          İşlemler ({txCount})
        </button>
        <button onClick={() => onPanel('edit')} className={`${btn} text-slate-600 ${active('edit')}`}>
          Düzenle
        </button>
        <button onClick={onDelete} className={`${btn} text-red-600 hover:bg-red-50`}>
          Sil
        </button>
      </div>
    </div>
  )
}
