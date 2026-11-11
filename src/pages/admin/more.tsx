import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Bell, Download, Hourglass, Pencil, Plus, ShieldAlert, Trash2, Upload, CheckCircle2, CircleDashed, Clock } from 'lucide-react'
import { useStore } from '../../lib/store'
import * as api from '../../lib/api'
import type { DayHours, Expense, ExpenseCategory, PackagePlan, Payment, PaymentMethod, Service, Settings } from '../../lib/types'
import { brl, categoryLabel, cx, fmtDate, fmtTime, methodLabel, periodLabel, ymd } from '../../lib/util'
import { exportAnamneses, exportFinance, exportHistory, expensesBetween, monthlySeries, revenueBetween, serviceRanking, sum } from '../../lib/reports'
import { Badge, Empty, Field, Modal, PageHeader, Segmented, Stat, attempt, statusTone, toast } from '../../components/ui'
import { CHART, tooltipStyle } from './Dashboard'

// ------------------------------------------------------------ Anamneses

export function AdminAnamneses() {
  const { db } = useStore()
  const [confirm, setConfirm] = useState(false)
  const rows = db.clients.map((c) => ({ c, a: api.latestAnamnesis(db, c.id) }))
  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Anamneses" sub="Dados de saúde. Acesso restrito à administração." actions={<button className="btn-secondary" onClick={() => setConfirm(true)}><Download size={16} /> Exportar</button>} />
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Cliente</th><th>Situação</th><th>Versão</th><th>Atualizada</th><th>Mapa</th><th>Alertas</th><th /></tr></thead>
          <tbody>
            {rows.map(({ c, a }) => {
              const x = a?.answers
              const alerts = x ? [
                x.conditions.some((v) => v !== 'nenhuma') && 'condição de saúde', x.allergies === 'sim' && 'alergia', x.productSensitivity === 'sim' && 'sensível a produtos',
                x.pregnant === 'sim' && 'gestante', x.injury === 'sim' && 'lesão', x.skin.some((v) => v !== 'nenhuma') && 'pele',
              ].filter(Boolean) as string[] : []
              return (
                <tr key={c.id}>
                  <td className="font-semibold">{c.name}</td>
                  <td>{a ? <Badge tone="sage">Preenchida</Badge> : <Badge tone="amber">Pendente</Badge>}</td>
                  <td>{a?.version ?? '—'}</td>
                  <td>{a ? fmtDate(a.submittedAt) : '—'}</td>
                  <td>{x ? <span className="text-xs"><span className="text-[#C4543F] font-bold">{x.marks.filter((m) => m.level === 'vermelho').length}</span> vermelhas · <span className="text-amber-600 font-bold">{x.marks.filter((m) => m.level === 'amarelo').length}</span> amarelas</span> : '—'}</td>
                  <td className="text-xs">{alerts.length ? <span className="text-clay-600 flex items-center gap-1"><AlertTriangle size={12} /> {alerts.join(', ')}</span> : '—'}</td>
                  <td>{a && <Link className="text-sage-600 font-semibold text-sm" to={`/admin/clientes/${c.id}`}>Abrir</Link>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Exportar dados de saúde">
        <div className="flex gap-3 text-sm text-bark-700">
          <ShieldAlert className="text-clay-600 shrink-0" />
          <div className="space-y-2">
            <p>A planilha terá <b>dados pessoais sensíveis</b>. Guarde em local protegido, não envie por canais abertos e não suba em planilhas públicas.</p>
            <p>Esta exportação é manual e fica registrada no log de auditoria.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button className="btn-ghost" onClick={() => setConfirm(false)}>Cancelar</button>
          <ExportAnamnesesButton onDone={() => setConfirm(false)} />
        </div>
      </Modal>
    </div>
  )
}

function ExportAnamnesesButton({ onDone }: { onDone: () => void }) {
  const { db, session, run } = useStore()
  return (
    <button className="btn-primary" onClick={() => {
      exportAnamneses(db)
      run((db) => db.audit.unshift({ id: 'log_' + Date.now(), at: new Date().toISOString(), actor: session!.name, action: 'Exportação de anamneses (dados sensíveis)' }))
      onDone()
    }}>Entendi, exportar</button>
  )
}

// ------------------------------------------------------------ Serviços

export function AdminServices() {
  const { db, session, run } = useStore()
  const [edit, setEdit] = useState<Partial<Service> | null>(null)
  const now = new Date()
  const [period, setPeriod] = useState<'30' | '90' | '365'>('90')
  const from = new Date(now.getTime() - Number(period) * 86400000)
  const ranking = serviceRanking(db, from, now)
  const top = ranking[0]
  const topRev = [...ranking].sort((a, b) => b.receita - a.receita)[0]
  const prevRanking = serviceRanking(db, new Date(from.getTime() - Number(period) * 86400000), from)
  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Serviços" actions={<button className="btn-primary" onClick={() => setEdit({ name: '', description: '', durationMin: 60, price: 0, active: true })}><Plus size={16} /> Novo serviço</button>} />
      <div className="grid md:grid-cols-3 gap-4 mb-5">
        {db.services.map((s) => (
          <div key={s.id} className={cx('card p-5', !s.active && 'opacity-60')}>
            <div className="flex justify-between items-start gap-2"><h3 className="text-lg">{s.name}</h3>{s.active ? <Badge tone="sage">Disponível</Badge> : <Badge>Indisponível</Badge>}</div>
            <p className="text-sm text-bark-500 mt-1 min-h-[40px]">{s.description}</p>
            <div className="flex justify-between items-end mt-3"><span className="text-sm text-bark-500">{s.durationMin} min</span><span className="font-display text-2xl">{brl(s.price)}</span></div>
            <div className="flex gap-2 mt-4">
              <button className="btn-secondary !py-1.5" onClick={() => setEdit(s)}><Pencil size={14} /> Editar</button>
              <button className="btn-ghost !py-1.5 text-red-700" onClick={() => { const r = run((db) => api.adminDeleteService(db, session!, s.id)); toast(r === 'excluido' ? 'Serviço excluído.' : 'Serviço tem histórico: foi desativado para preservar os registros.') }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="text-lg">Desempenho dos serviços</h2>
          <Segmented size="sm" value={period} onChange={setPeriod} options={[{ value: '30', label: '30 dias' }, { value: '90', label: '90 dias' }, { value: '365', label: '12 meses' }]} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <Stat label="Mais vendido" value={top?.name.replace(' (exemplo)', '') ?? '—'} sub={top && `${top.qtd} sessões`} />
          <Stat label="Maior faturamento" value={topRev?.name.replace(' (exemplo)', '') ?? '—'} sub={topRev && brl(topRev.receita)} tone="clay" />
        </div>
        <table className="table-base">
          <thead><tr><th>Serviço</th><th className="text-right">Sessões</th><th className="text-right">Período anterior</th><th className="text-right">Via pacote</th><th className="text-right">Receita avulsa</th></tr></thead>
          <tbody>{ranking.map((r) => { const prev = prevRanking.find((p) => p.name === r.name)?.qtd ?? 0; return (
            <tr key={r.name}><td>{r.name}</td><td className="text-right font-semibold">{r.qtd}</td><td className="text-right text-bark-500">{prev} {prev > 0 && <span className={r.qtd >= prev ? 'text-sage-600' : 'text-red-700'}>({r.qtd >= prev ? '+' : ''}{Math.round(((r.qtd - prev) / prev) * 100)}%)</span>}</td><td className="text-right">{r.pacote}</td><td className="text-right">{brl(r.receita)}</td></tr>
          ) })}</tbody>
        </table>
      </div>

      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Editar serviço' : 'Novo serviço'}>
          <div className="space-y-3">
            <Field label="Nome"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Descrição"><textarea className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Duração (min)"><input type="number" min={15} step={5} className="input" value={edit.durationMin} onChange={(e) => setEdit({ ...edit, durationMin: Number(e.target.value) })} /></Field>
              <Field label="Preço (R$)"><input type="number" min={0} step={1} className="input" value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#5B6E50]" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Disponível para agendamento</label>
            <button className="btn-primary w-full" onClick={() => { if (attempt(() => run((db) => api.adminUpsertService(db, session!, edit as Service)), 'Serviço salvo.')) setEdit(null) }}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ------------------------------------------------------------ Pacotes

export function AdminPackages() {
  const { db, session, run } = useStore()
  const [edit, setEdit] = useState<Partial<PackagePlan> | null>(null)
  const warnings = api.packageWarnings(db)
  const active = db.clientPackages.filter((p) => p.sessionsUsed < p.sessionsTotal && new Date(p.expiresAt) > new Date())
  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Pacotes" actions={<button className="btn-primary" onClick={() => setEdit({ name: '', sessions: 4, price: 0, validityDays: 60, paymentTerms: '', conditions: '', active: true })}><Plus size={16} /> Novo pacote</button>} />
      {warnings.length > 0 && (
        <div className="card p-4 mb-5 border-amber-200 bg-amber-50/60">
          <p className="font-semibold text-sm flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-amber-700" /> Alertas</p>
          <ul className="text-sm space-y-1">{warnings.map(({ cp, reasons }) => <li key={cp.id}><Link className="hover:underline" to={`/admin/clientes/${cp.clientId}`}><b>{db.clients.find((c) => c.id === cp.clientId)?.name}</b> · {cp.planName}: {reasons.join(', ')}</Link></li>)}</ul>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {db.packagePlans.map((p) => (
          <div key={p.id} className={cx('card p-5', !p.active && 'opacity-60')}>
            <div className="flex justify-between"><h3 className="text-lg">{p.name}</h3>{!p.active && <Badge>Inativo</Badge>}</div>
            <p className="font-display text-3xl mt-2">{brl(p.price)}</p>
            <p className="text-sm text-bark-500">{p.sessions} sessões · {brl(p.price / p.sessions)}/sessão · validade {p.validityDays} dias</p>
            <p className="text-sm text-bark-500">{p.paymentTerms}</p>
            {p.conditions && <p className="text-xs text-clay-600 mt-2">{p.conditions}</p>}
            <div className="flex gap-2 mt-4">
              <button className="btn-secondary !py-1.5" onClick={() => setEdit(p)}><Pencil size={14} /> Editar</button>
              <button className="btn-ghost !py-1.5 text-red-700" onClick={() => { const r = run((db) => api.adminDeletePlan(db, session!, p.id)); toast(r === 'excluido' ? 'Pacote excluído.' : 'Pacote tem contratos: foi desativado.') }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <h2 className="text-lg mb-3">Pacotes ativos de clientes ({active.length})</h2>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Cliente</th><th>Pacote</th><th>Contratação</th><th className="text-right">Pago</th><th className="text-right">Usadas</th><th className="text-right">Restantes</th><th>Vencimento</th></tr></thead>
          <tbody>{active.map((cp) => (
            <tr key={cp.id}><td><Link className="font-semibold hover:underline" to={`/admin/clientes/${cp.clientId}`}>{db.clients.find((c) => c.id === cp.clientId)?.name}</Link></td><td>{cp.planName}</td><td>{fmtDate(cp.purchasedAt)}</td><td className="text-right">{brl(cp.pricePaid)}</td><td className="text-right">{cp.sessionsUsed}/{cp.sessionsTotal}</td><td className="text-right font-semibold">{cp.sessionsTotal - cp.sessionsUsed}</td><td>{fmtDate(cp.expiresAt)}</td></tr>
          ))}</tbody>
        </table>
        {!active.length && <Empty title="Nenhum pacote ativo" />}
      </div>
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Editar pacote' : 'Novo pacote'}>
          <div className="space-y-3">
            <Field label="Nome"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Sessões"><input type="number" min={1} className="input" value={edit.sessions} onChange={(e) => setEdit({ ...edit, sessions: Number(e.target.value) })} /></Field>
              <Field label="Valor (R$)"><input type="number" min={0} className="input" value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></Field>
              <Field label="Validade (dias)"><input type="number" min={1} className="input" value={edit.validityDays} onChange={(e) => setEdit({ ...edit, validityDays: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Condições de pagamento"><input className="input" value={edit.paymentTerms} onChange={(e) => setEdit({ ...edit, paymentTerms: e.target.value })} /></Field>
            <Field label="Regras / observações"><textarea className="input" value={edit.conditions ?? ''} onChange={(e) => setEdit({ ...edit, conditions: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#5B6E50]" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Ativo</label>
            <button className="btn-primary w-full" onClick={() => { if (attempt(() => run((db) => api.adminUpsertPlan(db, session!, edit as PackagePlan)), 'Pacote salvo.')) setEdit(null) }}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ------------------------------------------------------------ Financeiro

export function AdminFinance() {
  const { db, session, run } = useStore()
  const [tab, setTab] = useState<'receitas' | 'despesas'>('receitas')
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [statusF, setStatusF] = useState<'todos' | 'recebido' | 'pendente'>('todos')
  const [pay, setPay] = useState<Partial<Payment> | null>(null)
  const [exp, setExp] = useState<Partial<Expense> | null>(null)
  const inMonth = (d: string) => !month || d.startsWith(month)
  const pays = db.payments.filter((p) => inMonth(p.date) && (statusF === 'todos' || p.status === statusF)).sort((a, b) => b.date.localeCompare(a.date))
  const exps = db.expenses.filter((e) => inMonth(e.date)).sort((a, b) => b.date.localeCompare(a.date))
  const allPays = db.payments.filter((p) => inMonth(p.date))
  const rec = sum(allPays.filter((p) => p.status === 'recebido').map((p) => p.amount))
  const pen = sum(allPays.filter((p) => p.status === 'pendente').map((p) => p.amount))
  const desp = sum(exps.map((e) => e.amount))

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Faturamento e despesas" actions={<>
        <input type="month" className="input !w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
        <button className="btn-secondary" onClick={() => exportFinance(db)}><Download size={16} /> Excel</button>
        <button className="btn-secondary" onClick={() => exportFinance(db, 'csv')}><Download size={16} /> CSV</button>
      </>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Recebido" value={brl(rec)} />
        <Stat label="A receber" value={brl(pen)} tone="clay" />
        <Stat label="Despesas" value={brl(desp)} tone="bark" />
        <Stat label="Resultado" value={<span className={rec + pen - desp < 0 ? 'text-red-700' : ''}>{brl(rec + pen - desp)}</span>} sub="Faturamento menos despesas" />
      </div>
      <div className="flex flex-wrap justify-between gap-3 mb-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'receitas', label: 'Receitas' }, { value: 'despesas', label: 'Despesas' }]} />
        {tab === 'receitas' ? (
          <div className="flex gap-2">
            <Segmented size="sm" value={statusF} onChange={setStatusF} options={[{ value: 'todos', label: 'Todos' }, { value: 'recebido', label: 'Recebidos' }, { value: 'pendente', label: 'Pendentes' }]} />
            <button className="btn-primary" onClick={() => setPay({ clientId: db.clients[0]?.id, description: 'Massagem avulsa', date: ymd(now), amount: 90, method: 'pix', status: 'recebido' })}><Plus size={16} /> Receita</button>
          </div>
        ) : <button className="btn-primary" onClick={() => setExp({ description: '', category: 'produtos', amount: 0, date: ymd(now), method: 'pix', notes: '' })}><Plus size={16} /> Despesa</button>}
      </div>

      {tab === 'receitas' ? (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Data</th><th>Cliente</th><th>Serviço / descrição</th><th>Forma</th><th className="text-right">Valor</th><th>Status</th><th /></tr></thead>
            <tbody>{pays.map((p) => (
              <tr key={p.id}>
                <td>{fmtDate(p.date + 'T12:00:00')}</td><td>{db.clients.find((c) => c.id === p.clientId)?.name}</td><td>{p.description}</td><td>{methodLabel[p.method]}</td>
                <td className="text-right font-semibold">{brl(p.amount)}</td><td><Badge tone={statusTone(p.status)}>{p.status === 'recebido' ? 'Recebido' : 'Pendente'}</Badge></td>
                <td className="text-right whitespace-nowrap">
                  {p.status === 'pendente' && <button className="btn-secondary !py-1 !text-xs mr-1" onClick={() => attempt(() => run((db) => api.adminUpsertPayment(db, session!, { ...p, status: 'recebido' })), 'Recebido.')}>Receber</button>}
                  <button className="btn-ghost !p-1.5" onClick={() => setPay(p)} aria-label="Editar"><Pencil size={14} /></button>
                  <button className="btn-ghost !p-1.5 text-red-700" onClick={() => run((db) => api.adminDeletePayment(db, session!, p.id))} aria-label="Excluir"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {!pays.length && <Empty title="Sem receitas no período" />}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Forma</th><th className="text-right">Valor</th><th>Obs.</th><th /></tr></thead>
            <tbody>{exps.map((e) => (
              <tr key={e.id}>
                <td>{fmtDate(e.date + 'T12:00:00')}</td><td>{e.description}</td><td><Badge tone="clay">{categoryLabel[e.category]}</Badge></td><td>{methodLabel[e.method]}</td>
                <td className="text-right font-semibold">{brl(e.amount)}</td><td className="text-xs text-bark-500">{e.notes}</td>
                <td className="text-right whitespace-nowrap">
                  <button className="btn-ghost !p-1.5" onClick={() => setExp(e)} aria-label="Editar"><Pencil size={14} /></button>
                  <button className="btn-ghost !p-1.5 text-red-700" onClick={() => run((db) => api.adminDeleteExpense(db, session!, e.id))} aria-label="Excluir"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {!exps.length && <Empty title="Sem despesas no período" />}
        </div>
      )}

      {pay && (
        <Modal open onClose={() => setPay(null)} title={pay.id ? 'Editar receita' : 'Nova receita'}>
          <div className="space-y-3">
            <Field label="Cliente"><select className="input" value={pay.clientId} onChange={(e) => setPay({ ...pay, clientId: e.target.value })}>{db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Serviço / descrição"><input className="input" list="svc-list" value={pay.description} onChange={(e) => setPay({ ...pay, description: e.target.value })} /><datalist id="svc-list">{db.services.map((s) => <option key={s.id} value={s.name} />)}{db.packagePlans.map((s) => <option key={s.id} value={s.name} />)}</datalist></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data"><input type="date" className="input" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} /></Field>
              <Field label="Valor (R$)"><input type="number" min={0} step="0.01" className="input" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: Number(e.target.value) })} /></Field>
              <Field label="Forma"><select className="input" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value as PaymentMethod })}>{Object.entries(methodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Status"><select className="input" value={pay.status} onChange={(e) => setPay({ ...pay, status: e.target.value as 'recebido' })}><option value="recebido">Recebido</option><option value="pendente">Pendente</option></select></Field>
            </div>
            <button className="btn-primary w-full" onClick={() => { if (attempt(() => run((db) => api.adminUpsertPayment(db, session!, pay as Payment)), 'Receita salva.')) setPay(null) }}>Salvar</button>
          </div>
        </Modal>
      )}
      {exp && (
        <Modal open onClose={() => setExp(null)} title={exp.id ? 'Editar despesa' : 'Nova despesa'}>
          <div className="space-y-3">
            <Field label="Descrição"><input className="input" value={exp.description} onChange={(e) => setExp({ ...exp, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria"><select className="input" value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value as ExpenseCategory })}>{Object.entries(categoryLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Valor (R$)"><input type="number" min={0} step="0.01" className="input" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: Number(e.target.value) })} /></Field>
              <Field label="Data"><input type="date" className="input" value={exp.date} onChange={(e) => setExp({ ...exp, date: e.target.value })} /></Field>
              <Field label="Forma"><select className="input" value={exp.method} onChange={(e) => setExp({ ...exp, method: e.target.value as PaymentMethod })}>{Object.entries(methodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            </div>
            <Field label="Observações"><input className="input" value={exp.notes ?? ''} onChange={(e) => setExp({ ...exp, notes: e.target.value })} /></Field>
            <button className="btn-primary w-full" onClick={() => { if (attempt(() => run((db) => api.adminUpsertExpense(db, session!, exp as Expense)), 'Despesa salva.')) setExp(null) }}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ------------------------------------------------------------ Relatórios

export function AdminReports() {
  const { db } = useStore()
  const [months, setMonths] = useState<'3' | '6' | '12'>('6')
  const series = monthlySeries(db, Number(months))
  const totRec = sum(series.map((s) => s.receita))
  const totDesp = sum(series.map((s) => s.despesas))
  const totSess = sum(series.map((s) => s.sessoes))
  const from = new Date(new Date().getFullYear(), new Date().getMonth() - Number(months) + 1, 1)
  const received = revenueBetween(db, from, new Date(2100, 0, 1), 'recebido')
  const pending = revenueBetween(db, from, new Date(2100, 0, 1), 'pendente')
  const cur = series.at(-1)!, prev = series.at(-2)
  const delta = prev && prev.receita ? ((cur.receita - prev.receita) / prev.receita) * 100 : 0
  const byCat = Object.entries(categoryLabel).map(([k, v]) => ({ name: v, valor: sum(db.expenses.filter((e) => e.category === k && e.date >= ymd(from)).map((e) => e.amount)) })).filter((x) => x.valor > 0)
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Relatórios" actions={<>
        <Segmented value={months} onChange={setMonths} options={[{ value: '3', label: '3 meses' }, { value: '6', label: '6 meses' }, { value: '12', label: '12 meses' }]} />
        <button className="btn-secondary" onClick={() => exportFinance(db)}><Download size={16} /> Financeiro</button>
        <button className="btn-secondary" onClick={() => exportHistory(db)}><Download size={16} /> Atendimentos</button>
      </>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Receita bruta" value={brl(totRec)} sub={`${brl(received)} recebido · ${brl(pending)} pendente`} />
        <Stat label="Total de despesas" value={brl(totDesp)} tone="clay" />
        <Stat label="Resultado" value={brl(totRec - totDesp)} sub={`Margem ${totRec ? Math.round(((totRec - totDesp) / totRec) * 100) : 0}%`} />
        <Stat label="Média por atendimento" value={brl(totSess ? totRec / totSess : 0)} sub={`${totSess} sessões · mês atual ${delta >= 0 ? '+' : ''}${delta.toFixed(0)}% vs anterior`} tone="bark" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-lg mb-4">Comparação entre meses</h2>
          <div className="h-72"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ left: -10 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6E5443' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6E5443' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => brl(Number(v))} cursor={{ fill: '#F5EFE6' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receita" name="Receita" fill={CHART.sage} radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill={CHART.clay} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></div>
        </div>
        <div className="card p-5">
          <h2 className="text-lg mb-4">Evolução do resultado</h2>
          <div className="h-72"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: -10, right: 8 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6E5443' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6E5443' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => (n === 'Sessões' ? v : brl(Number(v)))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="resultado" name="Resultado" stroke={CHART.bark} strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="recebido" name="Recebido" stroke={CHART.sageLight} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer></div>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Mês</th><th className="text-right">Receita</th><th className="text-right">Despesas</th><th className="text-right">Resultado</th><th className="text-right">Sessões</th></tr></thead>
            <tbody>{series.map((s) => <tr key={s.mes}><td className="capitalize">{s.mes}</td><td className="text-right">{brl(s.receita)}</td><td className="text-right">{brl(s.despesas)}</td><td className={cx('text-right font-semibold', s.resultado < 0 && 'text-red-700')}>{brl(s.resultado)}</td><td className="text-right">{s.sessoes}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="card p-5">
          <h2 className="text-lg mb-3">Despesas por categoria</h2>
          <ul className="space-y-2">{byCat.sort((a, b) => b.valor - a.valor).map((c) => (
            <li key={c.name}><div className="flex justify-between text-sm"><span>{c.name}</span><b>{brl(c.valor)}</b></div><div className="h-2 bg-linen-100 rounded-full mt-1"><div className="h-full bg-clay-400 rounded-full" style={{ width: `${(c.valor / Math.max(...byCat.map((x) => x.valor))) * 100}%` }} /></div></li>
          ))}</ul>
          <p className="text-xs text-bark-500 mt-4">Mês atual: despesas {brl(expensesBetween(db, new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date()))}.</p>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ Lista de espera

export function AdminWaitlist() {
  const { db, run } = useStore()
  const items = db.waitlist.filter((w) => w.status !== 'cancelado').sort((a, b) => a.date.localeCompare(b.date))
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Lista de espera" sub="Quando surge vaga por cancelamento ou remoção de bloqueio, o sistema avisa os clientes compatíveis automaticamente." />
      {items.length === 0 ? <div className="card"><Empty icon={<Hourglass />} title="Ninguém na lista" /></div> : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Cliente</th><th>Dia</th><th>Período</th><th>Alternativas</th><th>Serviço</th><th>Status</th><th /></tr></thead>
            <tbody>{items.map((w) => {
              const free = api.slotsFor(db, w.date, w.serviceId)
              return (
                <tr key={w.id}>
                  <td className="font-semibold">{db.clients.find((c) => c.id === w.clientId)?.name}</td>
                  <td>{fmtDate(w.date + 'T12:00:00')}</td><td>{periodLabel[w.period]}</td>
                  <td className="text-xs">{w.altDates.map((d) => fmtDate(d + 'T12:00:00')).join(', ') || '—'}</td>
                  <td className="text-xs">{db.services.find((s) => s.id === w.serviceId)?.name}</td>
                  <td><Badge tone={w.status === 'notificado' ? 'sage' : w.status === 'atendido' ? 'neutral' : 'amber'}>{w.status}</Badge></td>
                  <td className="text-right">{w.status === 'aguardando' && <button className="btn-secondary !py-1 !text-xs" onClick={() => { const n = run((db) => api.checkWaitlist(db, w.date)); toast(n.length ? `${n.length} cliente(s) avisado(s).` : `Sem vaga compatível ainda (${free.length} horários livres no dia, fora do período pedido).`) }}>Verificar vagas</button>}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-bark-500 mt-3">Controle de concorrência: a vaga é revalidada no momento da confirmação; se duas pessoas tentarem, só a primeira consegue.</p>
    </div>
  )
}

// ------------------------------------------------------------ Notificações

export function AdminNotifications() {
  const { db, session, run } = useStore()
  const [tab, setTab] = useState<'admin' | 'enviadas' | 'programadas'>('admin')
  const mine = db.notifications.filter((n) => !n.clientId)
  const toClients = db.notifications.filter((n) => n.clientId)
  const scheduled = api.scheduledReminders(db).slice(0, 40)
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Notificações" actions={tab === 'admin' && mine.some((n) => !n.read) && <button className="btn-secondary" onClick={() => run((db) => api.markNotificationsRead(db, session!))}>Marcar como lidas</button>} />
      <IntegrationStatus />
      <div className="my-4"><Segmented value={tab} onChange={setTab} options={[{ value: 'admin', label: 'Para mim' }, { value: 'enviadas', label: 'Para clientes' }, { value: 'programadas', label: 'Lembretes programados' }]} /></div>
      {tab === 'programadas' ? (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Disparo</th><th>Cliente</th><th>Sessão</th><th>Tipo</th><th>Canal</th></tr></thead>
            <tbody>{scheduled.map((r, i) => (
              <tr key={i}><td>{fmtDate(r.at)} {fmtTime(r.at)}</td><td>{db.clients.find((c) => c.id === r.appt.clientId)?.name}</td><td>{fmtDate(r.appt.start)} {fmtTime(r.appt.start)}</td><td>{r.hoursBefore}h antes</td><td><Badge tone="amber">Integração pendente</Badge></td></tr>
            ))}</tbody>
          </table>
          {!scheduled.length && <Empty title="Nenhum lembrete programado" />}
        </div>
      ) : (
        <div className="card divide-y divide-linen-100">
          {(tab === 'admin' ? mine : toClients).map((n) => (
            <div key={n.id} className={cx('p-4 flex gap-3', !n.read && tab === 'admin' && 'bg-sage-100/30')}>
              <Bell size={16} className="text-bark-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{n.title}{tab === 'enviadas' && <span className="font-normal text-bark-500"> · para {db.clients.find((c) => c.id === n.clientId)?.name}</span>}</p>
                <p className="text-sm text-bark-700">{n.body}</p>
                <p className="text-[11px] text-bark-500 mt-1">{fmtDate(n.createdAt)} {fmtTime(n.createdAt)}{tab === 'enviadas' && ' · App ✓ · WhatsApp e e-mail: integração pendente'}</p>
              </div>
              {n.link && <Link to={n.link} className="text-sm text-sage-600 font-semibold self-center">Abrir</Link>}
            </div>
          ))}
          {!(tab === 'admin' ? mine : toClients).length && <Empty title="Nada por aqui" />}
        </div>
      )}
    </div>
  )
}

function IntegrationStatus() {
  const items = [
    { name: 'WhatsApp Business API (Meta)', need: 'Conta Meta Business verificada, número dedicado, token e modelos de mensagem aprovados' },
    { name: 'E-mail (Resend)', need: 'Chave de API e domínio verificado' },
    { name: 'Google Sheets', need: 'Conta de serviço Google e ID da planilha' },
  ]
  return (
    <div className="card p-4">
      <p className="text-sm font-semibold mb-2">Integrações externas</p>
      <ul className="space-y-2">{items.map((i) => (
        <li key={i.name} className="flex gap-2 text-sm"><CircleDashed size={16} className="text-amber-600 mt-0.5 shrink-0" /><span><b>{i.name}</b>: pendente. Falta: {i.need}.</span></li>
      ))}
        <li className="flex gap-2 text-sm"><CheckCircle2 size={16} className="text-sage-600 mt-0.5 shrink-0" /><span><b>Notificações no app</b>: funcionando.</span></li>
      </ul>
    </div>
  )
}

// ------------------------------------------------------------ Configurações

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function AdminSettings() {
  const { db, session, run, resetDemo } = useStore()
  const [s, setS] = useState<Settings>(() => structuredClone(db.settings))
  const [vac, setVac] = useState({ from: '', to: '', reason: '' })
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((x) => ({ ...x, [k]: v }))
  const setDay = (i: number, patch: Partial<DayHours>) => set('week', s.week.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  const save = () => attempt(() => run((db) => api.adminUpdateSettings(db, session!, s)), 'Configurações salvas. A disponibilidade foi recalculada.')

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader title="Configurações" actions={<button className="btn-primary" onClick={save}>Salvar alterações</button>} />

      <section className="card p-5">
        <h2 className="text-lg mb-4">Negócio</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome do negócio"><input className="input" value={s.businessName} onChange={(e) => set('businessName', e.target.value)} /></Field>
          <Field label="Frase de apresentação"><input className="input" value={s.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
          <Field label="Telefone"><input className="input" value={s.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="WhatsApp"><input className="input" value={s.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></Field>
          <Field label="E-mail"><input className="input" value={s.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Endereço de referência"><input className="input" value={s.referenceAddress} onChange={(e) => set('referenceAddress', e.target.value)} /></Field>
          <div className="sm:col-span-2 flex items-center gap-4">
            {s.logoDataUrl ? <img src={s.logoDataUrl} className="w-14 h-14 rounded-full object-cover border" alt="Logo" /> : <div className="w-14 h-14 rounded-full bg-sage-100" />}
            <label className="btn-secondary cursor-pointer"><Upload size={16} /> Enviar logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (f.size > 300_000) return toast('Use uma imagem de até 300 KB.', 'err')
                const r = new FileReader(); r.onload = () => set('logoDataUrl', String(r.result)); r.readAsDataURL(f)
              }} />
            </label>
            {s.logoDataUrl && <button className="btn-ghost" onClick={() => set('logoDataUrl', undefined)}>Remover</button>}
          </div>
        </div>
        <p className="text-xs text-bark-500 mt-3">Serviços, valores e durações são editados em <Link to="/admin/servicos" className="underline">Serviços</Link> e <Link to="/admin/pacotes" className="underline">Pacotes</Link>.</p>
      </section>

      <section className="card p-5">
        <h2 className="text-lg mb-4">Horários de atendimento</h2>
        <div className="space-y-2">
          {s.week.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3">
              <label className="w-28 flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="accent-[#5B6E50]" checked={d.enabled} onChange={(e) => setDay(i, { enabled: e.target.checked })} /> {WEEKDAYS[i]}</label>
              <input type="time" className="input !w-32" value={d.open} disabled={!d.enabled} onChange={(e) => setDay(i, { open: e.target.value })} />
              <span className="text-bark-500 text-sm">às</span>
              <input type="time" className="input !w-32" value={d.close} disabled={!d.enabled} onChange={(e) => setDay(i, { close: e.target.value })} />
            </div>
          ))}
        </div>
        <h3 className="font-semibold text-sm mt-5 mb-2">Intervalos de descanso</h3>
        {s.breaks.map((b, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input type="time" className="input !w-32" value={b.start} onChange={(e) => set('breaks', s.breaks.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
            <span className="text-sm text-bark-500">às</span>
            <input type="time" className="input !w-32" value={b.end} onChange={(e) => set('breaks', s.breaks.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
            <button className="btn-ghost !p-2 text-red-700" onClick={() => set('breaks', s.breaks.filter((_, j) => j !== i))} aria-label="Remover"><Trash2 size={15} /></button>
          </div>
        ))}
        <button className="btn-secondary !py-1.5" onClick={() => set('breaks', [...s.breaks, { start: '15:00', end: '15:30' }])}><Plus size={14} /> Intervalo</button>
      </section>

      <section className="card p-5">
        <h2 className="text-lg mb-4">Regras da agenda</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Deslocamento entre clientes (min)" hint="Reservado antes e depois de cada sessão."><input type="number" min={0} step={5} className="input" value={s.travelMin} onChange={(e) => set('travelMin', Number(e.target.value))} /></Field>
          <Field label="Intervalo entre opções de horário (min)"><input type="number" min={5} step={5} className="input" value={s.slotStepMin} onChange={(e) => set('slotStepMin', Number(e.target.value))} /></Field>
          <Field label="Antecedência mínima (horas)"><input type="number" min={0} className="input" value={s.minAdvanceHours} onChange={(e) => set('minAdvanceHours', Number(e.target.value))} /></Field>
          <Field label="Agenda aberta até (dias à frente)"><input type="number" min={1} className="input" value={s.maxAdvanceDays} onChange={(e) => set('maxAdvanceDays', Number(e.target.value))} /></Field>
          <Field label="Cancelar/alterar pelo site até (horas antes)"><input type="number" min={0} className="input" value={s.cancelMinHours} onChange={(e) => set('cancelMinHours', Number(e.target.value))} /></Field>
        </div>
        <Field label="Texto da política de cancelamento" className="mt-4"><textarea className="input" value={s.cancelPolicyText} onChange={(e) => set('cancelPolicyText', e.target.value)} /></Field>
      </section>

      <section className="card p-5">
        <h2 className="text-lg mb-4">Férias e períodos fechados</h2>
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <Field label="De"><input type="date" className="input" value={vac.from} onChange={(e) => setVac({ ...vac, from: e.target.value })} /></Field>
          <Field label="Até"><input type="date" className="input" value={vac.to} onChange={(e) => setVac({ ...vac, to: e.target.value })} /></Field>
          <Field label="Motivo"><input className="input" value={vac.reason} onChange={(e) => setVac({ ...vac, reason: e.target.value })} /></Field>
          <button className="btn-secondary" onClick={() => { if (!vac.from || !vac.to || vac.to < vac.from) return toast('Datas inválidas.', 'err'); set('vacations', [...s.vacations, { id: 'v' + Date.now(), ...vac, reason: vac.reason || 'Férias' }]); setVac({ from: '', to: '', reason: '' }) }}><Plus size={14} /> Adicionar</button>
        </div>
        {s.vacations.length ? <ul className="text-sm divide-y divide-linen-100">{s.vacations.map((v) => <li key={v.id} className="py-2 flex justify-between">{fmtDate(v.from + 'T12:00:00')} a {fmtDate(v.to + 'T12:00:00')} · {v.reason}<button className="text-red-700" onClick={() => set('vacations', s.vacations.filter((x) => x.id !== v.id))}><Trash2 size={14} /></button></li>)}</ul> : <p className="text-sm text-bark-500">Nenhum período cadastrado.</p>}
      </section>

      <section className="card p-5">
        <h2 className="text-lg mb-4">Notificações</h2>
        <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" className="accent-[#5B6E50]" checked={s.reminders.afterBooking} onChange={(e) => set('reminders', { ...s.reminders, afterBooking: e.target.checked })} /> Confirmação logo após o agendamento</label>
        <Field label="Lembretes antes da sessão (horas, separados por vírgula)">
          <input className="input !w-60" defaultValue={s.reminders.hoursBefore.join(', ')} onBlur={(e) => set('reminders', { ...s.reminders, hoursBefore: e.target.value.split(',').map((x) => Number(x.trim())).filter((x) => x > 0) })} />
        </Field>
        <p className="text-xs text-bark-500 mt-2 flex items-center gap-1"><Clock size={12} /> Alterações e cancelamentos sempre geram aviso. Envio externo: integração pendente.</p>
      </section>

      <section className="card p-5">
        <h2 className="text-lg mb-3">Registro de ações administrativas</h2>
        <ul className="text-sm divide-y divide-linen-100 max-h-72 overflow-y-auto">
          {db.audit.slice(0, 60).map((l) => <li key={l.id} className="py-2 flex flex-wrap gap-x-3"><span className="text-bark-500 text-xs w-32">{fmtDate(l.at)} {fmtTime(l.at)}</span><span className="font-medium">{l.action}</span>{l.detail && <span className="text-bark-500">{l.detail}</span>}</li>)}
        </ul>
      </section>

      <section className="card p-5 border-red-200">
        <h2 className="text-lg mb-1">Demonstração</h2>
        <p className="text-sm text-bark-500 mb-3">Apaga tudo o que foi feito neste navegador e recria os dados fictícios.</p>
        <button className="btn-danger" onClick={() => resetDemo().then(() => toast('Demonstração restaurada.'))}>Restaurar dados da demonstração</button>
      </section>
    </div>
  )
}
