import { useState } from 'react'

// Yazdıkça altında öneri listesi açılan metin kutusu.
// Tarayıcının hazır <datalist> özelliği bazı Windows ekran ölçeklerinde listeyi yanlış yerde
// gösterdiği için listeyi kendimiz, kutunun hemen altına çiziyoruz.
export default function SuggestInput({ value, onChange, suggestions, className, ...rest }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1) // klavyeyle seçili öneri

  // Kurum adları Türkçe olduğu için (İş Bankası) karşılaştırma her dilde Türkçe küçük harf kuralıyla yapılır
  const q = value.trim().toLocaleLowerCase('tr')
  const matches = suggestions.filter((s) => {
    const low = s.toLocaleLowerCase('tr')
    return low.includes(q) && low !== q
  })
  const show = open && matches.length > 0

  function pick(s) {
    onChange(s)
    setOpen(false)
    setActive(-1)
  }

  function handleKeyDown(e) {
    if (!show) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault() // formu göndermek yerine öneriyi seç
      pick(matches[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <input
        {...rest}
        className={className}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {show && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {matches.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                // onMouseDown: kutu odağı kaybetmeden (liste kapanmadan) seçimi yakala
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(s)
                }}
                className={`block w-full px-3 py-1.5 text-left text-sm ${
                  i === active ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50'
                }`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
