// Modelo de dados do protótipo. Espelha as tabelas planejadas para o Supabase.

export type Role = 'client' | 'admin'

export interface User {
  id: string
  email: string
  passwordHash: string
  role: Role
  createdAt: string
}

export interface Address {
  street: string
  number: string
  complement?: string
  district: string
  city: string
  reference?: string
}

export interface Client {
  id: string
  userId?: string
  name: string
  cpf?: string
  birthDate?: string
  phone: string
  email: string
  address?: Address
  status: 'ativo' | 'inativo'
  createdAt: string
  isDemo?: boolean
}

export interface Service {
  id: string
  name: string
  description: string
  durationMin: number
  price: number
  active: boolean
}

export interface PackagePlan {
  id: string
  name: string
  sessions: number
  price: number
  validityDays: number
  paymentTerms: string
  conditions?: string
  active: boolean
}

export interface ClientPackage {
  id: string
  clientId: string
  planId: string
  planName: string
  purchasedAt: string
  pricePaid: number
  sessionsTotal: number
  sessionsUsed: number
  expiresAt: string
}

export type AppointmentStatus = 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'ausente'

export interface Appointment {
  id: string
  clientId: string
  serviceId: string
  serviceName: string
  start: string // ISO
  end: string // ISO
  price: number
  status: AppointmentStatus
  address: Address
  clientPackageId?: string
  notes?: string // observação visível ao cliente (ex.: instruções)
  changeRequest?: string
  createdAt: string
  cancelledAt?: string
}

export type PaymentMethod = 'pix' | 'dinheiro' | 'credito' | 'debito' | 'outros'

export interface Payment {
  id: string
  clientId: string
  appointmentId?: string
  clientPackageId?: string
  description: string
  date: string
  amount: number
  method: PaymentMethod
  status: 'recebido' | 'pendente'
}

export type ExpenseCategory = 'materiais' | 'produtos' | 'transporte' | 'marketing' | 'manutencao' | 'outros'

export interface Expense {
  id: string
  description: string
  category: ExpenseCategory
  amount: number
  date: string
  method: PaymentMethod
  notes?: string
}

export type View = 'anterior' | 'posterior'
export type Side = 'direito' | 'esquerdo' | 'central'
export type MarkLevel = 'vermelho' | 'amarelo'
export type MarkKind = 'dor' | 'atencao'

export interface BodyMark {
  regionId: string
  view: View
  side: Side
  level: MarkLevel
  kind: MarkKind
  markedAt: string
}

export interface AnamnesisAnswers {
  // Etapa 1
  fullName: string
  age: string
  profession: string
  mainGoalText: string
  // Etapa 2
  conditions: string[]
  conditionsOther: string
  continuousMeds: '' | 'sim' | 'nao'
  medsDetail: string
  allergies: '' | 'sim' | 'nao'
  allergiesDetail: string
  // Etapa 3
  skin: string[]
  skinOther: string
  productSensitivity: '' | 'sim' | 'nao'
  productSensitivityDetail: string
  // Etapa 4
  pain: '' | 'sim' | 'nao'
  injury: '' | 'sim' | 'nao'
  injuryDetail: string
  mobilityLimit: '' | 'sim' | 'nao'
  mobilityDetail: string
  // Etapa 5
  marks: BodyMark[]
  // Etapa 6
  pregnant: '' | 'sim' | 'nao' | 'na'
  avoidRegions: '' | 'sim' | 'nao'
  avoidRegionIds: string[]
  avoidText: string
  goal: string
  goalOther: string
  pressure: string
  extraInfo: string
}

export interface Anamnesis {
  id: string
  clientId: string
  version: number
  answers: AnamnesisAnswers
  consentVersion: string
  consentAt: string
  submittedAt: string
}

export interface ProfessionalNote {
  id: string
  clientId: string
  appointmentId?: string
  text: string
  evolution?: string
  createdAt: string
}

export interface Consent {
  id: string
  clientId: string
  kind: 'termos' | 'dados_saude'
  version: string
  acceptedAt: string
}

export type Period = 'manha' | 'tarde' | 'noite'

export interface WaitlistEntry {
  id: string
  clientId: string
  date: string // yyyy-mm-dd
  period: Period
  altDates: string[]
  serviceId: string
  status: 'aguardando' | 'notificado' | 'atendido' | 'cancelado'
  createdAt: string
}

export interface NotificationItem {
  id: string
  clientId?: string // undefined = para o admin
  title: string
  body: string
  link?: string
  kind: 'agendamento' | 'lembrete' | 'alteracao' | 'cancelamento' | 'lista_espera' | 'pacote' | 'sistema'
  createdAt: string
  read: boolean
  channels: { whatsapp: 'pendente_integracao' | 'enviado'; email: 'pendente_integracao' | 'enviado'; app: 'entregue' }
}

export interface TimeBlock {
  id: string
  start: string // ISO
  end: string // ISO
  reason: string
}

export interface Vacation {
  id: string
  from: string // yyyy-mm-dd
  to: string // yyyy-mm-dd
  reason: string
}

export interface DayHours {
  enabled: boolean
  open: string // HH:mm
  close: string // HH:mm
}

export interface Settings {
  businessName: string
  tagline: string
  phone: string
  whatsapp: string
  email: string
  referenceAddress: string
  logoDataUrl?: string
  week: DayHours[] // 0 = domingo
  breaks: { start: string; end: string }[]
  slotStepMin: number
  travelMin: number
  minAdvanceHours: number
  maxAdvanceDays: number
  cancelMinHours: number
  cancelPolicyText: string
  reminders: { afterBooking: boolean; hoursBefore: number[] }
  vacations: Vacation[]
  familyPackageNote: string
}

export interface AuditEntry {
  id: string
  at: string
  actor: string
  action: string
  detail?: string
}

export interface DB {
  version: number
  users: User[]
  clients: Client[]
  services: Service[]
  packagePlans: PackagePlan[]
  clientPackages: ClientPackage[]
  appointments: Appointment[]
  payments: Payment[]
  expenses: Expense[]
  anamneses: Anamnesis[]
  professionalNotes: ProfessionalNote[]
  consents: Consent[]
  waitlist: WaitlistEntry[]
  notifications: NotificationItem[]
  blocks: TimeBlock[]
  settings: Settings
  audit: AuditEntry[]
}
