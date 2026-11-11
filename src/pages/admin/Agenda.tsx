import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CalendarPlus, Check, ChevronLeft, ChevronRight, CircleDollarSign, Lock, MapPin, Phone, Trash2, UserX, X } from 'lucide-react'
import { useStore } from '../../lib/store'
import * as api from '../../lib/api'
import type { Address, Appointment, PaymentMethod } from '../../lib/types'
import { addDays, atMinutes, brl, cx, fmtDate, fmtTime, formatAddress, hm, methodLabel, startOfDay, statusLabel, ymd } from '../../lib/util'
import { weekRange } from '../../lib/reports'
import { Badge, Field, Modal, PageHeader, Segmented, attempt, statusTone } from '../../components/ui'
import AddressForm, { emptyAddress } from '../../components/AddressForm'

type Mode = 'dia' | 'semana' | 'mes'
const statusColor: Record<string, string> = {
  agendado: 'bg-sky-50 border-sky-300 text-sky-900',
  confirmado: 'bg-sage-100 border-sage-400 text-sage-700',
  realizado: 'bg-linen-100 border-linen-300 text-bark-700',
  ausente: 'bg-amber-50 border-amber-300 text-amber-900',
  cancelado: 'bg-red-50 border-red-200 text-red-800 line-through opacity-70',
}

export default function Agenda() {
  const { db } = useStore()
  const [mode, setMode] = useState<Mode>(() => (window.innerWidth < 768 ? 'dia' : 'semana'))
  const [ref, setRef] = useState(startOfDay(new Date()))
  const [showCancelled, setShowCancelled] = useState(false)
  const [sel, setSel] = useState<string>()
  const [newOpen, setNewOpen] = useState<{ date?: string; time?: string } | null>(null)
  const [blockOpen, setBlockOpen] = useState(false)

  const days = useMemo(() => {
    if (mode === 'dia') return [ref]
    if (mode === 'semana') { const [s] = weekRange(ref); return Array.from({ length: 7 }, (_, i) => addDays(s, i)) }
    const first = new Date(ref.getFullYear(), ref.getMonth(), 1)
    const s = addDays(first, -((first.getDay() + 6) % 7))
    return Array.from({ length: 42 }, (_, i) => addDays(s, i))
  }, [mode, ref])

  const shift = (dir: number) => {
    if (mode === 'dia') setRef(addDays(ref, dir))
    else if (mode === 'semana') setRef(addDays(ref, dir * 7))
    else setRef(new Date(ref.getFullYear(), ref.getMonth() + dir, 1))
  }

  const apptsOn = (d: Date) => db.appointments.filter((a) => ymd(new Date(a.start)) === ymd(d) && (showCancelled || a.status !== 'cancelado')).sort((a, b) => a.start.localeCompare(b.start))
  const blocksOn = (d: Date) => db.blocks.filter((b) => ymd(new Date(b.start)) === ymd(d))
  const openH = Math.min(...db.settings.week.filter((w) => w.enabled).map((w) => hm(w.open))) / 60
  const closeH = Math.max(...db.settings.week.filter((w) => w.enabled).map((w) => hm(w.close))) / 60
  const hours = Array.from({ length: Math.ceil(closeH - openH) }, (_, i) => Math.floor(openH) + i)
  const PX = 56 // px por hora
  const title = mode === 'mes' ? ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : mode === 'semana' ? `${fmtDate(days[0], { day: '2-digit', month: 'short' })} – ${fmtDate(days[6], { day: '2-digit', month: 'short', year: 'numeric' })}` : ref.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  const selected = db.appointments.find((a) => a.id === sel)

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Agenda" actions={<>
        <button className="btn-secondary" onClick={() => setBlockOpen(true)}><Lock size={16} /> Bloquear horário</button>
        <button className="btn-primary" onClick={() => setNewOpen({ date: ymd(ref) })}><CalendarPlus size={16} /> Novo agendamento</button>
      </>} />

      <div className="card p-3 sm:p-4 mb-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-1">
          <button className="btn-ghost !p-2" onClick={() => shift(-1)} aria-label="Anterior"><ChevronLeft size={18} /></button>
          <button className="btn-secondary !py-1.5" onClick={() => setRef(startOfDay(new Date()))}>Hoje</button>
          <button className="btn-ghost !p-2" onClick={() => shift(1)} aria-label="Próximo"><ChevronRight size={18} /></button>
          <span className="font-display text-lg inline-block first-letter:uppercase ml-2">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs flex items-center gap-1.5 text-bark-500"><input type="checkbox" className="accent-[#5B6E50]" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Cancelados</label>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'dia', label: 'Dia' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }]} />
        </div>
      </div>

      {mode === 'mes' ? (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 text-xs font-semibold text-bark-500 border-b border-linen-200">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => <div key={d} className="px-2 py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const list = apptsOn(d)
              const other = d.getMonth() !== ref.getMonth()
              return (
                <button key={ymd(d)} onClick={() => { setRef(d); setMode('dia') }} className={cx('min-h-[92px] border-b border-r border-linen-100 p-1.5 text-left align-top hover:bg-linen-50', other && 'bg-linen-50/60 text-bark-500/50')}>
                  <div className={cx('text-xs font-semibold mb-1 w-6 h-6 grid place-items-center rounded-full', ymd(d) === ymd(new Date()) && 'bg-sage-600 text-white')}>{d.getDate()}</div>
                  {list.slice(0, 3).map((a) => <div key={a.id} className={cx('truncate rounded px-1 text-[10px] border mb-0.5', statusColor[a.status])}>{fmtTime(a.start)} {db.clients.find((c) => c.id === a.clientId)?.name.split(' ')[0]}</div>)}
                  {list.length > 3 && <div className="text-[10px] text-bark-500">+{list.length - 3}</div>}
                  {blocksOn(d).length > 0 && <div className="text-[10px] text-bark-500 flex items-center gap-0.5"><Lock size={9} /> bloqueio</div>}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <div className="min-w-[640px]" style={mode === 'dia' ? { minWidth: 0 } : undefined}>
            <div className="grid border-b border-linen-200" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
              <div />
              {days.map((d) => {
                const closed = !db.settings.week[d.getDay()].enabled || db.settings.vacations.some((v) => ymd(d) >= v.from && ymd(d) <= v.to)
                return (
                  <div key={ymd(d)} className={cx('px-2 py-2 text-center border-l border-linen-100', closed && 'text-bark-500/50')}>
                    <div className="text-[11px] uppercase font-semibold tracking-wide">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</div>
                    <div className={cx('font-display text-lg mx-auto w-9 h-9 grid place-items-center rounded-full', ymd(d) === ymd(new Date()) && 'bg-sage-600 text-white')}>{d.getDate()}</div>
                  </div>
                )
              })}
            </div>
            <div className="grid relative" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
              <div>{hours.map((h) => <div key={h} style={{ height: PX }} className="text-[11px] text-bark-500 text-right pr-2 relative -top-2">{h}:00</div>)}</div>
              {days.map((d) => {
                const wd = db.settings.week[d.getDay()]
                const closed = !wd.enabled
                return (
                  <div key={ymd(d)} className={cx('relative border-l border-linen-100', closed && 'bg-[repeating-linear-gradient(135deg,#FBF8F3_0_6px,#F5EFE6_6px_12px)]')} style={{ height: hours.length * PX }}>
                    {hours.map((h) => (
                      <button key={h} className="absolute inset-x-0 border-t border-linen-100 hover:bg-sage-100/30" style={{ top: (h - hours[0]) * PX, height: PX }}
                        onClick={() => setNewOpen({ date: ymd(d), time: `${String(h).padStart(2, '0')}:00` })} aria-label={`Agendar ${fmtDate(d)} ${h}h`} />
                    ))}
                    {!closed && db.settings.breaks.map((b) => (
                      <div key={b.start} className="absolute inset-x-0 bg-linen-200/60 text-[10px] text-bark-500 px-1 pointer-events-none" style={{ top: (hm(b.start) / 60 - hours[0]) * PX, height: ((hm(b.end) - hm(b.start)) / 60) * PX }}>Pausa</div>
                    ))}
                    {blocksOn(d).map((b) => {
                      const s = new Date(b.start), e = new Date(b.end)
                      return (
                        <div key={b.id} className="absolute inset-x-1 rounded-lg bg-bark-700/80 text-linen-50 text-[10px] p-1 overflow-hidden" style={{ top: (s.getHours() + s.getMinutes() / 60 - hours[0]) * PX, height: ((e.getTime() - s.getTime()) / 3600000) * PX }}>
                          <Lock size={10} className="inline" /> {b.reason}
                        </div>
                      )
                    })}
                    {apptsOn(d).map((a) => {
                      const s = new Date(a.start), e = new Date(a.end)
                      const c = db.clients.find((x) => x.id === a.clientId)
                      const top = (s.getHours() + s.getMinutes() / 60 - hours[0]) * PX
                      const h = ((e.getTime() - s.getTime()) / 3600000) * PX
                      return (
                        <button key={a.id} onClick={() => setSel(a.id)} className={cx('absolute inset-x-1 rounded-lg border-l-4 border text-left p-1.5 overflow-hidden shadow-sm hover:shadow-soft transition z-10', statusColor[a.status])} style={{ top, height: h - 2 }}>
                          <div className="text-[11px] font-bold leading-tight truncate">{fmtTime(a.start)} {c?.name}</div>
                          {h > 40 && <div className="text-[10px] truncate opacity-80">{a.serviceName}</div>}
                          {h > 56 && mode === 'dia' && <div className="text-[10px] truncate opacity-80">{formatAddress(a.address)}</div>}
                          {a.changeRequest && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-clay-500" title="Pedido de alteração" />}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-bark-500">
        {Object.entries(statusColor).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><span className={cx('w-3 h-3 rounded border', v.split(' ').slice(0, 2).join(' '))} /> {statusLabel[k]}</span>)}
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-clay-500" /> Pedido de alteração</span>
      </div>

      {selected && <ApptModal a={selected} onClose={() => setSel(undefined)} />}
      {newOpen && <NewApptModal init={newOpen} onClose={() => setNewOpen(null)} />}
      <BlockModal open={blockOpen} onClose={() => setBlockOpen(false)} />
    </div>
  )
}

function ApptModal({ a, onClose }: { a: Appointment; onClose: () => void }) {
  const { db, session, run } = useStore()
  const c = db.clients.find((x) => x.id === a.clientId)!
  const payment = db.payments.find((p) => p.appointmentId === a.id)
  const [moving, setMoving] = useState(false)
  const [nd, setNd] = useState(ymd(new Date(a.start)))
  const [nt, setNt] = useState(fmtTime(a.start))
  const [note, setNote] = useState('')
  const [method, setMethod] = useState<PaymentMethod>(payment?.method ?? 'pix')
  const active = a.status === 'agendado' || a.status === 'confirmado'
  const S = session!

  return (
    <Modal open onClose={onClose} title="Atendimento" wide>
      <div className="flex flex-wrap justify-between gap-2 mb-4">
        <div>
          <Link to={`/admin/clientes/${c.id}`} className="text-xl font-display hover:underline">{c.name}</Link>
          <p className="text-sm text-bark-500 first-letter:uppercase">{fmtDate(a.start, { weekday: 'long', day: '2-digit', month: 'long' })} · {fmtTime(a.start)} às {fmtTime(a.end)}</p>
          <p className="text-sm text-bark-500">{a.serviceName} · {a.clientPackageId ? 'Sessão de pacote' : brl(a.price)}</p>
        </div>
        <Badge tone={statusTone(a.status)}>{statusLabel[a.status]}</Badge>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
        <a href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="rounded-xl bg-linen-100 p-3 flex gap-2 items-start hover:bg-linen-200"><Phone size={16} className="mt-0.5 text-sage-600" /> {c.phone}</a>
        <a href={`https://www.google.com/maps/search/${encodeURIComponent(formatAddress(a.address))}`} target="_blank" rel="noreferrer" className="rounded-xl bg-linen-100 p-3 flex gap-2 items-start hover:bg-linen-200"><MapPin size={16} className="mt-0.5 text-sage-600 shrink-0" /> {formatAddress(a.address)}{a.address.reference && ` · ${a.address.reference}`}</a>
      </div>
      {a.changeRequest && <div className="rounded-xl bg-amber-50 text-amber-900 text-sm p-3 mb-4"><b>Pedido do cliente:</b> "{a.changeRequest}"</div>}

      {active && (
        <div className="flex flex-wrap gap-2 mb-4">
          {a.status === 'agendado' && <button className="btn-secondary" onClick={() => attempt(() => run((db) => api.adminSetStatus(db, S, a.id, 'confirmado')), 'Confirmado.')}><Check size={16} /> Confirmar</button>}
          <button className="btn-primary" onClick={() => attempt(() => run((db) => api.adminSetStatus(db, S, a.id, 'realizado')), a.clientPackageId ? 'Realizado. 1 sessão descontada do pacote.' : 'Realizado. Pagamento registrado como pendente.')}><Check size={16} /> Marcar realizado</button>
          <button className="btn-secondary" onClick={() => attempt(() => run((db) => api.adminSetStatus(db, S, a.id, 'ausente')), 'Ausência registrada.')}><UserX size={16} /> Ausência</button>
          <button className="btn-secondary" onClick={() => setMoving((m) => !m)}>Alterar horário</button>
          <button className="btn-danger" onClick={() => { if (attempt(() => run((db) => api.adminCancel(db, S, a.id)), 'Cancelado. Cliente avisado e lista de espera verificada.')) onClose() }}><Ban size={16} /> Cancelar</button>
        </div>
      )}
      {moving && (
        <div className="rounded-xl border border-linen-300 p-3 mb-4 flex flex-wrap items-end gap-2">
          <Field label="Nova data"><input type="date" className="input" value={nd} onChange={(e) => setNd(e.target.value)} /></Field>
          <Field label="Horário"><input type="time" className="input" value={nt} onChange={(e) => setNt(e.target.value)} step={900} /></Field>
          <button className="btn-primary" onClick={() => { if (attempt(() => run((db) => api.adminMoveAppointment(db, S, a.id, atMinutes(nd, hm(nt)).toISOString(), true)), 'Horário alterado e cliente avisado.')) setMoving(false) }}>Salvar</button>
          <p className="text-xs text-bark-500 w-full">Como administradora, você pode encaixar fora da grade. O sistema só impede sobreposição com outro atendimento.</p>
        </div>
      )}

      {!a.clientPackageId && (a.status === 'realizado' || payment) && (
        <div className="rounded-xl border border-linen-200 p-3 mb-4">
          <p className="text-sm font-semibold mb-2 flex items-center gap-2"><CircleDollarSign size={16} /> Pagamento</p>
          {payment ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>{brl(payment.amount)} · {methodLabel[payment.method]}</span>
              <Badge tone={statusTone(payment.status)}>{payment.status === 'recebido' ? 'Recebido' : 'Pendente'}</Badge>
              {payment.status === 'pendente' && (
                <>
                  <select className="input !w-auto !py-1.5" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>{Object.entries(methodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  <button className="btn-primary !py-1.5" onClick={() => attempt(() => run((db) => api.adminUpsertPayment(db, S, { ...payment, method, status: 'recebido' })), 'Pagamento recebido.')}>Marcar como recebido</button>
                </>
              )}
            </div>
          ) : <p className="text-sm text-bark-500">Sem pagamento registrado.</p>}
        </div>
      )}

      <div className="rounded-xl bg-[#F3E7DA]/60 border border-clay-300/60 p-3">
        <p className="text-sm font-semibold mb-1 flex items-center gap-2"><Lock size={14} /> Observação do profissional <span className="text-[11px] font-normal text-bark-500">(nunca visível ao cliente)</span></p>
        {api.adminNotes(db, S, c.id).filter((n) => n.appointmentId === a.id).map((n) => <p key={n.id} className="text-sm mt-1">• {n.text}{n.evolution && <span className="text-bark-500"> · Evolução: {n.evolution}</span>}</p>)}
        <div className="flex gap-2 mt-2">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: tensão alta no trapézio direito" />
          <button className="btn-secondary" disabled={!note.trim()} onClick={() => { if (attempt(() => run((db) => api.adminAddNote(db, S, { clientId: c.id, appointmentId: a.id, text: note.trim() })), 'Observação salva.')) setNote('') }}>Salvar</button>
        </div>
      </div>
    </Modal>
  )
}

function NewApptModal({ init, onClose }: { init: { date?: string; time?: string }; onClose: () => void }) {
  const { db, session, run } = useStore()
  const clients = db.clients.filter((c) => c.status === 'ativo').sort((a, b) => a.name.localeCompare(b.name))
  const [clientId, setClientId] = useState('')
  const [serviceId, setServiceId] = useState(db.services.find((s) => s.active)?.id ?? '')
  const [date, setDate] = useState(init.date ?? ymd(new Date()))
  const [time, setTime] = useState(init.time ?? '')
  const [force, setForce] = useState(false)
  const [address, setAddress] = useState<Address>(emptyAddress())
  const [pkg, setPkg] = useState('')
  const slots = serviceId ? api.slotsFor(db, date, serviceId) : []
  const pkgs = db.clientPackages.filter((p) => p.clientId === clientId && api.packageAvailability(db, p).bookable > 0)

  const pickClient = (id: string) => {
    setClientId(id)
    setAddress(db.clients.find((c) => c.id === id)?.address ?? emptyAddress())
    setPkg('')
  }
  const save = () => {
    if (!clientId || !time) return
    const ok = attempt(() => run((db) => api.adminCreateAppointment(db, session!, { clientId, serviceId, start: atMinutes(date, hm(time)).toISOString(), address, clientPackageId: pkg || undefined, force })), 'Agendamento criado.')
    if (ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title="Novo agendamento" wide>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Cliente">
          <select className="input" value={clientId} onChange={(e) => pickClient(e.target.value)}><option value="">Selecione…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
        <Field label="Serviço">
          <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>{db.services.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name} · {s.durationMin}min · {brl(s.price)}</option>)}</select>
        </Field>
        <Field label="Data"><input type="date" className="input" value={date} onChange={(e) => { setDate(e.target.value); setTime('') }} /></Field>
        <Field label="Horário">
          {force ? <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} /> : (
            <select className="input" value={time} onChange={(e) => setTime(e.target.value)}>
              <option value="">{slots.length ? 'Selecione…' : 'Sem horários livres'}</option>
              {slots.map((s) => <option key={s.toISOString()} value={fmtTime(s)}>{fmtTime(s)}</option>)}
            </select>
          )}
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" className="accent-[#5B6E50]" checked={force} onChange={(e) => { setForce(e.target.checked); setTime('') }} /> Encaixe manual (ignora grade, pausa e deslocamento, mas não permite sobreposição)</label>
      {pkgs.length > 0 && (
        <Field label="Usar pacote" className="mt-4">
          <select className="input" value={pkg} onChange={(e) => setPkg(e.target.value)}><option value="">Não (avulso)</option>{pkgs.map((p) => <option key={p.id} value={p.id}>{p.planName} · {api.packageAvailability(db, p).bookable} disponível(is)</option>)}</select>
        </Field>
      )}
      <p className="label mt-5">Endereço do atendimento</p>
      <AddressForm value={address} onChange={setAddress} />
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" disabled={!clientId || !time} onClick={save}>Agendar</button>
      </div>
    </Modal>
  )
}

function BlockModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, session, run } = useStore()
  const [date, setDate] = useState(ymd(new Date()))
  const [start, setStart] = useState('13:00')
  const [end, setEnd] = useState('15:00')
  const [allDay, setAllDay] = useState(false)
  const [reason, setReason] = useState('')
  const future = db.blocks.filter((b) => new Date(b.end) > new Date()).sort((a, b) => a.start.localeCompare(b.start))
  return (
    <Modal open={open} onClose={onClose} title="Bloquear horários">
      <div className="space-y-3">
        <Field label="Data"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#5B6E50]" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> Dia inteiro</label>
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início"><input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="Fim"><input type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          </div>
        )}
        <Field label="Motivo (só você vê)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: consulta médica" /></Field>
        <button className="btn-primary w-full" onClick={() => attempt(() => run((db) => api.adminAddBlock(db, session!, {
          start: atMinutes(date, allDay ? 0 : hm(start)).toISOString(), end: atMinutes(date, allDay ? 24 * 60 : hm(end)).toISOString(), reason: reason || 'Bloqueio',
        })), 'Horário bloqueado. A disponibilidade do site já foi atualizada.')}>Bloquear</button>
      </div>
      {future.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold mb-2">Bloqueios ativos</p>
          <ul className="divide-y divide-linen-100 text-sm">
            {future.map((b) => (
              <li key={b.id} className="py-2 flex items-center justify-between gap-2">
                <span>{fmtDate(b.start)} · {fmtTime(b.start)}–{fmtTime(b.end)} · {b.reason}</span>
                <button className="btn-ghost !p-1.5 text-red-700" aria-label="Remover bloqueio" onClick={() => {
                  const notified = run((db) => api.adminRemoveBlock(db, session!, b.id))
                  attempt(() => undefined, notified.length ? `Bloqueio removido. ${notified.length} cliente(s) da lista de espera avisado(s).` : 'Bloqueio removido.')
                }}><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button className="sr-only" onClick={onClose}><X /></button>
    </Modal>
  )
}
