import { useState } from 'react'
import Assets from './pages/Assets'
import Dashboard from './pages/Dashboard'
import MonthlyUpdate from './pages/MonthlyUpdate'
import Settings from './pages/Settings'
import { setAmountsHidden } from './lib/format'
import { usePref } from './lib/prefs'
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
  const [tab, setTab] = useState('panel')

  // Gizlilik modu: açıkken tüm tutarlar ₺***,** olarak görünür. Tercih hatırlanır;
  // kafede gizleyip kapattıysan, siteyi tekrar açtığında da gizli başlar.
  const [hidden, setHidden] = usePref('capitrack:privacy', false)
  setAmountsHidden(hidden) // alttaki tüm ekranlar çizilmeden önce biçimlendiricilere bildir

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 pt-5">
          <div className="flex items-center gap-3">
            <img src="./favicon.svg" alt="" className="h-9 w-9" />
            <div className="flex-1">
              <h1 className="text-lg font-bold leading-tight">CapiTrack</h1>
              <p className="text-xs text-slate-500">Tüm yatırımların, tek yerde</p>
            </div>
            <button
              onClick={() => setHidden(!hidden)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                hidden ? 'bg-slate-800 text-white hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
              aria-pressed={hidden}
              title={hidden ? 'Tutarları göster' : 'Tutarları gizle'}
            >
              <EyeIcon off={hidden} />
              <span className="hidden sm:inline">{hidden ? 'Gizli' : 'Gizle'}</span>
            </button>
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
        {tab === 'panel' && <Dashboard portfolio={portfolio} goTo={setTab} />}
        {tab === 'varliklar' && <Assets portfolio={portfolio} />}
        {tab === 'guncelleme' && <MonthlyUpdate portfolio={portfolio} goToAssets={() => setTab('varliklar')} />}
        {tab === 'ayarlar' && <Settings portfolio={portfolio} />}
      </main>
    </div>
  )
}

// Göz ikonu (açık / üstü çizili). SVG: kodla çizilen, her boyutta net görünen küçük resim.
function EyeIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  )
}
