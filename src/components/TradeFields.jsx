import { useEffect } from 'react'
import { amountToInput, amountsHidden, currencySymbol, formatDate, formatPriceIn, formatTL, parseAmount, today } from '../lib/format'
import { t } from '../lib/i18n'
import { useRateOn } from '../lib/rates'

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

const sourceName = (s) => (s === 'Avrupa Merkez Bankası' ? t(s, 'European Central Bank') : s)

// Alış / satış alanları: tarih + adet + birim fiyat (mevduatta: tarih + tutar).
// Hem "Yeni varlık" formunda (ilk alış) hem de "Al / Sat" formunda kullanılır.
// currency: varlığın fiyat para birimi. TL değilse fiyat o para biriminde sorulur ve o günün kuru kendiliğinden gelir.
// currencyAsset: döviz hesabı (ör. 1.000 $). Fiyat sorulmaz; maliyeti o günün kuru belirler.
export default function TradeFields({ type, currency = 'TRY', currencyAsset = false, value, onChange }) {
  const amountMode = type.mode === 'amount'
  const foreign = !amountMode && currency !== 'TRY'
  const blur = amountsHidden() ? 'blur-sm focus:blur-none' : ''
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value })

  // Seçilen tarihin kuru (hafta sonuysa bir önceki iş günü). Kullanıcı kuru elle değiştirmediyse kutuya yazılır.
  const fx = useRateOn(foreign ? currency : 'TRY', value.date)
  useEffect(() => {
    if (fx.status === 'ok' && value.fxAuto !== false && value.fxText !== amountToInput(fx.rate)) {
      onChange({ ...value, fxText: amountToInput(fx.rate), fxAuto: true })
    }
  }, [fx, value, onChange])

  const q = parseAmount(value.quantity)
  const p = currencyAsset ? 1 : parseAmount(value.price)
  const rate = foreign ? parseAmount(value.fxText) : 1
  const total = q > 0 && p > 0 ? q * p : null
  const symbol = currencySymbol(currency)

  return (
    <div className="space-y-3">
      <div className={`grid gap-4 ${amountMode || currencyAsset ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">{t('Tarih', 'Date')}</span>
          <input type="date" className={inputClass} value={value.date} max={today()} onChange={set('date')} />
        </label>

        {amountMode ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">{t('Tutar', 'Amount')} (₺)</span>
            <input
              className={`${inputClass} ${blur}`}
              value={value.quantity}
              onChange={set('quantity')}
              placeholder={t('ör. 100.000', 'e.g. 100,000')}
              inputMode="decimal"
            />
          </label>
        ) : (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">
                {t('Miktar', 'Quantity')} ({currencyAsset ? currency : type.unit})
              </span>
              <input
                className={`${inputClass} ${blur}`}
                value={value.quantity}
                onChange={set('quantity')}
                placeholder={currencyAsset ? t('ör. 1.000', 'e.g. 1,000') : t('ör. 250', 'e.g. 250')}
                inputMode="decimal"
              />
            </label>
            {!currencyAsset && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">
                  {type.priceLabel} ({symbol})
                </span>
                <input
                  className={inputClass}
                  value={value.price}
                  onChange={set('price')}
                  placeholder={foreign ? t('ör. 545,20', 'e.g. 545.20') : t('ör. 312,50', 'e.g. 312.50')}
                  inputMode="decimal"
                />
              </label>
            )}
          </>
        )}
      </div>

      {foreign && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-slate-600">
              {t('Kur', 'Rate')}: 1 {currency} = ₺
            </span>
            <input
              className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-emerald-500"
              value={value.fxText ?? ''}
              onChange={(e) => onChange({ ...value, fxText: e.target.value, fxAuto: false })}
              inputMode="decimal"
              aria-label={t('Kur', 'Exchange rate')}
            />
          </label>
          <span className="text-xs text-slate-500">
            {fx.status === 'loading' && t('Kur alınıyor…', 'Fetching rate…')}
            {fx.status === 'ok' &&
              (value.fxAuto !== false
                ? t(
                    `Otomatik: ${formatDate(fx.date)} kuru (${sourceName(fx.source)})`,
                    `Automatic: rate of ${formatDate(fx.date)} (${sourceName(fx.source)})`,
                  )
                : t('Elle değiştirildi', 'Edited manually'))}
            {fx.status === 'error' && t('Kur alınamadı, elle yazabilirsin', 'Could not fetch the rate; you can type it')}
          </span>
        </div>
      )}

      {total !== null && (
        <p className="text-xs text-slate-500">
          {t('Toplam', 'Total')}:{' '}
          {foreign
            ? `${amountsHidden() ? `${symbol}***` : formatPriceIn(total, currency)}${rate > 0 ? ` ≈ ${formatTL(total * rate)}` : ''}`
            : formatTL(total)}
        </p>
      )}
    </div>
  )
}
