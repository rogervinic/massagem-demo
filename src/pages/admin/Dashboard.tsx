import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { CalendarCheck, CalendarX, DollarSign, Gauge, Receipt, TrendingUp, UserPlus, Users, AlertTriangle, MapPin, Phone } from 'lucide-react'
import { useStore } from '../../lib/store'
import * as api from '../../lib/api'
import { expensesBetween, monthRange, monthlySeries, occupancy, revenueBetween, serviceRanking, weekRange } from '../../lib/reports'
import { brl, fmtTime, formatAddress, statusLabel, startOfDay, ymd } from '../../lib/util'
import { Badge, PageHeader, Stat, statusTone } from '../../components/ui'

export const CHART = { sage: '#5B6E50', sageLight: '#AEBDA0', clay: '#BF9A76', bark: '#6E5443', grid: '#EBE1D2' }
export const tooltipStyle = { borderRadius: 12, border: '1px solid #EBE1D2', fontSize: 12, boxShadow: '0 8px 24px -12px rgba(74,56,45,.25)' }

export default function AdminDashboard() {
  const { db } = useStore()
  const now = new Date()
  const today = startOfDay(now)
  const [ws, we] = weekRange(now)
  const [ms, me] = monthRange(now)
  const fatDia = revenueBetween(db, today, today)
  const fatSem = revenueBetween(db, ws, we)
  const fatMes = revenueBetween(db, ms, me)
  const despMes = expensesBetween(db, ms, me)
  const newClients = db.clients.filter((c) => new Date(c.createdAt) >= ms).length
  const inMonth = db.appointments.filter((a) => new Date(a.start) >= ms && new Date(a.start) <= now)
  const realizadas = inMonth.filter((a) => a.status === 'realizado').length
  const canceladas = db.appointments.filter((a) => a.status === 'cancelado' && new Date(a.start) >= ms && new Date(a.start) <= me).length
  const futuros = db.appointments.filter((a) => (a.status === 'agendado' || a.status === 'confirmado') && new Date(a.start) > now)
  const occ = occupancy(db, ms, me)
  const series = monthlySeries(db, 6, now)
  const ranking = serviceRanking(db, new Date(now.getFullYear(), now.getMonth() - 2, 1), now)
  const todays = db.appointments.filter((a) => ymd(new Date(a.start)) === ymd(now) && a.status !== 'cancelado').sort((a, b) => a.start.localeCompare(b.start))
  const pending = db.payments.filter((p) => p.status === 'pendente')
  const warnings = api.packageWarnings(db, now)
  const changeReqs = db.appointments.filter((a) => a.changeRequest && a.status !== 'cancelado')

  return (
    <div className="max-w-7xl mx-auto fade-in">
      <PageHeader title="Dashboard" sub={now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} actions={<Link to="/admin/agenda" className="btn-primary">Abrir agenda</Link>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Faturamento hoje" value={brl(fatDia)} icon={<DollarSign size={16} />} />
        <Stat label="Na semana" value={brl(fatSem)} icon={<TrendingUp size={16} />} />
        <Stat label="No mês" value={brl(fatMes)} sub={`${brl(revenueBetween(db, ms, me, 'recebido'))} recebido`} icon={<TrendingUp size={16} />} />
        <Stat label="Lucro estimado (mês)" value={brl(fatMes - despMes)} sub={`Despesas: ${brl(despMes)}`} icon={<Receipt size={16} />} tone="clay" />
        <Stat label="Clientes" value={db.clients.filter((c) => c.status === 'ativo').length} sub={`${db.clients.length} cadastrados`} icon={<Users size={16} />} tone="bark" />
        <Stat label="Novos no mês" value={newClients} icon={<UserPlus size={16} />} tone="bark" />
        <Stat label="Sessões realizadas (mês)" value={realizadas} sub={`${futuros.length} agendamentos futuros`} icon={<CalendarCheck size={16} />} />
        <Stat label="Cancelamentos (mês)" value={canceladas} sub={<span className="flex items-center gap-1"><Gauge size={12} /> Ocupação da agenda: {(occ * 100).toFixed(0)}%</span>} icon={<CalendarX size={16} />} tone="clay" />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 mt-5">
        <div className="card p-5">
          <h2 className="text-lg mb-4">Faturamento x despesas (6 meses)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -10, right: 8 }}>
                <defs>
                  <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART.sage} stopOpacity={0.35} /><stop offset="100%" stopColor={CHART.sage} stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6E5443' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6E5443' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => brl(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="receita" name="Faturamento" stroke={CHART.sage} strokeWidth={2.5} fill="url(#gRec)" />
                <Area type="monotone" dataKey="despesas" name="Despesas" stroke={CHART.clay} strokeWidth={2} fill="transparent" strokeDasharray="5 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-lg mb-4">Serviços mais vendidos (3 meses)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ranking} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6E5443' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#4A382D' }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.replace(' (exemplo)', '').slice(0, 18)} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F5EFE6' }} />
                <Bar dataKey="qtd" name="Sessões" fill={CHART.sage} radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        <div className="card p-5 lg:col-span-2">
          <div className="flex justify-between items-center mb-3"><h2 className="text-lg">Hoje</h2><Link to="/admin/agenda" className="text-sm text-sage-600 font-semibold">Agenda completa</Link></div>
          {todays.length === 0 ? <p className="text-sm text-bark-500">Nenhum atendimento hoje.</p> : (
            <ul className="divide-y divide-linen-100">
              {todays.map((a) => {
                const c = db.clients.find((x) => x.id === a.clientId)
                return (
                  <li key={a.id} className="py-3 flex gap-4 items-start">
                    <div className="font-display text-xl w-14 shrink-0">{fmtTime(a.start)}</div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/admin/clientes/${a.clientId}`} className="font-semibold hover:underline">{c?.name}</Link>
                      <p className="text-xs text-bark-500">{a.serviceName}</p>
                      <p className="text-xs text-bark-500 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {formatAddress(a.address)} · <Phone size={11} /> {c?.phone}</p>
                    </div>
                    <Badge tone={statusTone(a.status)}>{statusLabel[a.status]}</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h2 className="text-lg mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-clay-500" /> Atenção</h2>
          <ul className="space-y-2 text-sm">
            {pending.length > 0 && <li><Link to="/admin/financeiro" className="flex justify-between hover:underline"><span>Pagamentos pendentes</span><b>{pending.length} · {brl(pending.reduce((s, p) => s + p.amount, 0))}</b></Link></li>}
            {warnings.map(({ cp, reasons }) => (
              <li key={cp.id}><Link to={`/admin/clientes/${cp.clientId}`} className="hover:underline">Pacote de <b>{db.clients.find((c) => c.id === cp.clientId)?.name}</b>: {reasons.join(', ')}</Link></li>
            ))}
            {changeReqs.map((a) => (
              <li key={a.id}><Link to="/admin/agenda" className="hover:underline"><b>{db.clients.find((c) => c.id === a.clientId)?.name}</b> pediu alteração: "{a.changeRequest}"</Link></li>
            ))}
            {db.waitlist.filter((w) => w.status === 'aguardando').length > 0 && <li><Link to="/admin/lista-de-espera" className="hover:underline">{db.waitlist.filter((w) => w.status === 'aguardando').length} cliente(s) na lista de espera</Link></li>}
            {!pending.length && !warnings.length && !changeReqs.length && <li className="text-bark-500">Tudo em dia.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
