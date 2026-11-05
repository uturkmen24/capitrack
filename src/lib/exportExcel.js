// Veriyi biçimlendirilmiş bir Excel dosyasına (.xlsx) çevirir. Bu dosya okumak / incelemek içindir;
// uygulamaya geri yüklemek için JSON yedeği kullanılır.
//
// Değerler Panel'de gördüğün gibidir ("son bilinen değer" kuralıyla).
// ExcelJS kütüphanesi büyük olduğu için sadece butona basıldığında yüklenir (sayfanın açılışını yavaşlatmaz).

import { getType } from './constants'
import { breakdown, monthRange } from './analytics'
import { formatMonth, shiftMonth } from './format'
import { latestValue } from './usePortfolio'

const GREEN = 'FF059669'
const LIGHT = 'FFF1F5F9'
const BORDER = { style: 'thin', color: { argb: 'FFE2E8F0' } }
const TL = '#,##0 "₺"'
const PCT = '0.0%'

/** "2026-11" -> Excel'in tarih olarak tanıdığı 1 Kasım 2026 */
function monthDate(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1))
}

/** Bir sayfanın ilk satırını başlık olarak biçimlendirir ve kaydırırken sabitler. */
function styleHeader(row) {
  row.height = 22
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
    cell.alignment = { vertical: 'middle' }
  })
}

/** Toplam satırını kalın, üstü çizgili ve gri zeminli yapar. */
function styleTotal(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } }
    cell.border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } } }
  })
}

/** Veri hücrelerine ince açık gri çizgiler çeker. */
function grid(sheet, fromRow, toRow, cols) {
  for (let r = fromRow; r <= toRow; r++) {
    for (let c = 1; c <= cols; c++) {
      sheet.getCell(r, c).border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
    }
  }
}

/** Excel sütun harfi: 1 -> A, 27 -> AA */
function colLetter(n) {
  let s = ''
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

export async function buildWorkbook(data) {
  const mod = await import('exceljs')
  const ExcelJS = mod.default ?? mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CapiTrack'
  wb.created = new Date()

  const months = monthRange(data.records)
  const valueAt = (a, m) => latestValue(data.records, a.id, shiftMonth(m, 1))?.value

  // --- 1. Aylık Tablo: satırlarda varlıklar, sütunlarda aylar ---
  const s1 = wb.addWorksheet('Aylık Tablo', { views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }] })
  s1.columns = [
    { header: 'Varlık', width: 26 },
    { header: 'Tür', width: 14 },
    { header: 'Kurum', width: 20 },
    ...months.map((m) => ({ header: formatMonth(m), width: 15, style: { numFmt: TL } })),
  ]
  for (const a of data.assets) {
    s1.addRow([a.name, getType(a.type).label, a.institution, ...months.map((m) => valueAt(a, m) ?? null)])
  }
  const lastAssetRow = data.assets.length + 1
  const total = s1.addRow([
    'Toplam',
    '',
    '',
    ...months.map((m, i) => {
      const col = colLetter(4 + i)
      const result = data.assets.reduce((s, a) => s + (valueAt(a, m) ?? 0), 0)
      return { formula: `SUM(${col}2:${col}${lastAssetRow})`, result }
    }),
  ])
  styleHeader(s1.getRow(1))
  grid(s1, 2, lastAssetRow, 3 + months.length)
  styleTotal(total)

  // --- 2. Dağılım: son ayın türe ve kuruma göre dağılımı (yan yana iki tablo) ---
  const s2 = wb.addWorksheet('Dağılım')
  const lastMonth = months[months.length - 1]
  s2.columns = [{ width: 18 }, { width: 15 }, { width: 10 }, { width: 4 }, { width: 22 }, { width: 15 }, { width: 10 }]
  s2.getCell('A1').value = `${lastMonth ? formatMonth(lastMonth) : ''} itibarıyla dağılım`
  s2.getCell('A1').font = { bold: true, size: 13 }
  const tables = [
    { col: 1, title: 'Tür', rows: lastMonth ? breakdown(data, lastMonth, (a) => a.type).map((r) => ({ ...r, key: getType(r.key).label })) : [] },
    { col: 5, title: 'Kurum', rows: lastMonth ? breakdown(data, lastMonth, (a) => a.institution || 'Belirtilmemiş') : [] },
  ]
  for (const t of tables) {
    const headers = [t.title, 'Değer', 'Pay']
    headers.forEach((h, i) => {
      const cell = s2.getCell(3, t.col + i)
      cell.value = h
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
    })
    t.rows.forEach((r, i) => {
      const row = 4 + i
      s2.getCell(row, t.col).value = r.key
      s2.getCell(row, t.col + 1).value = r.value
      s2.getCell(row, t.col + 1).numFmt = TL
      s2.getCell(row, t.col + 2).value = r.share
      s2.getCell(row, t.col + 2).numFmt = PCT
      for (let c = 0; c < 3; c++) s2.getCell(row, t.col + c).border = { bottom: BORDER }
    })
  }

  // --- 3. Tüm Kayıtlar: her satır bir ay + bir varlık; filtrelenebilir ---
  const s3 = wb.addWorksheet('Tüm Kayıtlar', { views: [{ state: 'frozen', ySplit: 1 }] })
  s3.columns = [
    { header: 'Ay', width: 16, style: { numFmt: 'mmmm yyyy' } },
    { header: 'Varlık', width: 26 },
    { header: 'Tür', width: 14 },
    { header: 'Kurum', width: 20 },
    { header: 'Değer', width: 15, style: { numFmt: TL } },
  ]
  for (const m of months) {
    for (const a of data.assets) {
      const v = valueAt(a, m)
      if (v != null) s3.addRow([monthDate(m), a.name, getType(a.type).label, a.institution, v])
    }
  }
  styleHeader(s3.getRow(1))
  s3.autoFilter = { from: 'A1', to: `E${Math.max(s3.rowCount, 1)}` }
  grid(s3, 2, s3.rowCount, 5)

  // --- 4. Varlıklar: liste, notlar ve son değerler ---
  const s4 = wb.addWorksheet('Varlıklar', { views: [{ state: 'frozen', ySplit: 1 }] })
  s4.columns = [
    { header: 'Varlık', width: 26 },
    { header: 'Tür', width: 14 },
    { header: 'Kurum', width: 20 },
    { header: 'Not', width: 30 },
    { header: 'Son değer', width: 15, style: { numFmt: TL } },
    { header: 'Son güncelleme', width: 16, style: { numFmt: 'mmmm yyyy' } },
  ]
  for (const a of data.assets) {
    const last = latestValue(data.records, a.id)
    s4.addRow([a.name, getType(a.type).label, a.institution, a.note, last?.value ?? null, last ? monthDate(last.month) : null])
  }
  styleHeader(s4.getRow(1))
  grid(s4, 2, s4.rowCount, 6)

  return wb
}

/** Excel dosyasını oluşturup bayt dizisi olarak döner. */
export async function buildExcel(data) {
  const wb = await buildWorkbook(data)
  return wb.xlsx.writeBuffer()
}
