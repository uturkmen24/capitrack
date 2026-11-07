import { formatTL } from '../lib/format'
import { t } from '../lib/i18n'
import ProfitLoss from './ProfitLoss'

// Açılıp kapanabilen grup kutusu. Başlıkta türün adı, varlık sayısı, toplam değeri ve kâr/zararı yazar.
export default function AssetGroup({ type, count, value, cost, collapsed, onToggle, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 bg-slate-50 px-5 py-3 text-left hover:bg-slate-100"
      >
        <span className={`text-slate-400 transition-transform ${collapsed ? '' : 'rotate-90'}`} aria-hidden="true">
          ▸
        </span>
        <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: type.color }} />
        <span className="flex-1 font-semibold">
          {type.label}{' '}
          <span className="whitespace-nowrap font-normal text-slate-500">· {t(`${count} varlık`, `${count} assets`)}</span>
        </span>
        <span className="text-right">
          <span className="block font-semibold tabular-nums">{formatTL(value)}</span>
          <ProfitLoss value={value} cost={cost} className="block text-xs font-medium" />
        </span>
      </button>
      {!collapsed && <div className="divide-y divide-slate-100 border-t border-slate-200">{children}</div>}
    </section>
  )
}

// Türünde tek olan varlıkların başlıksız kutusu (gruplardan sonra gelir)
export function SingleList({ children }) {
  return (
    <section className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {children}
    </section>
  )
}
