// Benchmark & fırsat maliyeti: portföyü "para enflasyon kadar / mevduat faizi kadar büyüseydi" senaryosuyla karşılaştırır.
//
// İkisi de aynı yöntemi kullanır: her para girişi (alış, mevduata yatırma) ve çıkışı (satış, çekme) kendi tarihinden
// bugüne yıllık oranla bileşik büyütülür:  Tutar × (1 + oran) ^ (gün / 365).  Girişler artı, çıkışlar eksi sayılır.
// Böylece "3 ay önce yatırılan para" ile "2 yıl önce yatırılan para" aynı tutulmaz; her biri kendi süresince büyür.

import { today } from './format'

const DAY = 24 * 60 * 60 * 1000

/** İki tarih ("2026-06-10") arasındaki gün sayısı */
export function daysBetween(from, to) {
  return Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / DAY))
}

/**
 * Para akışlarını yıllık oranla bugüne büyütür.
 * Dönen: { net: yatırılan net para (nominal), grown: büyütülmüş toplam }
 */
export function compoundFlows(transactions, annualRate, asOf = today()) {
  let net = 0
  let grown = 0
  for (const t of transactions) {
    const amount = (t.kind === 'sell' ? -1 : 1) * t.quantity * t.price
    net += amount
    grown += amount * (1 + annualRate) ** (daysBetween(t.date, asOf) / 365)
  }
  return { net, grown }
}

/** Fisher denklemi: reel getiri = (1 + nominal getiri) / (1 + enflasyon) − 1 */
export function fisher(nominal, inflation) {
  return (1 + nominal) / (1 + inflation) - 1
}

/**
 * Enflasyona göre reel getiri.
 * nominal: portföyün yatırılan net paraya göre getirisi.
 * periodInflation: aynı para akışlarının, yatırıldıkları süre boyunca gördüğü enflasyon
 *   (yıllık oran doğrudan kullanılamaz; portföy 1 yıllık değilse dönemler uyuşmaz).
 * needed: satın alma gücünü korumak için portföyün bugün ulaşması gereken değer.
 */
export function realReturn(value, transactions, annualInflation, asOf) {
  const { net, grown } = compoundFlows(transactions, annualInflation, asOf)
  if (!(net > 0) || !(grown > 0)) return null
  const nominal = value / net - 1
  const periodInflation = grown / net - 1
  return { net, needed: grown, nominal, periodInflation, real: fisher(nominal, periodInflation) }
}

/**
 * "Sadece mevduat olsaydı": aynı para aynı tarihlerde mevduata yatırılsaydı bugün ne olurdu?
 * diff > 0 ise portföy faizi geçmiş demektir; alpha bu farkın mevduat değerine oranıdır.
 */
export function depositComparison(value, transactions, annualRate, asOf) {
  const { net, grown } = compoundFlows(transactions, annualRate, asOf)
  if (!(grown > 0)) return null
  return { net, deposit: grown, diff: value - grown, alpha: value / grown - 1 }
}
