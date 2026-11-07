import { useLayoutEffect, useState } from 'react'
import Assets from './pages/Assets'
import Dashboard from './pages/Dashboard'
import MonthlyUpdate from './pages/MonthlyUpdate'
import Settings from './pages/Settings'
import { setAmountsHidden } from './lib/format'
import { setLang, t } from './lib/i18n'
import { usePref } from './lib/prefs'
import { setDark, systemPrefersDark } from './lib/theme'
import { usePortfolio } from './lib/usePortfolio'

export default function App() {
  // Dil: Türkçe / İngilizce. Seçim hatırlanır. Örnek veri seçili dilde oluşturulduğu için
  // veri yüklenmeden (usePortfolio) önce bildirilir.
  const [lang, setLangPref] = usePref('capitrack:lang', 'tr')
  setLang(lang)

  // Tema: kullanıcı hiç seçmediyse bilgisayarın ayarına uyar; seçtiyse o hatırlanır.
  const [theme, setTheme] = usePref('capitrack:theme', null)
  const dark = theme ? theme === 'dark' : systemPrefersDark()
  setDark(dark)

  // Tüm veri burada bir kez yüklenir ve sekmelere aktarılır.
  const portfolio = usePortfolio()
  const [tab, setTab] = useState('panel')

  // Gizlilik modu: açıkken tüm tutarlar ₺***,** olarak görünür. Tercih hatırlanır;
  // kafede gizleyip kapattıysan, siteyi tekrar açtığında da gizli başlar.
  const [hidden, setHidden] = usePref('capitrack:privacy', false)
  setAmountsHidden(hidden) // alttaki tüm ekranlar çizilmeden önce biçimlendiricilere bildir

  // <html> etiketine dil ve tema bilgisini yaz (karanlık renkler index.css'te "dark" sınıfına bağlı).
  // useLayoutEffect: ekran boyanmadan önce çalışır, böylece tema değişirken bir an yanlış renk görünmez.
  useLayoutEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.classList.toggle('dark', dark)
  }, [lang, dark])

  const tabs = [
    { id: 'panel', label: t('Panel', 'Dashboard') },
    { id: 'varliklar', label: t('Varlıklarım', 'My Assets') },
    { id: 'guncelleme', label: t('Aylık Güncelleme', 'Monthly Update') },
    { id: 'ayarlar', label: t('Ayarlar', 'Settings') },
  ]

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 pt-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="./favicon.svg" alt="" className="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold leading-tight">CapiTrack</h1>
              <p className="truncate text-xs text-slate-500">{t('Tüm yatırımların, tek yerde', 'All your investments in one place')}</p>
            </div>

            {/* Dil seçici: TR / EN */}
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold" role="group" aria-label={t('Dil', 'Language')}>
              {[
                ['tr', 'TR'],
                ['en', 'EN'],
              ].map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => setLangPref(code)}
                  aria-pressed={lang === code}
                  title={code === 'tr' ? 'Türkçe' : 'English'}
                  className={`rounded-md px-2 py-1 ${lang === code ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tema: açık / karanlık */}
            <button
              onClick={() => setTheme(dark ? 'light' : 'dark')}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-pressed={dark}
              title={dark ? t('Açık temaya geç', 'Switch to light theme') : t('Karanlık temaya geç', 'Switch to dark theme')}
              aria-label={t('Karanlık tema', 'Dark theme')}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Gizlilik modu */}
            <button
              onClick={() => setHidden(!hidden)}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:px-3 ${
                hidden
                  ? 'bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-300 dark:hover:bg-slate-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              aria-pressed={hidden}
              title={hidden ? t('Tutarları göster', 'Show amounts') : t('Tutarları gizle', 'Hide amounts')}
            >
              <EyeIcon off={hidden} />
              <span className="hidden sm:inline">{hidden ? t('Gizli', 'Hidden') : t('Gizle', 'Hide')}</span>
            </button>
          </div>

          <nav className="-mb-px mt-4 flex gap-1 overflow-x-auto">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === tb.id
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tb.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* key={lang}: dil değişince ekran sıfırdan çizilir. Formlardaki yazılı sayılar ("312,50" ↔ "312.50")
          yeni dilin yazımıyla yeniden doldurulur; eski yazım yanlış okunmaz. */}
      <main key={lang} className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'panel' && <Dashboard portfolio={portfolio} goTo={setTab} />}
        {tab === 'varliklar' && <Assets portfolio={portfolio} />}
        {tab === 'guncelleme' && <MonthlyUpdate portfolio={portfolio} goToAssets={() => setTab('varliklar')} />}
        {tab === 'ayarlar' && <Settings portfolio={portfolio} />}
      </main>
    </div>
  )
}

// İkonlar: kodla çizilen, her boyutta net görünen küçük resimler (SVG)
const iconProps = {
  viewBox: '0 0 24 24',
  className: 'h-5 w-5',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

// Göz ikonu (açık / üstü çizili)
function EyeIcon({ off }) {
  return (
    <svg {...iconProps}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}
