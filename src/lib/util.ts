export const uid = (prefix = '') =>
  prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const pad = (n: number) => String(n).padStart(2, '0')

/** yyyy-mm-dd no fuso local */
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** HH:mm -> minutos desde meia-noite */
export const hm = (s: string) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

export const atMinutes = (dateYmd: string, minutes: number) => {
  const d = parseYmd(dateYmd)
  d.setMinutes(minutes)
  return d
}

export const fmtDate = (iso: string | Date, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) =>
  new Date(iso).toLocaleDateString('pt-BR', opts)

export const fmtTime = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const fmtLong = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const methodLabel: Record<string, string> = {
  pix: 'Pix', dinheiro: 'Dinheiro', credito: 'Cartão de crédito', debito: 'Cartão de débito', outros: 'Outros',
}

export const categoryLabel: Record<string, string> = {
  materiais: 'Materiais de trabalho', produtos: 'Produtos de massagem', transporte: 'Transporte e combustível',
  marketing: 'Marketing', manutencao: 'Manutenção', outros: 'Outros',
}

export const statusLabel: Record<string, string> = {
  agendado: 'Agendado', confirmado: 'Confirmado', realizado: 'Realizado', cancelado: 'Cancelado', ausente: 'Ausência',
}

export const periodLabel: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }

export const formatAddress = (a?: { street: string; number: string; complement?: string; district: string; city: string }) =>
  a ? `${a.street}, ${a.number}${a.complement ? ' - ' + a.complement : ''} · ${a.district}, ${a.city}` : '—'
