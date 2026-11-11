import { beforeEach, describe, expect, it } from 'vitest'
import type { DB } from './types'
import * as api from './api'
import { computeSlots } from './availability'
import { buildSeed, DEMO, emptyAnswers } from './seed'
import { addDays, atMinutes, ymd } from './util'
import { REGIONS, REGION_BY_ID } from './bodyRegions'

// "agora" fixo: segunda-feira 07:00
const NOW = new Date(2026, 10, 9, 7, 0) // 09/11/2026
const nextMonday = ymd(addDays(NOW, 7)) // 16/11/2026, segunda

let db: DB
let admin: api.Session
let ana: api.Session

const address = { street: 'Rua Teste', number: '1', district: 'Centro', city: 'Natal/RN' }

beforeEach(async () => {
  db = await buildSeed(NOW)
  // limpa a agenda do dia usado nos testes
  db.appointments = db.appointments.filter((a) => ymd(new Date(a.start)) !== nextMonday)
  db.blocks = []
  admin = await api.login(db, DEMO.admin.email, DEMO.admin.password)
  ana = await api.login(db, DEMO.client.email, DEMO.client.password)
})

describe('autenticação', () => {
  it('recusa senha errada', async () => {
    await expect(api.login(db, DEMO.client.email, 'errada123')).rejects.toThrow()
  })
  it('não guarda senha em texto puro', () => {
    expect(db.users.every((u) => u.passwordHash.length === 64 && !u.passwordHash.includes('demo'))).toBe(true)
  })
  it('cadastro valida dados e cria sessão de cliente', async () => {
    await expect(api.register(db, { name: 'Só', email: 'x@y.com', phone: '84999999999', password: '12345678', acceptTerms: true })).rejects.toThrow('nome completo')
    await expect(api.register(db, { name: 'Novo Cliente', email: 'novo@teste.com', phone: '84999999999', password: '123', acceptTerms: true })).rejects.toThrow('8 caracteres')
    const s = await api.register(db, { name: 'Novo Cliente', email: 'novo@teste.com', phone: '84999999999', password: '12345678', acceptTerms: true })
    expect(s.role).toBe('client')
    await expect(api.register(db, { name: 'Outro Nome', email: 'novo@teste.com', phone: '84999999999', password: '12345678', acceptTerms: true })).rejects.toThrow('Já existe')
  })
})

describe('isolamento e permissões', () => {
  it('cliente não acessa funções administrativas', () => {
    expect(() => api.adminClients(db, ana)).toThrow(api.AccessError)
    expect(() => api.adminNotes(db, ana, 'cli_ana')).toThrow(api.AccessError)
    expect(() => api.adminUpdateSettings(db, ana, { travelMin: 0 })).toThrow(api.AccessError)
  })
  it('cliente só vê os próprios agendamentos e pacotes', () => {
    expect(api.myAppointments(db, ana).every((a) => a.clientId === 'cli_ana')).toBe(true)
    expect(api.myPackages(db, ana).every((p) => p.clientId === 'cli_ana')).toBe(true)
    expect(api.myNotifications(db, ana).every((n) => n.clientId === 'cli_ana')).toBe(true)
  })
  it('cliente não cancela agendamento de outra pessoa', () => {
    const other = db.appointments.find((a) => a.clientId !== 'cli_ana' && a.status === 'agendado')!
    expect(() => api.cancelMine(db, ana, other.id, NOW)).toThrow(api.AccessError)
  })
  it('observações profissionais não aparecem em nada que o cliente recebe', () => {
    const payload = JSON.stringify({
      a: api.myAppointments(db, ana), p: api.myPackages(db, ana), an: api.myAnamnesis(db, ana),
      n: api.myNotifications(db, ana), c: api.myClient(db, ana),
    })
    for (const note of db.professionalNotes) expect(payload).not.toContain(note.text)
  })
})

describe('disponibilidade', () => {
  it('respeita expediente, pausa e duração', () => {
    const slots = api.slotsFor(db, nextMonday, 'svc_avulsa', NOW).map((d) => d.getHours() * 60 + d.getMinutes())
    expect(slots[0]).toBe(8 * 60)
    expect(slots.at(-1)).toBe(19 * 60) // 19h + 60min = 20h
    // nenhuma sessão invade a pausa 12h-13h
    expect(slots.some((m) => m > 11 * 60 && m < 13 * 60)).toBe(false)
  })
  it('domingo e férias ficam fechados', () => {
    const sunday = ymd(addDays(NOW, 6))
    expect(api.slotsFor(db, sunday, 'svc_avulsa', NOW)).toHaveLength(0)
    db.settings.vacations.push({ id: 'v', from: nextMonday, to: nextMonday, reason: 'férias' })
    expect(api.slotsFor(db, nextMonday, 'svc_avulsa', NOW)).toHaveLength(0)
  })
  it('aplica antecedência mínima', () => {
    const today = ymd(NOW) // agora 07:00, antecedência 4h => primeiro horário 11:00
    const slots = api.slotsFor(db, today, 'svc_avulsa', NOW)
    expect(slots.every((d) => d.getTime() >= NOW.getTime() + 4 * 3600000)).toBe(true)
  })
  it('bloqueia horários incompatíveis com deslocamento', () => {
    api.bookMine(db, ana, { serviceId: 'svc_avulsa', start: atMinutes(nextMonday, 10 * 60).toISOString(), address }, NOW)
    const m = api.slotsFor(db, nextMonday, 'svc_avulsa', NOW).map((d) => d.getHours() * 60 + d.getMinutes())
    // 10h-11h ocupado + 30min de deslocamento: 9h (termina 10h) não cabe; 8h30 cabe (termina 9h30)
    expect(m).toContain(8 * 60 + 30)
    expect(m).not.toContain(9 * 60)
    expect(m).not.toContain(11 * 60)
    // 11h30 respeitaria o deslocamento, mas invade a pausa de 12h; próximo livre é 13h
    expect(m).not.toContain(11 * 60 + 30)
    expect(m).toContain(13 * 60)
  })
  it('bloqueio manual remove horários', () => {
    db.blocks.push({ id: 'b', start: atMinutes(nextMonday, 14 * 60).toISOString(), end: atMinutes(nextMonday, 16 * 60).toISOString(), reason: 'x' })
    const m = api.slotsFor(db, nextMonday, 'svc_avulsa', NOW).map((d) => d.getHours() * 60 + d.getMinutes())
    expect(m).not.toContain(14 * 60)
    expect(m).not.toContain(15 * 60)
    expect(m).toContain(16 * 60)
  })
  it('função pura computeSlots funciona sem banco', () => {
    const s = computeSlots({ settings: db.settings, date: nextMonday, durationMin: 90, appointments: [], blocks: [], now: NOW })
    expect(s.at(-1)!.getHours()).toBe(18) // 18h30 + 90 = 20h
  })
})

describe('agendamento', () => {
  it('impede reserva duplicada no mesmo horário', async () => {
    const start = atMinutes(nextMonday, 15 * 60).toISOString()
    api.bookMine(db, ana, { serviceId: 'svc_avulsa', start, address }, NOW)
    const other = await api.register(db, { name: 'Cliente Concorrente', email: 'c@c.com', phone: '84999999999', password: '12345678', acceptTerms: true })
    expect(() => api.bookMine(db, other, { serviceId: 'svc_avulsa', start, address }, NOW)).toThrow(api.SlotTakenError)
  })
  it('exige endereço completo', () => {
    expect(() => api.bookMine(db, ana, { serviceId: 'svc_avulsa', start: atMinutes(nextMonday, 15 * 60).toISOString(), address: { ...address, number: '' } }, NOW)).toThrow('endereço')
  })
  it('cancelamento respeita a antecedência configurada', () => {
    const a = api.bookMine(db, ana, { serviceId: 'svc_avulsa', start: atMinutes(nextMonday, 15 * 60).toISOString(), address }, NOW)
    const late = new Date(new Date(a.start).getTime() - 2 * 3600000)
    expect(() => api.cancelMine(db, ana, a.id, late)).toThrow('12h')
    api.cancelMine(db, ana, a.id, NOW)
    expect(a.status).toBe('cancelado')
    // horário volta a ficar livre
    expect(api.slotsFor(db, nextMonday, 'svc_avulsa', NOW).some((d) => d.toISOString() === a.start)).toBe(true)
  })
  it('remarcação pelo cliente usa um horário livre', () => {
    const a = api.bookMine(db, ana, { serviceId: 'svc_avulsa', start: atMinutes(nextMonday, 15 * 60).toISOString(), address }, NOW)
    api.rescheduleMine(db, ana, a.id, atMinutes(nextMonday, 17 * 60).toISOString(), NOW)
    expect(new Date(a.start).getHours()).toBe(17)
  })
  it('lista de espera avisa quando abre vaga e trava a vaga para quem confirmar primeiro', async () => {
    // lota a manhã
    const morning = [8 * 60, 9 * 60 + 30, 11 * 60]
    const appts = morning.map((m) => api.adminCreateAppointment(db, admin, { clientId: 'cli_carla', serviceId: 'svc_avulsa', start: atMinutes(nextMonday, m).toISOString(), address }, NOW))
    expect(api.slotsFor(db, nextMonday, 'svc_avulsa', NOW).filter((d) => d.getHours() < 12)).toHaveLength(0)
    const w = api.addWaitlistMine(db, ana, { date: nextMonday, period: 'manha', altDates: [], serviceId: 'svc_avulsa' })
    api.adminCancel(db, admin, appts[1].id, NOW)
    expect(w.status).toBe('notificado')
    expect(db.notifications.some((n) => n.clientId === 'cli_ana' && n.kind === 'lista_espera')).toBe(true)
    // duas pessoas tentam a mesma vaga: a segunda falha
    const freed = appts[1].start
    api.bookMine(db, ana, { serviceId: 'svc_avulsa', start: freed, address }, NOW)
    const other = await api.register(db, { name: 'Outra Pessoa', email: 'o@o.com', phone: '84999999999', password: '12345678', acceptTerms: true })
    expect(() => api.bookMine(db, other, { serviceId: 'svc_avulsa', start: freed, address }, NOW)).toThrow(api.SlotTakenError)
  })
  it('notificações externas ficam como integração pendente (nada é simulado como enviado)', () => {
    api.bookMine(db, ana, { serviceId: 'svc_avulsa', start: atMinutes(nextMonday, 15 * 60).toISOString(), address }, NOW)
    expect(db.notifications.every((n) => n.channels.whatsapp === 'pendente_integracao' && n.channels.email === 'pendente_integracao')).toBe(true)
  })
})

describe('pacotes e financeiro', () => {
  it('desconta sessão ao concluir atendimento do pacote', () => {
    const cp = db.clientPackages.find((p) => p.id === 'cpk_ana')!
    const before = cp.sessionsUsed
    const a = api.bookMine(db, ana, { serviceId: 'svc_avulsa', start: atMinutes(nextMonday, 15 * 60).toISOString(), address, clientPackageId: cp.id }, NOW)
    expect(a.price).toBe(0)
    api.adminSetStatus(db, admin, a.id, 'realizado', NOW)
    expect(cp.sessionsUsed).toBe(before + 1)
    // marcar de novo não desconta duas vezes
    api.adminSetStatus(db, admin, a.id, 'realizado', NOW)
    expect(cp.sessionsUsed).toBe(before + 1)
  })
  it('não deixa reservar mais sessões do que o pacote tem', () => {
    const cp = db.clientPackages.find((p) => p.id === 'cpk_ana')!
    // 4 sessões, 2 usadas, 1 já reservada na seed => sobra 1
    expect(api.packageAvailability(db, cp, NOW).bookable).toBe(1)
    api.bookMine(db, ana, { serviceId: 'svc_avulsa', start: atMinutes(nextMonday, 15 * 60).toISOString(), address, clientPackageId: cp.id }, NOW)
    expect(() => api.bookMine(db, ana, { serviceId: 'svc_avulsa', start: atMinutes(nextMonday, 17 * 60).toISOString(), address, clientPackageId: cp.id }, NOW)).toThrow('sessões')
  })
  it('atendimento avulso realizado gera pagamento pendente', () => {
    const a = api.adminCreateAppointment(db, admin, { clientId: 'cli_diego', serviceId: 'svc_avulsa', start: atMinutes(nextMonday, 15 * 60).toISOString(), address }, NOW)
    api.adminSetStatus(db, admin, a.id, 'realizado', NOW)
    const p = db.payments.find((x) => x.appointmentId === a.id)!
    expect(p.status).toBe('pendente')
    expect(p.amount).toBe(90)
  })
  it('venda de pacote registra contrato e receita', () => {
    const cp = api.adminSellPackage(db, admin, { clientId: 'cli_elisa', planId: 'plan_4v', method: 'pix', paid: true })
    expect(cp.sessionsTotal).toBe(4)
    expect(db.payments.some((p) => p.clientPackageId === cp.id && p.amount === 260 && p.status === 'recebido')).toBe(true)
  })
  it('preços iniciais vêm da base, não do código das telas', () => {
    expect(db.services.find((s) => s.id === 'svc_avulsa')!.price).toBe(90)
    expect(db.packagePlans.map((p) => p.price)).toEqual([280, 260, 200])
  })
})

describe('anamnese e mapa corporal', () => {
  it('exige consentimento LGPD e registra versão', () => {
    const ans = { ...emptyAnswers(), fullName: 'Ana', pain: 'nao' as const }
    expect(() => api.submitAnamnesis(db, ana, ans, false)).toThrow('consentimento')
    const a = api.submitAnamnesis(db, ana, ans, true)
    expect(a.version).toBe(2)
    expect(a.consentVersion).toBe(api.CONSENT_VERSION)
    expect(db.consents.filter((c) => c.clientId === 'cli_ana' && c.kind === 'dados_saude')).toHaveLength(2)
  })
  it('se marcar dor, exige ao menos uma região de dor no mapa', () => {
    const ans = { ...emptyAnswers(), pain: 'sim' as const }
    expect(() => api.submitAnamnesis(db, ana, ans, true)).toThrow('mapa')
  })
  it('marcações são recuperadas na versão mais recente', () => {
    const latest = api.myAnamnesis(db, ana)!
    expect(latest.answers.marks.length).toBeGreaterThan(0)
    expect(latest.answers.marks.every((m) => REGION_BY_ID[m.regionId])).toBe(true)
  })
  it('regiões têm ids únicos e lateralidade correta', () => {
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(REGIONS.length)
    expect(REGION_BY_ID['anterior.ombro.dir'].side).toBe('direito')
    expect(REGION_BY_ID['posterior.gluteo.esq'].side).toBe('esquerdo')
    // na vista frontal, o lado direito da pessoa fica à esquerda da tela
    const d = REGION_BY_ID['anterior.ombro.dir'].shape
    expect(d.type === 'poly' && d.pts[0][0] < 110).toBe(true)
    // sem vista lateral
    expect(REGIONS.every((r) => r.view === 'anterior' || r.view === 'posterior')).toBe(true)
  })
})
