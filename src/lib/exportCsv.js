// Veriyi Excel'de açılabilen bir CSV tablosuna çevirir.
// Her satır: bir ay + bir varlık. Değerler Panel'de gördüğün gibidir ("son bilinen değer" kuralıyla).
//
// Türkçe Excel uyumu için:
// - Sütunlar noktalı virgülle (;) ayrılır (Türkçe Excel virgülü ondalık işareti sayar)
// - Ondalıklar virgülle yazılır (45000,5)
// - Dosyanın başına "BOM" işareti eklenir, böylece Excel ş, ğ, ı gibi harfleri doğru gösterir

import { getType } from './constants'
import { monthRange } from './analytics'
import { formatMonth, shiftMonth } from './format'
import { latestValue } from './usePortfolio'

function cell(v) {
  const s = String(v ?? '')
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsv(data) {
  const rows = [['Ay', 'Ay (yazıyla)', 'Varlık', 'Tür', 'Kurum', 'Değer (TL)']]
  for (const month of monthRange(data.records)) {
    for (const a of data.assets) {
      const rec = latestValue(data.records, a.id, shiftMonth(month, 1))
      if (!rec) continue // varlığın henüz hiç değeri girilmemiş
      rows.push([month, formatMonth(month), a.name, getType(a.type).label, a.institution, String(rec.value).replace('.', ',')])
    }
  }
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n')
}
