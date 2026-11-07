// Açık / karanlık tema.
//
// Arayüz renkleri (kartlar, yazılar, kenarlıklar) index.css'te <html class="dark"> altında yeniden tanımlanır;
// bileşenlerin tek tek değişmesi gerekmez. Grafikler ise renklerini doğrudan SVG'ye yazdığı için
// karanlık modda kullanacakları renkler burada tutulur.
//
// Seçili temayı App.jsx yönetir (setDark), dil ve gizlilik modundaki yöntemle aynı.

let dark = false

export function setDark(value) {
  dark = Boolean(value)
}

export function isDark() {
  return dark
}

/** Sistem karanlık modda mı? (ilk açılışta varsayılan tema için) */
export function systemPrefersDark() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

// Grafik "çerçeve" renkleri: ızgara, eksen, soluk yazılar, maliyet çizgisi, değer çizgisi ve
// noktaların etrafındaki halka (kart zemini rengiyle aynı ki nokta çizgiden ayrılsın).
// Karanlık değerler dataviz paletinin karanlık adımlarından, kart zeminimize (#18202f) göre seçildi.
const CHART = {
  light: { grid: '#e1e0d9', axis: '#c3c2b7', muted: '#898781', cost: '#94a3b8', value: '#059669', surface: '#ffffff' },
  dark: { grid: '#2b364a', axis: '#3a475e', muted: '#8f9bb0', cost: '#7d8aa1', value: '#10b981', surface: '#18202f' },
}

export function chartColors() {
  return dark ? CHART.dark : CHART.light
}
