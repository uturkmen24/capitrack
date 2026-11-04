import { useRef, useState } from 'react'
import { createDemoData } from '../lib/demoData'
import { emptyData, validateData } from '../lib/storage'

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
const primaryBtn = 'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700'
const secondaryBtn =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'

// "Ayarlar" ekranı: yedek alma, yedekten geri yükleme, örnek veri ve sıfırlama.
export default function Settings({ portfolio }) {
  const { data, replaceData } = portfolio
  const fileInput = useRef(null)
  const [message, setMessage] = useState(null) // { ok, text }

  const monthCount = Object.keys(data.records).length
  const hasData = data.assets.length > 0

  // Veriyi JSON dosyası olarak bilgisayara indirir.
  function handleExport() {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const d = new Date()
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const a = document.createElement('a')
    a.href = url
    a.download = `capitrack-yedek-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ ok: true, text: 'Yedek dosyası indirildi.' })
  }

  // Seçilen JSON dosyasını okur, kontrol eder ve mevcut verinin yerine koyar.
  async function handleImport(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // aynı dosya tekrar seçilebilsin
    if (!file) return
    try {
      const next = validateData(JSON.parse(await file.text()))
      const summary = `${next.assets.length} varlık, ${Object.keys(next.records).length} aylık kayıt`
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
    replaceData(createDemoData())
    setMessage({ ok: true, text: 'Örnek veri yüklendi: 5 varlık, 6 aylık geçmiş. Panel’e göz at!' })
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
          Şu an kayıtlı: {data.assets.length} varlık, {monthCount} aylık kayıt.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleExport} disabled={!hasData} className={`${primaryBtn} disabled:opacity-40`}>
            Yedeği indir (JSON)
          </button>
          <button onClick={() => fileInput.current?.click()} className={secondaryBtn}>
            Yedekten geri yükle
          </button>
          {/* Gizli dosya seçici: "Yedekten geri yükle" butonu bunu açar */}
          <input ref={fileInput} type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
        </div>
      </section>

      <section className={card}>
        <h3 className="font-semibold">Örnek veri</h3>
        <p className="mt-1 text-sm text-slate-500">
          Uygulamayı denemek için 5 varlık ve son 6 ayın değerlerinden oluşan örnek bir portföy yükle.
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
