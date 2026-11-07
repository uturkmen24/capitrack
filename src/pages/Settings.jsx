import { useRef, useState } from 'react'
import { createDemoData } from '../lib/demoData'
import { buildExcel } from '../lib/exportExcel'
import { today } from '../lib/format'
import { t } from '../lib/i18n'
import { emptyData, validateData } from '../lib/storage'

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
const primaryBtn = 'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700'
const secondaryBtn =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'

/** "9 varlık, 14 işlem" (İng. "9 assets, 14 transactions") */
const summarize = (d) =>
  t(`${d.assets.length} varlık, ${d.transactions.length} işlem`, `${d.assets.length} assets, ${d.transactions.length} transactions`)

/** Bir metni dosya olarak indirtir: geçici bir bağlantı oluşturup ona tıklar. */
function download(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// "Ayarlar" ekranı: yedek alma, yedekten geri yükleme, örnek veri ve sıfırlama.
export default function Settings({ portfolio }) {
  const { data, replaceData } = portfolio
  const fileInput = useRef(null)
  const [message, setMessage] = useState(null) // { ok, text }
  const [exporting, setExporting] = useState(false)

  const hasData = data.assets.length > 0

  // Veriyi JSON dosyası olarak bilgisayara indirir (uygulamaya geri yüklemek için).
  function handleExport() {
    download(JSON.stringify(data, null, 2), 'application/json', `capitrack-${t('yedek', 'backup')}-${today()}.json`)
    setMessage({ ok: true, text: t('Yedek dosyası indirildi.', 'Backup file downloaded.') })
  }

  // Veriyi biçimlendirilmiş bir Excel dosyası olarak indirir (okumak / incelemek için).
  async function handleExcel() {
    setExporting(true)
    try {
      const buffer = await buildExcel(data)
      download(buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `capitrack-${today()}.xlsx`)
      setMessage({
        ok: true,
        text: t(
          'Excel dosyası indirildi: Varlıklar, Aylık Tablo, İşlemler, Aylık Fiyatlar ve Dağılım sayfaları.',
          'Excel file downloaded: Assets, Monthly Table, Transactions, Monthly Prices and Allocation sheets.',
        ),
      })
    } catch {
      setMessage({
        ok: false,
        text: t(
          'Excel dosyası oluşturulamadı. İnternet bağlantını kontrol edip tekrar dene.',
          'Could not create the Excel file. Check your internet connection and try again.',
        ),
      })
    } finally {
      setExporting(false)
    }
  }

  // Seçilen JSON dosyasını okur, kontrol eder ve mevcut verinin yerine koyar.
  async function handleImport(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // aynı dosya tekrar seçilebilsin
    if (!file) return
    try {
      const next = validateData(JSON.parse(await file.text()))
      const summary = summarize(next)
      const question = t(
        `Mevcut verilerin silinip yedekteki ${summary} yüklenecek. Devam edilsin mi?`,
        `Your current data will be replaced with the backup’s ${summary}. Continue?`,
      )
      if (hasData && !window.confirm(question)) return
      replaceData(next)
      setMessage({ ok: true, text: t(`Yedek yüklendi: ${summary}.`, `Backup restored: ${summary}.`) })
    } catch (err) {
      const text =
        err instanceof SyntaxError
          ? t('Dosya okunamadı: geçerli bir JSON dosyası değil.', 'Could not read the file: it is not a valid JSON file.')
          : err.message
      setMessage({ ok: false, text })
    }
  }

  function handleDemo() {
    const question = t('Mevcut verilerin silinip örnek veri yüklenecek. Devam edilsin mi?', 'Your current data will be replaced with sample data. Continue?')
    if (hasData && !window.confirm(question)) return
    const demo = createDemoData()
    replaceData(demo)
    setMessage({
      ok: true,
      text: t(
        `Örnek veri yüklendi: ${summarize(demo)}, 6 aylık geçmiş. Panel’e göz at!`,
        `Sample data loaded: ${summarize(demo)}, 6 months of history. Take a look at the Dashboard!`,
      ),
    })
  }

  function handleReset() {
    const question = t(
      'Tüm varlıkların ve aylık kayıtların kalıcı olarak silinecek. Emin misin?',
      'All your assets and monthly records will be permanently deleted. Are you sure?',
    )
    if (!window.confirm(question)) return
    replaceData(emptyData())
    setMessage({ ok: true, text: t('Tüm veriler silindi.', 'All data deleted.') })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{t('Ayarlar', 'Settings')}</h2>
        <p className="text-sm text-slate-500">
          {t(
            'Verilerin sadece bu tarayıcıda saklanıyor. Kaybetmemek veya başka bir cihaza taşımak için yedek al.',
            'Your data is stored only in this browser. Make a backup so you don’t lose it or to move it to another device.',
          )}
        </p>
      </div>

      {message && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}
        >
          {message.text}
        </p>
      )}

      <section className={card}>
        <h3 className="font-semibold">{t('Yedekle ve geri yükle', 'Back up and restore')}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {t(
            `Şu an kayıtlı: ${summarize(data)}, ${Object.keys(data.prices).length} aylık fiyat kaydı.`,
            `Currently saved: ${summarize(data)}, ${Object.keys(data.prices).length} months of prices.`,
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleExport} disabled={!hasData} className={`${primaryBtn} disabled:opacity-40`}>
            {t('Yedeği indir (JSON)', 'Download backup (JSON)')}
          </button>
          <button onClick={() => fileInput.current?.click()} className={secondaryBtn}>
            {t('Yedekten geri yükle', 'Restore from backup')}
          </button>
          <button onClick={handleExcel} disabled={!hasData || exporting} className={`${secondaryBtn} disabled:opacity-40`}>
            {exporting ? t('Hazırlanıyor…', 'Preparing…') : t('Excel dosyası indir (.xlsx)', 'Download Excel file (.xlsx)')}
          </button>
          {/* Gizli dosya seçici: "Yedekten geri yükle" butonu bunu açar */}
          <input ref={fileInput} type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
        </div>
      </section>

      <section className={card}>
        <h3 className="font-semibold">{t('Örnek veri', 'Sample data')}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {t(
            'Uygulamayı denemek için 9 varlık (3 hisse, 2 fon, altın, ETF, dolar, mevduat), alış/satış işlemleri ve son 6 ayın fiyatlarından oluşan örnek bir portföy yükle.',
            'Load a sample portfolio to try the app: 9 assets (3 stocks, 2 funds, gold, an ETF, US dollars, a deposit), buy/sell transactions and prices for the last 6 months.',
          )}
        </p>
        <button onClick={handleDemo} className={`${secondaryBtn} mt-4`}>
          {t('Örnek veriyi yükle', 'Load sample data')}
        </button>
      </section>

      <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-red-700">{t('Tüm verileri sil', 'Delete all data')}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {t('Bu işlem geri alınamaz. Önce yedek almanı öneririm.', 'This cannot be undone. Making a backup first is recommended.')}
        </p>
        <button
          onClick={handleReset}
          disabled={!hasData}
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
        >
          {t('Tüm verileri sil', 'Delete all data')}
        </button>
      </section>
    </div>
  )
}
