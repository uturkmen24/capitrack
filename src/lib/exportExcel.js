// Veriyi biçimlendirilmiş bir Excel dosyasına (.xlsx) çevirir. Bu dosya okumak / incelemek içindir;
// uygulamaya geri yüklemek için JSON yedeği kullanılır.
// ExcelJS kütüphanesi büyük olduğu için sadece butona basıldığında yüklenir (sayfanın açılışını yavaşlatmaz).

import { assetStateAt, assetTimeline, breakdown, monthRange } from './analytics'
import { getType, groupByType } from './constants'
import { formatMonth } from './format'

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
  const s1 = wb.addWorksheet('Varlıklar', { views: [{ state: 'frozen', ySplit: 1, xSplit: 2 }] })
  s1.columns = [
    { header: 'Tür', width: 14 },
    { header: 'Varlık', width: 24 },
    { header: 'Kurum', width: 22 },
    { header: 'Miktar', width: 12, style: { numFmt: QTY } },
    { header: 'Birim', width: 8 },
    { header: 'Ort. maliyet', width: 14, style: { numFmt: PRICE } },
    { header: 'Son fiyat', width: 14, style: { numFmt: PRICE } },
    { header: 'Değer', width: 15, style: { numFmt: TL } },
    { header: 'Maliyet', width: 15, style: { numFmt: TL } },
    { header: 'Kâr / Zarar', width: 15, style: { numFmt: TL } },
    { header: 'K/Z %', width: 9, style: { numFmt: PCT } },
    { header: 'Gerçekleşen K/Z', width: 16, style: { numFmt: TL } },
    { header: 'Not', width: 26 },
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
    const sub = s1.addRow([`${g.type.label} toplamı`])
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
    const tot = s1.addRow(['Genel toplam'])
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
      { header: 'Tür', width: 14 },
      { header: 'Varlık', width: 24 },
      ...months.map((m) => ({ header: formatMonth(m), width: 15, style: { numFmt } })),
    ]
    styleHeader(ws.getRow(1))
    for (const a of ordered) ws.addRow([getType(a.type).label, a.name, ...months.map((m) => valueOf(a, m))])
    if (withTotal && ordered.length) {
      const lastRow = ws.rowCount
      const tot = ws.addRow([
        'Toplam',
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
  pivot('Aylık Tablo', (a, m) => series.get(a.id).get(m)?.value ?? null, TL, true)

  // --- 3. İşlemler: tüm alış / satışlar, filtrelenebilir ---
  const s3 = wb.addWorksheet('İşlemler', { views: [{ state: 'frozen', ySplit: 1 }] })
  s3.columns = [
    { header: 'Tarih', width: 16, style: { numFmt: DATE } },
    { header: 'Tür', width: 14 },
    { header: 'Varlık', width: 24 },
    { header: 'Kurum', width: 22 },
    { header: 'İşlem', width: 10 },
    { header: 'Miktar', width: 12, style: { numFmt: QTY } },
    { header: 'Birim fiyat', width: 14, style: { numFmt: PRICE } },
    { header: 'Tutar', width: 15, style: { numFmt: TL } },
  ]
  styleHeader(s3.getRow(1))
  const byId = new Map(data.assets.map((a) => [a.id, a]))
  for (const t of [...data.transactions].sort((x, y) => x.date.localeCompare(y.date))) {
    const a = byId.get(t.assetId)
    const type = getType(a.type)
    const amount = type.mode === 'amount'
    const label = amount ? (t.kind === 'buy' ? 'Yatırma' : 'Çekme') : t.kind === 'buy' ? 'Alış' : 'Satış'
    const r = s3.addRow([toDate(t.date), type.label, a.name, a.institution, label, amount ? null : t.quantity, amount ? null : t.price, null])
    r.getCell(8).value = amount ? t.quantity : { formula: `F${r.number}*G${r.number}`, result: t.quantity * t.price }
  }
  s3.autoFilter = { from: 'A1', to: `H${Math.max(s3.rowCount, 1)}` }
  grid(s3, 2, s3.rowCount, 8)

  pivot('Aylık Fiyatlar', (a, m) => data.prices[m]?.[a.id] ?? null, PRICE, false)

  // --- 5. Dağılım: son ayın türe ve kuruma göre dağılımı (yan yana iki tablo) ---
  const s5 = wb.addWorksheet('Dağılım')
  s5.columns = [{ width: 18 }, { width: 15 }, { width: 10 }, { width: 4 }, { width: 24 }, { width: 15 }, { width: 10 }]
  s5.getCell('A1').value = `${lastMonth ? formatMonth(lastMonth) : ''} itibarıyla dağılım`
  s5.getCell('A1').font = { bold: true, size: 13 }
  const tables = [
    { c: 1, title: 'Tür', rows: lastMonth ? breakdown(data, lastMonth, (a) => a.type).map((r) => ({ ...r, key: getType(r.key).label })) : [] },
    { c: 5, title: 'Kurum', rows: lastMonth ? breakdown(data, lastMonth, (a) => a.institution || 'Belirtilmemiş') : [] },
  ]
  for (const t of tables) {
    ;[t.title, 'Değer', 'Pay'].forEach((h, i) => {
      const cell = s5.getCell(3, t.c + i)
      cell.value = h
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
    })
    t.rows.forEach((r, i) => {
      const row = 4 + i
      s5.getCell(row, t.c).value = r.key
      s5.getCell(row, t.c + 1).value = r.value
      s5.getCell(row, t.c + 1).numFmt = TL
      s5.getCell(row, t.c + 2).value = r.share
      s5.getCell(row, t.c + 2).numFmt = PCT
      for (let k = 0; k < 3; k++) s5.getCell(row, t.c + k).border = { bottom: BORDER }
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
