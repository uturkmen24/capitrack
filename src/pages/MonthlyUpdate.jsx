import { useState } from 'react'
import AssetGroup, { SingleList } from '../components/AssetGroup'
import ProfitLoss from '../components/ProfitLoss'
import TypeBadge from '../components/TypeBadge'
import { assetStateAt, isHeld } from '../lib/analytics'
import { getType, splitByType } from '../lib/constants'
import { assetCurrency, isCurrencyAsset, lastRawPrice, rateAt } from '../lib/currency'
import {
  amountsHidden,
  amountToInput,
  currencySymbol,
  currentMonth,
  formatMonth,
  formatPercent,
  formatPrice,
  formatQty,
  formatSignedTL,
  formatTL,
  parseAmount,
  shiftMonth,
} from '../lib/format'
import { t } from '../lib/i18n'
import { usePref } from '../lib/prefs'

const inputClass =
  'w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-sm tabular-nums outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

// "Aylık Güncelleme" ekranı: bir ay seç, o ay elinde olan varlıkların fiyatlarını (mevduatta bakiyesini) gir.
// Değer = adet × fiyat otomatik hesaplanır. Adetler Varlıklarım'daki alış/satış işlemlerinden gelir.
export default function MonthlyUpdate({ portfolio, goToAssets }) {
  const { data, raw, rates, saveMonth } = portfolio
  const [month, setMonth] = useState(currentMonth())
  const isCurrent = month === currentMonth()

  if (data.transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-medium">{t('Önce bir alış eklemelisin', 'Add a purchase first')}</p>
        <p className="mt-1 text-sm text-slate-500">
          {t(
            'Aylık fiyat girebilmek için Varlıklarım ekranında en az bir varlığın ve alış işleminin olması gerekiyor.',
            'To enter monthly prices you need at least one asset with a purchase on the My Assets screen.',
          )}
        </p>
        <button
          onClick={goToAssets}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t('Varlıklarıma git', 'Go to My Assets')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{t('Aylık Güncelleme', 'Monthly Update')}</h2>
          <p className="text-sm text-slate-500">
            {t(
              'Her varlığın ay sonundaki birim fiyatını (mevduatta bakiyesini) yaz. Adetler alış/satış işlemlerinden gelir.',
              'Enter each asset’s month-end unit price (the balance for deposits). Quantities come from your buy/sell transactions.',
            )}
          </p>
        </div>

        {/* Ay seçici: oklarla önceki/sonraki aya geç. Gelecek aylara gidilemez. */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100"
            aria-label={t('Önceki ay', 'Previous month')}
          >
            ‹
          </button>
          <span className="w-32 text-center text-sm font-medium">{formatMonth(month)}</span>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={isCurrent}
            className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label={t('Sonraki ay', 'Next month')}
          >
            ›
          </button>
        </div>
      </div>

      {/* key={month}: ay değişince form sıfırdan, o ayın verisiyle açılır */}
      <MonthForm key={month} month={month} data={data} raw={raw} rates={rates} onSave={saveMonth} />
    </div>
  )
}

// data: TL'ye çevrilmiş veri (hesaplar), raw: kaydedildiği hâli (döviz fiyatları kendi para birimiyle), rates: kurlar
function MonthForm({ month, data, raw, rates, onSave }) {
  const [collapsed, setCollapsed] = usePref('capitrack:collapsed:monthly', [])
  const prevMonth = shiftMonth(month, -1)

  // O ay elinde olan varlıklar ve o ayki durumları.
  // currency: fiyatın para birimi; auto: döviz hesabı (fiyatı kur, kullanıcı girmez); rate: o ayın kuru (bu ay için canlı)
  const rows = data.assets
    .map((asset) => {
      const type = getType(asset.type)
      const currency = type.mode === 'amount' ? 'TRY' : assetCurrency(asset)
      return {
        asset,
        month,
        type,
        currency,
        auto: isCurrencyAsset(asset),
        rate: rateAt(rates, currency, month),
        state: assetStateAt(data, asset, month),
        prev: assetStateAt(data, asset, prevMonth),
        prevRaw: currency === 'TRY' ? null : lastRawPrice(raw, asset, prevMonth),
      }
    })
    .filter((r) => isHeld(r.state))

  // Form ilk açıldığında: o ay girilmiş fiyat varsa o, yoksa son bilinen fiyat / bakiye.
  // Döviz cinsinden varlıkta fiyat kendi para birimiyle gelir; döviz hesabının kutusu yoktur.
  const [inputs, setInputs] = useState(() =>
    Object.fromEntries(
      rows
        .filter((r) => !r.auto)
        .map((r) => [
          r.asset.id,
          amountToInput(r.type.mode === 'amount' ? r.state.value : r.currency === 'TRY' ? r.state.price : lastRawPrice(raw, r.asset, month)),
        ]),
    ),
  )
  const [message, setMessage] = useState(null) // { ok: true/false, text }

  const autoIds = new Set(rows.filter((r) => r.auto).map((r) => r.asset.id))
  const hasSavedPrices = Object.keys(raw.prices[month] ?? {}).some((id) => !autoIds.has(id))
  const hasInputs = rows.some((r) => !r.auto)
  const parsed = Object.fromEntries(Object.entries(inputs).map(([id, v]) => [id, parseAmount(v)]))
  const invalid = Object.values(parsed).some((v) => Number.isNaN(v))

  /** Formdaki fiyata göre o ayki değer (fiyat boşsa son bilinen değer). Döviz cinsinden fiyat o ayın kuruyla TL'ye çevrilir. */
  function liveValue(r) {
    if (r.auto) return r.state.value
    const v = parsed[r.asset.id]
    if (!Number.isFinite(v)) return r.state.value
    if (r.type.mode === 'amount') return v
    if (r.currency !== 'TRY') return r.rate ? r.state.qty * v * r.rate : r.state.value
    return r.state.qty * v
  }

  const total = rows.reduce((s, r) => s + liveValue(r), 0)
  const prevTotal = data.assets.reduce((s, a) => s + (assetStateAt(data, a, shiftMonth(month, -1))?.value ?? 0), 0)
  const flow = rows.reduce((s, r) => s + r.state.flow, 0)
  const monthReturn = total - prevTotal - flow // yeni eklenen para getiri sayılmaz

  function handleSubmit(e) {
    e.preventDefault()
    if (invalid) {
      setMessage({ ok: false, text: t('Kırmızı işaretli alanlara geçerli bir sayı yaz.', 'Enter a valid number in the fields marked red.') })
      return
    }
    onSave(month, parsed)
    setMessage({ ok: true, text: t(`${formatMonth(month)} kaydedildi.`, `${formatMonth(month)} saved.`) })
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        {t(
          `${formatMonth(month)} ayında elinde bir varlık görünmüyor (henüz alınmamış veya tamamen satılmış).`,
          `You don’t seem to hold any assets in ${formatMonth(month)} (not bought yet or fully sold).`,
        )}
      </p>
    )
  }

  const toggle = (typeId) =>
    setCollapsed(collapsed.includes(typeId) ? collapsed.filter((x) => x !== typeId) : [...collapsed, typeId])

  // Aynı türden birden fazla varlık varsa grup (üstte), türünde tek olanlar düz liste (altta)
  const { groups, singles } = splitByType(rows, (r) => r.asset.type)

  const renderRow = (r, showType) => (
    <MonthRow
      key={r.asset.id}
      row={r}
      showType={showType}
      input={inputs[r.asset.id] ?? ''}
      parsedValue={parsed[r.asset.id]}
      value={liveValue(r)}
      onChange={(v) => {
        setInputs({ ...inputs, [r.asset.id]: v })
        setMessage(null)
      }}
    />
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!hasSavedPrices && hasInputs && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t(
            'Bu ay için henüz fiyat girilmedi. Alanlar son bilinen fiyatlarla dolduruldu; değişenleri düzeltip kaydet.',
            'No prices entered for this month yet. Fields are filled with the last known prices; update what changed and save.',
          )}
        </p>
      )}

      {groups.map(({ type, items }) => (
        <AssetGroup
          key={type.id}
          type={type}
          count={items.length}
          value={items.reduce((s, r) => s + liveValue(r), 0)}
          cost={items.reduce((s, r) => s + r.state.cost, 0)}
          collapsed={collapsed.includes(type.id)}
          onToggle={() => toggle(type.id)}
        >
          {items.map((r) => renderRow(r, false))}
        </AssetGroup>
      ))}

      {singles.length > 0 && <SingleList>{singles.map((r) => renderRow(r, true))}</SingleList>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm text-slate-500">{t(`${formatMonth(month)} toplamı`, `${formatMonth(month)} total`)}</p>
          <p className="text-2xl font-bold tabular-nums">{formatTL(total)}</p>
          {prevTotal > 0 && (
            <p className={`text-sm font-medium tabular-nums ${monthReturn >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {monthReturn >= 0 ? '▲' : '▼'} {t('Bu ayki getiri', 'This month’s return')}: {formatSignedTL(monthReturn)} (
              {formatPercent(monthReturn / prevTotal)})
            </p>
          )}
          {Math.abs(flow) > 0.5 && (
            <p className="text-xs text-slate-500">
              {flow > 0
                ? t(`Bu ay eklenen para: ${formatTL(flow)} (getiriye dahil değil)`, `Money added this month: ${formatTL(flow)} (not counted as return)`)
                : t(
                    `Bu ay çekilen para: ${formatTL(-flow)} (getiriye dahil değil)`,
                    `Money withdrawn this month: ${formatTL(-flow)} (not counted as return)`,
                  )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {message && <span className={`text-sm ${message.ok ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</span>}
          <button type="submit" className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
            {t('Kaydet', 'Save')}
          </button>
        </div>
      </div>
    </form>
  )
}

// Tek bir varlığın aylık satırı:
//   "250 adet × [312,00]"            TL fiyatlı varlık
//   "2 adet × $[567,40] × ₺50,05"    döviz cinsinden fiyat: dolar girilir, o ayın kuruyla TL'ye çevrilir
//   "1.000 USD × ₺50,05"             döviz hesabı: kutu yok, kur otomatik
//   "Bakiye [139.200]"               mevduat
function MonthRow({ row, showType, input, parsedValue, value, onChange }) {
  const { asset, type, state, prev, currency, auto, rate, prevRaw } = row
  const amountMode = type.mode === 'amount'
  const foreign = !amountMode && currency !== 'TRY'
  const bad = Number.isNaN(parsedValue)
  const blur = amountsHidden() ? 'blur-sm focus:blur-none' : ''
  // Fiyatın geçen aya göre değişimi (sadece adetli varlıklarda; döviz cinsinden fiyatta kendi para birimiyle, döviz hesabında kur)
  let priceChange = null
  if (auto) priceChange = prev?.price > 0 && state.price > 0 ? state.price / prev.price - 1 : null
  else if (foreign) priceChange = prevRaw > 0 && parsedValue > 0 ? parsedValue / prevRaw - 1 : null
  else if (!amountMode) priceChange = prev?.price > 0 && Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue / prev.price - 1 : null

  // Düzen: telefonda iki kat (üstte ad + değer, altta giriş), bilgisayarda tek satır (ad | giriş | değer).
  // "order" sınıfları, aynı parçaların ekran genişliğine göre farklı sırada dizilmesini sağlar.
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3 sm:grid-cols-[1fr_auto_auto]">
      <div className="order-1 min-w-0">
        <p className="flex min-w-0 items-center gap-2 font-medium">
          <span className="truncate">{asset.name}</span>
          {showType && <TypeBadge type={asset.type} />}
        </p>
        <p className="truncate text-xs text-slate-500">
          {asset.institution || '—'}
          {priceChange !== null && Math.abs(priceChange) > 0.0005 && (
            <span className={priceChange > 0 ? 'text-emerald-700' : 'text-red-600'}>
              {' '}
              · {auto ? t('kur', 'rate') : t('fiyat', 'price')} {formatPercent(priceChange)}
            </span>
          )}
        </p>
      </div>

      <div className="order-3 col-span-2 flex flex-wrap items-center gap-2 text-sm sm:order-2 sm:col-span-1 sm:justify-end">
        {auto ? (
          <span className="whitespace-nowrap tabular-nums text-slate-500">
            {formatQty(state.qty)} {currency} × {state.price != null ? formatPrice(state.price) : '—'}{' '}
            <span className="text-xs text-slate-400">
              ({rate ? (row.month >= currentMonth() ? t('canlı kur', 'live rate') : t('ay sonu kuru', 'month-end rate')) : t('kur alınamadı', 'rate unavailable')})
            </span>
          </span>
        ) : (
          <>
            <span className="whitespace-nowrap tabular-nums text-slate-500">
              {amountMode ? t('Bakiye', 'Balance') : `${formatQty(state.qty)} ${type.unit} ×`}
            </span>
            <span className="relative">
              {foreign && (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{currencySymbol(currency)}</span>
              )}
              <input
                className={`${inputClass} ${foreign ? 'pl-7' : ''} ${bad ? 'border-red-400 ring-2 ring-red-400/20' : ''} ${amountMode ? blur : ''}`}
                value={input}
                onChange={(e) => onChange(e.target.value)}
                placeholder="—"
                inputMode="decimal"
                aria-label={`${asset.name} ${amountMode ? t('bakiyesi', 'balance') : `${type.priceLabel.toLowerCase()} (${currency})`}`}
              />
            </span>
            {foreign && (
              <span className="whitespace-nowrap tabular-nums text-slate-500" title={t('O ayın kuru', 'Rate for that month')}>
                × {rate ? formatPrice(rate) : t('kur yok', 'no rate')}
              </span>
            )}
          </>
        )}
      </div>

      <div className="order-2 whitespace-nowrap text-right sm:order-3 sm:min-w-36">
        <span className="block font-semibold tabular-nums">{formatTL(value)}</span>
        <ProfitLoss value={value} cost={state.cost} className="block text-xs font-medium" />
      </div>
    </div>
  )
}
