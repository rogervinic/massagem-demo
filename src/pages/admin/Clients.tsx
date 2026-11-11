import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Lock, Package, Phone, Plus, Search, Trash2, UserPlus, Mail, MapPin } from 'lucide-react'
import { useStore } from '../../lib/store'
import * as api from '../../lib/api'
import type { Address, Client, PaymentMethod } from '../../lib/types'
import { brl, cx, fmtDate, fmtTime, formatAddress, methodLabel, statusLabel, ymd } from '../../lib/util'
import { exportClients } from '../../lib/reports'
import { Badge, Empty, Field, Modal, PageHeader, Segmented, attempt, statusTone } from '../../components/ui'
import AddressForm, { emptyAddress } from '../../components/AddressForm'
import AnamnesisView from '../../components/AnamnesisView'
import BodyMap from '../../components/BodyMap'

export function ClientsList() {
  const { db, session } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'todos' | 'ativo' | 'inativo'>('ativo')
  const [filter, setFilter] = useState<'todos' | 'pacote' | 'sem_anamnese' | 'futuro'>('todos')
  const [newOpen, setNewOpen] = useState(false)
  const now = new Date()
  const rows = api.adminClients(db, session!).map((c) => ({ c, s: api.adminClientSummary(db, session!, c.id, now) }))
    .filter(({ c }) => status === 'todos' || c.status === status)
    .filter(({ c }) => { const t = q.trim().toLowerCase(); return !t || c.name.toLowerCase().includes(t) || c.phone.replace(/\D/g, '').includes(t.replace(/\D/g, '') || '@@') || c.email.includes(t) })
    .filter(({ c, s }) => filter === 'todos' || (filter === 'pacote' && db.clientPackages.some((p) => p.clientId === c.id && p.sessionsUsed < p.sessionsTotal)) || (filter === 'sem_anamnese' && !api.latestAnamnesis(db, c.id)) || (filter === 'futuro' && !!s.next))
    .sort((a, b) => a.c.name.localeCompare(b.c.name))

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Clientes" sub={`${rows.length} de ${db.clients.length}`} actions={<>
        <button className="btn-secondary" onClick={() => exportClients(db)}><Download size={16} /> Excel</button>
        <button className="btn-secondary" onClick={() => exportClients(db, 'csv')}><Download size={16} /> CSV</button>
        <button className="btn-primary" onClick={() => setNewOpen(true)}><UserPlus size={16} /> Novo cliente</button>
      </>} />
      <div className="card p-3 mb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-500" /><input className="input !pl-9" placeholder="Buscar por nome, telefone ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="input md:!w-52" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="todos">Todos</option><option value="futuro">Com agendamento futuro</option><option value="pacote">Com pacote ativo</option><option value="sem_anamnese">Sem anamnese</option>
        </select>
        <Segmented size="sm" value={status} onChange={setStatus} options={[{ value: 'ativo', label: 'Ativos' }, { value: 'inativo', label: 'Inativos' }, { value: 'todos', label: 'Todos' }]} />
      </div>

      <div className="card overflow-x-auto hidden md:block">
        <table className="table-base">
          <thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>1º atendimento</th><th className="text-right">Sessões</th><th>Último</th><th>Próximo</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map(({ c, s }) => (
              <tr key={c.id} className="hover:bg-linen-50 cursor-pointer" onClick={() => nav(`/admin/clientes/${c.id}`)}>
                <td className="font-semibold">{c.name}{c.isDemo && <span className="ml-1 text-[10px] text-bark-500">(fictício)</span>}</td>
                <td className="whitespace-nowrap">{c.phone}</td>
                <td className="text-bark-500">{c.email}</td>
                <td>{s.first ? fmtDate(s.first.start) : '—'}</td>
                <td className="text-right">{s.sessions}</td>
                <td>{s.last ? fmtDate(s.last.start) : '—'}</td>
                <td className="whitespace-nowrap">{s.next ? `${fmtDate(s.next.start, { day: '2-digit', month: '2-digit' })} ${fmtTime(s.next.start)}` : '—'}</td>
                <td><Badge tone={c.status === 'ativo' ? 'sage' : 'neutral'}>{c.status === 'ativo' ? 'Ativo' : 'Inativo'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty title="Nenhum cliente encontrado" />}
      </div>
      <div className="md:hidden space-y-2">
        {rows.map(({ c, s }) => (
          <Link key={c.id} to={`/admin/clientes/${c.id}`} className="card p-4 block">
            <div className="flex justify-between"><b>{c.name}</b><Badge tone={c.status === 'ativo' ? 'sage' : 'neutral'}>{c.status}</Badge></div>
            <p className="text-xs text-bark-500 mt-1">{c.phone} · {s.sessions} sessões{s.next && ` · próximo ${fmtDate(s.next.start, { day: '2-digit', month: '2-digit' })}`}</p>
          </Link>
        ))}
      </div>
      <ClientFormModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}

function ClientFormModal({ open, onClose, client }: { open: boolean; onClose: () => void; client?: Client }) {
  const { session, run } = useStore()
  const nav = useNavigate()
  const [f, setF] = useState({ name: client?.name ?? '', phone: client?.phone ?? '', email: client?.email ?? '', birthDate: client?.birthDate ?? '', cpf: client?.cpf ?? '', status: client?.status ?? 'ativo' })
  const [addr, setAddr] = useState<Address>(client?.address ?? emptyAddress())
  const save = () => {
    let id = ''
    const ok = attempt(() => { id = run((db) => api.adminUpsertClient(db, session!, { ...client, ...f, birthDate: f.birthDate || undefined, cpf: f.cpf || undefined, address: addr.street ? addr : undefined })).id }, 'Cliente salvo.')
    if (ok) { onClose(); if (!client) nav(`/admin/clientes/${id}`) }
  }
  return (
    <Modal open={open} onClose={onClose} title={client ? 'Editar cliente' : 'Novo cliente'} wide>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nome completo"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Telefone / WhatsApp"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="E-mail"><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Nascimento"><input type="date" className="input" value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} /></Field>
        <Field label="CPF (opcional)"><input className="input" value={f.cpf} onChange={(e) => setF({ ...f, cpf: e.target.value })} /></Field>
        <Field label="Status"><select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as 'ativo' })}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></Field>
      </div>
      <p className="label mt-5">Endereço</p>
      <AddressForm value={addr} onChange={setAddr} />
      <div className="flex justify-end gap-2 mt-5"><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save}>Salvar</button></div>
    </Modal>
  )
}

type Tab = 'resumo' | 'anamnese' | 'historico' | 'observacoes' | 'pagamentos' | 'pacotes'

export function ClientDetail() {
  const { id } = useParams()
  const { db, session, run } = useStore()
  const S = session!
  const c = db.clients.find((x) => x.id === id)
  const [tab, setTab] = useState<Tab>('resumo')
  const [edit, setEdit] = useState(false)
  const [sell, setSell] = useState(false)
  const [note, setNote] = useState({ text: '', evolution: '' })
  const [anamVersion, setAnamVersion] = useState<number>()
  if (!c) return <Empty title="Cliente não encontrado"><Link to="/admin/clientes" className="underline">Voltar</Link></Empty>

  const sum = api.adminClientSummary(db, S, c.id)
  const anams = db.anamneses.filter((a) => a.clientId === c.id).sort((a, b) => b.version - a.version)
  const anam = anams.find((a) => a.version === anamVersion) ?? anams[0]
  const notes = api.adminNotes(db, S, c.id)
  const pays = db.payments.filter((p) => p.clientId === c.id).sort((a, b) => b.date.localeCompare(a.date))
  const pkgs = db.clientPackages.filter((p) => p.clientId === c.id)
  const consents = db.consents.filter((x) => x.clientId === c.id)
  const paid = pays.filter((p) => p.status === 'recebido').reduce((s, p) => s + p.amount, 0)
  const pending = pays.filter((p) => p.status === 'pendente').reduce((s, p) => s + p.amount, 0)

  const tabs: { value: Tab; label: string }[] = [
    { value: 'resumo', label: 'Resumo' }, { value: 'anamnese', label: 'Anamnese e mapa' }, { value: 'historico', label: `Histórico (${sum.appts.length})` },
    { value: 'observacoes', label: `Observações (${notes.length})` }, { value: 'pagamentos', label: 'Pagamentos' }, { value: 'pacotes', label: `Pacotes (${pkgs.length})` },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <Link to="/admin/clientes" className="text-sm text-bark-500 flex items-center gap-1 mb-3"><ArrowLeft size={14} /> Clientes</Link>
      <div className="card p-5 sm:p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 rounded-full bg-sage-100 text-sage-700 grid place-items-center font-display text-xl">{c.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>
            <div>
              <h1 className="text-2xl">{c.name}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-bark-500 mt-1">
                <a href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-sage-700"><Phone size={13} /> {c.phone}</a>
                <span className="flex items-center gap-1"><Mail size={13} /> {c.email}</span>
                {c.address && <span className="flex items-center gap-1"><MapPin size={13} /> {c.address.district}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2"><button className="btn-secondary" onClick={() => setEdit(true)}>Editar</button><Link to="/admin/agenda" className="btn-primary">Agendar</Link></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-sm">
          <div className="rounded-xl bg-linen-50 p-3"><p className="text-xs text-bark-500">Sessões realizadas</p><p className="font-display text-xl">{sum.sessions}</p></div>
          <div className="rounded-xl bg-linen-50 p-3"><p className="text-xs text-bark-500">Próximo</p><p className="font-semibold">{sum.next ? `${fmtDate(sum.next.start, { day: '2-digit', month: '2-digit' })} ${fmtTime(sum.next.start)}` : '—'}</p></div>
          <div className="rounded-xl bg-linen-50 p-3"><p className="text-xs text-bark-500">Total pago</p><p className="font-display text-xl">{brl(paid)}</p></div>
          <div className="rounded-xl bg-linen-50 p-3"><p className="text-xs text-bark-500">Pendente</p><p className={cx('font-display text-xl', pending > 0 && 'text-clay-600')}>{brl(pending)}</p></div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 mb-4">
        {tabs.map((t) => <button key={t.value} onClick={() => setTab(t.value)} className={cx('whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition', tab === t.value ? 'bg-bark-900 text-linen-50' : 'text-bark-700 hover:bg-linen-200')}>{t.label}</button>)}
      </div>

      <div className="fade-in" key={tab}>
        {tab === 'resumo' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5 text-sm space-y-2">
              <h3 className="text-lg mb-2">Dados</h3>
              <p><span className="text-bark-500">Nascimento:</span> {c.birthDate ? fmtDate(c.birthDate + 'T12:00:00') : '—'}</p>
              <p><span className="text-bark-500">CPF:</span> {c.cpf || '—'}</p>
              <p><span className="text-bark-500">Endereço:</span> {formatAddress(c.address)}</p>
              <p><span className="text-bark-500">Cadastro:</span> {fmtDate(c.createdAt)} {c.userId ? '· possui login' : '· cadastro manual'}</p>
              <p><span className="text-bark-500">1º atendimento:</span> {sum.first ? fmtDate(sum.first.start) : '—'} · <span className="text-bark-500">último:</span> {sum.last ? fmtDate(sum.last.start) : '—'}</p>
            </div>
            <div className="card p-5 text-sm">
              <h3 className="text-lg mb-2">Consentimentos (LGPD)</h3>
              {consents.length ? <ul className="space-y-1">{consents.map((x) => <li key={x.id}>✓ {x.kind === 'termos' ? 'Termos e privacidade' : 'Dados de saúde'} · {x.version} · {fmtDate(x.acceptedAt)} {fmtTime(x.acceptedAt)}</li>)}</ul> : <p className="text-bark-500">Nenhum registrado.</p>}
              <h3 className="text-lg mt-5 mb-2">Anamnese</h3>
              {anam ? <p>Versão {anam.version} · {fmtDate(anam.submittedAt)} · {anam.answers.marks.length} região(ões) no mapa. <button className="text-sage-600 font-semibold" onClick={() => setTab('anamnese')}>Ver</button></p> : <p className="text-bark-500">Ainda não preenchida.</p>}
            </div>
          </div>
        )}

        {tab === 'anamnese' && (anam ? (
          <div className="grid lg:grid-cols-[1fr_1fr] gap-4 items-start">
            <div className="card p-5">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                <h3 className="text-lg">Respostas</h3>
                <select className="input !w-auto !py-1.5 text-xs" value={anam.version} onChange={(e) => setAnamVersion(Number(e.target.value))}>
                  {anams.map((a) => <option key={a.id} value={a.version}>Versão {a.version} · {fmtDate(a.submittedAt)}</option>)}
                </select>
              </div>
              <AnamnesisView a={anam.answers} />
              <p className="text-xs text-bark-500">Consentimento {anam.consentVersion} em {fmtDate(anam.consentAt)}.</p>
            </div>
            <div className="card p-5"><h3 className="text-lg mb-4">Mapa corporal</h3><BodyMap marks={anam.answers.marks} title={false} /></div>
          </div>
        ) : <div className="card"><Empty title="Anamnese ainda não preenchida" /></div>)}

        {tab === 'historico' && (
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Data</th><th>Horário</th><th>Serviço</th><th>Duração</th><th className="text-right">Valor</th><th>Status</th><th>Observações</th></tr></thead>
              <tbody>
                {[...sum.appts].reverse().map((a) => {
                  const n = notes.filter((x) => x.appointmentId === a.id)
                  return (
                    <tr key={a.id}>
                      <td>{fmtDate(a.start)}</td><td>{fmtTime(a.start)}</td><td>{a.serviceName}</td>
                      <td>{Math.round((new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000)} min</td>
                      <td className="text-right">{a.clientPackageId ? 'Pacote' : brl(a.price)}</td>
                      <td><Badge tone={statusTone(a.status)}>{statusLabel[a.status]}</Badge></td>
                      <td className="text-xs text-bark-700 max-w-[260px]">{n.map((x) => x.text).join(' · ') || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!sum.appts.length && <Empty title="Sem atendimentos" />}
          </div>
        )}

        {tab === 'observacoes' && (
          <div className="grid lg:grid-cols-[1fr_1.3fr] gap-4 items-start">
            <div className="card p-5 bg-[#FBF5EE]">
              <h3 className="text-lg flex items-center gap-2"><Lock size={16} /> Observações do profissional</h3>
              <p className="text-xs text-bark-500 mb-4">Campo exclusivo da administração. O cliente nunca vê este conteúdo.</p>
              <Field label="Observação"><textarea className="input min-h-[90px]" value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} /></Field>
              <Field label="Registro de evolução (opcional)" className="mt-3"><input className="input" value={note.evolution} onChange={(e) => setNote({ ...note, evolution: e.target.value })} placeholder="Ex.: dor lombar reduziu" /></Field>
              <button className="btn-primary mt-4" onClick={() => { if (attempt(() => run((db) => api.adminAddNote(db, S, { clientId: c.id, text: note.text.trim(), evolution: note.evolution.trim() || undefined })), 'Observação salva.')) setNote({ text: '', evolution: '' }) }}>Salvar observação</button>
            </div>
            <div className="space-y-3">
              {notes.length ? notes.map((n) => {
                const a = sum.appts.find((x) => x.id === n.appointmentId)
                return (
                  <div key={n.id} className="card p-4">
                    <div className="flex justify-between gap-2"><p className="text-xs text-bark-500">{fmtDate(n.createdAt)}{a && ` · sessão de ${fmtDate(a.start)}`}</p><button className="text-bark-500 hover:text-red-700" aria-label="Excluir" onClick={() => run((db) => api.adminDeleteNote(db, S, n.id))}><Trash2 size={14} /></button></div>
                    <p className="text-sm mt-1">{n.text}</p>
                    {n.evolution && <p className="text-sm mt-1 text-sage-700"><b>Evolução:</b> {n.evolution}</p>}
                  </div>
                )
              }) : <div className="card"><Empty title="Nenhuma observação" /></div>}
            </div>
          </div>
        )}

        {tab === 'pagamentos' && <ClientPayments clientId={c.id} />}

        {tab === 'pacotes' && (
          <div>
            <div className="flex justify-end mb-3"><button className="btn-primary" onClick={() => setSell(true)}><Plus size={16} /> Vender pacote</button></div>
            {pkgs.length ? (
              <div className="grid md:grid-cols-2 gap-4">
                {pkgs.map((cp) => {
                  const av = api.packageAvailability(db, cp)
                  const days = Math.ceil((new Date(cp.expiresAt).getTime() - Date.now()) / 86400000)
                  return (
                    <div key={cp.id} className="card p-5">
                      <div className="flex justify-between"><h3 className="text-lg">{cp.planName}</h3>{av.expired ? <Badge tone="red">Vencido</Badge> : av.remaining <= 1 ? <Badge tone="amber">{av.remaining} restante</Badge> : <Badge tone="sage">Ativo</Badge>}</div>
                      <dl className="grid grid-cols-2 gap-y-1.5 text-sm mt-3">
                        <dt className="text-bark-500">Contratação</dt><dd>{fmtDate(cp.purchasedAt)}</dd>
                        <dt className="text-bark-500">Valor pago</dt><dd>{brl(cp.pricePaid)}</dd>
                        <dt className="text-bark-500">Contratadas</dt><dd>{cp.sessionsTotal}</dd>
                        <dt className="text-bark-500">Realizadas</dt><dd>{cp.sessionsUsed}</dd>
                        <dt className="text-bark-500">Restantes</dt><dd className="font-semibold">{av.remaining}{av.reserved ? ` (${av.reserved} agendada)` : ''}</dd>
                        <dt className="text-bark-500">Vencimento</dt><dd className={cx(days <= 15 && days >= 0 && 'text-clay-600 font-semibold')}>{fmtDate(cp.expiresAt)}{days >= 0 && days <= 15 && ` · ${days} dias`}</dd>
                      </dl>
                    </div>
                  )
                })}
              </div>
            ) : <div className="card"><Empty icon={<Package />} title="Nenhum pacote contratado" /></div>}
          </div>
        )}
      </div>

      {edit && <ClientFormModal open onClose={() => setEdit(false)} client={c} />}
      {sell && <SellPackageModal clientId={c.id} onClose={() => setSell(false)} />}
    </div>
  )
}

function SellPackageModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { db, session, run } = useStore()
  const plans = db.packagePlans.filter((p) => p.active)
  const [planId, setPlanId] = useState(plans[0]?.id ?? '')
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [paid, setPaid] = useState(true)
  const [date, setDate] = useState(ymd(new Date()))
  const plan = plans.find((p) => p.id === planId)
  return (
    <Modal open onClose={onClose} title="Vender pacote">
      <div className="space-y-3">
        <Field label="Pacote"><select className="input" value={planId} onChange={(e) => setPlanId(e.target.value)}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {brl(p.price)}</option>)}</select></Field>
        {plan?.conditions && <p className="text-xs bg-amber-50 text-amber-900 rounded-lg p-2">{plan.conditions}</p>}
        <Field label="Data da contratação"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Forma de pagamento"><select className="input" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>{Object.entries(methodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#5B6E50]" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Pagamento já recebido</label>
        <button className="btn-primary w-full" onClick={() => { if (attempt(() => run((db) => api.adminSellPackage(db, session!, { clientId, planId, method, paid, date })), 'Pacote ativado.')) onClose() }}>Confirmar venda</button>
      </div>
    </Modal>
  )
}

export function ClientPayments({ clientId }: { clientId: string }) {
  const { db, session, run } = useStore()
  const pays = db.payments.filter((p) => p.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="card overflow-x-auto">
      <table className="table-base">
        <thead><tr><th>Data</th><th>Descrição</th><th>Forma</th><th className="text-right">Valor</th><th>Status</th><th /></tr></thead>
        <tbody>
          {pays.map((p) => (
            <tr key={p.id}>
              <td>{fmtDate(p.date + 'T12:00:00')}</td><td>{p.description}</td><td>{methodLabel[p.method]}</td><td className="text-right font-semibold">{brl(p.amount)}</td>
              <td><Badge tone={statusTone(p.status)}>{p.status === 'recebido' ? 'Recebido' : 'Pendente'}</Badge></td>
              <td className="text-right">{p.status === 'pendente' && <button className="btn-secondary !py-1 !text-xs" onClick={() => attempt(() => run((db) => api.adminUpsertPayment(db, session!, { ...p, status: 'recebido' })), 'Marcado como recebido.')}>Receber</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!pays.length && <Empty title="Sem pagamentos" />}
    </div>
  )
}
