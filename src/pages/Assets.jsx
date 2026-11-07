import { useState } from 'react'
import AssetForm from '../components/AssetForm'
import AssetGroup, { SingleList } from '../components/AssetGroup'
import ProfitLoss from '../components/ProfitLoss'
import TransactionForm from '../components/TransactionForm'
import TransactionList from '../components/TransactionList'
import TypeBadge from '../components/TypeBadge'
import { assetStateAt, checkTransactions } from '../lib/analytics'
import { getType, splitByType } from '../lib/constants'
import { currentMonth, formatPrice, formatQty, formatSignedTL, formatTL } from '../lib/format'
import { t } from '../lib/i18n'
import { usePref } from '../lib/prefs'

const btn = 'rounded-lg px-3 py-1.5 text-sm hover:bg-slate-100'

// "Varlıklarım" ekranı: aynı türden birden fazla varlık türe göre gruplanır, tekler altta listelenir; her varlığın adedi, ortalama maliyeti,
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

  // Aynı türden birden fazla varlık varsa grup (üstte), türünde tek olanlar düz liste (altta)
  const { groups, singles } = splitByType(rows, (r) => r.asset.type)

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
    const rest = data.transactions.filter((x) => x.id !== tx.id)
    const problem = checkTransactions(data, asset, rest)
    if (problem) return window.alert(t(`Bu işlem silinemez: ${problem}`, `This transaction can’t be deleted: ${problem}`))
    if (
      window.confirm(
        t(
          'Bu işlem silinsin mi? Ortalama maliyet ve kâr/zarar yeniden hesaplanır.',
          'Delete this transaction? Average cost and profit/loss will be recalculated.',
        ),
      )
    )
      deleteTransaction(tx.id)
  }

  function handleDelete(asset) {
    const ok = window.confirm(
      t(
        `"${asset.name}", tüm işlemleri ve fiyat geçmişiyle birlikte silinsin mi?`,
        `Delete "${asset.name}" together with all its transactions and price history?`,
      ),
    )
    if (ok) deleteAsset(asset.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{t('Varlıklarım', 'My Assets')}</h2>
          <p className="text-sm text-slate-500">
            {t(`${data.assets.length} varlık`, `${data.assets.length} assets`)}
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
            {t('+ Varlık ekle', '+ Add asset')}
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
          <p className="font-medium">{t('Henüz varlık eklemedin', 'You haven’t added any assets yet')}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t(
              'Her hisseyi, fonu veya hesabı ayrı ayrı ekle (ör. THYAO, BIMAS). Aynı türden birden fazla varlık olunca otomatik olarak bir başlık altında toplanır.',
              'Add each stock, fund or account separately (e.g. THYAO, BIMAS). When you have more than one asset of the same type, they are grouped under one heading automatically.',
            )}
          </p>
        </div>
      )}

      {groups.map(({ type, items }) => {
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
            {sorted.map((r) => renderItem(r, false))}
          </AssetGroup>
        )
      })}

      {singles.length > 0 && <SingleList>{singles.map((r) => renderItem(r, true))}</SingleList>}
    </div>
  )

  // Bir varlığın satırı ve altında açılan paneli (Al / Sat, İşlemler, Düzenle).
  // showType: grupsuz listede türü belli olsun diye adın yanına tür rozeti konur.
  function renderItem({ asset, state }, showType) {
    return (
      <div key={asset.id}>
        <AssetRow
          asset={asset}
          state={state}
          showType={showType}
          txCount={data.transactions.filter((x) => x.assetId === asset.id).length}
          onPanel={(kind) => togglePanel(asset.id, kind)}
          activePanel={panel?.id === asset.id ? panel.kind : null}
          onDelete={() => handleDelete(asset)}
        />
        {panel?.id === asset.id && panel.kind === 'trade' && (
          <TransactionForm asset={asset} state={state} onSubmit={(tx) => handleTrade(asset, tx)} onCancel={() => setPanel(null)} />
        )}
        {panel?.id === asset.id && panel.kind === 'history' && (
          <TransactionList asset={asset} transactions={data.transactions} onDelete={(tx) => handleDeleteTx(asset, tx)} />
        )}
        {panel?.id === asset.id && panel.kind === 'edit' && (
          <div className="bg-slate-50 p-4">
            <AssetForm
              key={asset.id}
              asset={asset}
              lockedMode={data.transactions.some((x) => x.assetId === asset.id) ? getType(asset.type).mode : null}
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
    )
  }
}

// Tek bir varlık satırı
function AssetRow({ asset, state, showType, txCount, onPanel, activePanel, onDelete }) {
  const type = getType(asset.type)
  const amountMode = type.mode === 'amount'
  const soldOut = state && state.value === 0 && state.cost === 0 && txCount > 0
  const active = (kind) => (activePanel === kind ? 'bg-slate-100 font-medium' : '')

  const realizedText = `${t('Gerçekleşen', 'Realized')}: ${state ? formatSignedTL(state.realized) : ''}`
  let detail
  if (!state) detail = t('Henüz alış yok. “Al / Sat” ile ilk alışı ekle.', 'No purchases yet. Add the first one with “Buy / Sell”.')
  else if (soldOut) detail = `${t('Tamamı satıldı', 'Fully sold')} · ${realizedText}`
  else if (amountMode) detail = `${t('Yatırılan', 'Deposited')}: ${formatTL(state.cost)}`
  else
    detail = `${formatQty(state.qty)} ${type.unit} · ${t('Ort. maliyet', 'Avg. cost')} ${formatPrice(state.avg)} · ${t('Son fiyat', 'Last price')} ${
      state.price != null ? formatPrice(state.price) : '—'
    }`

  return (
    <div className="px-5 py-3">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {asset.name}
            {showType && <TypeBadge type={asset.type} />}
          </p>
          <p className="truncate text-xs text-slate-500">{[asset.institution, asset.note].filter(Boolean).join(' · ') || '—'}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums">{state ? formatTL(state.value) : '—'}</p>
          {state && !soldOut && <ProfitLoss value={state.value} cost={state.cost} className="text-xs font-medium" />}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-600 tabular-nums">
        {detail}
        {state && !soldOut && state.realized !== 0 && ` · ${realizedText}`}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        <button onClick={() => onPanel('trade')} className={`${btn} text-emerald-700 ${active('trade')}`}>
          {amountMode ? t('Yatır / Çek', 'Deposit / Withdraw') : t('Al / Sat', 'Buy / Sell')}
        </button>
        <button onClick={() => onPanel('history')} className={`${btn} text-slate-600 ${active('history')}`}>
          {t('İşlemler', 'Transactions')} ({txCount})
        </button>
        <button onClick={() => onPanel('edit')} className={`${btn} text-slate-600 ${active('edit')}`}>
          {t('Düzenle', 'Edit')}
        </button>
        <button onClick={onDelete} className={`${btn} text-red-600 hover:bg-red-50`}>
          {t('Sil', 'Delete')}
        </button>
      </div>
    </div>
  )
}
