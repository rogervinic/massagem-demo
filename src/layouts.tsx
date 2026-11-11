import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, CalendarDays, CalendarPlus, ClipboardList, Hourglass, Home, LayoutDashboard, LogOut, Menu, Package,
  Settings, Sparkles, User, Users, Wallet, BarChart3, X, History, HeartPulse,
} from 'lucide-react'
import { useStore } from './lib/store'
import { cx } from './lib/util'
import { DemoBanner } from './components/ui'

export function Logo({ light }: { light?: boolean }) {
  const { db } = useStore()
  return (
    <Link to="/" className="flex items-center gap-2.5">
      {db.settings.logoDataUrl ? (
        <img src={db.settings.logoDataUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
      ) : (
        <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden>
          <circle cx="16" cy="16" r="15" fill="#728764" />
          <path d="M16 6c-5 6-5 14 0 20 5-6 5-14 0-20z" fill="#F5EFE6" />
          <path d="M16 9v15" stroke="#728764" strokeWidth="1.2" />
        </svg>
      )}
      <span className={cx('font-display text-lg leading-none', light ? 'text-linen-50' : 'text-bark-900')}>{db.settings.businessName}</span>
    </Link>
  )
}

export function RequireRole({ role, children }: { role: 'client' | 'admin'; children: ReactNode }) {
  const { session } = useStore()
  const loc = useLocation()
  if (!session) return <Navigate to={role === 'admin' ? '/admin/login' : '/entrar'} state={{ from: loc.pathname }} replace />
  if (session.role !== role) return <Navigate to={session.role === 'admin' ? '/admin' : '/cliente'} replace />
  return <>{children}</>
}

interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean; badge?: number }

function Shell({ items, area, mobileItems }: { items: NavItem[]; area: 'client' | 'admin'; mobileItems?: NavItem[] }) {
  const { session, setSession } = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const logout = () => { setSession(null); nav('/') }
  const admin = area === 'admin'

  const links = (onClick?: () => void) =>
    items.map((i) => (
      <NavLink
        key={i.to}
        to={i.to}
        end={i.end}
        onClick={onClick}
        className={({ isActive }) =>
          cx(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            admin
              ? isActive ? 'bg-sage-600 text-white' : 'text-linen-200 hover:bg-white/10'
              : isActive ? 'bg-sage-100 text-sage-700' : 'text-bark-700 hover:bg-linen-200/70',
          )
        }
      >
        {i.icon}
        <span className="flex-1">{i.label}</span>
        {!!i.badge && <span className="min-w-5 h-5 px-1.5 rounded-full bg-clay-500 text-white text-[11px] grid place-items-center">{i.badge}</span>}
      </NavLink>
    ))

  return (
    <div className="min-h-screen flex flex-col">
      <DemoBanner />
      <div className="flex flex-1">
        <aside className={cx('hidden lg:flex w-64 shrink-0 flex-col p-4 gap-1 sticky top-0 h-screen', admin ? 'bg-bark-900' : 'bg-linen-50 border-r border-linen-200')}>
          <div className="px-2 py-3 mb-3"><Logo light={admin} /></div>
          {admin && <p className="px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-clay-300 mb-1">Painel administrativo</p>}
          <nav className="flex flex-col gap-0.5 overflow-y-auto">{links()}</nav>
          <div className="mt-auto pt-4 border-t border-white/10">
            <div className={cx('px-3 text-xs mb-2', admin ? 'text-linen-300' : 'text-bark-500')}>Logado como <b>{session?.name}</b></div>
            <button onClick={logout} className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', admin ? 'text-linen-200 hover:bg-white/10' : 'text-bark-700 hover:bg-linen-200')}>
              <LogOut size={18} /> Sair
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className={cx('lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b', admin ? 'bg-bark-900 border-bark-700' : 'bg-linen-50/95 backdrop-blur border-linen-200')}>
            <Logo light={admin} />
            <button className={cx('p-2 rounded-lg', admin ? 'text-linen-100' : 'text-bark-700')} onClick={() => setOpen(true)} aria-label="Menu"><Menu size={22} /></button>
          </header>
          {open && (
            <div className="lg:hidden fixed inset-0 z-50 bg-bark-900/40" onClick={() => setOpen(false)}>
              <div className={cx('fade-in absolute right-0 top-0 h-full w-72 p-4 flex flex-col gap-1', admin ? 'bg-bark-900' : 'bg-linen-50')} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <span className={cx('text-sm font-semibold', admin ? 'text-linen-100' : 'text-bark-700')}>{session?.name}</span>
                  <button onClick={() => setOpen(false)} className={admin ? 'text-linen-100' : ''} aria-label="Fechar"><X /></button>
                </div>
                <nav className="flex flex-col gap-0.5 overflow-y-auto">{links(() => setOpen(false))}</nav>
                <button onClick={logout} className={cx('mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm', admin ? 'text-linen-200' : 'text-bark-700')}><LogOut size={18} /> Sair</button>
              </div>
            </div>
          )}
          <main className={cx('flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8', mobileItems && 'pb-24 lg:pb-8')}>
            <Outlet />
          </main>
          {mobileItems && (
            <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-linen-200 grid grid-cols-5">
              {mobileItems.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold relative', isActive ? 'text-sage-600' : 'text-bark-500')}>
                  {i.icon}
                  {i.label}
                  {!!i.badge && <span className="absolute top-1 right-[28%] w-2 h-2 rounded-full bg-clay-500" />}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}

export function ClientLayout() {
  const { db, session } = useStore()
  const unread = db.notifications.filter((n) => n.clientId === session?.clientId && !n.read).length
  const items: NavItem[] = [
    { to: '/cliente', label: 'Início', icon: <Home size={18} />, end: true },
    { to: '/cliente/agendar', label: 'Agendar', icon: <CalendarPlus size={18} /> },
    { to: '/cliente/anamnese', label: 'Anamnese', icon: <HeartPulse size={18} /> },
    { to: '/cliente/historico', label: 'Histórico', icon: <History size={18} /> },
    { to: '/cliente/pacotes', label: 'Meus pacotes', icon: <Package size={18} /> },
    { to: '/cliente/lista-de-espera', label: 'Lista de espera', icon: <Hourglass size={18} /> },
    { to: '/cliente/notificacoes', label: 'Notificações', icon: <Bell size={18} />, badge: unread },
    { to: '/cliente/perfil', label: 'Meu perfil', icon: <User size={18} /> },
  ]
  const mobile: NavItem[] = [
    { to: '/cliente', label: 'Início', icon: <Home size={20} />, end: true },
    { to: '/cliente/agendar', label: 'Agendar', icon: <CalendarPlus size={20} /> },
    { to: '/cliente/anamnese', label: 'Anamnese', icon: <HeartPulse size={20} /> },
    { to: '/cliente/historico', label: 'Histórico', icon: <History size={20} /> },
    { to: '/cliente/notificacoes', label: 'Avisos', icon: <Bell size={20} />, badge: unread },
  ]
  return (
    <RequireRole role="client">
      <Shell items={items} area="client" mobileItems={mobile} />
    </RequireRole>
  )
}

export function AdminLayout() {
  const { db } = useStore()
  const unread = db.notifications.filter((n) => !n.clientId && !n.read).length
  const waiting = db.waitlist.filter((w) => w.status === 'aguardando').length
  const items: NavItem[] = [
    { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
    { to: '/admin/agenda', label: 'Agenda', icon: <CalendarDays size={18} /> },
    { to: '/admin/clientes', label: 'Clientes', icon: <Users size={18} /> },
    { to: '/admin/anamneses', label: 'Anamneses', icon: <ClipboardList size={18} /> },
    { to: '/admin/servicos', label: 'Serviços', icon: <Sparkles size={18} /> },
    { to: '/admin/pacotes', label: 'Pacotes', icon: <Package size={18} /> },
    { to: '/admin/financeiro', label: 'Faturamento e despesas', icon: <Wallet size={18} /> },
    { to: '/admin/relatorios', label: 'Relatórios', icon: <BarChart3 size={18} /> },
    { to: '/admin/lista-de-espera', label: 'Lista de espera', icon: <Hourglass size={18} />, badge: waiting },
    { to: '/admin/notificacoes', label: 'Notificações', icon: <Bell size={18} />, badge: unread },
    { to: '/admin/configuracoes', label: 'Configurações', icon: <Settings size={18} /> },
  ]
  return (
    <RequireRole role="admin">
      <Shell items={items} area="admin" />
    </RequireRole>
  )
}

