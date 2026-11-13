import { useState } from 'react'
import SuggestInput from './SuggestInput'
import TradeFields, { inputClass } from './TradeFields'
import { ASSET_TYPES, getType } from '../lib/constants'
import { CURRENCIES, FOREIGN, assetCurrency, defaultCurrency } from '../lib/currency'
import { t } from '../lib/i18n'
import { emptyTrade, isTradeEmpty, readTrade } from '../lib/trade'

const currencyName = (c) =>
  ({
    TRY: t('Türk lirası (₺)', 'Turkish lira (₺)'),
    USD: t('Dolar ($)', 'US dollar ($)'),
    EUR: t('Euro (€)', 'Euro (€)'),
    GBP: t('Sterlin (£)', 'Pound (£)'),
  })[c]

// Varlık ekleme ve düzenleme formu. "asset" verilirse düzenleme modunda açılır.
// Yeni varlık eklerken isteğe bağlı olarak ilk alış da girilir (maliyet hesabı buradan başlar).
// lockedMode: varlığın işlemleri varsa, takip şekli farklı bir türe (ör. hisse → mevduat) geçilemez.
// currencyLocked: işlemi olan varlığın fiyat para birimi değiştirilemez (kayıtlı fiyatların anlamı değişirdi).
export default function AssetForm({ asset, lockedMode, currencyLocked, institutions, onSave, onCancel }) {
  const [name, setName] = useState(asset?.name ?? '')
  const [type, setType] = useState(asset?.type ?? 'hisse')
  const [currency, setCurrency] = useState(asset ? assetCurrency(asset) : defaultCurrency('hisse'))
  const [institution, setInstitution] = useState(asset?.institution ?? '')
  const [note, setNote] = useState(asset?.note ?? '')
  const [trade, setTrade] = useState(emptyTrade())
  const [error, setError] = useState('')
  const typeInfo = getType(type)
  const isCurrencyType = type === 'doviz'
  // İşlemi olan varlık: aynı şekilde takip edilen türler arasında ve döviz hesabı ↔ diğerleri arasında geçilemez
  // (döviz hesabının işlemlerinde fiyat yerine kur tutulur).
  const typeOptions = lockedMode
    ? ASSET_TYPES.filter((x) => x.mode === lockedMode && (x.id === 'doviz') === (asset.type === 'doviz'))
    : ASSET_TYPES
  const currencyOptions = isCurrencyType ? FOREIGN : CURRENCIES

  function changeType(next) {
    setType(next)
    if (!currencyLocked) setCurrency(defaultCurrency(next))
  }

  function handleSubmit(e) {
    e.preventDefault() // tarayıcının sayfayı yenilemesini engelle
    if (!name.trim()) return setError(t('Lütfen varlığa bir ad ver.', 'Please give the asset a name.'))
    const cur = typeInfo.mode === 'amount' ? 'TRY' : currency
    let firstTx = null
    if (!asset && !isTradeEmpty(trade)) {
      const r = readTrade(trade, 'buy', typeInfo.mode === 'amount', { currency: cur, currencyAsset: isCurrencyType })
      if (r.error) return setError(r.error)
      firstTx = r.tx
    }
    onSave({ name: name.trim(), type, currency: cur, institution: institution.trim(), note: note.trim() }, firstTx)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold">{asset ? t('Varlığı düzenle', 'Edit asset') : t('Yeni varlık', 'New asset')}</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">{t('Ad', 'Name')} *</span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('ör. THYAO, Gram Altın, Altın Fonu', 'e.g. THYAO, Gold (gram), Gold Fund')}
            autoFocus
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">{t('Tür', 'Type')}</span>
          <select className={inputClass} value={type} onChange={(e) => changeType(e.target.value)}>
            {typeOptions.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </label>

        {typeInfo.mode === 'unit' && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              {isCurrencyType ? t('Döviz', 'Currency') : t('Fiyat para birimi', 'Price currency')}
            </span>
            <select
              className={`${inputClass} disabled:opacity-60`}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={currencyLocked}
            >
              {currencyOptions.map((c) => (
                <option key={c} value={c}>
                  {currencyName(c)}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              {isCurrencyType
                ? t('Değeri her ay canlı kurla hesaplanır; kur girmen gerekmez.', 'Its value is calculated with the live rate; you don’t enter a rate.')
                : currency !== 'TRY'
                  ? t(
                      `Fiyatları ${currency} olarak girersin; TL karşılığı kurla otomatik hesaplanır.`,
                      `You enter prices in ${currency}; the lira value is calculated with the exchange rate.`,
                    )
                  : t('Fiyatlar TL olarak girilir.', 'Prices are entered in lira.')}
              {currencyLocked && ` ${t('İşlemi olduğu için değiştirilemez.', 'Locked because the asset has transactions.')}`}
            </span>
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">{t('Kurum / Banka', 'Institution / Bank')}</span>
          {/* Daha önce yazılan kurumları öneri olarak sunar */}
          <SuggestInput
            className={inputClass}
            value={institution}
            onChange={setInstitution}
            suggestions={institutions}
            placeholder={t('ör. Ziraat Bankası', 'e.g. Ziraat Bankası')}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">{t('Not', 'Note')}</span>
          <input
            className={inputClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('İsteğe bağlı, ör. Türk Hava Yolları', 'Optional, e.g. Turkish Airlines')}
          />
        </label>
      </div>

      {!asset && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="mb-3 text-sm font-medium">
            {typeInfo.mode === 'amount' ? t('İlk yatırılan para', 'First deposit') : t('İlk alış', 'First purchase')}{' '}
            <span className="font-normal text-slate-500">
              {t('(isteğe bağlı, sonra “Al / Sat” ile de ekleyebilirsin)', '(optional, you can also add it later with “Buy / Sell”)')}
            </span>
          </p>
          <TradeFields
            type={typeInfo}
            currency={typeInfo.mode === 'amount' ? 'TRY' : currency}
            currencyAsset={isCurrencyType}
            value={trade}
            onChange={setTrade}
          />
        </div>
      )}
      {lockedMode && (
        <p className="mt-3 text-xs text-slate-500">
          {t(
            'Bu varlığın işlemleri olduğu için sadece aynı şekilde takip edilen türler arasında değişiklik yapılabilir.',
            'This asset has transactions, so it can only be changed to a type that is tracked the same way.',
          )}
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          {t('Vazgeç', 'Cancel')}
        </button>
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t('Kaydet', 'Save')}
        </button>
      </div>
    </form>
  )
}
