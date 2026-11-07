import { useState } from 'react'
import { getType } from '../lib/constants'
import {
  amountToInput,
  currentMonth,
  formatDate,
  formatPctValue,
  formatQty,
  formatShare,
  formatSignedTL,
  formatTL,
  parseAmount,
  today,
} from '../lib/format'
import { t } from '../lib/i18n'
import { usePref } from '../lib/prefs'
import {
  STEP_OPTIONS,
  buildPlan,
  currentShares,
  isValidPlan,
  minMove,
  rebalanceRows,
  roundQty,
  stepDate,
  sumsTo100,
} from '../lib/rebalance'
import { newId } from '../lib/usePortfolio'

const NEW_COLOR = '#94a3b8'
const pill = (active) =>
  `rounded-md px-3 py-1 text-sm ${active ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`

// Kayıtlı plandaki bir kalemin adı ve birimi. Türe göre planlarda ad, türün o anki dildeki adıdır
// (plan Türkçe oluşturulup İngilizce açılsa da "Gold" yazsın). Varlık adları kullanıcının yazdığı gibi kalır.
const moveLabel = (plan, m) => (plan.by === 'type' && m.typeId ? getType(m.typeId).label : m.label)
const moveUnit = (m) => (m.typeId ? getType(m.typeId).unit : m.unit)

// "Kademeli portföy dengeleme": Panel'de açılır-kapanır bir kart.
// Plan yoksa hedef formu, plan varsa adım adım yol haritası görünür. Plan ve işaretlenen adımlar bu tarayıcıda saklanır.
export default function RebalancePlanner({ data }) {
  const [open, setOpen] = usePref('capitrack:rebalance:open', false)
  const [stored, setPlan] = usePref('capitrack:rebalance:plan', null)
  const [editing, setEditing] = useState(false)
  const plan = isValidPlan(stored) ? stored : null
  const done = plan ? plan.done.filter(Boolean).length : 0

  let summary = t('Hedef dağılımını gir, alım-satımları adım adım planla', 'Enter a target allocation and plan your trades step by step')
  if (plan && done === plan.steps) summary = t('Plan tamamlandı', 'Plan completed')
  else if (plan) {
    const next = formatDate(stepDate(plan.createdAt, plan.done.indexOf(false), plan.period))
    summary = t(`${done} / ${plan.steps} adım tamamlandı · Sıradaki: ${next}`, `${done} / ${plan.steps} steps done · Next: ${next}`)
  }

  function toggleStep(i) {
    setPlan({ ...plan, done: plan.done.map((d, j) => (j === i ? !d : d)) })
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
      >
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true">
          ▸
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{t('Kademeli portföy dengeleme', 'Gradual portfolio rebalancing')}</span>
          <span className="block text-sm text-slate-500">{summary}</span>
        </span>
        {plan && (
          <span className="hidden h-2 w-24 shrink-0 rounded-full bg-emerald-100 sm:block" aria-hidden="true">
            <span className="block h-2 rounded-full bg-emerald-600" style={{ width: `${(done / plan.steps) * 100}%` }} />
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-slate-200 p-5">
          {editing || !plan ? (
            <PlanForm
              data={data}
              plan={plan}
              onCreate={(p) => {
                if (plan && done > 0 && done < plan.steps) {
                  const ok = window.confirm(
                    t(
                      `Mevcut planda ${done} adım tamamlandı. Yeni plan eskisinin yerine geçsin mi?`,
                      `${done} steps of the current plan are done. Replace it with the new plan?`,
                    ),
                  )
                  if (!ok) return
                }
                setPlan(p)
                setEditing(false)
              }}
              onCancel={plan ? () => setEditing(false) : null}
            />
          ) : (
            <PlanView
              plan={plan}
              onToggleStep={toggleStep}
              onEdit={() => setEditing(true)}
              onDelete={() => window.confirm(t('Plan ve işaretlediğin adımlar silinsin mi?', 'Delete the plan and your checked steps?')) && setPlan(null)}
            />
          )}
        </div>
      )}
    </section>
  )
}

// --- Hedef formu ---

/** Formun başlangıç yüzdeleri: aynı kırılımda kayıtlı plan varsa onun hedefleri, yoksa bugünkü paylar. */
function initialInputs(rows, plan, by) {
  const shares = currentShares(rows)
  const fromPlan = plan?.by === by ? plan.targets : {}
  const out = {}
  for (const r of rows) out[r.key] = amountToInput(fromPlan[r.key] ?? shares[r.key] ?? 0)
  for (const e of plan?.by === by ? plan.extras : []) out[e.key] = amountToInput(fromPlan[e.key] ?? 0)
  return out
}

function PlanForm({ data, plan, onCreate, onCancel }) {
  const [by, setBy] = useState(plan?.by ?? 'type')
  const rows = rebalanceRows(data, by, currentMonth())
  const [inputs, setInputs] = useState(() => initialInputs(rows, plan, by))
  const [extras, setExtras] = useState(() => (plan?.by === by ? plan.extras : []))
  const [steps, setSteps] = useState(plan?.steps ?? 4)
  const [period, setPeriod] = useState(plan?.period ?? 'ay')
  const [message, setMessage] = useState('')

  const total = rows.reduce((s, r) => s + r.value, 0)
  const allRows = [
    ...rows,
    ...extras.map((e) => ({ key: e.key, label: e.label.trim(), color: NEW_COLOR, value: 0, amountMode: false, price: null, isNew: true })),
  ]

  // Yazılan yüzdeler: boş = 0, geçersiz veya %100'ü aşan = NaN
  const parsed = Object.fromEntries(
    allRows.map((r) => {
      const v = parseAmount(inputs[r.key])
      return [r.key, v === null ? 0 : v <= 100 ? v : NaN]
    }),
  )
  const values = Object.values(parsed)
  const invalid = values.some((v) => Number.isNaN(v))
  const sum = invalid ? NaN : values.reduce((s, v) => s + v, 0)
  const sumOk = !invalid && sumsTo100(values)
  const unnamed = extras.some((e) => !e.label.trim() && parsed[e.key] > 0)
  const canSubmit = sumOk && !unnamed && total > 0
  // Toplam %100 iken önizleme, planla birebir aynı (nakit dengesi uygulanmış) tutarları gösterir
  const preview = sumOk && total > 0 ? buildPlan(allRows, parsed, 1) : null
  const previewDelta = preview && Object.fromEntries([...preview.sells, ...preview.buys].map((m) => [m.key, m.delta]))

  function changeBy(next) {
    if (next === by) return
    setBy(next)
    setInputs(initialInputs(rebalanceRows(data, next, currentMonth()), plan, next))
    setExtras(plan?.by === next ? plan.extras : [])
    setMessage('')
  }

  function addExtra() {
    const key = `yeni-${newId()}`
    setExtras([...extras, { key, label: '' }])
    setInputs({ ...inputs, [key]: '' })
  }

  function removeExtra(key) {
    setExtras(extras.filter((e) => e.key !== key))
    const rest = { ...inputs }
    delete rest[key]
    setInputs(rest)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    const result = buildPlan(allRows, parsed, steps)
    if (result.sells.length + result.buys.length === 0) {
      setMessage(t('Portföyün zaten bu hedefe çok yakın; alım-satım gerekmiyor.', 'Your portfolio is already very close to this target; no trades needed.'))
      return
    }
    const usedExtras = extras.filter((x) => x.label.trim()).map((x) => ({ key: x.key, label: x.label.trim() }))
    onCreate({
      createdAt: today(),
      by,
      steps,
      period,
      total: result.total,
      targets: parsed,
      extras: usedExtras,
      sells: result.sells,
      buys: result.buys,
      done: Array(steps).fill(false),
    })
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {t('Dengeleme için elinde değeri olan en az bir varlık olmalı.', 'You need at least one asset with a value to rebalance.')}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {t(
            'Her kalem için hedef payı yaz. Alanlar bugünkü paylarla dolu gelir; sadece değiştirmek istediklerini düzelt.',
            'Enter a target share for each item. Fields start with today’s shares; change only the ones you want to.',
          )}
        </p>
        <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label={t('Kırılım', 'Breakdown')}>
          <button type="button" onClick={() => changeBy('type')} className={pill(by === 'type')} aria-pressed={by === 'type'}>
            {t('Türe göre', 'By type')}
          </button>
          <button type="button" onClick={() => changeBy('asset')} className={pill(by === 'asset')} aria-pressed={by === 'asset'}>
            {t('Varlığa göre', 'By asset')}
          </button>
        </div>
      </div>

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {allRows.map((r) => {
          const pct = parsed[r.key]
          const delta = previewDelta ? (previewDelta[r.key] ?? 0) : Number.isFinite(pct) ? (total * pct) / 100 - r.value : null
          const shows = delta !== null && Math.abs(delta) >= minMove(total)
          return (
            <li key={r.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden="true" />
              <div className="min-w-0 flex-1 basis-40">
                {r.isNew ? (
                  <input
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-emerald-500"
                    placeholder={t('Yeni varlık adı (ör. SPY)', 'New asset name (e.g. SPY)')}
                    value={extras.find((e) => e.key === r.key).label}
                    onChange={(e) => setExtras(extras.map((x) => (x.key === r.key ? { ...x, label: e.target.value } : x)))}
                    aria-label={t('Yeni varlık adı', 'New asset name')}
                  />
                ) : (
                  <p className="truncate text-sm font-medium">{r.label}</p>
                )}
                <p className="text-xs text-slate-500">
                  {r.isNew
                    ? t('Henüz yok', 'Not held yet')
                    : `${by === 'asset' ? getType(r.typeId).label : r.note} · ${t('şu an', 'now')} ${formatShare(r.value / total)} · ${formatTL(r.value)}`}
                </p>
              </div>
              <span
                className={`w-28 text-right text-xs font-medium tabular-nums ${
                  !shows ? 'text-slate-400' : delta > 0 ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {shows ? `${delta > 0 ? '▲' : '▼'} ${formatSignedTL(delta)}` : t('değişmez', 'no change')}
              </span>
              <PercentInput
                value={inputs[r.key] ?? ''}
                bad={Number.isNaN(pct)}
                label={t(`${r.label || 'Yeni varlık'} hedef payı`, `${r.label || 'New asset'} target share`)}
                onChange={(v) => {
                  setInputs({ ...inputs, [r.key]: v })
                  setMessage('')
                }}
              />
              {r.isNew && (
                <button
                  type="button"
                  onClick={() => removeExtra(r.key)}
                  className="rounded-md px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={t('Bu satırı kaldır', 'Remove this row')}
                >
                  ✕
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <button type="button" onClick={addExtra} className="text-sm font-medium text-emerald-700 hover:underline">
        {t('+ Henüz sahip olmadığın bir varlık ekle', '+ Add an asset you don’t own yet')}
      </button>

      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-500">{t('Kaç adımda?', 'How many steps?')}</p>
          <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label={t('Adım sayısı', 'Number of steps')}>
            {STEP_OPTIONS.map((n) => (
              <button key={n} type="button" onClick={() => setSteps(n)} className={pill(steps === n)} aria-pressed={steps === n}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-500">{t('Ne sıklıkla?', 'How often?')}</p>
          <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label={t('Periyot', 'Period')}>
            <button type="button" onClick={() => setPeriod('hafta')} className={pill(period === 'hafta')} aria-pressed={period === 'hafta'}>
              {t('Haftalık', 'Weekly')}
            </button>
            <button type="button" onClick={() => setPeriod('ay')} className={pill(period === 'ay')} aria-pressed={period === 'ay'}>
              {t('Aylık', 'Monthly')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <SumBadge sum={sum} ok={sumOk} />
          {unnamed && <span className="text-sm text-red-600">{t('Yeni varlığa bir ad yaz.', 'Enter a name for the new asset.')}</span>}
          {message && <span className="text-sm text-slate-600">{message}</span>}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
              {t('Vazgeç', 'Cancel')}
            </button>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {t('Hesapla', 'Calculate')}
          </button>
        </div>
      </div>
    </form>
  )
}

function SumBadge({ sum, ok }) {
  if (ok)
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
        ✓ {t('Toplam', 'Total')} {formatPctValue(100)}
      </span>
    )
  let text
  if (Number.isNaN(sum)) text = t('Geçersiz yüzde var (0–100 arası bir sayı yaz)', 'Invalid percentage (enter a number from 0 to 100)')
  else {
    const gap = formatPctValue(Math.abs(100 - sum))
    text = t(
      `Toplam ${formatPctValue(sum)} · %100 olmalı (${gap} ${sum < 100 ? 'eksik' : 'fazla'})`,
      `Total ${formatPctValue(sum)} · must be 100% (${gap} ${sum < 100 ? 'short' : 'over'})`,
    )
  }
  return (
    <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700" role="alert">
      ✕ {text}
    </span>
  )
}

function PercentInput({ value, bad, label, onChange }) {
  return (
    <span
      className={`flex shrink-0 items-center rounded-lg border bg-white focus-within:ring-2 ${
        bad ? 'border-red-400 ring-red-400/20' : 'border-slate-300 focus-within:border-emerald-500 focus-within:ring-emerald-500/20'
      }`}
    >
      <span className="pl-2 text-xs text-slate-400">%</span>
      <input
        className="w-14 bg-transparent py-1 pl-1 pr-2 text-right text-sm tabular-nums outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        aria-label={label}
      />
    </span>
  )
}

// --- Plan görünümü ---

function PlanView({ plan, onToggleStep, onEdit, onDelete }) {
  const next = plan.done.indexOf(false)
  const weekly = plan.period === 'hafta'
  // Her adımda önce satışlar (alışların parası buradan gelir), sonra alışlar
  const moves = [...plan.sells, ...plan.buys]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-slate-600">
          {t(
            `${formatDate(plan.createdAt)} tarihli plan · ${formatTL(plan.total)} portföy · ${plan.steps} adım, ${weekly ? 'haftalık' : 'aylık'}`,
            `Plan of ${formatDate(plan.createdAt)} · ${formatTL(plan.total)} portfolio · ${plan.steps} steps, ${weekly ? 'weekly' : 'monthly'}`,
          )}
        </p>
        <div className="flex gap-1">
          <button onClick={onEdit} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            {t('Hedefleri düzenle', 'Edit targets')}
          </button>
          <button onClick={onDelete} className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            {t('Planı sil', 'Delete plan')}
          </button>
        </div>
      </div>

      {/* Toplam değişim: satılacaklar ve alınacaklar */}
      <div className="grid gap-4 md:grid-cols-2">
        <MoveSummary plan={plan} title={t('Satılacaklar', 'To sell')} moves={plan.sells} sell />
        <MoveSummary plan={plan} title={t('Alınacaklar', 'To buy')} moves={plan.buys} />
      </div>

      {/* Adım adım yol haritası */}
      <ol className="space-y-3">
        {plan.done.map((isDone, i) => (
          <li
            key={i}
            className={`rounded-xl border p-4 ${
              isDone ? 'border-slate-200 bg-slate-50' : i === next ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200'
            }`}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => onToggleStep(i)}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-emerald-600"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className={`font-semibold ${isDone ? 'text-slate-500 line-through' : ''}`}>
                    {t(`Adım ${i + 1} (${i + 1}. ${weekly ? 'Hafta' : 'Ay'})`, `Step ${i + 1} (${weekly ? 'Week' : 'Month'} ${i + 1})`)}
                  </span>
                  <span className="text-xs text-slate-500">{formatDate(stepDate(plan.createdAt, i, plan.period))}</span>
                  {isDone && <span className="text-xs font-medium text-emerald-700">✓ {t('Tamamlandı', 'Done')}</span>}
                  {!isDone && i === next && <span className="text-xs font-medium text-emerald-700">{t('Sıradaki', 'Next')}</span>}
                </span>
                <ul className={`mt-2 space-y-1 ${isDone ? 'opacity-60' : ''}`}>
                  {moves.map((m) => (
                    <MoveLine key={m.key} plan={plan} move={m} />
                  ))}
                </ul>
              </span>
            </label>
          </li>
        ))}
      </ol>

      <p className="text-xs text-slate-400">
        {t(
          'Plan, oluşturulduğu günün değerlerine göre hazırlandı ve her adımda aynı tutar alınıp satılır. Fiyatlar değiştikçe son adımda hedefe tam oturmayabilir; gerekirse “Hedefleri düzenle” ile planı yeniden hesaplayabilirsin. Bu bir hesaplama aracıdır, yatırım tavsiyesi değildir.',
          'The plan uses the values from the day it was created, and the same amount is traded in every step. As prices change it may not land exactly on target; you can recalculate with “Edit targets”. This is a calculation tool, not investment advice.',
        )}
      </p>
    </div>
  )
}

function verb(move) {
  const sell = move.delta < 0
  if (move.amountMode) return sell ? t('çek', 'withdraw') : t('yatır', 'deposit')
  return sell ? t('sat', 'sell') : t('al', 'buy')
}

// Bir adımdaki tek işlem: "● ₺11.250 Altın sat (~3,6 gr)" (İng. "● Sell ₺11,250 Gold (~3.6 g)").
// Yön renkle ve fiille birlikte yazılır. Türkçede fiil sonda, İngilizcede başta gelir.
function MoveLine({ plan, move }) {
  const sell = move.delta < 0
  const unit = moveUnit(move)
  const verbEl = <span className={`font-medium ${sell ? 'text-red-700' : 'text-emerald-700'}`}>{verb(move)}</span>
  const amount = <span className="font-semibold tabular-nums">{formatTL(move.step)}</span>
  const label = moveLabel(plan, move)
  return (
    <li className="flex items-baseline gap-2 text-sm">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${sell ? 'bg-red-500' : 'bg-emerald-500'}`} aria-hidden="true" />
      <span>
        {t(
          <>
            {amount} {label} {verbEl}
          </>,
          <>
            <span className="capitalize">{verbEl}</span> {amount} {label}
          </>,
        )}
        {move.qty != null && (
          <span className="text-slate-500">
            {' '}
            (~{formatQty(roundQty(move.qty))} {unit})
          </span>
        )}
      </span>
    </li>
  )
}

function MoveSummary({ plan, title, moves, sell }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className={`mb-2 text-sm font-semibold ${sell ? 'text-red-700' : 'text-emerald-700'}`}>
        {sell ? '▼' : '▲'} {title}
      </p>
      {moves.length === 0 ? (
        <p className="text-sm text-slate-500">{t('Yok', 'None')}</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {moves.map((m) => (
            <li key={m.key} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {moveLabel(plan, m)} <span className="text-xs text-slate-500">→ {formatPctValue(m.targetPct)}</span>
              </span>
              <span className="shrink-0 tabular-nums font-medium">{formatTL(Math.abs(m.delta))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
