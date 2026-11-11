import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cx, ymd } from '../lib/util'

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export type DayMark = 'disponivel' | 'lotado' | 'fechado' | 'ferias' | 'indisponivel'

export default function Calendar({
  value, onChange, stateOf, initialMonth,
}: { value?: string; onChange: (d: string) => void; stateOf?: (d: string) => DayMark; initialMonth?: Date }) {
  const [month, setMonth] = useState(() => {
    const d = initialMonth ?? (value ? new Date(value + 'T12:00:00') : new Date())
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const first = month.getDay()
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => ymd(new Date(month.getFullYear(), month.getMonth(), i + 1)))]
  const today = ymd(new Date())

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" className="btn-ghost !p-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
        <span className="font-display text-lg inline-block first-letter:uppercase">{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
        <button type="button" className="btn-ghost !p-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Próximo mês"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEK.map((w, i) => <div key={i} className="text-[11px] font-semibold text-bark-500 py-1">{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const st = stateOf ? stateOf(d) : 'disponivel'
          const enabled = st === 'disponivel'
          const sel = d === value
          return (
            <button
              type="button"
              key={d}
              disabled={!stateOf ? false : st === 'indisponivel' || st === 'fechado' || st === 'ferias'}
              onClick={() => onChange(d)}
              className={cx(
                'relative aspect-square rounded-xl text-sm font-medium transition flex flex-col items-center justify-center',
                sel ? 'bg-sage-600 text-white shadow-soft' : enabled ? 'bg-white border border-sage-200 text-bark-900 hover:border-sage-500' : st === 'lotado' ? 'bg-linen-100 text-bark-500' : 'text-bark-500/40',
                d === today && !sel && 'ring-2 ring-clay-300',
              )}
              title={st === 'lotado' ? 'Sem horários (entre na lista de espera)' : st === 'ferias' ? 'Férias' : st === 'fechado' ? 'Sem atendimento' : undefined}
            >
              {Number(d.slice(8))}
              {stateOf && enabled && !sel && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-sage-500" />}
            </button>
          )
        })}
      </div>
      {stateOf && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-bark-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sage-500" /> Com horários</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-linen-200" /> Lotado</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded ring-2 ring-clay-300" /> Hoje</span>
        </div>
      )}
    </div>
  )
}
