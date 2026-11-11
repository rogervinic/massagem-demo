import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '../lib/util'

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bark-900/30 backdrop-blur-[2px] p-0 sm:p-4" onClick={onClose}>
      <div
        className={cx('fade-in w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-soft max-h-[92vh] overflow-y-auto', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur flex items-center justify-between px-5 py-4 border-b border-linen-200">
          <h3 className="text-lg">{title}</h3>
          <button className="btn-ghost !p-2" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-bark-500">{hint}</span>}
    </label>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'sage' | 'clay' | 'red' | 'amber' | 'blue'; children: ReactNode }) {
  const t = {
    neutral: 'bg-linen-100 text-bark-700',
    sage: 'bg-sage-100 text-sage-700',
    clay: 'bg-[#F3E7DA] text-clay-600',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-800',
    blue: 'bg-sky-50 text-sky-800',
  }[tone]
  return <span className={cx('chip', t)}>{children}</span>
}

export const statusTone = (s: string) =>
  (({ agendado: 'blue', confirmado: 'sage', realizado: 'neutral', cancelado: 'red', ausente: 'amber', recebido: 'sage', pendente: 'amber' }) as const)[s as 'agendado'] ?? 'neutral'

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      {icon && <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-linen-100 grid place-items-center text-sage-600">{icon}</div>}
      <p className="font-medium text-bark-700">{title}</p>
      {children && <div className="text-sm text-bark-500 mt-1">{children}</div>}
    </div>
  )
}

export function Stat({ label, value, sub, icon, tone = 'sage' }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: 'sage' | 'clay' | 'bark' }) {
  const bg = { sage: 'bg-sage-100 text-sage-700', clay: 'bg-[#F3E7DA] text-clay-600', bark: 'bg-linen-200 text-bark-700' }[tone]
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-bark-500">{label}</span>
        {icon && <span className={cx('w-8 h-8 rounded-lg grid place-items-center', bg)}>{icon}</span>}
      </div>
      <div className="mt-2 font-display text-2xl text-bark-900">{value}</div>
      {sub && <div className="text-xs text-bark-500 mt-1">{sub}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex rounded-xl bg-linen-100 p-1 border border-linen-200">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-lg font-semibold transition',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === o.value ? 'bg-white text-bark-900 shadow-sm' : 'text-bark-500 hover:text-bark-700',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Opções em "pílulas" (radio) */
export function Choice<T extends string>({ value, onChange, options, name }: { value: T | ''; onChange: (v: T) => void; options: { value: T; label: string }[]; name: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === o.value}
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-full border px-4 py-2 text-sm font-medium transition',
            value === o.value ? 'border-sage-600 bg-sage-600 text-white' : 'border-linen-300 bg-white text-bark-700 hover:border-sage-400',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Caixas de seleção em "pílulas", com opção exclusiva (ex.: "Nenhuma") */
export function MultiChoice({ value, onChange, options, exclusive }: { value: string[]; onChange: (v: string[]) => void; options: { value: string; label: string }[]; exclusive?: string }) {
  const toggle = (v: string) => {
    if (v === exclusive) return onChange(value.includes(v) ? [] : [v])
    const base = value.filter((x) => x !== exclusive)
    onChange(base.includes(v) ? base.filter((x) => x !== v) : [...base, v])
  }
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <button
            type="button"
            role="checkbox"
            aria-checked={on}
            key={o.value}
            onClick={() => toggle(o.value)}
            className={cx(
              'flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition',
              on ? 'border-sage-500 bg-sage-100/60 text-bark-900' : 'border-linen-300 bg-white text-bark-700 hover:border-sage-300',
            )}
          >
            <span className={cx('w-5 h-5 rounded-md border grid place-items-center shrink-0', on ? 'bg-sage-600 border-sage-600 text-white' : 'border-linen-300')}>
              {on && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>}
            </span>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

let toastFn: ((msg: string, tone?: 'ok' | 'err') => void) | null = null
export const toast = (msg: string, tone: 'ok' | 'err' = 'ok') => toastFn?.(msg, tone)

export function Toaster() {
  const [items, setItems] = useState<{ id: number; msg: string; tone: 'ok' | 'err' }[]>([])
  useEffect(() => {
    toastFn = (msg, tone = 'ok') => {
      const id = Date.now() + Math.random()
      setItems((x) => [...x, { id, msg, tone }])
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4200)
    }
    return () => { toastFn = null }
  }, [])
  return (
    <div className="fixed z-[60] bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-[min(92vw,420px)]">
      {items.map((i) => (
        <div key={i.id} className={cx('fade-in rounded-xl px-4 py-3 text-sm shadow-soft border', i.tone === 'ok' ? 'bg-bark-900 text-linen-50 border-bark-900' : 'bg-red-50 text-red-800 border-red-200')}>
          {i.msg}
        </div>
      ))}
    </div>
  )
}

/** Executa ação e mostra o erro como toast */
export function attempt(fn: () => void, ok?: string) {
  try {
    fn()
    if (ok) toast(ok)
    return true
  } catch (e) {
    toast((e as Error).message, 'err')
    return false
  }
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {sub && <p className="text-sm text-bark-500 mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function DemoBanner() {
  return (
    <div className="bg-bark-900 text-linen-100 text-[11px] sm:text-xs text-center px-3 py-1.5 tracking-wide">
      AMBIENTE DE DEMONSTRAÇÃO · dados fictícios · nada é enviado por WhatsApp ou e-mail
    </div>
  )
}
