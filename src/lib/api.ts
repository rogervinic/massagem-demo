// Camada de acesso a dados. Todas as funções recebem a sessão e aplicam as
// mesmas regras que as políticas de Row Level Security aplicariam no Supabase:
// cliente só enxerga o próprio cadastro; observações profissionais só para admin.

import type {
  Address, Anamnesis, AnamnesisAnswers, Appointment, Client, ClientPackage, DB, Expense, NotificationItem,
  PackagePlan, Payment, PaymentMethod, ProfessionalNote, Service, Settings, TimeBlock, WaitlistEntry, Period,
} from './types'
import { computeSlots, isIntervalFree, periodOf, canClientCancel } from './availability'
import { fmtDate, fmtTime, sha256, uid, ymd } from './util'

export const CONSENT_VERSION = 'LGPD-saude-v1.0 (2026-11)'
export const TERMS_VERSION = 'termos-v1.0 (2026-11)'

export interface Session {
  userId: string
  role: 'client' | 'admin'
  clientId?: string
  name: string
}

export class AccessError extends Error {}
export class SlotTakenError extends Error {}
export class RuleError extends Error {}

const requireAdmin = (s: Session | null) => {
  if (!s || s.role !== 'admin') throw new AccessError('Acesso restrito ao administrador.')
}
const requireClient = (s: Session | null): string => {
  if (!s || s.role !== 'client' || !s.clientId) throw new AccessError('Faça login como cliente.')
  return s.clientId
}

const audit = (db: DB, s: Session, action: string, detail?: string) => {
  db.audit.unshift({ id: uid('log_'), at: new Date().toISOString(), actor: s.name, action, detail })
  db.audit = db.audit.slice(0, 300)
}

export function notify(
  db: DB,
  n: Omit<NotificationItem, 'id' | 'createdAt' | 'read' | 'channels'>,
) {
  // Sem credenciais do WhatsApp/E-mail, a mensagem fica registrada no app e
  // marcada como "integração pendente". Nada é enviado de verdade.
  const item: NotificationItem = {
    ...n,
    id: uid('ntf_'),
    createdAt: new Date().toISOString(),
    read: false,
    channels: { whatsapp: 'pendente_integracao', email: 'pendente_integracao', app: 'entregue' },
  }
  db.notifications.unshift(item)
  return item
}

// ------------------------------------------------------------------ Autenticação

export async function hashPassword(pw: string) {
  return sha256('salvia-demo::' + pw)
}

export async function login(db: DB, email: string, password: string): Promise<Session> {
  const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  if (!user || user.passwordHash !== (await hashPassword(password))) throw new RuleError('E-mail ou senha incorretos.')
  if (user.role === 'admin') return { userId: user.id, role: 'admin', name: 'Administrador' }
  const client = db.clients.find((c) => c.userId === user.id)
  if (!client) throw new RuleError('Cadastro de cliente não encontrado.')
  return { userId: user.id, role: 'client', clientId: client.id, name: client.name }
}

export async function register(
  db: DB,
  data: { name: string; email: string; phone: string; birthDate?: string; cpf?: string; password: string; acceptTerms: boolean },
): Promise<Session> {
  const email = data.email.trim().toLowerCase()
  if (!data.name.trim() || data.name.trim().split(' ').length < 2) throw new RuleError('Informe o nome completo.')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new RuleError('E-mail inválido.')
  if (data.phone.replace(/\D/g, '').length < 10) throw new RuleError('Telefone inválido. Use DDD + número.')
  if (data.password.length < 8) throw new RuleError('A senha precisa ter pelo menos 8 caracteres.')
  if (data.cpf && data.cpf.replace(/\D/g, '').length !== 11) throw new RuleError('CPF deve ter 11 dígitos.')
  if (!data.acceptTerms) throw new RuleError('É preciso aceitar os termos e a política de privacidade.')
  if (db.users.some((u) => u.email === email)) throw new RuleError('Já existe uma conta com este e-mail.')

  const now = new Date().toISOString()
  const userId = uid('usr_')
  db.users.push({ id: userId, email, passwordHash: await hashPassword(data.password), role: 'client', createdAt: now })
  const client: Client = {
    id: uid('cli_'), userId, name: data.name.trim(), email, phone: data.phone.trim(),
    birthDate: data.birthDate || undefined, cpf: data.cpf || undefined, status: 'ativo', createdAt: now,
  }
  db.clients.push(client)
  db.consents.push({ id: uid('cns_'), clientId: client.id, kind: 'termos', version: TERMS_VERSION, acceptedAt: now })
  notify(db, { title: 'Novo cliente cadastrado', body: `${client.name} criou uma conta.`, kind: 'sistema', link: `/admin/clientes/${client.id}` })
  return { userId, role: 'client', clientId: client.id, name: client.name }
}

export async function resetPassword(db: DB, email: string, newPassword: string) {
  const user = db.users.find((u) => u.email === email.trim().toLowerCase())
  if (!user) throw new RuleError('Não encontramos uma conta com este e-mail.')
  if (newPassword.length < 8) throw new RuleError('A senha precisa ter pelo menos 8 caracteres.')
  user.passwordHash = await hashPassword(newPassword)
}

// ------------------------------------------------------------------ Público

export const listActiveServices = (db: DB) => db.services.filter((s) => s.active)
export const listActivePlans = (db: DB) => db.packagePlans.filter((p) => p.active)

export function slotsFor(db: DB, date: string, serviceId: string, now = new Date(), excludeAppointmentId?: string) {
  const svc = db.services.find((s) => s.id === serviceId)
  if (!svc) return []
  return computeSlots({
    settings: db.settings, date, durationMin: svc.durationMin, appointments: db.appointments,
    blocks: db.blocks, now, excludeAppointmentId,
  })
}

// ------------------------------------------------------------------ Cliente

export function myClient(db: DB, s: Session) {
  const id = requireClient(s)
  return db.clients.find((c) => c.id === id)!
}

export function updateMyProfile(db: DB, s: Session, patch: Partial<Pick<Client, 'name' | 'phone' | 'birthDate' | 'cpf' | 'address'>>) {
  const c = myClient(db, s)
  Object.assign(c, patch)
}

export function myAppointments(db: DB, s: Session) {
  const id = requireClient(s)
  return db.appointments.filter((a) => a.clientId === id).sort((a, b) => b.start.localeCompare(a.start))
}

export function myPackages(db: DB, s: Session) {
  const id = requireClient(s)
  return db.clientPackages.filter((p) => p.clientId === id)
}

export function myAnamnesis(db: DB, s: Session): Anamnesis | undefined {
  const id = requireClient(s)
  return latestAnamnesis(db, id)
}

export function myNotifications(db: DB, s: Session) {
  const id = requireClient(s)
  return db.notifications.filter((n) => n.clientId === id)
}

export function myWaitlist(db: DB, s: Session) {
  const id = requireClient(s)
  return db.waitlist.filter((w) => w.clientId === id && w.status !== 'cancelado')
}

/** Observações profissionais NUNCA passam por aqui. Não existe função de cliente que as retorne. */

export function packageAvailability(db: DB, cp: ClientPackage, now = new Date()) {
  const reserved = db.appointments.filter(
    (a) => a.clientPackageId === cp.id && (a.status === 'agendado' || a.status === 'confirmado'),
  ).length
  const remaining = cp.sessionsTotal - cp.sessionsUsed
  const expired = new Date(cp.expiresAt).getTime() < now.getTime()
  return { remaining, reserved, bookable: expired ? 0 : Math.max(0, remaining - reserved), expired }
}

function createAppointment(
  db: DB,
  p: { clientId: string; serviceId: string; start: string; address: Address; clientPackageId?: string; notes?: string; force?: boolean },
  now: Date,
) {
  const svc = db.services.find((x) => x.id === p.serviceId)
  if (!svc) throw new RuleError('Serviço não encontrado.')
  if (!p.address?.street || !p.address?.number || !p.address?.district || !p.address?.city)
    throw new RuleError('Informe o endereço completo do atendimento.')
  const start = new Date(p.start)
  const end = new Date(start.getTime() + svc.durationMin * 60000)

  // Revalida no momento da gravação: se alguém reservou antes, falha.
  if (p.force) {
    if (!isIntervalFree(start, end, { settings: { ...db.settings, travelMin: 0 }, appointments: db.appointments, blocks: [] }))
      throw new SlotTakenError('Já existe um atendimento nesse horário.')
  } else {
    const valid = slotsFor(db, ymd(start), svc.id, now).some((d) => d.getTime() === start.getTime())
    if (!valid) throw new SlotTakenError('Esse horário acabou de ficar indisponível. Escolha outro.')
  }

  if (p.clientPackageId) {
    const cp = db.clientPackages.find((x) => x.id === p.clientPackageId && x.clientId === p.clientId)
    if (!cp) throw new RuleError('Pacote não encontrado.')
    if (packageAvailability(db, cp, now).bookable <= 0) throw new RuleError('Este pacote não tem sessões disponíveis.')
  }

  const appt: Appointment = {
    id: uid('apt_'), clientId: p.clientId, serviceId: svc.id, serviceName: svc.name,
    start: start.toISOString(), end: end.toISOString(), price: p.clientPackageId ? 0 : svc.price,
    status: 'agendado', address: p.address, clientPackageId: p.clientPackageId, notes: p.notes,
    createdAt: now.toISOString(),
  }
  db.appointments.push(appt)
  return appt
}

export function bookMine(
  db: DB, s: Session,
  p: { serviceId: string; start: string; address: Address; clientPackageId?: string; saveAddress?: boolean },
  now = new Date(),
) {
  const clientId = requireClient(s)
  const appt = createAppointment(db, { ...p, clientId }, now)
  const c = db.clients.find((x) => x.id === clientId)!
  if (p.saveAddress) c.address = p.address
  notify(db, {
    clientId, kind: 'agendamento', title: 'Agendamento confirmado',
    body: `${appt.serviceName} em ${fmtDate(appt.start)} às ${fmtTime(appt.start)}.`, link: '/cliente',
  })
  notify(db, { kind: 'agendamento', title: 'Novo agendamento', body: `${c.name}: ${appt.serviceName} em ${fmtDate(appt.start)} às ${fmtTime(appt.start)}.`, link: '/admin/agenda' })
  db.waitlist.filter((w) => w.clientId === clientId && w.status === 'notificado' && (w.date === ymd(new Date(appt.start)) || w.altDates.includes(ymd(new Date(appt.start))))).forEach((w) => (w.status = 'atendido'))
  return appt
}

export function cancelMine(db: DB, s: Session, appointmentId: string, now = new Date()) {
  const clientId = requireClient(s)
  const a = db.appointments.find((x) => x.id === appointmentId && x.clientId === clientId)
  if (!a) throw new AccessError('Agendamento não encontrado.')
  if (!canClientCancel(a, db.settings, now))
    throw new RuleError(`Cancelamentos pelo site só até ${db.settings.cancelMinHours}h antes. Fale com a profissional pelo WhatsApp.`)
  doCancel(db, a, 'cliente', now)
}

export function rescheduleMine(db: DB, s: Session, appointmentId: string, newStart: string, now = new Date()) {
  const clientId = requireClient(s)
  const a = db.appointments.find((x) => x.id === appointmentId && x.clientId === clientId)
  if (!a) throw new AccessError('Agendamento não encontrado.')
  if (!canClientCancel(a, db.settings, now))
    throw new RuleError(`Alterações pelo site só até ${db.settings.cancelMinHours}h antes. Use "Solicitar alteração".`)
  moveAppointment(db, a, newStart, now, false)
}

export function requestChangeMine(db: DB, s: Session, appointmentId: string, text: string) {
  const clientId = requireClient(s)
  const a = db.appointments.find((x) => x.id === appointmentId && x.clientId === clientId)
  if (!a) throw new AccessError('Agendamento não encontrado.')
  a.changeRequest = text
  const c = db.clients.find((x) => x.id === clientId)!
  notify(db, { kind: 'alteracao', title: 'Pedido de alteração', body: `${c.name} pediu: "${text}" (sessão de ${fmtDate(a.start)} ${fmtTime(a.start)}).`, link: '/admin/agenda' })
}

export function addWaitlistMine(db: DB, s: Session, e: { date: string; period: Period; altDates: string[]; serviceId: string }) {
  const clientId = requireClient(s)
  if (!e.date) throw new RuleError('Escolha o dia desejado.')
  const entry: WaitlistEntry = { id: uid('wl_'), clientId, ...e, status: 'aguardando', createdAt: new Date().toISOString() }
  db.waitlist.push(entry)
  return entry
}

export function removeWaitlistMine(db: DB, s: Session, id: string) {
  const clientId = requireClient(s)
  const w = db.waitlist.find((x) => x.id === id && x.clientId === clientId)
  if (w) w.status = 'cancelado'
}

export function markNotificationsRead(db: DB, s: Session) {
  if (s.role === 'admin') db.notifications.filter((n) => !n.clientId).forEach((n) => (n.read = true))
  else db.notifications.filter((n) => n.clientId === s.clientId).forEach((n) => (n.read = true))
}

export function submitAnamnesis(db: DB, s: Session, answers: AnamnesisAnswers, consent: boolean) {
  const clientId = requireClient(s)
  if (!consent) throw new RuleError('O consentimento para tratamento de dados de saúde é obrigatório.')
  if (answers.pain === 'sim' && answers.marks.filter((m) => m.kind === 'dor').length === 0)
    throw new RuleError('Você indicou dor: marque pelo menos uma região como "Dor ou desconforto" no mapa corporal.')
  const prev = latestAnamnesis(db, clientId)
  const now = new Date().toISOString()
  const a: Anamnesis = {
    id: uid('anm_'), clientId, version: (prev?.version ?? 0) + 1,
    answers: structuredClone(answers), consentVersion: CONSENT_VERSION, consentAt: now, submittedAt: now,
  }
  db.anamneses.push(a)
  db.consents.push({ id: uid('cns_'), clientId, kind: 'dados_saude', version: CONSENT_VERSION, acceptedAt: now })
  const c = db.clients.find((x) => x.id === clientId)!
  notify(db, { kind: 'sistema', title: prev ? 'Anamnese atualizada' : 'Anamnese enviada', body: `${c.name} ${prev ? 'atualizou' : 'enviou'} a anamnese (versão ${a.version}).`, link: `/admin/clientes/${clientId}` })
  return a
}

// ------------------------------------------------------------------ Compartilhado

export function latestAnamnesis(db: DB, clientId: string) {
  return db.anamneses.filter((a) => a.clientId === clientId).sort((a, b) => b.version - a.version)[0]
}

function doCancel(db: DB, a: Appointment, by: 'cliente' | 'admin', now: Date) {
  a.status = 'cancelado'
  a.cancelledAt = now.toISOString()
  const c = db.clients.find((x) => x.id === a.clientId)
  notify(db, {
    clientId: a.clientId, kind: 'cancelamento', title: 'Agendamento cancelado',
    body: `Sua sessão de ${fmtDate(a.start)} às ${fmtTime(a.start)} foi cancelada${by === 'admin' ? ' pela profissional' : ''}.`,
  })
  if (by === 'cliente') notify(db, { kind: 'cancelamento', title: 'Cancelamento', body: `${c?.name} cancelou a sessão de ${fmtDate(a.start)} às ${fmtTime(a.start)}.`, link: '/admin/agenda' })
  checkWaitlist(db, ymd(new Date(a.start)), now)
}

function moveAppointment(db: DB, a: Appointment, newStart: string, now: Date, force: boolean) {
  const oldStart = a.start
  const svc = db.services.find((x) => x.id === a.serviceId)
  const dur = svc ? svc.durationMin : (new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000
  const start = new Date(newStart)
  const end = new Date(start.getTime() + dur * 60000)
  if (force) {
    if (!isIntervalFree(start, end, { settings: { ...db.settings, travelMin: 0 }, appointments: db.appointments, blocks: [], excludeAppointmentId: a.id }))
      throw new SlotTakenError('Já existe um atendimento nesse horário.')
  } else {
    const valid = svc && slotsFor(db, ymd(start), svc.id, now, a.id).some((d) => d.getTime() === start.getTime())
    if (!valid) throw new SlotTakenError('Esse horário não está disponível.')
  }
  a.start = start.toISOString()
  a.end = end.toISOString()
  a.changeRequest = undefined
  notify(db, {
    clientId: a.clientId, kind: 'alteracao', title: 'Horário alterado',
    body: `Sua sessão passou de ${fmtDate(oldStart)} ${fmtTime(oldStart)} para ${fmtDate(a.start)} às ${fmtTime(a.start)}.`, link: '/cliente',
  })
  checkWaitlist(db, ymd(new Date(oldStart)), now)
}

/** Procura clientes na lista de espera com horário compatível e avisa. */
export function checkWaitlist(db: DB, date: string, now = new Date()) {
  const notified: string[] = []
  for (const w of db.waitlist) {
    if (w.status !== 'aguardando') continue
    const dates = [w.date, ...w.altDates]
    if (!dates.includes(date)) continue
    const slots = slotsFor(db, date, w.serviceId, now).filter((d) => periodOf(d) === w.period)
    if (!slots.length) continue
    w.status = 'notificado'
    notified.push(w.clientId)
    notify(db, {
      clientId: w.clientId, kind: 'lista_espera', title: 'Abriu uma vaga para você',
      body: `Surgiu horário em ${fmtDate(date + 'T12:00:00')} (${slots.map(fmtTime).join(', ')}). Reserve pelo site: quem confirmar primeiro fica com a vaga.`,
      link: `/cliente/agendar?data=${date}&servico=${w.serviceId}`,
    })
  }
  return notified
}

// ------------------------------------------------------------------ Admin

export function adminClients(db: DB, s: Session) {
  requireAdmin(s)
  return db.clients
}

export function adminClientSummary(db: DB, s: Session, clientId: string, now = new Date()) {
  requireAdmin(s)
  const appts = db.appointments.filter((a) => a.clientId === clientId).sort((a, b) => a.start.localeCompare(b.start))
  const done = appts.filter((a) => a.status === 'realizado')
  const next = appts.find((a) => (a.status === 'agendado' || a.status === 'confirmado') && new Date(a.start) > now)
  return { first: done[0], last: done[done.length - 1], next, sessions: done.length, appts }
}

export function adminNotes(db: DB, s: Session, clientId: string) {
  requireAdmin(s)
  return db.professionalNotes.filter((n) => n.clientId === clientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function adminAddNote(db: DB, s: Session, n: Omit<ProfessionalNote, 'id' | 'createdAt'>) {
  requireAdmin(s)
  if (!n.text.trim()) throw new RuleError('Escreva a observação.')
  db.professionalNotes.push({ ...n, id: uid('nt_'), createdAt: new Date().toISOString() })
  audit(db, s, 'Observação profissional adicionada', db.clients.find((c) => c.id === n.clientId)?.name)
}

export function adminDeleteNote(db: DB, s: Session, id: string) {
  requireAdmin(s)
  db.professionalNotes = db.professionalNotes.filter((n) => n.id !== id)
  audit(db, s, 'Observação profissional removida')
}

export function adminUpsertClient(db: DB, s: Session, c: Partial<Client> & { name: string; phone: string; email: string }) {
  requireAdmin(s)
  if (!c.name.trim()) throw new RuleError('Informe o nome.')
  if (c.id) {
    const ex = db.clients.find((x) => x.id === c.id)!
    Object.assign(ex, c)
    audit(db, s, 'Cliente editado', c.name)
    return ex
  }
  const nc: Client = { id: uid('cli_'), status: 'ativo', createdAt: new Date().toISOString(), ...c } as Client
  db.clients.push(nc)
  audit(db, s, 'Cliente cadastrado manualmente', c.name)
  return nc
}

export function adminCreateAppointment(
  db: DB, s: Session,
  p: { clientId: string; serviceId: string; start: string; address: Address; clientPackageId?: string; notes?: string; force?: boolean },
  now = new Date(),
) {
  requireAdmin(s)
  const a = createAppointment(db, p, now)
  notify(db, { clientId: a.clientId, kind: 'agendamento', title: 'Agendamento confirmado', body: `${a.serviceName} em ${fmtDate(a.start)} às ${fmtTime(a.start)}.`, link: '/cliente' })
  audit(db, s, 'Agendamento criado', `${fmtDate(a.start)} ${fmtTime(a.start)}`)
  return a
}

export function adminMoveAppointment(db: DB, s: Session, id: string, newStart: string, force = true, now = new Date()) {
  requireAdmin(s)
  const a = db.appointments.find((x) => x.id === id)
  if (!a) throw new RuleError('Agendamento não encontrado.')
  moveAppointment(db, a, newStart, now, force)
  audit(db, s, 'Agendamento alterado', `${fmtDate(a.start)} ${fmtTime(a.start)}`)
}

export function adminCancel(db: DB, s: Session, id: string, now = new Date()) {
  requireAdmin(s)
  const a = db.appointments.find((x) => x.id === id)
  if (!a) throw new RuleError('Agendamento não encontrado.')
  doCancel(db, a, 'admin', now)
  audit(db, s, 'Agendamento cancelado', `${fmtDate(a.start)} ${fmtTime(a.start)}`)
}

export function adminSetStatus(db: DB, s: Session, id: string, status: 'confirmado' | 'realizado' | 'ausente', now = new Date()) {
  requireAdmin(s)
  const a = db.appointments.find((x) => x.id === id)
  if (!a) throw new RuleError('Agendamento não encontrado.')
  if (a.status === 'realizado' && status === 'realizado') return
  const was = a.status
  a.status = status
  if (status === 'realizado' && was !== 'realizado') {
    if (a.clientPackageId) {
      const cp = db.clientPackages.find((x) => x.id === a.clientPackageId)
      if (cp) {
        if (cp.sessionsUsed >= cp.sessionsTotal) throw new RuleError('O pacote já não tem sessões restantes.')
        cp.sessionsUsed += 1
        packageAlerts(db, cp, now)
      }
    } else if (!db.payments.some((p) => p.appointmentId === a.id)) {
      db.payments.push({
        id: uid('pay_'), clientId: a.clientId, appointmentId: a.id, description: a.serviceName,
        date: ymd(new Date(a.start)), amount: a.price, method: 'pix', status: 'pendente',
      })
    }
  }
  audit(db, s, `Atendimento marcado como ${status}`, `${fmtDate(a.start)} ${fmtTime(a.start)}`)
}

export function packageAlerts(db: DB, cp: ClientPackage, now = new Date()) {
  const remaining = cp.sessionsTotal - cp.sessionsUsed
  const daysLeft = Math.ceil((new Date(cp.expiresAt).getTime() - now.getTime()) / 86400000)
  const c = db.clients.find((x) => x.id === cp.clientId)
  if (remaining <= 1) {
    const msg = remaining === 0 ? 'Todas as sessões do seu pacote foram utilizadas.' : 'Resta 1 sessão no seu pacote.'
    notify(db, { clientId: cp.clientId, kind: 'pacote', title: 'Pacote quase no fim', body: msg, link: '/cliente/pacotes' })
    notify(db, { kind: 'pacote', title: 'Pacote quase no fim', body: `${c?.name}: ${msg.replace('seu', 'o')}`, link: `/admin/clientes/${cp.clientId}` })
  }
  if (daysLeft <= 15 && remaining > 0) {
    notify(db, { clientId: cp.clientId, kind: 'pacote', title: 'Pacote perto do vencimento', body: `Seu pacote vence em ${fmtDate(cp.expiresAt)} e ainda tem ${remaining} sessão(ões).`, link: '/cliente/pacotes' })
  }
}

export function packageWarnings(db: DB, now = new Date()) {
  return db.clientPackages
    .map((cp) => {
      const remaining = cp.sessionsTotal - cp.sessionsUsed
      const daysLeft = Math.ceil((new Date(cp.expiresAt).getTime() - now.getTime()) / 86400000)
      const reasons: string[] = []
      if (remaining <= 1 && daysLeft >= 0) reasons.push(remaining === 0 ? 'sem sessões' : '1 sessão restante')
      if (daysLeft >= 0 && daysLeft <= 15 && remaining > 0) reasons.push(`vence em ${daysLeft} dia(s)`)
      return { cp, reasons }
    })
    .filter((x) => x.reasons.length)
}

export function adminSellPackage(
  db: DB, s: Session,
  p: { clientId: string; planId: string; method: PaymentMethod; paid: boolean; date?: string },
) {
  requireAdmin(s)
  const plan = db.packagePlans.find((x) => x.id === p.planId)
  if (!plan) throw new RuleError('Pacote não encontrado.')
  const purchased = p.date ? new Date(p.date + 'T12:00:00') : new Date()
  const cp: ClientPackage = {
    id: uid('cpk_'), clientId: p.clientId, planId: plan.id, planName: plan.name, purchasedAt: purchased.toISOString(),
    pricePaid: plan.price, sessionsTotal: plan.sessions, sessionsUsed: 0,
    expiresAt: new Date(purchased.getTime() + plan.validityDays * 86400000).toISOString(),
  }
  db.clientPackages.push(cp)
  db.payments.push({
    id: uid('pay_'), clientId: p.clientId, clientPackageId: cp.id, description: plan.name, date: ymd(purchased),
    amount: plan.price, method: p.method, status: p.paid ? 'recebido' : 'pendente',
  })
  notify(db, { clientId: p.clientId, kind: 'pacote', title: 'Pacote ativado', body: `${plan.name}: ${plan.sessions} sessões até ${fmtDate(cp.expiresAt)}.`, link: '/cliente/pacotes' })
  audit(db, s, 'Pacote vendido', `${plan.name} · ${db.clients.find((c) => c.id === p.clientId)?.name}`)
  return cp
}

export function adminUpsertPayment(db: DB, s: Session, p: Partial<Payment> & Omit<Payment, 'id'>) {
  requireAdmin(s)
  if (!(p.amount > 0)) throw new RuleError('Informe um valor maior que zero.')
  if (p.id) Object.assign(db.payments.find((x) => x.id === p.id)!, p)
  else db.payments.push({ ...p, id: uid('pay_') })
  audit(db, s, p.id ? 'Pagamento editado' : 'Pagamento registrado', `${p.description} · R$ ${p.amount}`)
}

export function adminDeletePayment(db: DB, s: Session, id: string) {
  requireAdmin(s)
  db.payments = db.payments.filter((p) => p.id !== id)
  audit(db, s, 'Pagamento excluído')
}

export function adminUpsertExpense(db: DB, s: Session, e: Partial<Expense> & Omit<Expense, 'id'>) {
  requireAdmin(s)
  if (!e.description.trim()) throw new RuleError('Informe a descrição.')
  if (!(e.amount > 0)) throw new RuleError('Informe um valor maior que zero.')
  if (e.id) Object.assign(db.expenses.find((x) => x.id === e.id)!, e)
  else db.expenses.push({ ...e, id: uid('exp_') })
  audit(db, s, e.id ? 'Despesa editada' : 'Despesa registrada', `${e.description} · R$ ${e.amount}`)
}

export function adminDeleteExpense(db: DB, s: Session, id: string) {
  requireAdmin(s)
  db.expenses = db.expenses.filter((e) => e.id !== id)
  audit(db, s, 'Despesa excluída')
}

export function adminUpsertService(db: DB, s: Session, v: Partial<Service> & Omit<Service, 'id'>) {
  requireAdmin(s)
  if (!v.name.trim()) throw new RuleError('Informe o nome.')
  if (!(v.durationMin >= 15)) throw new RuleError('Duração mínima de 15 minutos.')
  if (!(v.price >= 0)) throw new RuleError('Preço inválido.')
  if (v.id) Object.assign(db.services.find((x) => x.id === v.id)!, v)
  else db.services.push({ ...v, id: uid('svc_') })
  audit(db, s, v.id ? 'Serviço editado' : 'Serviço criado', v.name)
}

export function adminDeleteService(db: DB, s: Session, id: string) {
  requireAdmin(s)
  if (db.appointments.some((a) => a.serviceId === id)) {
    // mantém histórico: só desativa
    db.services.find((x) => x.id === id)!.active = false
    audit(db, s, 'Serviço desativado (possui histórico)')
    return 'desativado'
  }
  db.services = db.services.filter((x) => x.id !== id)
  audit(db, s, 'Serviço excluído')
  return 'excluido'
}

export function adminUpsertPlan(db: DB, s: Session, v: Partial<PackagePlan> & Omit<PackagePlan, 'id'>) {
  requireAdmin(s)
  if (!v.name.trim()) throw new RuleError('Informe o nome.')
  if (!(v.sessions >= 1)) throw new RuleError('Quantidade de sessões inválida.')
  if (v.id) Object.assign(db.packagePlans.find((x) => x.id === v.id)!, v)
  else db.packagePlans.push({ ...v, id: uid('plan_') })
  audit(db, s, v.id ? 'Pacote editado' : 'Pacote criado', v.name)
}

export function adminDeletePlan(db: DB, s: Session, id: string) {
  requireAdmin(s)
  if (db.clientPackages.some((c) => c.planId === id)) {
    db.packagePlans.find((x) => x.id === id)!.active = false
    audit(db, s, 'Pacote desativado (possui contratos)')
    return 'desativado'
  }
  db.packagePlans = db.packagePlans.filter((x) => x.id !== id)
  audit(db, s, 'Pacote excluído')
  return 'excluido'
}

export function adminAddBlock(db: DB, s: Session, b: Omit<TimeBlock, 'id'>) {
  requireAdmin(s)
  if (new Date(b.end) <= new Date(b.start)) throw new RuleError('O fim do bloqueio deve ser depois do início.')
  db.blocks.push({ ...b, id: uid('blk_') })
  audit(db, s, 'Horário bloqueado', `${fmtDate(b.start)} ${fmtTime(b.start)}–${fmtTime(b.end)}`)
}

export function adminRemoveBlock(db: DB, s: Session, id: string, now = new Date()) {
  requireAdmin(s)
  const b = db.blocks.find((x) => x.id === id)
  db.blocks = db.blocks.filter((x) => x.id !== id)
  audit(db, s, 'Bloqueio removido')
  if (b) return checkWaitlist(db, ymd(new Date(b.start)), now)
  return []
}

export function adminUpdateSettings(db: DB, s: Session, patch: Partial<Settings>) {
  requireAdmin(s)
  Object.assign(db.settings, patch)
  audit(db, s, 'Configurações alteradas', Object.keys(patch).join(', '))
}

export function adminNotifications(db: DB, s: Session) {
  requireAdmin(s)
  return db.notifications
}

/** Lembretes que seriam disparados (24h e 2h antes etc.), calculados a partir da agenda. */
export function scheduledReminders(db: DB, now = new Date()) {
  const out: { appt: Appointment; at: Date; hoursBefore: number }[] = []
  for (const a of db.appointments) {
    if (a.status !== 'agendado' && a.status !== 'confirmado') continue
    for (const h of db.settings.reminders.hoursBefore) {
      const at = new Date(new Date(a.start).getTime() - h * 3600000)
      if (at > now) out.push({ appt: a, at, hoursBefore: h })
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime())
}
