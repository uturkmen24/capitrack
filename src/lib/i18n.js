// Dil desteği (Türkçe / İngilizce). Harici kütüphane yok.
//
// Her metin kodun içinde iki diliyle yan yana yazılır:  t('Varlıklarım', 'My Assets')
// Böylece bir metnin çevirisi hep yanında durur; bir anahtar dosyasında arayıp eşleştirmek gerekmez.
//
// Seçili dili App.jsx yönetir: dil değişince setLang çağrılır ve tüm ekran yeniden çizilir
// (gizlilik modundaki setAmountsHidden ile aynı yöntem).

let lang = 'tr'

export function setLang(value) {
  lang = value === 'en' ? 'en' : 'tr'
}

export function getLang() {
  return lang
}

/** Seçili dile göre metni seçer: t('Kaydet', 'Save') */
export function t(tr, en) {
  return lang === 'en' ? en : tr
}

/** Sayı ve tarih biçimlendirmede kullanılan yerel ayar */
export function locale() {
  return lang === 'en' ? 'en-US' : 'tr-TR'
}
