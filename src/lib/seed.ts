// Dados FICTÍCIOS para a demonstração. Nenhuma informação real.
import type { Anamnesis, AnamnesisAnswers, Appointment, Client, DB, Expense, Payment, Settings } from './types'
import { hashPassword, CONSENT_VERSION, TERMS_VERSION } from './api'
import { addDays, atMinutes, ymd } from './util'

export const DEMO = {
  admin: { email: 'admin@demo.salvia', password: 'demo1234' },
  client: { email: 'ana.demo@exemplo.com', password: 'demo1234' },
}

export const DB_VERSION = 3

export function defaultSettings(): Settings {
  const wd = { enabled: true, open: '08:00', close: '20:00' }
  return {
    businessName: 'Sálvia Massoterapia',
    tagline: 'Massagem terapêutica e relaxante no conforto da sua casa',
    phone: '(84) 90000-0000',
    whatsapp: '(84) 90000-0000',
    email: 'contato@demo.salvia',
    referenceAddress: 'Natal/RN · atendimento a domicílio',
    week: [
      { enabled: false, open: '08:00', close: '12:00' },
      { ...wd }, { ...wd }, { ...wd }, { ...wd }, { ...wd },
      { enabled: true, open: '08:00', close: '14:00' },
    ],
    breaks: [{ start: '12:00', end: '13:00' }],
    slotStepMin: 30,
    travelMin: 30,
    minAdvanceHours: 4,
    maxAdvanceDays: 60,
    cancelMinHours: 12,
    cancelPolicyText:
      'Cancelamentos e alterações pelo site podem ser feitos até 12 horas antes do horário marcado. Depois disso, fale diretamente pelo WhatsApp.',
    reminders: { afterBooking: true, hoursBefore: [24, 2] },
    vacations: [],
    familyPackageNote:
      'Válido para clientes da mesma residência, com contratação conjunta e atendimentos em sequência no mesmo endereço.',
  }
}

export const emptyAnswers = (): AnamnesisAnswers => ({
  fullName: '', age: '', profession: '', mainGoalText: '',
  conditions: [], conditionsOther: '', continuousMeds: '', medsDetail: '', allergies: '', allergiesDetail: '',
  skin: [], skinOther: '', productSensitivity: '', productSensitivityDetail: '',
  pain: '', injury: '', injuryDetail: '', mobilityLimit: '', mobilityDetail: '',
  marks: [],
  pregnant: '', avoidRegions: '', avoidRegionIds: [], avoidText: '', goal: '', goalOther: '', pressure: '', extraInfo: '',
})

// gerador determinístico para a demo ficar igual a cada reset
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

const addr = (street: string, number: string, district: string) => ({ street, number, district, city: 'Natal/RN' })

export async function buildSeed(now = new Date()): Promise<DB> {
  const rand = rng(42)
  const iso = now.toISOString()
  const settings = defaultSettings()

  const services = [
    { id: 'svc_avulsa', name: 'Massagem avulsa', description: 'Sessão de 60 minutos de massagem relaxante ou terapêutica, ajustada às suas necessidades.', durationMin: 60, price: 90, active: true },
    { id: 'svc_longa', name: 'Massagem estendida 90 min (exemplo)', description: 'Serviço de exemplo para a demonstração. Sessão longa com foco em regiões de maior tensão.', durationMin: 90, price: 130, active: true },
    { id: 'svc_express', name: 'Quick massage 30 min (exemplo)', description: 'Serviço de exemplo para a demonstração. Sessão curta para costas, pescoço e ombros.', durationMin: 30, price: 50, active: true },
  ]

  const packagePlans = [
    { id: 'plan_4', name: 'Pacote de 4 sessões', sessions: 4, price: 280, validityDays: 60, paymentTerms: 'Pix ou cartão, em até 2x', active: true },
    { id: 'plan_4v', name: 'Pacote de 4 sessões à vista', sessions: 4, price: 260, validityDays: 60, paymentTerms: 'À vista (Pix ou dinheiro)', active: true },
    {
      id: 'plan_fam', name: 'Pacote familiar adicional', sessions: 4, price: 200, validityDays: 60, paymentTerms: 'Junto com o pacote principal',
      conditions: settings.familyPackageNote, active: true,
    },
  ]

  const users = [
    { id: 'usr_admin', email: DEMO.admin.email, passwordHash: await hashPassword(DEMO.admin.password), role: 'admin' as const, createdAt: iso },
    { id: 'usr_ana', email: DEMO.client.email, passwordHash: await hashPassword(DEMO.client.password), role: 'client' as const, createdAt: iso },
  ]

  const ago = (d: number) => addDays(now, -d).toISOString()
  const clients: Client[] = [
    { id: 'cli_ana', userId: 'usr_ana', name: 'Ana Demonstração', email: DEMO.client.email, phone: '(84) 90000-0001', birthDate: '1994-03-12', status: 'ativo', createdAt: ago(110), isDemo: true, address: addr('Rua Exemplo das Flores', '120', 'Bairro Fictício') },
    { id: 'cli_bruno', name: 'Bruno Exemplo', email: 'bruno.exemplo@exemplo.com', phone: '(84) 90000-0002', status: 'ativo', createdAt: ago(100), isDemo: true, address: addr('Av. Teste', '45', 'Bairro Modelo') },
    { id: 'cli_carla', name: 'Carla Fictícia', email: 'carla.ficticia@exemplo.com', phone: '(84) 90000-0003', status: 'ativo', createdAt: ago(80), isDemo: true, address: addr('Rua Simulada', '300', 'Bairro Fictício') },
    { id: 'cli_diego', name: 'Diego Teste', email: 'diego.teste@exemplo.com', phone: '(84) 90000-0004', status: 'ativo', createdAt: ago(55), isDemo: true, address: addr('Rua Protótipo', '12', 'Bairro Exemplo') },
    { id: 'cli_elisa', name: 'Elisa Modelo', email: 'elisa.modelo@exemplo.com', phone: '(84) 90000-0005', status: 'ativo', createdAt: ago(20), isDemo: true, address: addr('Travessa Demo', '8', 'Bairro Modelo') },
    { id: 'cli_fabio', name: 'Fábio Amostra', email: 'fabio.amostra@exemplo.com', phone: '(84) 90000-0006', status: 'inativo', createdAt: ago(120), isDemo: true, address: addr('Rua Amostra', '77', 'Bairro Teste') },
  ]

  const appointments: Appointment[] = []
  const payments: Payment[] = []
  const methods = ['pix', 'pix', 'pix', 'dinheiro', 'credito', 'debito'] as const
  const others = ['cli_bruno', 'cli_carla', 'cli_diego', 'cli_elisa', 'cli_fabio']
  const times = [9 * 60, 14 * 60, 17 * 60]
  let n = 0

  const push = (clientId: string, svcId: string, start: Date, status: Appointment['status'], pkg?: string) => {
    const svc = services.find((s) => s.id === svcId)!
    const c = clients.find((x) => x.id === clientId)!
    const a: Appointment = {
      id: `apt_${++n}`, clientId, serviceId: svc.id, serviceName: svc.name, start: start.toISOString(),
      end: new Date(start.getTime() + svc.durationMin * 60000).toISOString(), price: pkg ? 0 : svc.price,
      status, address: c.address!, clientPackageId: pkg, createdAt: new Date(start.getTime() - 5 * 86400000).toISOString(),
      cancelledAt: status === 'cancelado' ? new Date(start.getTime() - 86400000).toISOString() : undefined,
    }
    appointments.push(a)
    if (status === 'realizado' && !pkg) {
      const pending = rand() < 0.08
      payments.push({ id: `pay_${n}`, clientId, appointmentId: a.id, description: svc.name, date: ymd(start), amount: svc.price, method: methods[Math.floor(rand() * methods.length)], status: pending ? 'pendente' : 'recebido' })
    }
    return a
  }

  // Histórico de 120 dias dos outros clientes
  for (let d = 120; d >= 1; d--) {
    const day = addDays(now, -d)
    const dow = day.getDay()
    if (!settings.week[dow].enabled) continue
    for (const t of times) {
      if (dow === 6 && t > 11 * 60) continue
      if (rand() > 0.42) continue
      const cid = others[Math.floor(rand() * others.length)]
      const created = clients.find((c) => c.id === cid)!.createdAt
      if (day.toISOString() < created) continue
      const r = rand()
      const svc = r < 0.68 ? 'svc_avulsa' : r < 0.86 ? 'svc_longa' : 'svc_express'
      const st = rand()
      push(cid, svc, atMinutes(ymd(day), t), st < 0.86 ? 'realizado' : st < 0.95 ? 'cancelado' : 'ausente')
    }
  }

  // Pacote da Ana: 4 sessões, 2 usadas
  const pkgStart = addDays(now, -24)
  const clientPackages = [
    { id: 'cpk_ana', clientId: 'cli_ana', planId: 'plan_4', planName: 'Pacote de 4 sessões', purchasedAt: pkgStart.toISOString(), pricePaid: 280, sessionsTotal: 4, sessionsUsed: 2, expiresAt: addDays(pkgStart, 60).toISOString() },
    { id: 'cpk_bruno', clientId: 'cli_bruno', planId: 'plan_4v', planName: 'Pacote de 4 sessões à vista', purchasedAt: addDays(now, -50).toISOString(), pricePaid: 260, sessionsTotal: 4, sessionsUsed: 3, expiresAt: addDays(now, 10).toISOString() },
  ]
  payments.push({ id: 'pay_pkg_ana', clientId: 'cli_ana', clientPackageId: 'cpk_ana', description: 'Pacote de 4 sessões', date: ymd(pkgStart), amount: 280, method: 'pix', status: 'recebido' })
  payments.push({ id: 'pay_pkg_bruno', clientId: 'cli_bruno', clientPackageId: 'cpk_bruno', description: 'Pacote de 4 sessões à vista', date: ymd(addDays(now, -50)), amount: 260, method: 'dinheiro', status: 'recebido' })

  // encontra o próximo dia útil a partir de um offset, evitando choque com o histórico
  const nextOpen = (offset: number, minute: number) => {
    let d = addDays(now, offset)
    while (!settings.week[d.getDay()].enabled || (d.getDay() === 6 && minute >= 12 * 60)) d = addDays(d, 1)
    return atMinutes(ymd(d), minute)
  }
  const clearDay = (date: Date) => {
    const k = ymd(date)
    for (let i = appointments.length - 1; i >= 0; i--) if (ymd(new Date(appointments[i].start)) === k) appointments.splice(i, 1)
  }

  // Sessões da Ana
  const anaPast = [nextOpen(-90, 10 * 60 + 30), nextOpen(-20, 10 * 60 + 30), nextOpen(-8, 10 * 60 + 30)]
  anaPast.forEach(clearDay)
  push('cli_ana', 'svc_avulsa', anaPast[0], 'realizado')
  push('cli_ana', 'svc_avulsa', anaPast[1], 'realizado', 'cpk_ana')
  push('cli_ana', 'svc_avulsa', anaPast[2], 'realizado', 'cpk_ana')
  const anaNext = nextOpen(2, 10 * 60)
  push('cli_ana', 'svc_avulsa', anaNext, 'confirmado', 'cpk_ana')

  // Agenda futura dos outros
  push('cli_bruno', 'svc_avulsa', nextOpen(1, 15 * 60), 'agendado', 'cpk_bruno')
  push('cli_carla', 'svc_longa', nextOpen(2, 14 * 60), 'agendado')
  push('cli_diego', 'svc_avulsa', nextOpen(3, 9 * 60), 'confirmado')
  push('cli_elisa', 'svc_express', nextOpen(4, 18 * 60), 'agendado')
  push('cli_carla', 'svc_avulsa', nextOpen(7, 9 * 60), 'agendado')
  push('cli_diego', 'svc_avulsa', nextOpen(9, 16 * 60), 'agendado')

  // remove possíveis reservas passadas do histórico que caiam no futuro (não deveria, mas por segurança)
  // Despesas fictícias dos últimos 4 meses
  const expenses: Expense[] = []
  let e = 0
  for (let m = 3; m >= 0; m--) {
    const base = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const add = (day: number, description: string, category: Expense['category'], amount: number, method: Expense['method']) => {
      const d = new Date(base.getFullYear(), base.getMonth(), day)
      if (d > now) return
      expenses.push({ id: `exp_${++e}`, description, category, amount, date: ymd(d), method })
    }
    add(3, 'Óleo de massagem neutro 1L', 'produtos', 68 + m * 3, 'pix')
    add(5, 'Combustível', 'transporte', 180 + Math.round(rand() * 60), 'debito')
    add(19, 'Combustível', 'transporte', 160 + Math.round(rand() * 60), 'debito')
    add(10, 'Lençóis descartáveis e toalhas', 'materiais', 54, 'pix')
    if (m % 2 === 0) add(14, 'Impulsionamento Instagram', 'marketing', 80, 'credito')
    if (m === 2) add(22, 'Revisão da maca portátil', 'manutencao', 120, 'dinheiro')
  }

  // Anamnese da Ana com marcações no mapa
  const markedAt = addDays(now, -24).toISOString()
  const answers: AnamnesisAnswers = {
    ...emptyAnswers(),
    fullName: 'Ana Demonstração', age: '32', profession: 'Analista (exemplo)', mainGoalText: 'Aliviar tensão no pescoço e ombros por trabalhar muitas horas sentada.',
    conditions: ['nenhuma'], continuousMeds: 'nao', allergies: 'sim', allergiesDetail: 'Dado fictício: alergia a lavanda.',
    skin: ['nenhuma'], productSensitivity: 'sim', productSensitivityDetail: 'Prefere óleo sem fragrância (exemplo).',
    pain: 'sim', injury: 'nao', mobilityLimit: 'nao',
    marks: [
      { regionId: 'posterior.trapezio.dir', view: 'posterior', side: 'direito', level: 'vermelho', kind: 'dor', markedAt },
      { regionId: 'posterior.trapezio.esq', view: 'posterior', side: 'esquerdo', level: 'amarelo', kind: 'dor', markedAt },
      { regionId: 'posterior.cervical', view: 'posterior', side: 'central', level: 'vermelho', kind: 'dor', markedAt },
      { regionId: 'posterior.lombar', view: 'posterior', side: 'central', level: 'amarelo', kind: 'atencao', markedAt },
      { regionId: 'anterior.ombro.dir', view: 'anterior', side: 'direito', level: 'amarelo', kind: 'dor', markedAt },
      { regionId: 'posterior.panturrilha.esq', view: 'posterior', side: 'esquerdo', level: 'amarelo', kind: 'atencao', markedAt },
    ],
    pregnant: 'nao', avoidRegions: 'sim', avoidRegionIds: ['anterior.abdomen'], avoidText: '',
    goal: 'alivio', pressure: 'moderada', extraInfo: 'Informação fictícia para demonstração.',
  }
  const anamneses: Anamnesis[] = [
    { id: 'anm_ana_1', clientId: 'cli_ana', version: 1, answers, consentVersion: CONSENT_VERSION, consentAt: markedAt, submittedAt: markedAt },
  ]
  const consents = [
    { id: 'cns_1', clientId: 'cli_ana', kind: 'termos' as const, version: TERMS_VERSION, acceptedAt: clients[0].createdAt },
    { id: 'cns_2', clientId: 'cli_ana', kind: 'dados_saude' as const, version: CONSENT_VERSION, acceptedAt: markedAt },
  ]

  const professionalNotes = [
    { id: 'nt_1', clientId: 'cli_ana', appointmentId: appointments.find((a) => a.clientId === 'cli_ana' && a.start === anaPast[1].toISOString())?.id, text: 'Nota interna fictícia: trapézio direito bem tenso, respondeu bem à pressão moderada.', evolution: 'Relatou melhora de 30% na tensão cervical.', createdAt: anaPast[1].toISOString() },
    { id: 'nt_2', clientId: 'cli_ana', text: 'Nota interna fictícia: preferir horários pela manhã. Usar óleo sem fragrância.', createdAt: anaPast[2].toISOString() },
  ]

  const blocks = [{ id: 'blk_1', start: nextOpen(5, 13 * 60).toISOString(), end: nextOpen(5, 16 * 60).toISOString(), reason: 'Compromisso pessoal (exemplo)' }]

  const waitDate = ymd(nextOpen(2, 9 * 60))
  const waitlist = [{ id: 'wl_1', clientId: 'cli_elisa', date: waitDate, period: 'manha' as const, altDates: [], serviceId: 'svc_avulsa', status: 'aguardando' as const, createdAt: ago(1) }]

  const db: DB = {
    version: DB_VERSION, users, clients, services, packagePlans, clientPackages, appointments, payments, expenses,
    anamneses, professionalNotes, consents, waitlist, notifications: [], blocks, settings, audit: [],
  }

  const nt = (o: Partial<DB['notifications'][number]> & { title: string; body: string; kind: DB['notifications'][number]['kind'] }, hoursAgo: number, read = false) =>
    db.notifications.push({
      id: `ntf_seed_${db.notifications.length}`, createdAt: new Date(now.getTime() - hoursAgo * 3600000).toISOString(), read,
      channels: { whatsapp: 'pendente_integracao', email: 'pendente_integracao', app: 'entregue' }, ...o,
    })
  nt({ clientId: 'cli_ana', kind: 'agendamento', title: 'Agendamento confirmado', body: 'Massagem avulsa confirmada (dados de demonstração).', link: '/cliente' }, 30)
  nt({ clientId: 'cli_ana', kind: 'pacote', title: 'Pacote ativado', body: 'Pacote de 4 sessões ativo por 60 dias.', link: '/cliente/pacotes' }, 24 * 24, true)
  nt({ kind: 'pacote', title: 'Pacote perto do vencimento', body: 'Bruno Exemplo: pacote vence em 10 dias com 1 sessão restante.', link: '/admin/clientes/cli_bruno' }, 5)
  nt({ kind: 'sistema', title: 'Anamnese enviada', body: 'Ana Demonstração enviou a anamnese (versão 1).', link: '/admin/clientes/cli_ana' }, 24 * 24, true)
  db.audit.push({ id: 'log_seed', at: iso, actor: 'Sistema', action: 'Base de demonstração criada', detail: 'Dados fictícios' })
  return db
}
