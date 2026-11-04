import { useState } from 'react'
import ComingSoon from './components/ComingSoon'
import Assets from './pages/Assets'
import { usePortfolio } from './lib/usePortfolio'

// Üst menüdeki sekmeler
const TABS = [
  { id: 'panel', label: 'Panel' },
  { id: 'varliklar', label: 'Varlıklarım' },
  { id: 'guncelleme', label: 'Aylık Güncelleme' },
  { id: 'ayarlar', label: 'Ayarlar' },
]

export default function App() {
  // Tüm veri burada bir kez yüklenir ve sekmelere aktarılır.
  const portfolio = usePortfolio()
  const [tab, setTab] = useState('varliklar')

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 pt-5">
          <div className="flex items-center gap-3">
            <img src="./favicon.svg" alt="" className="h-9 w-9" />
            <div>
              <h1 className="text-lg font-bold leading-tight">CapiTrack</h1>
              <p className="text-xs text-slate-500">Tüm yatırımların, tek yerde</p>
            </div>
          </div>

          <nav className="-mb-px mt-4 flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'panel' && (
          <ComingSoon
            title="Panel"
            text="Toplam varlık, artış grafiği ve dağılım grafikleri 3. aşamada burada olacak."
          />
        )}
        {tab === 'varliklar' && <Assets portfolio={portfolio} />}
        {tab === 'guncelleme' && (
          <ComingSoon
            title="Aylık Güncelleme"
            text="Tüm varlıklarının o ayki değerini tek ekranda girme özelliği 2. aşamada geliyor."
          />
        )}
        {tab === 'ayarlar' && (
          <ComingSoon title="Ayarlar" text="JSON yedekleme, içe aktarma ve örnek veri 4. aşamada geliyor." />
        )}
      </main>
    </div>
  )
}
