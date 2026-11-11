import * as XLSX from 'xlsx'
import type { DB } from './types'
import { addDays, categoryLabel, fmtDate, fmtTime, hm, methodLabel, parseYmd, startOfDay, statusLabel, ymd } from './util'
import { latestAnamnesis } from './api'
import { regionLabel } from './bodyRegions'
import { CONDITIONS, GOALS, PRESSURE, SKIN } from '../components/AnamnesisView'

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function revenueBetween(db: DB, from: Date, to: Date, status?: 'recebido' | 'pendente') {
  const f = ymd(from), t = ymd(to)
  return sum(db.payments.filter((p) => p.date >= f && p.date <= t && (!status || p.status === status)).map((p) => p.amount))
}

export function expensesBetween(db: DB, from: Date, to: Date) {
  const f = ymd(from), t = ymd(to)
  return sum(db.expenses.filter((e) => e.date >= f && e.date <= t).map((e) => e.amount))
}

export const monthRange = (d: Date) => [new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() + 1, 0)] as const
export const weekRange = (d: Date) => {
  const s = addDays(startOfDay(d), -((d.getDay() + 6) % 7)) // segunda
  return [s, addDays(s, 6)] as const
}

export function occupancy(db: DB, from: Date, to: Date) {
  let capacity = 0
  for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
    const h = db.settings.week[d.getDay()]
    if (!h.enabled) continue
    const key = ymd(d)
    if (db.settings.vacations.some((v) => key >= v.from && key <= v.to)) continue
    let mins = hm(h.close) - hm(h.open)
    for (const b of db.settings.breaks) mins -= Math.max(0, Math.min(hm(b.end), hm(h.close)) - Math.max(hm(b.start), hm(h.open)))
    capacity += mins
  }
  const f = from.getTime(), t = addDays(startOfDay(to), 1).getTime()
  const booked = sum(
    db.appointments
      .filter((a) => a.status !== 'cancelado' && new Date(a.start).getTime() >= f && new Date(a.start).getTime() < t)
      .map((a) => (new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000),
  )
  return capacity ? booked / capacity : 0
}

export function monthlySeries(db: DB, months = 6, now = new Date()) {
  const out = []
  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const [a, b] = monthRange(ref)
    const receita = revenueBetween(db, a, b)
    const despesas = expensesBetween(db, a, b)
    const sessoes = db.appointments.filter((x) => x.status === 'realizado' && x.start >= a.toISOString() && new Date(x.start) <= addDays(b, 1)).length
    out.push({
      mes: ref.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      receita, recebido: revenueBetween(db, a, b, 'recebido'), despesas, resultado: receita - despesas, sessoes,
    })
  }
  return out
}

export function serviceRanking(db: DB, from: Date, to: Date) {
  const f = from.getTime(), t = addDays(startOfDay(to), 1).getTime()
  const done = db.appointments.filter((a) => a.status === 'realizado' && new Date(a.start).getTime() >= f && new Date(a.start).getTime() < t)
  const map = new Map<string, { name: string; qtd: number; receita: number; pacote: number }>()
  for (const a of done) {
    const r = map.get(a.serviceId) ?? { name: db.services.find((s) => s.id === a.serviceId)?.name ?? a.serviceName, qtd: 0, receita: 0, pacote: 0 }
    r.qtd++
    r.receita += a.price
    if (a.clientPackageId) r.pacote++
    map.set(a.serviceId, r)
  }
  return [...map.values()].sort((a, b) => b.qtd - a.qtd)
}

// -------------------------------------------------------------- Exportação

function download(sheets: Record<string, Record<string, unknown>[]>, name: string, format: 'xlsx' | 'csv') {
  const wb = XLSX.utils.book_new()
  for (const [title, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Aviso: 'Sem dados' }])
    const cols = Object.keys(rows[0] ?? { Aviso: '' })
    ws['!cols'] = cols.map((c) => ({ wch: Math.max(12, c.length + 2, ...rows.slice(0, 50).map((r) => String(r[c] ?? '').length + 1)) }))
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length, 1), c: Math.max(cols.length - 1, 0) } }) }
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
  }
  if (format === 'csv') {
    const first = Object.keys(sheets)[0]
    const csv = '﻿' + XLSX.utils.sheet_to_csv(wb.Sheets[first.slice(0, 31)], { FS: ';' })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${name}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    return
  }
  XLSX.writeFile(wb, `${name}.xlsx`)
}

const stamp = () => ymd(new Date())

export function exportClients(db: DB, format: 'xlsx' | 'csv' = 'xlsx') {
  const rows = db.clients.map((c) => {
    const done = db.appointments.filter((a) => a.clientId === c.id && a.status === 'realizado').sort((a, b) => a.start.localeCompare(b.start))
    const next = db.appointments.filter((a) => a.clientId === c.id && (a.status === 'agendado' || a.status === 'confirmado') && new Date(a.start) > new Date()).sort((a, b) => a.start.localeCompare(b.start))[0]
    return {
      Nome: c.name, Telefone: c.phone, 'E-mail': c.email, 'Data de nascimento': c.birthDate ? fmtDate(c.birthDate + 'T12:00:00') : '',
      Endereço: c.address ? `${c.address.street}, ${c.address.number} - ${c.address.district}, ${c.address.city}` : '',
      'Primeiro atendimento': done[0] ? fmtDate(done[0].start) : '', 'Último atendimento': done.at(-1) ? fmtDate(done.at(-1)!.start) : '',
      Sessões: done.length, 'Próximo agendamento': next ? `${fmtDate(next.start)} ${fmtTime(next.start)}` : '', Status: c.status, 'Cadastro em': fmtDate(c.createdAt),
    }
  })
  download({ Clientes: rows }, `clientes-${stamp()}`, format)
}

export function exportHistory(db: DB, format: 'xlsx' | 'csv' = 'xlsx') {
  const rows = [...db.appointments].sort((a, b) => b.start.localeCompare(a.start)).map((a) => ({
    Data: fmtDate(a.start), Horário: fmtTime(a.start), Cliente: db.clients.find((c) => c.id === a.clientId)?.name ?? '',
    Serviço: a.serviceName, 'Duração (min)': Math.round((new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000),
    'Valor (R$)': a.price, Pacote: a.clientPackageId ? 'Sim' : 'Não', Status: statusLabel[a.status], Bairro: a.address.district,
  }))
  download({ Atendimentos: rows }, `historico-atendimentos-${stamp()}`, format)
}

export function exportFinance(db: DB, format: 'xlsx' | 'csv' = 'xlsx') {
  const receitas = [...db.payments].sort((a, b) => b.date.localeCompare(a.date)).map((p) => ({
    Data: fmtDate(p.date + 'T12:00:00'), Cliente: db.clients.find((c) => c.id === p.clientId)?.name ?? '', Descrição: p.description,
    'Valor (R$)': p.amount, Forma: methodLabel[p.method], Status: p.status === 'recebido' ? 'Recebido' : 'Pendente',
  }))
  const despesas = [...db.expenses].sort((a, b) => b.date.localeCompare(a.date)).map((e) => ({
    Data: fmtDate(e.date + 'T12:00:00'), Descrição: e.description, Categoria: categoryLabel[e.category], 'Valor (R$)': e.amount, Forma: methodLabel[e.method], Observações: e.notes ?? '',
  }))
  const resumo = monthlySeries(db, 12).map((m) => ({ Mês: m.mes, 'Receita (R$)': m.receita, 'Recebido (R$)': m.recebido, 'Despesas (R$)': m.despesas, 'Resultado (R$)': m.resultado, Sessões: m.sessoes }))
  if (format === 'csv') return download({ Receitas: receitas }, `financeiro-receitas-${stamp()}`, 'csv')
  download({ Resumo: resumo, Receitas: receitas, Despesas: despesas }, `financeiro-${stamp()}`, 'xlsx')
}

/** Dados de saúde: exportação só manual, com confirmação explícita na tela. */
export function exportAnamneses(db: DB) {
  const lbl = (list: { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v
  const yn = (v: string) => (v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : v === 'na' ? 'Não se aplica' : '')
  const rows = db.clients.map((c) => ({ c, a: latestAnamnesis(db, c.id) })).filter((x) => x.a).map(({ c, a }) => {
    const x = a!.answers
    return {
      Cliente: c.name, Versão: a!.version, 'Atualizada em': fmtDate(a!.submittedAt), Consentimento: a!.consentVersion,
      Idade: x.age, Profissão: x.profession, Condições: x.conditions.map((v) => lbl(CONDITIONS, v)).join(', ') + (x.conditionsOther ? ` (${x.conditionsOther})` : ''),
      Medicamentos: yn(x.continuousMeds) + (x.medsDetail ? `: ${x.medsDetail}` : ''), Alergias: yn(x.allergies) + (x.allergiesDetail ? `: ${x.allergiesDetail}` : ''),
      Pele: x.skin.map((v) => lbl(SKIN, v)).join(', '), 'Sensibilidade a produtos': yn(x.productSensitivity) + (x.productSensitivityDetail ? `: ${x.productSensitivityDetail}` : ''),
      Dor: yn(x.pain), Lesão: yn(x.injury) + (x.injuryDetail ? `: ${x.injuryDetail}` : ''), 'Limitação de movimento': yn(x.mobilityLimit) + (x.mobilityDetail ? `: ${x.mobilityDetail}` : ''),
      'Regiões vermelhas': x.marks.filter((m) => m.level === 'vermelho').map((m) => regionLabel(m.regionId, true)).join(', '),
      'Regiões amarelas': x.marks.filter((m) => m.level === 'amarelo').map((m) => regionLabel(m.regionId, true)).join(', '),
      Gestante: yn(x.pregnant), 'Evitar regiões': x.avoidRegionIds.map((r) => regionLabel(r, true)).join(', ') + (x.avoidText ? ` ${x.avoidText}` : ''),
      Objetivo: x.goal ? lbl(GOALS, x.goal) : '', Pressão: x.pressure ? lbl(PRESSURE, x.pressure) : '', Observações: x.extraInfo,
    }
  })
  download({ Anamneses: rows }, `anamneses-CONFIDENCIAL-${stamp()}`, 'xlsx')
}

export const ymdToDate = parseYmd
