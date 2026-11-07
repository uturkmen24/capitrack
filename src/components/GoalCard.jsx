import { useState } from 'react'
import {
  amountsHidden,
  amountToInput,
  currentMonth,
  formatMonth,
  formatPctValue,
  formatShare,
  formatTL,
  parseAmount,
  shiftMonth,
} from '../lib/format'
import { formatDuration, monthsToGoal } from '../lib/goal'
import { t } from '../lib/i18n'

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
          <p className="font-medium">{t('Bir hedef belirle', 'Set a goal')}</p>
          <p className="text-sm text-slate-500">
            {t(
              'Ev peşinatı, araba, emeklilik… Ne kadar yaklaştığını ve ne zaman ulaşacağını gör.',
              'A house down payment, a car, retirement… See how close you are and when you will get there.',
            )}
          </p>
        </div>
        <button onClick={() => setEditing(true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          {t('Hedef belirle', 'Set goal')}
        </button>
      </div>
    )
  }

  const ratio = Math.min(current / goal.target, 1)
  const months = monthsToGoal(current, goal.target, goal.monthly, goal.annualReturn)
  const reached = months === 0
  const returnLabel = formatPctValue(goal.annualReturn * 100)
  const when = months > 0 && months <= 1200 ? formatMonth(shiftMonth(currentMonth(), months)) : ''

  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {t('Hedef', 'Goal')}
            {goal.name && `: ${goal.name}`}
          </p>
          <p className="mt-1 text-2xl font-bold">
            {formatShare(current / goal.target)}{' '}
            <span className="text-base font-medium text-slate-500">{t('tamamlandı', 'complete')}</span>
          </p>
        </div>
        <button onClick={() => setEditing(true)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
          {t('Düzenle', 'Edit')}
        </button>
      </div>

      {/* İlerleme çubuğu: aynı rengin açık tonu "yol", koyu tonu "gelinen yer" */}
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-emerald-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        aria-label={t('Hedefe ilerleme', 'Progress toward goal')}
      >
        <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${ratio * 100}%` }} />
      </div>

      <div className="mt-2 flex flex-wrap justify-between gap-x-4 text-sm tabular-nums text-slate-600">
        <span>
          {formatTL(current)} / {formatTL(goal.target)}
        </span>
        {!reached && (
          <span>
            {t('Kalan', 'Remaining')}: {formatTL(goal.target - current)}
          </span>
        )}
      </div>

      <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {reached ? (
          t(
            'Tebrikler, hedefine ulaştın! Yeni bir hedef belirlemek için “Düzenle”ye bas.',
            'Congratulations, you reached your goal! Press “Edit” to set a new one.',
          )
        ) : months === Infinity || months > 1200 ? (
          t(
            'Bu koşullarla hedefe ulaşmak 100 yıldan uzun sürüyor. Aylık eklemeyi veya beklenen getiriyi artırmayı dene.',
            'At this pace it would take more than 100 years to reach the goal. Try increasing the monthly contribution or the expected return.',
          )
        ) : t(
          <>
            Aylık ortalama <strong>{formatTL(goal.monthly)}</strong> ekleme ve yıllık <strong>{returnLabel}</strong> reel getiri ile bu
            hedefe yaklaşık <strong>{formatDuration(months)}</strong> sonra (<strong>{when}</strong>) ulaşırsın.
          </>,
          <>
            Adding about <strong>{formatTL(goal.monthly)}</strong> a month with a <strong>{returnLabel}</strong> annual real return,
            you will reach this goal in about <strong>{formatDuration(months)}</strong> (<strong>{when}</strong>).
          </>,
        )}
      </p>
      <p className="mt-2 text-xs text-slate-400">
        {t(
          'Reel getiri, enflasyondan arındırılmış getiridir; hesap bugünkü TL değeriyle yapılır. Bu bir tahmindir, garanti değildir.',
          'Real return means return after inflation; the calculation uses today’s lira value. This is an estimate, not a guarantee.',
        )}
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
    const tg = parseAmount(target)
    const m = parseAmount(monthly) ?? 0
    const a = parseAmount(annual) ?? 0
    if (!(tg > 0)) return setError(t('Hedef tutarı sıfırdan büyük bir sayı olmalı.', 'The goal amount must be a number greater than zero.'))
    if (Number.isNaN(m)) return setError(t('Aylık ekleme bir sayı olmalı (ör. 5.000).', 'The monthly contribution must be a number (e.g. 5,000).'))
    if (Number.isNaN(a) || a > 100)
      return setError(t('Yıllık getiri 0 ile 100 arasında bir yüzde olmalı (ör. 10).', 'The annual return must be a percentage between 0 and 100 (e.g. 10).'))
    onSave({ name: name.trim(), target: tg, monthly: m, annualReturn: a / 100 })
  }

  return (
    <form onSubmit={handleSubmit} className={card}>
      <h3 className="mb-4 font-semibold">{goal ? t('Hedefi düzenle', 'Edit goal') : t('Yeni hedef', 'New goal')}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">{t('Hedef adı', 'Goal name')}</span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('ör. Ev peşinatı', 'e.g. House down payment')}
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">{t('Hedef tutar (₺)', 'Goal amount (₺)')} *</span>
          <input
            className={`${inputClass} ${blur}`}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={t('ör. 1.000.000', 'e.g. 1,000,000')}
            inputMode="decimal"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">{t('Aylık ekleme (₺)', 'Monthly contribution (₺)')}</span>
          <input
            className={`${inputClass} ${blur}`}
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            placeholder={t('ör. 5.000', 'e.g. 5,000')}
            inputMode="decimal"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            {t('Beklenen yıllık reel getiri (%)', 'Expected annual real return (%)')}
          </span>
          <input
            className={inputClass}
            value={annual}
            onChange={(e) => setAnnual(e.target.value)}
            placeholder={t('ör. 10', 'e.g. 10')}
            inputMode="decimal"
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex flex-wrap justify-between gap-2">
        {goal ? (
          <button
            type="button"
            onClick={() => window.confirm(t('Hedef kaldırılsın mı?', 'Remove the goal?')) && onSave(null)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            {t('Hedefi kaldır', 'Remove goal')}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            {t('Vazgeç', 'Cancel')}
          </button>
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            {t('Kaydet', 'Save')}
          </button>
        </div>
      </div>
    </form>
  )
}
