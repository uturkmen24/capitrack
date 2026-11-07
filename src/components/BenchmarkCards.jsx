import { useState } from 'react'
import { depositComparison, realReturn } from '../lib/benchmark'
import { amountToInput, formatPercent, formatSignedTL, formatTL, parseAmount } from '../lib/format'
import { t } from '../lib/i18n'
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
          title={t('Enflasyona göre reel getiri', 'Real return after inflation')}
          subtitle={t('Satın alma gücün arttı mı?', 'Did your purchasing power grow?')}
          input={<RateInput label={t('Yıllık TÜFE', 'Annual CPI')} value={inflation} onChange={setInflation} />}
        />
        {real ? (
          <>
            <Badge up={real.real >= 0}>
              {real.real >= 0
                ? t(
                    `Reel Kazanç: ${formatPercent(real.real, 1)} (Satın Alma Gücü Arttı)`,
                    `Real Gain: ${formatPercent(real.real, 1)} (Purchasing Power Up)`,
                  )
                : t(`Reel Kayıp: ${formatPercent(real.real, 1)}`, `Real Loss: ${formatPercent(real.real, 1)}`)}
            </Badge>
            <Rows
              rows={[
                [t('Nominal getiri', 'Nominal return'), formatPercent(real.nominal, 1)],
                [t('Aynı dönemdeki enflasyon', 'Inflation over the same period'), formatPercent(real.periodInflation, 1)],
                [t('Alım gücünü korumak için gereken', 'Needed to keep purchasing power'), formatTL(real.needed)],
              ]}
            />
            <Hint>
              {t(
                'Reel getiri = (1 + nominal) ÷ (1 + enflasyon) − 1. Her para girişi kendi tarihinden bugüne enflasyonla büyütülür, satışlar düşülür.',
                'Real return = (1 + nominal) ÷ (1 + inflation) − 1. Each contribution is grown by inflation from its own date to today; sales are subtracted.',
              )}
            </Hint>
          </>
        ) : (
          <Empty />
        )}
      </section>

      <section className={cardClass}>
        <CardHeader
          title={t('Sadece mevduat olsaydı', 'If it were all in a deposit')}
          subtitle={t('Fırsat maliyeti', 'Opportunity cost')}
          input={<RateInput label={t('Yıllık faiz', 'Annual rate')} value={depositRate} onChange={setDepositRate} />}
        />
        {dep ? (
          <>
            <Badge up={dep.diff >= 0}>
              {dep.diff >= 0
                ? t(
                    `Faize göre ${formatSignedTL(dep.diff)} daha kârlı (${formatPercent(dep.alpha, 1)} Alfa)`,
                    `${formatSignedTL(dep.diff)} ahead of the deposit (${formatPercent(dep.alpha, 1)} Alpha)`,
                  )
                : t(
                    `Faizin ${formatTL(Math.abs(dep.diff))} gerisinde (${formatPercent(dep.alpha, 1)})`,
                    `${formatTL(Math.abs(dep.diff))} behind the deposit (${formatPercent(dep.alpha, 1)})`,
                  )}
            </Badge>
            <Rows
              rows={[
                [t('Portföyün bugünkü değeri', 'Portfolio value today'), formatTL(value)],
                [t('Mevduatta olsaydı', 'If held in a deposit'), formatTL(dep.deposit)],
                [t('Yatırılan net para', 'Net amount invested'), formatTL(dep.net)],
              ]}
            />
            <Hint>
              {t(
                'Her alış aynı gün mevduata yatırılmış gibi hesaplanır: Tutar × (1 + faiz)^(gün ÷ 365). Stopaj sonrası (net) faizi yazarsan karşılaştırma daha adil olur.',
                'Each purchase is treated as if it had been deposited on the same day: Amount × (1 + rate)^(days ÷ 365). Enter the after-tax (net) rate for a fairer comparison.',
              )}
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
  return (
    <p className="text-sm text-slate-500">
      {t('Hesap için yatırılan net paranın sıfırdan büyük olması gerekiyor.', 'The net amount invested must be greater than zero.')}
    </p>
  )
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
