import { useState } from 'react'
import { depositComparison, realReturn } from '../lib/benchmark'
import { amountToInput, formatPercent, formatSignedTL, formatTL, parseAmount } from '../lib/format'
import { usePref } from '../lib/prefs'

// "Benchmark & Fırsat Maliyeti": iki kart yan yana (telefonda alt alta).
// 1) Enflasyona göre reel getiri (Fisher)  2) Para sadece mevduatta dursaydı ne olurdu?
// Oranlar kullanıcı tarafından değiştirilebilir ve bu tarayıcıda hatırlanır.
export default function BenchmarkCards({ transactions, value, cardClass }) {
  const [inflation, setInflation] = usePref('capitrack:inflation', 40)
  const [depositRate, setDepositRate] = usePref('capitrack:depositRate', 45)

  const real = realReturn(value, transactions, inflation / 100)
  const dep = depositComparison(value, transactions, depositRate / 100)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className={cardClass}>
        <CardHeader
          title="Enflasyona göre reel getiri"
          subtitle="Satın alma gücün arttı mı?"
          input={<RateInput label="Yıllık TÜFE" value={inflation} onChange={setInflation} />}
        />
        {real ? (
          <>
            <Badge up={real.real >= 0}>
              {real.real >= 0
                ? `Reel Kazanç: ${formatPercent(real.real, 1)} (Satın Alma Gücü Arttı)`
                : `Reel Kayıp: ${formatPercent(real.real, 1)}`}
            </Badge>
            <Rows
              rows={[
                ['Nominal getiri', formatPercent(real.nominal, 1)],
                ['Aynı dönemdeki enflasyon', formatPercent(real.periodInflation, 1)],
                ['Alım gücünü korumak için gereken', formatTL(real.needed)],
              ]}
            />
            <Hint>
              Reel getiri = (1 + nominal) ÷ (1 + enflasyon) − 1. Her para girişi kendi tarihinden bugüne enflasyonla büyütülür,
              satışlar düşülür.
            </Hint>
          </>
        ) : (
          <Empty />
        )}
      </section>

      <section className={cardClass}>
        <CardHeader
          title="Sadece mevduat olsaydı"
          subtitle="Fırsat maliyeti"
          input={<RateInput label="Yıllık faiz" value={depositRate} onChange={setDepositRate} />}
        />
        {dep ? (
          <>
            <Badge up={dep.diff >= 0}>
              {dep.diff >= 0
                ? `Faize göre ${formatSignedTL(dep.diff)} daha kârlı (${formatPercent(dep.alpha, 1)} Alfa)`
                : `Faizin ${formatTL(Math.abs(dep.diff))} gerisinde (${formatPercent(dep.alpha, 1)})`}
            </Badge>
            <Rows
              rows={[
                ['Portföyün bugünkü değeri', formatTL(value)],
                ['Mevduatta olsaydı', formatTL(dep.deposit)],
                ['Yatırılan net para', formatTL(dep.net)],
              ]}
            />
            <Hint>
              Her alış aynı gün mevduata yatırılmış gibi hesaplanır: Tutar × (1 + faiz)^(gün ÷ 365). Stopaj sonrası (net) faizi
              yazarsan karşılaştırma daha adil olur.
            </Hint>
          </>
        ) : (
          <Empty />
        )}
      </section>
    </div>
  )
}

function CardHeader({ title, subtitle, input }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {input}
    </div>
  )
}

// Sonuç rozeti: yön hem renkle hem ▲/▼ işaretiyle gösterilir (renk körleri için).
function Badge({ up, children }) {
  return (
    <p
      className={`inline-flex items-start gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums ${
        up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      <span aria-hidden="true">{up ? '▲' : '▼'}</span>
      <span>{children}</span>
    </p>
  )
}

function Rows({ rows }) {
  return (
    <dl className="mt-4 space-y-1.5 text-sm">
      {rows.map(([label, val]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-slate-500">{label}</dt>
          <dd className="font-medium tabular-nums">{val}</dd>
        </div>
      ))}
    </dl>
  )
}

function Hint({ children }) {
  return <p className="mt-3 text-xs text-slate-400">{children}</p>
}

function Empty() {
  return <p className="text-sm text-slate-500">Hesap için yatırılan net paranın sıfırdan büyük olması gerekiyor.</p>
}

// Küçük yüzde kutusu. Yazarken geçersiz değer (boş, harf) kaydedilmez; kutu kırmızı olur, son geçerli oran kullanılır.
function RateInput({ label, value, onChange }) {
  const [text, setText] = useState(amountToInput(value))
  const parsed = parseAmount(text)
  const valid = (n) => Number.isFinite(n) && n <= 1000
  return (
    <label className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
      {label}
      <span
        className={`flex items-center rounded-lg border bg-white focus-within:ring-2 ${
          valid(parsed) ? 'border-slate-300 focus-within:border-emerald-500 focus-within:ring-emerald-500/20' : 'border-red-400 ring-red-400/20'
        }`}
      >
        <span className="pl-2 text-slate-400">%</span>
        <input
          className="w-14 bg-transparent py-1 pl-1 pr-2 text-right text-sm tabular-nums text-slate-800 outline-none"
          value={text}
          inputMode="decimal"
          aria-label={`${label} (%)`}
          onChange={(e) => {
            setText(e.target.value)
            const n = parseAmount(e.target.value)
            if (valid(n)) onChange(n)
          }}
        />
      </span>
    </label>
  )
}
