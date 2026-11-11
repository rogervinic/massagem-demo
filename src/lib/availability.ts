import type { Appointment, Period, Settings, TimeBlock } from './types'
import { atMinutes, hm, overlaps, parseYmd } from './util'

export interface SlotQuery {
  settings: Settings
  date: string // yyyy-mm-dd
  durationMin: number
  appointments: Appointment[]
  blocks: TimeBlock[]
  now: Date
  excludeAppointmentId?: string
}

export type DayState = 'fechado' | 'ferias' | 'indisponivel' | 'lotado' | 'disponivel'

export function dayState(q: Omit<SlotQuery, 'durationMin'> & { durationMin: number }): DayState {
  const { settings, date, now } = q
  const d = parseYmd(date)
  const hours = settings.week[d.getDay()]
  if (!hours?.enabled) return 'fechado'
  if (settings.vacations.some((v) => date >= v.from && date <= v.to)) return 'ferias'
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0 || diffDays > settings.maxAdvanceDays) return 'indisponivel'
  return computeSlots(q).length ? 'disponivel' : 'lotado'
}

/** Verifica se um intervalo [start, end) é compatível com agenda, pausas, bloqueios e deslocamento. */
export function isIntervalFree(
  start: Date,
  end: Date,
  ctx: { settings: Settings; appointments: Appointment[]; blocks: TimeBlock[]; excludeAppointmentId?: string },
) {
  const { settings, appointments, blocks, excludeAppointmentId } = ctx
  const s = start.getTime()
  const e = end.getTime()
  const travel = settings.travelMin * 60000

  for (const b of blocks) {
    if (overlaps(s, e, new Date(b.start).getTime(), new Date(b.end).getTime())) return false
  }
  for (const a of appointments) {
    if (a.id === excludeAppointmentId) continue
    if (a.status === 'cancelado') continue
    const as = new Date(a.start).getTime()
    const ae = new Date(a.end).getTime()
    // exige deslocamento antes e depois de cada atendimento
    if (overlaps(s - travel, e + travel, as, ae)) return false
  }
  return true
}

export function computeSlots(q: SlotQuery): Date[] {
  const { settings, date, durationMin, now } = q
  const d = parseYmd(date)
  const hours = settings.week[d.getDay()]
  if (!hours?.enabled) return []
  if (settings.vacations.some((v) => date >= v.from && date <= v.to)) return []

  const open = hm(hours.open)
  const close = hm(hours.close)
  const earliest = now.getTime() + settings.minAdvanceHours * 3600000
  const step = Math.max(5, settings.slotStepMin)
  const out: Date[] = []

  for (let m = open; m + durationMin <= close; m += step) {
    const start = atMinutes(date, m)
    const end = atMinutes(date, m + durationMin)
    if (start.getTime() < earliest) continue
    if (settings.breaks.some((b) => overlaps(m, m + durationMin, hm(b.start), hm(b.end)))) continue
    if (!isIntervalFree(start, end, q)) continue
    out.push(start)
  }
  return out
}

export function periodOf(d: Date): Period {
  const h = d.getHours()
  if (h < 12) return 'manha'
  if (h < 18) return 'tarde'
  return 'noite'
}

/** Pode o cliente cancelar/alterar sozinho? */
export function canClientCancel(appt: Appointment, settings: Settings, now: Date) {
  if (appt.status === 'cancelado' || appt.status === 'realizado' || appt.status === 'ausente') return false
  return new Date(appt.start).getTime() - now.getTime() >= settings.cancelMinHours * 3600000
}
