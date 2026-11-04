import { getType } from '../lib/constants'

// Yatırım türünü renkli küçük bir etiket olarak gösterir.
export default function TypeBadge({ type }) {
  const t = getType(type)
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${t.badge}`}>
      {t.label}
    </span>
  )
}
