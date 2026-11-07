import { formatDate, formatMonth, formatRate, formatTL, formatUSD } from '../lib/format'
import { useUsdTry } from '../lib/fx'
import { t } from '../lib/i18n'
import { usePref } from '../lib/prefs'

// Kur kaynağının adı kayıtta Türkçe tutulur; ekranda seçili dile çevrilir
const sourceName = (s) => (s === 'Avrupa Merkez Bankası' ? t(s, 'European Central Bank') : s)

// "Toplam varlık" kartı. Tutara (veya ₺/$ düğmesine) tıklayınca TL ile dolar arasında geçiş yapar.
// Seçim hatırlanır. Dolar karşılığı, bugünkü kurla hesaplanır.
export default function TotalTile({ total, month, className }) {
  const { fx, status } = useUsdTry()
  const [currency, setCurrency] = usePref('capitrack:currency', 'TRY')
  const inUsd = currency === 'USD' && fx // kur yoksa her zaman TL göster

  function toggle() {
    if (fx) setCurrency(inUsd ? 'TRY' : 'USD')
  }

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-500">{t('Toplam varlık', 'Total assets')}</p>

        {/* ₺ / $ seçici: hangisinin seçili olduğunu gösterir, tıklanınca geçiş yapar */}
        <div
          className={`flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold ${fx ? '' : 'opacity-40'}`}
          role="group"
          aria-label={t('Para birimi', 'Currency')}
        >
          {[
            ['TRY', '₺'],
            ['USD', '$'],
          ].map(([code, symbol]) => {
            const active = (code === 'USD') === Boolean(inUsd)
            return (
              <button
                key={code}
                onClick={() => fx && setCurrency(code)}
                disabled={!fx}
                aria-pressed={active}
                className={`rounded-md px-2 py-0.5 ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                {symbol}
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={toggle}
        disabled={!fx}
        className="mt-1 block text-left text-4xl font-bold tracking-tight disabled:cursor-default"
        title={fx ? t('TL / Dolar arasında geçiş için tıkla', 'Click to switch between TRY and USD') : undefined}
      >
        {inUsd ? formatUSD(total / fx.rate) : formatTL(total)}
      </button>

      <p className="mt-1 text-xs text-slate-500">
        {t('Son güncelleme', 'Last update')}: {formatMonth(month)}
      </p>
      <p className="mt-0.5 text-xs text-slate-400">
        {status === 'loading' && t('Dolar kuru alınıyor…', 'Fetching USD rate…')}
        {status === 'error' &&
          t('Dolar kuru alınamadı (internet bağlantısını kontrol et)', 'Could not fetch the USD rate (check your internet connection)')}
        {fx && `1 $ = ₺${formatRate(fx.rate)} · ${formatDate(fx.date)} · ${sourceName(fx.source)}`}
      </p>
    </div>
  )
}
