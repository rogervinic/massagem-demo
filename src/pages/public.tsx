import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarCheck, Clock, HeartHandshake, Home as HomeIcon, Leaf, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { useStore } from '../lib/store'
import * as api from '../lib/api'
import { DEMO } from '../lib/seed'
import { Logo } from '../layouts'
import { DemoBanner, Field, toast } from '../components/ui'
import { brl } from '../lib/util'

function PublicHeader() {
  const { session } = useStore()
  return (
    <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <Logo />
      <nav className="flex items-center gap-2">
        {session ? (
          <Link to={session.role === 'admin' ? '/admin' : '/cliente'} className="btn-primary">Abrir painel</Link>
        ) : (
          <>
            <Link to="/entrar" className="btn-ghost">Entrar</Link>
            <Link to="/cadastro" className="btn-primary hidden sm:inline-flex">Criar conta</Link>
          </>
        )}
      </nav>
    </header>
  )
}

export function Home() {
  const { db, resetDemo } = useStore()
  const services = api.listActiveServices(db)
  const plans = api.listActivePlans(db)
  return (
    <div className="min-h-screen">
      <DemoBanner />
      <PublicHeader />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-16 grid lg:grid-cols-[1.1fr_.9fr] gap-10 items-center">
        <div className="fade-in">
          <span className="chip bg-sage-100 text-sage-700 mb-5"><Leaf size={14} /> Atendimento a domicílio · {db.settings.referenceAddress.split('·')[0]}</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">Pausa para o corpo, <em className="text-sage-600 not-italic font-normal">sem sair de casa.</em></h1>
          <p className="mt-5 text-lg text-bark-500 max-w-xl">{db.settings.tagline}. Agende online, preencha sua anamnese e acompanhe suas sessões em um só lugar.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/cadastro" className="btn-primary !px-6 !py-3 !text-base">Agendar minha sessão <ArrowRight size={18} /></Link>
            <Link to="/entrar" className="btn-secondary !px-6 !py-3 !text-base">Já tenho conta</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-bark-500">
            <span className="flex items-center gap-2"><HomeIcon size={16} className="text-sage-600" /> Vamos até você</span>
            <span className="flex items-center gap-2"><CalendarCheck size={16} className="text-sage-600" /> Horários em tempo real</span>
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-sage-600" /> Dados de saúde protegidos</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 bg-gradient-to-br from-sage-200/60 via-linen-200 to-clay-300/40 rounded-[48px] blur-2xl" aria-hidden />
          <div className="relative card p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-clay-500 mb-1">Teste a demonstração</p>
            <h2 className="text-2xl mb-4">Entre com um perfil fictício</h2>
            <DemoQuickLogin />
            <button className="mt-4 text-xs text-bark-500 underline underline-offset-2" onClick={() => resetDemo().then(() => toast('Demonstração restaurada ao estado inicial.'))}>
              Restaurar dados da demonstração
            </button>
          </div>
        </div>
      </section>

      <section className="bg-linen-50 border-y border-linen-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="text-3xl mb-2">Serviços</h2>
          <p className="text-bark-500 mb-8">Valores e durações são editáveis no painel administrativo.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {services.map((s) => (
              <div key={s.id} className="card p-5 flex flex-col">
                <Sparkles className="text-sage-500 mb-3" size={22} />
                <h3 className="text-lg">{s.name}</h3>
                <p className="text-sm text-bark-500 mt-1 flex-1">{s.description}</p>
                <div className="flex items-end justify-between mt-4">
                  <span className="flex items-center gap-1.5 text-sm text-bark-500"><Clock size={15} /> {s.durationMin} min</span>
                  <span className="font-display text-2xl">{brl(s.price)}</span>
                </div>
              </div>
            ))}
          </div>
          <h3 className="text-2xl mt-12 mb-5">Pacotes</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div key={p.id} className="rounded-2xl border border-sage-200 bg-white/70 p-5">
                <div className="flex items-baseline justify-between">
                  <h4 className="font-semibold">{p.name}</h4>
                  <span className="font-display text-xl">{brl(p.price)}</span>
                </div>
                <p className="text-sm text-bark-500 mt-1">{p.sessions} sessões · validade de {p.validityDays} dias · {p.paymentTerms}</p>
                {p.conditions && <p className="text-xs text-clay-600 mt-2">{p.conditions}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid sm:grid-cols-3 gap-6">
        {[
          { icon: <CalendarCheck />, t: 'Agende em minutos', d: 'Veja os horários livres, escolha o serviço e informe o endereço.' },
          { icon: <HeartHandshake />, t: 'Atendimento sob medida', d: 'Sua anamnese e o mapa corporal orientam cada sessão.' },
          { icon: <Lock />, t: 'Privacidade', d: 'Seus dados de saúde ficam visíveis só para a profissional.' },
        ].map((f) => (
          <div key={f.t}>
            <div className="w-11 h-11 rounded-xl bg-sage-100 text-sage-600 grid place-items-center mb-3">{f.icon}</div>
            <h3 className="text-lg">{f.t}</h3>
            <p className="text-sm text-bark-500 mt-1">{f.d}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-linen-200 py-8 text-center text-xs text-bark-500 space-y-1">
        <p>{db.settings.businessName} · {db.settings.whatsapp} · {db.settings.email}</p>
        <p><Link to="/privacidade" className="underline">Política de privacidade</Link> · <Link to="/admin/login" className="underline">Área administrativa</Link></p>
      </footer>
    </div>
  )
}

function DemoQuickLogin() {
  const { db, setSession } = useStore()
  const nav = useNavigate()
  const go = async (who: 'client' | 'admin') => {
    const c = DEMO[who]
    const s = await api.login(db, c.email, c.password)
    setSession(s)
    nav(who === 'admin' ? '/admin' : '/cliente')
  }
  return (
    <div className="space-y-3">
      <button onClick={() => go('client')} className="w-full text-left rounded-xl border border-linen-300 hover:border-sage-400 hover:bg-sage-100/40 p-4 transition">
        <div className="font-semibold">Cliente: Ana Demonstração</div>
        <div className="text-xs text-bark-500 mt-0.5">{DEMO.client.email} · senha {DEMO.client.password}</div>
      </button>
      <button onClick={() => go('admin')} className="w-full text-left rounded-xl border border-linen-300 hover:border-sage-400 hover:bg-sage-100/40 p-4 transition">
        <div className="font-semibold">Administradora</div>
        <div className="text-xs text-bark-500 mt-0.5">{DEMO.admin.email} · senha {DEMO.admin.password}</div>
      </button>
    </div>
  )
}

function AuthCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <DemoBanner />
      <PublicHeader />
      <div className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-md card p-6 sm:p-8 fade-in">
          <h1 className="text-2xl">{title}</h1>
          {sub && <p className="text-sm text-bark-500 mt-1 mb-6">{sub}</p>}
          {children}
        </div>
      </div>
    </div>
  )
}

export function Login({ admin }: { admin?: boolean }) {
  const { db, setSession } = useStore()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState(admin ? DEMO.admin.email : '')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const s = await api.login(db, email, pw)
      if (admin && s.role !== 'admin') throw new Error('Esta conta não tem acesso administrativo.')
      setSession(s)
      nav(loc.state?.from ?? (s.role === 'admin' ? '/admin' : '/cliente'), { replace: true })
    } catch (err) {
      toast((err as Error).message, 'err')
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthCard title={admin ? 'Acesso administrativo' : 'Entrar'} sub={admin ? 'Somente para a profissional responsável.' : 'Acesse seus agendamentos e sua anamnese.'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="E-mail"><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Senha"><input className="input" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
        <button className="btn-primary w-full" disabled={busy}>Entrar</button>
      </form>
      <div className="mt-5 text-sm flex justify-between">
        {!admin && <Link to="/cadastro" className="text-sage-600 font-semibold">Criar conta</Link>}
        <Link to="/recuperar-senha" className="text-bark-500">Esqueci minha senha</Link>
      </div>
      <p className="mt-6 text-xs text-bark-500 bg-linen-100 rounded-lg p-3">
        Demonstração: {admin ? `${DEMO.admin.email} / ${DEMO.admin.password}` : `${DEMO.client.email} / ${DEMO.client.password}`}
      </p>
    </AuthCard>
  )
}

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
const maskCpf = (v: string) => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')

export function Register() {
  const { runAsync, setSession } = useStore()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', phone: '', birthDate: '', cpf: '', password: '', acceptTerms: false })
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const s = await runAsync((db) => api.register(db, f))
      setSession(s)
      toast('Conta criada! Que tal preencher sua anamnese?')
      nav('/cliente')
    } catch (err) {
      toast((err as Error).message, 'err')
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthCard title="Criar conta" sub="Leva menos de um minuto.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome completo"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefone / WhatsApp"><input className="input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: maskPhone(e.target.value) })} required /></Field>
          <Field label="Nascimento"><input className="input" type="date" value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} /></Field>
        </div>
        <Field label="E-mail"><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></Field>
        <Field label="CPF (opcional)" hint="Só se precisar de recibo com CPF."><input className="input" inputMode="numeric" value={f.cpf} onChange={(e) => setF({ ...f, cpf: maskCpf(e.target.value) })} /></Field>
        <Field label="Senha" hint="Mínimo de 8 caracteres."><input className="input" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></Field>
        <label className="flex items-start gap-2 text-sm text-bark-700">
          <input type="checkbox" className="mt-1 w-4 h-4 accent-[#5B6E50]" checked={f.acceptTerms} onChange={(e) => setF({ ...f, acceptTerms: e.target.checked })} />
          <span>Li e aceito os termos de uso e a <Link to="/privacidade" className="underline" target="_blank">política de privacidade</Link>.</span>
        </label>
        <button className="btn-primary w-full" disabled={busy}>Criar conta</button>
        <p className="text-xs text-bark-500">Na demonstração, use um e-mail inventado. Não informe dados reais.</p>
      </form>
    </AuthCard>
  )
}

export function Forgot() {
  const { runAsync } = useStore()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [stage, setStage] = useState<'email' | 'reset'>('email')
  return (
    <AuthCard title="Recuperar senha" sub="Na versão final, você recebe um link por e-mail.">
      {stage === 'email' ? (
        <form onSubmit={(e) => { e.preventDefault(); setStage('reset') }} className="space-y-4">
          <Field label="E-mail da conta"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <button className="btn-primary w-full">Continuar</button>
        </form>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            try {
              await runAsync((db) => api.resetPassword(db, email, pw))
              toast('Senha alterada. Entre com a nova senha.')
              nav('/entrar')
            } catch (err) { toast((err as Error).message, 'err') }
          }}
          className="space-y-4"
        >
          <div className="text-xs rounded-lg bg-amber-50 text-amber-900 p-3">
            Integração de e-mail pendente. Na demonstração, o link de redefinição é substituído por este formulário.
          </div>
          <Field label="Nova senha"><input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
          <button className="btn-primary w-full">Salvar nova senha</button>
        </form>
      )}
    </AuthCard>
  )
}

export function Privacy() {
  const { db } = useStore()
  return (
    <div className="min-h-screen">
      <DemoBanner />
      <PublicHeader />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 card p-6 sm:p-10 mb-10 space-y-4 text-sm text-bark-700 leading-relaxed">
        <h1 className="text-3xl">Política de privacidade</h1>
        <p className="text-xs text-bark-500">Modelo para a demonstração. Revisar com um profissional antes de publicar.</p>
        <h2 className="text-lg">Quem trata seus dados</h2>
        <p>{db.settings.businessName}, contato {db.settings.email}, é a controladora dos dados coletados nesta plataforma.</p>
        <h2 className="text-lg">Quais dados coletamos</h2>
        <p>Cadastro (nome, e-mail, telefone, data de nascimento e, se você quiser, CPF), endereço de atendimento, histórico de sessões, pagamentos e as respostas da anamnese, incluindo o mapa corporal.</p>
        <h2 className="text-lg">Dados de saúde</h2>
        <p>As respostas da anamnese são dados pessoais sensíveis. Só são tratadas com o seu consentimento específico, registrado com data e versão, e servem apenas para planejar e realizar os atendimentos com segurança. Apenas a profissional responsável tem acesso.</p>
        <h2 className="text-lg">Seus direitos</h2>
        <p>Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados, e revogar o consentimento, pelo e-mail acima. Alguns registros (como pagamentos) podem precisar ser guardados pelo prazo exigido em lei.</p>
        <h2 className="text-lg">Segurança</h2>
        <p>Senhas são armazenadas com hash, o acesso é separado por perfil e cada cliente vê apenas os próprios dados.</p>
      </article>
    </div>
  )
}
