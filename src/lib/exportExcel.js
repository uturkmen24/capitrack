// Veriyi biçimlendirilmiş bir Excel dosyasına (.xlsx) çevirir. Bu dosya okumak / incelemek içindir;
// uygulamaya geri yüklemek için JSON yedeği kullanılır.
// ExcelJS kütüphanesi büyük olduğu için sadece butona basıldığında yüklenir (sayfanın açılışını yavaşlatmaz).

import { assetStateAt, assetTimeline, breakdown, monthRange } from './analytics'
import { getType, groupByType } from './constants'
import { formatMonth } from './format'
import { t } from './i18n'

const GREEN = 'FF059669'
const LIGHT = 'FFF1F5F9'
const BORDER = { style: 'thin', color: { argb: 'FFE2E8F0' } }
const TL = '#,##0 "₺"'
const PRICE = '#,##0.00## "₺"'
const QTY = '#,##0.####'
const PCT = '0.0%'
const DATE = 'd mmmm yyyy'

/** "2026-11" veya "2026-11-05" -> Excel'in tarih olarak tanıdığı değer */
function toDate(iso) {
  const [y, m, d = 1] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Excel sütun harfi: 1 -> A, 27 -> AA */
function col(n) {
  let s = ''
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

/** İlk satırı yeşil zeminli kalın başlık yapar. */
function styleHeader(row) {
  row.height = 22
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
    cell.alignment = { vertical: 'middle' }
  })
}

/** Toplam satırını kalın, üstü çizgili ve gri zeminli yapar. */
function styleTotal(row, cols) {
  for (let c = 1; c <= cols; c++) {
    const cell = row.getCell(c)
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } }
    cell.border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } } }
  }
}

/** Veri hücrelerine ince açık gri çizgiler çeker. */
function grid(sheet, fromRow, toRow, cols) {
  for (let r = fromRow; r <= toRow; r++) {
    for (let c = 1; c <= cols; c++) {
      const cell = sheet.getCell(r, c)
      if (!cell.border) cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
    }
  }
}

export async function buildWorkbook(data) {
  const mod = await import('exceljs')
  const ExcelJS = mod.default ?? mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CapiTrack'
  wb.created = new Date()
  wb.calcProperties.fullCalcOnLoad = true // Excel açılışta tüm formülleri yeniden hesaplasın

  const months = monthRange(data)
  const lastMonth = months[months.length - 1]
  // Varlıklar her sayfada aynı sırada: türe göre gruplu
  const ordered = groupByType(data.assets).flatMap((g) => g.items)
  const series = new Map(ordered.map((a) => [a.id, new Map(assetTimeline(data, a, lastMonth ?? '0000-00').map((s) => [s.month, s]))]))

  // --- 1. Varlıklar: türe göre gruplu özet, grup ara toplamları ve genel toplam ---
  const s1 = wb.addWorksheet(t('Varlıklar', 'Assets'), { views: [{ state: 'frozen', ySplit: 1, xSplit: 2 }] })
  s1.columns = [
    { header: t('Tür', 'Type'), width: 14 },
    { header: t('Varlık', 'Asset'), width: 24 },
    { header: t('Kurum', 'Institution'), width: 22 },
    { header: t('Miktar', 'Quantity'), width: 12, style: { numFmt: QTY } },
    { header: t('Birim', 'Unit'), width: 8 },
    { header: t('Ort. maliyet', 'Avg. cost'), width: 14, style: { numFmt: PRICE } },
    { header: t('Son fiyat', 'Last price'), width: 14, style: { numFmt: PRICE } },
    { header: t('Değer', 'Value'), width: 15, style: { numFmt: TL } },
    { header: t('Maliyet', 'Cost'), width: 15, style: { numFmt: TL } },
    { header: t('Kâr / Zarar', 'Profit / Loss'), width: 15, style: { numFmt: TL } },
    { header: t('K/Z %', 'P/L %'), width: 9, style: { numFmt: PCT } },
    { header: t('Gerçekleşen K/Z', 'Realized P/L'), width: 16, style: { numFmt: TL } },
    { header: t('Not', 'Note'), width: 26 },
  ]
  styleHeader(s1.getRow(1))
  const subtotalRows = []
  const grand = { H: 0, I: 0, J: 0, L: 0 }
  for (const g of groupByType(data.assets)) {
    const first = s1.rowCount + 1
    const sums = { H: 0, I: 0, J: 0, L: 0 }
    for (const a of g.items) {
      const s = lastMonth ? assetStateAt(data, a, lastMonth) : null
      sums.H += s?.value ?? 0
      sums.I += s?.cost ?? 0
      sums.J += (s?.value ?? 0) - (s?.cost ?? 0)
      sums.L += s?.realized ?? 0
      const amount = g.type.mode === 'amount'
      const r = s1.addRow([
        g.type.label,
        a.name,
        a.institution,
        amount ? null : (s?.qty ?? 0),
        amount ? '' : g.type.unit,
        amount || !s?.qty ? null : s.avg,
        amount ? null : (s?.price ?? null),
        s?.value ?? 0,
        s?.cost ?? 0,
        null,
        null,
        s?.realized ?? 0,
        a.note,
      ])
      const n = r.number
      r.getCell(10).value = { formula: `H${n}-I${n}`, result: (s?.value ?? 0) - (s?.cost ?? 0) }
      r.getCell(11).value = { formula: `IF(I${n}>0,J${n}/I${n},"")`, result: s?.cost > 0 ? (s.value - s.cost) / s.cost : '' }
    }
    const last = s1.rowCount
    const sub = s1.addRow([t(`${g.type.label} toplamı`, `${g.type.label} total`)])
    const n = sub.number
    // Formülün yanında sonucunu da yazıyoruz: formülü hesaplamayan önizleme araçlarında da rakam görünsün
    for (const c of ['H', 'I', 'J', 'L']) {
      sub.getCell(c).value = { formula: `SUM(${c}${first}:${c}${last})`, result: sums[c] }
      grand[c] += sums[c]
    }
    sub.getCell('K').value = { formula: `IF(I${n}>0,J${n}/I${n},"")`, result: sums.I > 0 ? sums.J / sums.I : '' }
    styleTotal(sub, 13)
    subtotalRows.push(n)
  }
  if (subtotalRows.length) {
    const tot = s1.addRow([t('Genel toplam', 'Grand total')])
    const n = tot.number
    for (const c of ['H', 'I', 'J', 'L'])
      tot.getCell(c).value = { formula: subtotalRows.map((r) => `${c}${r}`).join('+'), result: grand[c] }
    tot.getCell('K').value = { formula: `IF(I${n}>0,J${n}/I${n},"")`, result: grand.I > 0 ? grand.J / grand.I : '' }
    styleTotal(tot, 13)
    tot.eachCell((c) => (c.font = { bold: true, size: 12 }))
  }
  grid(s1, 2, s1.rowCount, 13)

  // --- 2. Aylık Tablo: satırlarda varlıklar, sütunlarda aylar (değer) ---
  // --- 4. Aylık Fiyatlar: aynı düzende, girilen birim fiyat / bakiye ---
  const pivot = (name, valueOf, numFmt, withTotal) => {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] })
    ws.columns = [
      { header: t('Tür', 'Type'), width: 14 },
      { header: t('Varlık', 'Asset'), width: 24 },
      ...months.map((m) => ({ header: formatMonth(m), width: 15, style: { numFmt } })),
    ]
    styleHeader(ws.getRow(1))
    for (const a of ordered) ws.addRow([getType(a.type).label, a.name, ...months.map((m) => valueOf(a, m))])
    if (withTotal && ordered.length) {
      const lastRow = ws.rowCount
      const tot = ws.addRow([
        t('Toplam', 'Total'),
        '',
        ...months.map((m, i) => ({
          formula: `SUM(${col(3 + i)}2:${col(3 + i)}${lastRow})`,
          result: ordered.reduce((s, a) => s + (valueOf(a, m) ?? 0), 0),
        })),
      ])
      styleTotal(tot, 2 + months.length)
    }
    grid(ws, 2, ws.rowCount, 2 + months.length)
    return ws
  }
  pivot(t('Aylık Tablo', 'Monthly Table'), (a, m) => series.get(a.id).get(m)?.value ?? null, TL, true)

  // --- 3. İşlemler: tüm alış / satışlar, filtrelenebilir ---
  const s3 = wb.addWorksheet(t('İşlemler', 'Transactions'), { views: [{ state: 'frozen', ySplit: 1 }] })
  s3.columns = [
    { header: t('Tarih', 'Date'), width: 16, style: { numFmt: DATE } },
    { header: t('Tür', 'Type'), width: 14 },
    { header: t('Varlık', 'Asset'), width: 24 },
    { header: t('Kurum', 'Institution'), width: 22 },
    { header: t('İşlem', 'Action'), width: 12 },
    { header: t('Miktar', 'Quantity'), width: 12, style: { numFmt: QTY } },
    { header: t('Birim fiyat', 'Unit price'), width: 14, style: { numFmt: PRICE } },
    { header: t('Tutar', 'Amount'), width: 15, style: { numFmt: TL } },
  ]
  styleHeader(s3.getRow(1))
  const byId = new Map(data.assets.map((a) => [a.id, a]))
  for (const tr of [...data.transactions].sort((x, y) => x.date.localeCompare(y.date))) {
    const a = byId.get(tr.assetId)
    const type = getType(a.type)
    const amount = type.mode === 'amount'
    const buy = tr.kind === 'buy'
    const label = amount ? (buy ? t('Yatırma', 'Deposit') : t('Çekme', 'Withdrawal')) : buy ? t('Alış', 'Buy') : t('Satış', 'Sell')
    const r = s3.addRow([toDate(tr.date), type.label, a.name, a.institution, label, amount ? null : tr.quantity, amount ? null : tr.price, null])
    r.getCell(8).value = amount ? tr.quantity : { formula: `F${r.number}*G${r.number}`, result: tr.quantity * tr.price }
  }
  s3.autoFilter = { from: 'A1', to: `H${Math.max(s3.rowCount, 1)}` }
  grid(s3, 2, s3.rowCount, 8)

  pivot(t('Aylık Fiyatlar', 'Monthly Prices'), (a, m) => data.prices[m]?.[a.id] ?? null, PRICE, false)

  // --- 5. Dağılım: son ayın türe ve kuruma göre dağılımı (yan yana iki tablo) ---
  const s5 = wb.addWorksheet(t('Dağılım', 'Allocation'))
  s5.columns = [{ width: 18 }, { width: 15 }, { width: 10 }, { width: 4 }, { width: 24 }, { width: 15 }, { width: 10 }]
  const asOf = lastMonth ? formatMonth(lastMonth) : ''
  s5.getCell('A1').value = t(`${asOf} itibarıyla dağılım`, `Allocation as of ${asOf}`)
  s5.getCell('A1').font = { bold: true, size: 13 }
  const unspecified = t('Belirtilmemiş', 'Unspecified')
  const tables = [
    { c: 1, title: t('Tür', 'Type'), rows: lastMonth ? breakdown(data, lastMonth, (a) => a.type).map((r) => ({ ...r, key: getType(r.key).label })) : [] },
    { c: 5, title: t('Kurum', 'Institution'), rows: lastMonth ? breakdown(data, lastMonth, (a) => a.institution || unspecified) : [] },
  ]
  for (const tb of tables) {
    ;[tb.title, t('Değer', 'Value'), t('Pay', 'Share')].forEach((h, i) => {
      const cell = s5.getCell(3, tb.c + i)
      cell.value = h
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
    })
    tb.rows.forEach((r, i) => {
      const row = 4 + i
      s5.getCell(row, tb.c).value = r.key
      s5.getCell(row, tb.c + 1).value = r.value
      s5.getCell(row, tb.c + 1).numFmt = TL
      s5.getCell(row, tb.c + 2).value = r.share
      s5.getCell(row, tb.c + 2).numFmt = PCT
      for (let k = 0; k < 3; k++) s5.getCell(row, tb.c + k).border = { bottom: BORDER }
    })
  }

  // Açılışta görünen sayfa: Varlıklar
  wb.views = [{ activeTab: 0 }]
  return wb
}

/** Excel dosyasını oluşturup bayt dizisi olarak döner. */
export async function buildExcel(data) {
  const wb = await buildWorkbook(data)
  return wb.xlsx.writeBuffer()
}
