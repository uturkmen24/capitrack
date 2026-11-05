import { useRef, useState } from 'react'
import { createDemoData } from '../lib/demoData'
import { buildExcel } from '../lib/exportExcel'
import { today } from '../lib/format'
import { emptyData, validateData } from '../lib/storage'

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
const primaryBtn = 'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700'
const secondaryBtn =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'

/** "9 varlık, 14 işlem" */
const summarize = (d) => `${d.assets.length} varlık, ${d.transactions.length} işlem`

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
    download(JSON.stringify(data, null, 2), 'application/json', `capitrack-yedek-${today()}.json`)
    setMessage({ ok: true, text: 'Yedek dosyası indirildi.' })
  }

  // Veriyi biçimlendirilmiş bir Excel dosyası olarak indirir (okumak / incelemek için).
  async function handleExcel() {
    setExporting(true)
    try {
      const buffer = await buildExcel(data)
      download(buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `capitrack-${today()}.xlsx`)
      setMessage({ ok: true, text: 'Excel dosyası indirildi: Varlıklar, Aylık Tablo, İşlemler, Aylık Fiyatlar ve Dağılım sayfaları.' })
    } catch {
      setMessage({ ok: false, text: 'Excel dosyası oluşturulamadı. İnternet bağlantını kontrol edip tekrar dene.' })
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
      if (hasData && !window.confirm(`Mevcut verilerin silinip yedekteki ${summary} yüklenecek. Devam edilsin mi?`)) return
      replaceData(next)
      setMessage({ ok: true, text: `Yedek yüklendi: ${summary}.` })
    } catch (err) {
      const text = err instanceof SyntaxError ? 'Dosya okunamadı: geçerli bir JSON dosyası değil.' : err.message
      setMessage({ ok: false, text })
    }
  }

  function handleDemo() {
    if (hasData && !window.confirm('Mevcut verilerin silinip örnek veri yüklenecek. Devam edilsin mi?')) return
    const demo = createDemoData()
    replaceData(demo)
    setMessage({ ok: true, text: `Örnek veri yüklendi: ${summarize(demo)}, 6 aylık geçmiş. Panel’e göz at!` })
  }

  function handleReset() {
    if (!window.confirm('Tüm varlıkların ve aylık kayıtların kalıcı olarak silinecek. Emin misin?')) return
    replaceData(emptyData())
    setMessage({ ok: true, text: 'Tüm veriler silindi.' })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Ayarlar</h2>
        <p className="text-sm text-slate-500">
          Verilerin sadece bu tarayıcıda saklanıyor. Kaybetmemek veya başka bir cihaza taşımak için yedek al.
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
        <h3 className="font-semibold">Yedekle ve geri yükle</h3>
        <p className="mt-1 text-sm text-slate-500">
          Şu an kayıtlı: {summarize(data)}, {Object.keys(data.prices).length} aylık fiyat kaydı.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleExport} disabled={!hasData} className={`${primaryBtn} disabled:opacity-40`}>
            Yedeği indir (JSON)
          </button>
          <button onClick={() => fileInput.current?.click()} className={secondaryBtn}>
            Yedekten geri yükle
          </button>
          <button onClick={handleExcel} disabled={!hasData || exporting} className={`${secondaryBtn} disabled:opacity-40`}>
            {exporting ? 'Hazırlanıyor…' : 'Excel dosyası indir (.xlsx)'}
          </button>
          {/* Gizli dosya seçici: "Yedekten geri yükle" butonu bunu açar */}
          <input ref={fileInput} type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
        </div>
      </section>

      <section className={card}>
        <h3 className="font-semibold">Örnek veri</h3>
        <p className="mt-1 text-sm text-slate-500">
          Uygulamayı denemek için 9 varlık (3 hisse, 2 fon, altın, ETF, dolar, mevduat), alış/satış işlemleri ve son 6 ayın
          fiyatlarından oluşan örnek bir portföy yükle.
        </p>
        <button onClick={handleDemo} className={`${secondaryBtn} mt-4`}>
          Örnek veriyi yükle
        </button>
      </section>

      <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-red-700">Tüm verileri sil</h3>
        <p className="mt-1 text-sm text-slate-500">Bu işlem geri alınamaz. Önce yedek almanı öneririm.</p>
        <button
          onClick={handleReset}
          disabled={!hasData}
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
        >
          Tüm verileri sil
        </button>
      </section>
    </div>
  )
}
