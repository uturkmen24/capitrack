import { useState } from 'react'
import { amountsHidden, amountToInput, currentMonth, formatMonth, formatShare, formatTL, parseAmount, shiftMonth } from '../lib/format'
import { formatDuration, monthsToGoal } from '../lib/goal'

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

// Panel'deki hedef kartı: hedefe ne kadar yaklaşıldığı + bileşik getiriyle ne zaman ulaşılacağı.
export default function GoalCard({ goal, current, onSave }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <GoalForm
        goal={goal}
        onCancel={() => setEditing(false)}
        onSave={(g) => {
          onSave(g)
          setEditing(false)
        }}
      />
    )
  }

  if (!goal) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-4">
        <div>
          <p className="font-medium">Bir hedef belirle</p>
          <p className="text-sm text-slate-500">Ev peşinatı, araba, emeklilik… Ne kadar yaklaştığını ve ne zaman ulaşacağını gör.</p>
        </div>
        <button onClick={() => setEditing(true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Hedef belirle
        </button>
      </div>
    )
  }

  const ratio = Math.min(current / goal.target, 1)
  const months = monthsToGoal(current, goal.target, goal.monthly, goal.annualReturn)
  const reached = months === 0
  const returnLabel = `%${(goal.annualReturn * 100).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`

  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Hedef{goal.name && `: ${goal.name}`}</p>
          <p className="mt-1 text-2xl font-bold">
            {formatShare(current / goal.target)} <span className="text-base font-medium text-slate-500">tamamlandı</span>
          </p>
        </div>
        <button onClick={() => setEditing(true)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
          Düzenle
        </button>
      </div>

      {/* İlerleme çubuğu: aynı rengin açık tonu "yol", koyu tonu "gelinen yer" */}
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-emerald-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        aria-label="Hedefe ilerleme"
      >
        <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${ratio * 100}%` }} />
      </div>

      <div className="mt-2 flex flex-wrap justify-between gap-x-4 text-sm tabular-nums text-slate-600">
        <span>
          {formatTL(current)} / {formatTL(goal.target)}
        </span>
        {!reached && <span>Kalan: {formatTL(goal.target - current)}</span>}
      </div>

      <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {reached ? (
          <>Tebrikler, hedefine ulaştın! Yeni bir hedef belirlemek için “Düzenle”ye bas.</>
        ) : months === Infinity || months > 1200 ? (
          <>Bu koşullarla hedefe ulaşmak 100 yıldan uzun sürüyor. Aylık eklemeyi veya beklenen getiriyi artırmayı dene.</>
        ) : (
          <>
            Aylık ortalama <strong>{formatTL(goal.monthly)}</strong> ekleme ve yıllık <strong>{returnLabel}</strong> reel getiri
            ile bu hedefe yaklaşık <strong>{formatDuration(months)}</strong> sonra (
            <strong>{formatMonth(shiftMonth(currentMonth(), months))}</strong>) ulaşırsın.
          </>
        )}
      </p>
      <p className="mt-2 text-xs text-slate-400">
        Reel getiri, enflasyondan arındırılmış getiridir; hesap bugünkü TL değeriyle yapılır. Bu bir tahmindir, garanti değildir.
      </p>
    </section>
  )
}

function GoalForm({ goal, onSave, onCancel }) {
  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(amountToInput(goal?.target))
  const [monthly, setMonthly] = useState(amountToInput(goal?.monthly ?? 5000))
  const [annual, setAnnual] = useState(amountToInput(goal ? Math.round(goal.annualReturn * 10000) / 100 : 10))
  const [error, setError] = useState('')
  const blur = amountsHidden() ? 'blur-sm focus:blur-none' : ''

  function handleSubmit(e) {
    e.preventDefault()
    const t = parseAmount(target)
    const m = parseAmount(monthly) ?? 0
    const a = parseAmount(annual) ?? 0
    if (!(t > 0)) return setError('Hedef tutarı sıfırdan büyük bir sayı olmalı.')
    if (Number.isNaN(m)) return setError('Aylık ekleme bir sayı olmalı (ör. 5.000).')
    if (Number.isNaN(a) || a > 100) return setError('Yıllık getiri 0 ile 100 arasında bir yüzde olmalı (ör. 10).')
    onSave({ name: name.trim(), target: t, monthly: m, annualReturn: a / 100 })
  }

  return (
    <form onSubmit={handleSubmit} className={card}>
      <h3 className="mb-4 font-semibold">{goal ? 'Hedefi düzenle' : 'Yeni hedef'}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Hedef adı</span>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="ör. Ev peşinatı" autoFocus />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Hedef tutar (₺) *</span>
          <input className={`${inputClass} ${blur}`} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="ör. 1.000.000" inputMode="decimal" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Aylık ekleme (₺)</span>
          <input className={`${inputClass} ${blur}`} value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="ör. 5.000" inputMode="decimal" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Beklenen yıllık reel getiri (%)</span>
          <input className={inputClass} value={annual} onChange={(e) => setAnnual(e.target.value)} placeholder="ör. 10" inputMode="decimal" />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex flex-wrap justify-between gap-2">
        {goal ? (
          <button
            type="button"
            onClick={() => window.confirm('Hedef kaldırılsın mı?') && onSave(null)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Hedefi kaldır
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Vazgeç
          </button>
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Kaydet
          </button>
        </div>
      </div>
    </form>
  )
}
