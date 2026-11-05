// Kullanıcı tercihlerini (gizlilik modu, para birimi, grafik türü…) hatırlayan küçük yardımcı.
// useState gibi çalışır, ek olarak değeri LocalStorage'a yazar; sayfa yeniden açılınca kaldığı yerden devam eder.
// Portföy verisinden ayrı tutulur: bunlar yedek dosyasına girmeyen, sadece bu tarayıcıya ait ayarlardır.

import { useEffect, useState } from 'react'

export function usePref(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw == null ? initial : JSON.parse(raw)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Depolama kapalıysa tercih sadece bu oturumda geçerli olur; uygulama çalışmaya devam eder.
    }
  }, [key, value])

  return [value, setValue]
}
