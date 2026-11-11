import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Bell, CalendarClock, CalendarPlus, Check, CheckCircle2, ChevronRight, Clock, HeartPulse, Hourglass, MapPin, Package,
  Trash2, User, AlertTriangle, MessageCircle,
} from 'lucide-react'
import { useStore } from '../../lib/store'
import * as api from '../../lib/api'
import { canClientCancel, dayState } from '../../lib/availability'
import type { Address, Appointment, Period } from '../../lib/types'
import { brl, cx, fmtDate, fmtLong, fmtTime, formatAddress, periodLabel, statusLabel, ymd } from '../../lib/util'
import { Badge, Empty, Field, Modal, PageHeader, attempt, statusTone, toast, Choice } from '../../components/ui'
import Calendar from '../../components/Calendar'
import AddressForm, { emptyAddress } from '../../components/AddressForm'

// ------------------------------------------------------------ Início

export function ClientHome() {
  const { db, session } = useStore()
  const me = api.myClient(db, session!)
  const appts = api.myAppointments(db, session!)
  const now = new Date()
  const upcoming = appts.filter((a) => (a.status === 'agendado' || a.status === 'confirmado') && new Date(a.start) > now).sort((a, b) => a.start.localeCompare(b.start))
  const next = upcoming[0]
  const anam = api.myAnamnesis(db, session!)
  const pkgs = api.myPackages(db, session!).filter((p) => new Date(p.expiresAt) > now && p.sessionsUsed < p.sessionsTotal)
  const notifs = api.myNotifications(db, session!).slice(0, 3)
  const done = appts.filter((a) => a.status === 'realizado').length
  const first = me.name.split(' ')[0]

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <p className="text-sm text-bark-500">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1 className="text-3xl sm:text-4xl mt-1 mb-6">Olá, {first}.</h1>

      {!anam && (
        <Link to="/cliente/anamnese" className="flex items-center gap-4 rounded-2xl bg-[#F3E7DA] border border-clay-300 p-4 mb-5 hover:brightness-[.98]">
          <HeartPulse className="text-clay-600 shrink-0" />
          <div className="flex-1"><b className="text-bark-900">Preencha sua anamnese</b><p className="text-sm text-bark-700">Ela ajuda a preparar seu atendimento. Leva uns 5 minutos.</p></div>
          <ChevronRight className="text-clay-600" />
        </Link>
      )}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <div className="card p-5 sm:p-6 bg-gradient-to-br from-white to-sage-100/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg">Próxima sessão</h2>
            {next && <Badge tone={statusTone(next.status)}>{statusLabel[next.status]}</Badge>}
          </div>
          {next ? (
            <>
              <p className="font-display text-3xl first-letter:uppercase">{fmtLong(next.start)}</p>
              <p className="text-xl text-sage-700 mt-1">{fmtTime(next.start)} às {fmtTime(next.end)}</p>
              <div className="mt-4 space-y-1.5 text-sm text-bark-700">
                <p className="flex items-center gap-2"><Clock size={15} className="text-bark-500" /> {next.serviceName}{next.clientPackageId ? ' · pelo pacote' : ` · ${brl(next.price)}`}</p>
                <p className="flex items-center gap-2"><MapPin size={15} className="text-bark-500" /> {formatAddress(next.address)}</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                <Link to="/cliente/historico" className="btn-secondary">Gerenciar</Link>
                <Link to="/cliente/agendar" className="btn-ghost">Agendar outra</Link>
              </div>
            </>
          ) : (
            <div className="py-4">
              <p className="text-bark-500 mb-4">Você não tem sessões agendadas.</p>
              <Link to="/cliente/agendar" className="btn-primary"><CalendarPlus size={18} /> Agendar sessão</Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 content-start">
          <Link to="/cliente/agendar" className="card p-4 hover:border-sage-300 transition"><CalendarPlus className="text-sage-600 mb-2" /><b className="text-sm">Novo agendamento</b></Link>
          <Link to="/cliente/anamnese" className="card p-4 hover:border-sage-300 transition"><HeartPulse className="text-sage-600 mb-2" /><b className="text-sm">Anamnese</b><p className="text-xs text-bark-500">{anam ? `Atualizada ${fmtDate(anam.submittedAt)}` : 'Pendente'}</p></Link>
          <Link to="/cliente/pacotes" className="card p-4 hover:border-sage-300 transition"><Package className="text-sage-600 mb-2" /><b className="text-sm">Meus pacotes</b><p className="text-xs text-bark-500">{pkgs.length ? `${pkgs[0].sessionsTotal - pkgs[0].sessionsUsed} sessões restantes` : 'Nenhum ativo'}</p></Link>
          <Link to="/cliente/perfil" className="card p-4 hover:border-sage-300 transition"><User className="text-sage-600 mb-2" /><b className="text-sm">Meu perfil</b><p className="text-xs text-bark-500">{done} sessões realizadas</p></Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <div className="card p-5">
          <div className="flex justify-between items-center mb-3"><h2 className="text-lg">Próximas</h2><Link to="/cliente/historico" className="text-sm text-sage-600 font-semibold">Ver histórico</Link></div>
          {upcoming.length ? upcoming.slice(0, 4).map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-linen-100 last:border-0 text-sm">
              <span><b>{fmtDate(a.start, { day: '2-digit', month: 'short' })}</b> · {fmtTime(a.start)} · {a.serviceName}</span>
              <Badge tone={statusTone(a.status)}>{statusLabel[a.status]}</Badge>
            </div>
          )) : <p className="text-sm text-bark-500">Nada por aqui.</p>}
        </div>
        <div className="card p-5">
          <div className="flex justify-between items-center mb-3"><h2 className="text-lg">Notificações</h2><Link to="/cliente/notificacoes" className="text-sm text-sage-600 font-semibold">Ver todas</Link></div>
          {notifs.length ? notifs.map((n) => (
            <div key={n.id} className="py-2.5 border-b border-linen-100 last:border-0">
              <p className="text-sm font-semibold flex items-center gap-2">{!n.read && <span className="w-2 h-2 rounded-full bg-clay-500" />}{n.title}</p>
              <p className="text-xs text-bark-500">{n.body}</p>
            </div>
          )) : <p className="text-sm text-bark-500">Sem notificações.</p>}
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ Agendamento

export function Book() {
  const { db, session, run } = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const rescheduleId = params.get('remarcar')
  const resched = rescheduleId ? api.myAppointments(db, session!).find((a) => a.id === rescheduleId) : undefined
  const me = api.myClient(db, session!)
  const services = api.listActiveServices(db)
  const [serviceId, setServiceId] = useState(resched?.serviceId ?? params.get('servico') ?? services[0]?.id)
  const [date, setDate] = useState<string | undefined>(params.get('data') ?? undefined)
  const [time, setTime] = useState<string>()
  const [address, setAddress] = useState<Address>(me.address ?? emptyAddress())
  const [saveAddress, setSaveAddress] = useState(!me.address)
  const pkgs = api.myPackages(db, session!).map((cp) => ({ cp, av: api.packageAvailability(db, cp) })).filter((x) => x.av.bookable > 0)
  const [usePkg, setUsePkg] = useState<string | undefined>(pkgs[0]?.cp.id)
  const [done, setDone] = useState<Appointment>()
  const [waitOpen, setWaitOpen] = useState(false)
  const svc = services.find((s) => s.id === serviceId)
  const now = new Date()

  const stateOf = (d: string) => (svc ? dayState({ settings: db.settings, date: d, durationMin: svc.durationMin, appointments: db.appointments, blocks: db.blocks, now, excludeAppointmentId: resched?.id }) : 'fechado')
  const slots = useMemo(() => (date && svc ? api.slotsFor(db, date, svc.id, new Date(), resched?.id) : []), [db, date, svc, resched?.id, db.appointments.length, db.blocks.length])

  const confirm = () => {
    if (!time || !svc) return
    if (resched) {
      const ok = attempt(() => run((db) => api.rescheduleMine(db, session!, resched.id, time)), 'Sessão remarcada.')
      if (ok) nav('/cliente/historico')
      return
    }
    try {
      const a = run((db) => api.bookMine(db, session!, { serviceId: svc.id, start: time, address, clientPackageId: usePkg, saveAddress }))
      setDone(a)
      window.scrollTo({ top: 0 })
    } catch (e) {
      toast((e as Error).message, 'err')
      setTime(undefined)
    }
  }

  if (done)
    return (
      <div className="max-w-lg mx-auto card p-8 text-center fade-in">
        <div className="w-16 h-16 rounded-full bg-sage-100 text-sage-600 grid place-items-center mx-auto mb-4"><CheckCircle2 size={34} /></div>
        <h1 className="text-2xl">Sessão agendada!</h1>
        <p className="text-bark-500 mt-2 first-letter:uppercase">{fmtLong(done.start)} · {fmtTime(done.start)}</p>
        <p className="text-sm text-bark-500 mt-1">{done.serviceName} · {formatAddress(done.address)}</p>
        <p className="text-xs text-bark-500 mt-4 bg-linen-100 rounded-lg p-3">A confirmação ficou nas suas notificações. O envio por WhatsApp e e-mail está com integração pendente nesta demonstração.</p>
        <div className="flex gap-2 justify-center mt-6">
          <Link to="/cliente" className="btn-primary">Ir para o início</Link>
          {!api.myAnamnesis(db, session!) && <Link to="/cliente/anamnese" className="btn-secondary">Preencher anamnese</Link>}
        </div>
      </div>
    )

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title={resched ? 'Remarcar sessão' : 'Agendar sessão'} sub={resched ? `Atual: ${fmtDate(resched.start)} às ${fmtTime(resched.start)}` : 'Escolha o serviço, o dia e o horário.'} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5">
          {!resched && (
            <section className="card p-5">
              <h2 className="text-lg mb-3">1. Serviço</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {services.map((s) => (
                  <button key={s.id} onClick={() => { setServiceId(s.id); setTime(undefined) }}
                    className={cx('text-left rounded-xl border-2 p-4 transition', s.id === serviceId ? 'border-sage-500 bg-sage-100/40' : 'border-linen-200 hover:border-sage-300')}>
                    <div className="flex justify-between gap-2"><b className="text-sm">{s.name}</b><span className="text-sm font-semibold">{brl(s.price)}</span></div>
                    <p className="text-xs text-bark-500 mt-1 flex items-center gap-1"><Clock size={12} /> {s.durationMin} minutos</p>
                  </button>
                ))}
              </div>
              {pkgs.length > 0 && (
                <div className="mt-4 rounded-xl bg-linen-100 p-3 text-sm">
                  <label className="flex items-center gap-2 font-medium">
                    <input type="checkbox" className="w-4 h-4 accent-[#5B6E50]" checked={!!usePkg} onChange={(e) => setUsePkg(e.target.checked ? pkgs[0].cp.id : undefined)} />
                    Usar sessão do pacote ({pkgs[0].cp.planName}: {pkgs[0].av.bookable} disponível{pkgs[0].av.bookable > 1 ? 'is' : ''})
                  </label>
                </div>
              )}
            </section>
          )}

          <section className="card p-5">
            <h2 className="text-lg mb-3">{resched ? '1' : '2'}. Dia e horário</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Calendar value={date} onChange={(d) => { setDate(d); setTime(undefined) }} stateOf={stateOf} />
              <div>
                {!date ? (
                  <p className="text-sm text-bark-500 mt-10 text-center">Selecione um dia no calendário.</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold first-letter:uppercase mb-3">{fmtLong(date + 'T12:00:00')}</p>
                    {slots.length ? (
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((s) => {
                          const iso = s.toISOString()
                          return (
                            <button key={iso} onClick={() => setTime(iso)}
                              className={cx('rounded-xl border py-2.5 text-sm font-semibold transition', time === iso ? 'bg-sage-600 border-sage-600 text-white' : 'bg-white border-linen-300 hover:border-sage-500')}>
                              {fmtTime(s)}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-sm text-bark-500">Sem horários livres neste dia.</p>
                        {!resched && <button className="btn-secondary mt-3" onClick={() => setWaitOpen(true)}><Hourglass size={16} /> Entrar na lista de espera</button>}
                      </div>
                    )}
                    {slots.length > 0 && !resched && (
                      <button className="text-xs text-sage-700 underline mt-4" onClick={() => setWaitOpen(true)}>Queria outro horário? Entre na lista de espera</button>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          {!resched && (
            <section className="card p-5">
              <h2 className="text-lg mb-1">3. Endereço do atendimento</h2>
              <p className="text-xs text-bark-500 mb-4">O atendimento é feito no local que você indicar.</p>
              <AddressForm value={address} onChange={setAddress} />
              <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" className="w-4 h-4 accent-[#5B6E50]" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} /> Salvar como meu endereço padrão</label>
            </section>
          )}
        </div>

        <aside className="card p-5 lg:sticky lg:top-6">
          <h2 className="text-lg mb-4">Resumo</h2>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-bark-500">Serviço</dt><dd className="font-medium text-right">{svc?.name}</dd></div>
            <div className="flex justify-between"><dt className="text-bark-500">Duração</dt><dd>{svc?.durationMin} min</dd></div>
            <div className="flex justify-between"><dt className="text-bark-500">Data</dt><dd>{date ? fmtDate(date + 'T12:00:00') : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-bark-500">Horário</dt><dd>{time ? `${fmtTime(time)} às ${fmtTime(new Date(new Date(time).getTime() + (svc?.durationMin ?? 0) * 60000))}` : '—'}</dd></div>
            {!resched && <div className="flex justify-between border-t border-linen-200 pt-2 mt-2"><dt className="font-semibold">Valor</dt><dd className="font-display text-xl">{usePkg ? 'Pacote' : brl(svc?.price ?? 0)}</dd></div>}
          </dl>
          <button className="btn-primary w-full mt-5" disabled={!time} onClick={confirm}><Check size={18} /> {resched ? 'Confirmar remarcação' : 'Confirmar agendamento'}</button>
          <p className="text-[11px] text-bark-500 mt-3">{db.settings.cancelPolicyText}</p>
        </aside>
      </div>
      <WaitlistModal open={waitOpen} onClose={() => setWaitOpen(false)} defaultDate={date} serviceId={serviceId} />
    </div>
  )
}

function WaitlistModal({ open, onClose, defaultDate, serviceId }: { open: boolean; onClose: () => void; defaultDate?: string; serviceId?: string }) {
  const { db, session, run } = useStore()
  const [date, setDate] = useState(defaultDate ?? '')
  const [period, setPeriod] = useState<Period>('manha')
  const [alts, setAlts] = useState<string[]>([])
  const [alt, setAlt] = useState('')
  const [svc, setSvc] = useState(serviceId ?? db.services[0]?.id)
  const save = () => {
    const ok = attempt(() => run((db) => api.addWaitlistMine(db, session!, { date: date || defaultDate || '', period, altDates: alts, serviceId: svc })), 'Você entrou na lista de espera. Avisaremos se abrir uma vaga.')
    if (ok) onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Lista de espera">
      <div className="space-y-4">
        <Field label="Serviço">
          <select className="input" value={svc} onChange={(e) => setSvc(e.target.value)}>{api.listActiveServices(db).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </Field>
        <Field label="Dia desejado"><input type="date" className="input" value={date || defaultDate || ''} min={ymd(new Date())} onChange={(e) => setDate(e.target.value)} /></Field>
        <div><span className="label">Período</span><Choice name="periodo" value={period} onChange={setPeriod} options={[{ value: 'manha', label: 'Manhã' }, { value: 'tarde', label: 'Tarde' }, { value: 'noite', label: 'Noite' }]} /></div>
        <div>
          <span className="label">Datas alternativas</span>
          <div className="flex gap-2"><input type="date" className="input" value={alt} min={ymd(new Date())} onChange={(e) => setAlt(e.target.value)} /><button className="btn-secondary" type="button" onClick={() => { if (alt && !alts.includes(alt)) setAlts([...alts, alt]); setAlt('') }}>Adicionar</button></div>
          <div className="flex flex-wrap gap-1.5 mt-2">{alts.map((d) => <button key={d} className="chip bg-linen-100" onClick={() => setAlts(alts.filter((x) => x !== d))}>{fmtDate(d + 'T12:00:00')} ×</button>)}</div>
        </div>
        <p className="text-xs text-bark-500">Se abrir uma vaga compatível, você recebe um aviso. A vaga fica com quem confirmar primeiro no site.</p>
        <button className="btn-primary w-full" onClick={save}>Entrar na lista</button>
      </div>
    </Modal>
  )
}

// ------------------------------------------------------------ Histórico

export function ClientHistory() {
  const { db, session, run } = useStore()
  const nav = useNavigate()
  const appts = api.myAppointments(db, session!)
  const now = new Date()
  const upcoming = appts.filter((a) => (a.status === 'agendado' || a.status === 'confirmado') && new Date(a.start) > now).reverse()
  const past = appts.filter((a) => !upcoming.includes(a))
  const [cancelling, setCancelling] = useState<Appointment>()
  const [changing, setChanging] = useState<Appointment>()
  const [msg, setMsg] = useState('')

  const Item = ({ a }: { a: Appointment }) => {
    const can = canClientCancel(a, db.settings, now)
    const isUpcoming = upcoming.includes(a)
    return (
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold first-letter:uppercase">{fmtLong(a.start)}</p>
            <p className="text-sm text-bark-500">{fmtTime(a.start)} às {fmtTime(a.end)} · {a.serviceName} · {Math.round((new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000)} min · {a.clientPackageId ? 'Pacote' : brl(a.price)}</p>
            <p className="text-xs text-bark-500 mt-1 flex items-center gap-1"><MapPin size={12} /> {formatAddress(a.address)}</p>
          </div>
          <Badge tone={statusTone(a.status)}>{statusLabel[a.status]}</Badge>
        </div>
        {a.changeRequest && <p className="text-xs mt-2 bg-amber-50 text-amber-900 rounded-lg px-3 py-2">Pedido de alteração enviado: "{a.changeRequest}"</p>}
        {isUpcoming && (
          <div className="flex flex-wrap gap-2 mt-4">
            {can ? (
              <>
                <button className="btn-secondary !py-2" onClick={() => nav(`/cliente/agendar?remarcar=${a.id}`)}><CalendarClock size={16} /> Remarcar</button>
                <button className="btn-danger !py-2" onClick={() => setCancelling(a)}>Cancelar</button>
              </>
            ) : (
              <button className="btn-secondary !py-2" onClick={() => { setChanging(a); setMsg('') }}><MessageCircle size={16} /> Solicitar alteração</button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Histórico de sessões" sub="Seus agendamentos e sessões realizadas." actions={<Link to="/cliente/agendar" className="btn-primary"><CalendarPlus size={16} /> Agendar</Link>} />
      <h2 className="text-sm font-semibold uppercase tracking-wide text-bark-500 mb-3">Próximas</h2>
      <div className="space-y-3 mb-8">{upcoming.length ? upcoming.map((a) => <Item key={a.id} a={a} />) : <p className="text-sm text-bark-500">Nenhuma sessão futura.</p>}</div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-bark-500 mb-3">Anteriores</h2>
      <div className="space-y-3">{past.length ? past.map((a) => <Item key={a.id} a={a} />) : <p className="text-sm text-bark-500">Nenhuma sessão anterior.</p>}</div>

      <Modal open={!!cancelling} onClose={() => setCancelling(undefined)} title="Cancelar sessão">
        <p className="text-sm text-bark-700">Cancelar a sessão de <b>{cancelling && fmtDate(cancelling.start)} às {cancelling && fmtTime(cancelling.start)}</b>?</p>
        {cancelling?.clientPackageId && <p className="text-xs text-bark-500 mt-2">A sessão volta para o seu pacote.</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button className="btn-ghost" onClick={() => setCancelling(undefined)}>Voltar</button>
          <button className="btn-danger" onClick={() => { attempt(() => run((db) => api.cancelMine(db, session!, cancelling!.id)), 'Sessão cancelada.'); setCancelling(undefined) }}>Cancelar sessão</button>
        </div>
      </Modal>
      <Modal open={!!changing} onClose={() => setChanging(undefined)} title="Solicitar alteração">
        <div className="flex gap-2 text-xs bg-amber-50 text-amber-900 rounded-lg p-3 mb-4"><AlertTriangle size={16} className="shrink-0" /> Faltam menos de {db.settings.cancelMinHours}h. A profissional vai analisar o seu pedido.</div>
        <textarea className="input min-h-[100px]" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ex.: preciso mudar para depois das 16h" />
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn-primary" disabled={!msg.trim()} onClick={() => { attempt(() => run((db) => api.requestChangeMine(db, session!, changing!.id, msg.trim())), 'Pedido enviado.'); setChanging(undefined) }}>Enviar pedido</button>
        </div>
      </Modal>
    </div>
  )
}

// ------------------------------------------------------------ Pacotes

export function ClientPackages() {
  const { db, session } = useStore()
  const pkgs = api.myPackages(db, session!)
  const plans = api.listActivePlans(db)
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Meus pacotes" />
      {pkgs.length === 0 ? (
        <div className="card"><Empty icon={<Package />} title="Você ainda não tem pacotes">Fale com a profissional para contratar.</Empty></div>
      ) : (
        <div className="space-y-4">
          {pkgs.map((cp) => {
            const av = api.packageAvailability(db, cp)
            const pct = (cp.sessionsUsed / cp.sessionsTotal) * 100
            return (
              <div key={cp.id} className="card p-5">
                <div className="flex justify-between items-start gap-2">
                  <div><h3 className="text-lg">{cp.planName}</h3><p className="text-xs text-bark-500">Contratado em {fmtDate(cp.purchasedAt)} · {brl(cp.pricePaid)}</p></div>
                  {av.expired ? <Badge tone="red">Vencido</Badge> : av.remaining === 0 ? <Badge>Concluído</Badge> : <Badge tone="sage">Ativo</Badge>}
                </div>
                <div className="mt-4 h-2 rounded-full bg-linen-200 overflow-hidden"><div className="h-full bg-sage-500" style={{ width: `${pct}%` }} /></div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div><p className="font-display text-2xl">{cp.sessionsTotal}</p><p className="text-xs text-bark-500">Contratadas</p></div>
                  <div><p className="font-display text-2xl">{cp.sessionsUsed}</p><p className="text-xs text-bark-500">Realizadas</p></div>
                  <div><p className="font-display text-2xl text-sage-700">{av.remaining}</p><p className="text-xs text-bark-500">Restantes</p></div>
                </div>
                <p className="text-sm text-bark-500 mt-4">Válido até <b className="text-bark-700">{fmtDate(cp.expiresAt)}</b>{av.reserved > 0 && ` · ${av.reserved} já agendada(s)`}</p>
              </div>
            )
          })}
        </div>
      )}
      <h2 className="text-lg mt-8 mb-3">Pacotes disponíveis</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-2xl border border-linen-300 bg-white/60 p-4">
            <b className="text-sm">{p.name}</b>
            <p className="font-display text-xl mt-1">{brl(p.price)}</p>
            <p className="text-xs text-bark-500">{p.sessions} sessões · {p.validityDays} dias</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------ Perfil

export function ClientProfile() {
  const { db, session, run, setSession } = useStore()
  const me = api.myClient(db, session!)
  const [f, setF] = useState({ name: me.name, phone: me.phone, birthDate: me.birthDate ?? '', cpf: me.cpf ?? '' })
  const [addr, setAddr] = useState<Address>(me.address ?? emptyAddress())
  const consents = db.consents.filter((c) => c.clientId === me.id)
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Meu perfil" />
      <div className="card p-5 mb-5">
        <h2 className="text-lg mb-4">Dados pessoais</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome completo"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="E-mail" hint="Para trocar o e-mail, fale com a profissional."><input className="input bg-linen-50" value={me.email} disabled /></Field>
          <Field label="Telefone / WhatsApp"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Data de nascimento"><input type="date" className="input" value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} /></Field>
          <Field label="CPF (opcional)"><input className="input" value={f.cpf} onChange={(e) => setF({ ...f, cpf: e.target.value })} /></Field>
        </div>
      </div>
      <div className="card p-5 mb-5">
        <h2 className="text-lg mb-4">Endereço padrão</h2>
        <AddressForm value={addr} onChange={setAddr} />
      </div>
      <button className="btn-primary" onClick={() => {
        const ok = attempt(() => run((db) => api.updateMyProfile(db, session!, { ...f, birthDate: f.birthDate || undefined, cpf: f.cpf || undefined, address: addr.street ? addr : undefined })), 'Perfil atualizado.')
        if (ok) setSession({ ...session!, name: f.name })
      }}>Salvar alterações</button>

      <div className="card p-5 mt-8">
        <h2 className="text-lg mb-2">Privacidade e seus dados (LGPD)</h2>
        <ul className="text-sm text-bark-700 space-y-1 mb-4">
          {consents.map((c) => <li key={c.id}>✓ {c.kind === 'termos' ? 'Termos e privacidade' : 'Dados de saúde'} · {c.version} · {fmtDate(c.acceptedAt)}</li>)}
        </ul>
        <p className="text-sm text-bark-500 mb-3">Você pode pedir acesso, correção ou exclusão dos seus dados. Alguns registros podem ser mantidos pelo prazo legal.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => { run((db) => api.notify(db, { kind: 'sistema', title: 'Solicitação LGPD', body: `${me.name} pediu uma cópia dos seus dados.`, link: `/admin/clientes/${me.id}` })); toast('Pedido registrado. A profissional vai responder.') }}>Pedir cópia dos meus dados</button>
          <button className="btn-danger" onClick={() => { run((db) => api.notify(db, { kind: 'sistema', title: 'Solicitação LGPD', body: `${me.name} pediu a exclusão dos seus dados.`, link: `/admin/clientes/${me.id}` })); toast('Pedido de exclusão registrado.') }}>Pedir exclusão</button>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ Lista de espera

export function ClientWaitlist() {
  const { db, session, run } = useStore()
  const items = api.myWaitlist(db, session!)
  const [open, setOpen] = useState(false)
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Lista de espera" sub="Avisamos quando abrir um horário compatível." actions={<button className="btn-primary" onClick={() => setOpen(true)}><Hourglass size={16} /> Novo pedido</button>} />
      {items.length === 0 ? (
        <div className="card"><Empty icon={<Hourglass />} title="Você não está em nenhuma lista">Quando um dia estiver lotado, peça para entrar na lista.</Empty></div>
      ) : (
        <div className="space-y-3">
          {items.map((w) => (
            <div key={w.id} className="card p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{fmtDate(w.date + 'T12:00:00')} · {periodLabel[w.period]}</p>
                <p className="text-xs text-bark-500">{db.services.find((s) => s.id === w.serviceId)?.name}{w.altDates.length > 0 && ` · alternativas: ${w.altDates.map((d) => fmtDate(d + 'T12:00:00')).join(', ')}`}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={w.status === 'notificado' ? 'sage' : w.status === 'atendido' ? 'neutral' : 'amber'}>{w.status === 'notificado' ? 'Vaga aberta!' : w.status === 'atendido' ? 'Atendido' : 'Aguardando'}</Badge>
                {w.status === 'notificado' && <Link className="btn-primary !py-1.5 !text-xs" to={`/cliente/agendar?data=${w.date}&servico=${w.serviceId}`}>Reservar</Link>}
                <button className="btn-ghost !p-2" aria-label="Sair da lista" onClick={() => run((db) => api.removeWaitlistMine(db, session!, w.id))}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <WaitlistModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

// ------------------------------------------------------------ Notificações

export function ClientNotifications() {
  const { db, session, run } = useStore()
  const items = api.myNotifications(db, session!)
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Notificações" actions={items.some((n) => !n.read) && <button className="btn-secondary" onClick={() => run((db) => api.markNotificationsRead(db, session!))}>Marcar todas como lidas</button>} />
      {items.length === 0 ? <div className="card"><Empty icon={<Bell />} title="Sem notificações" /></div> : (
        <div className="card divide-y divide-linen-100">
          {items.map((n) => (
            <div key={n.id} className={cx('p-4 flex gap-3', !n.read && 'bg-sage-100/30')}>
              <span className={cx('mt-1.5 w-2 h-2 rounded-full shrink-0', n.read ? 'bg-transparent' : 'bg-clay-500')} />
              <div className="flex-1">
                <p className="font-semibold text-sm">{n.title}</p>
                <p className="text-sm text-bark-700">{n.body}</p>
                <p className="text-[11px] text-bark-500 mt-1">{fmtDate(n.createdAt)} {fmtTime(n.createdAt)} · No app ✓ · WhatsApp e e-mail: integração pendente</p>
              </div>
              {n.link && <Link to={n.link} className="text-sm text-sage-600 font-semibold self-center">Abrir</Link>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
