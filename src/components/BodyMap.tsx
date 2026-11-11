import { useMemo, useState } from 'react'
import { Eraser, Pencil, Trash2 } from 'lucide-react'
import type { BodyMark, MarkKind, MarkLevel, View } from '../lib/types'
import { REGIONS, REGION_BY_ID, VIEWBOX, regionLabel, shapePath } from '../lib/bodyRegions'
import { cx, fmtDate } from '../lib/util'
import { Segmented } from './ui'

export const LEVEL_COLOR: Record<MarkLevel, string> = { vermelho: '#C4543F', amarelo: '#E2AE3A' }
const LEVEL_TEXT: Record<MarkLevel, string> = { vermelho: 'Dor intensa / atenção elevada', amarelo: 'Dor moderada / atenção moderada' }
const KIND_TEXT: Record<MarkKind, string> = { dor: 'Dor ou desconforto', atencao: 'Quer mais atenção (sem dor)' }

const BASE_FILL = '#F3F2EF'
const STROKE = '#3A3836'

// Linhas anatômicas decorativas (não clicáveis)
const DETAIL: Record<View, string[]> = {
  anterior: [
    'M110,92 L110,128', // esterno
    'M98,83 Q86,86 72,90', 'M122,83 Q134,86 148,90', // clavículas
    'M110,138 L110,192', // linha alba
    'M96,150 Q110,153 124,150', 'M95,165 Q110,168 125,165', 'M95,179 Q110,182 125,179',
    'M90,108 Q98,118 108,120', 'M130,108 Q122,118 112,120', // contorno peitoral
    'M88,238 Q92,268 94,296', 'M132,238 Q128,268 126,296', // coxa medial
    'M93,312 a4.5,5 0 1,0 9,0 a4.5,5 0 1,0 -9,0', 'M118,312 a4.5,5 0 1,0 9,0 a4.5,5 0 1,0 -9,0', // patelas
    'M95,334 Q97,358 95,385', 'M125,334 Q123,358 125,385', // tíbias
  ],
  posterior: [
    'M110,62 L110,198', // coluna
    'M92,120 Q100,128 104,128', 'M128,120 Q120,128 116,128',
    'M110,206 L110,238', // fenda glútea
    'M86,236 Q96,242 108,238', 'M134,236 Q124,242 112,238', // prega glútea
    'M95,256 L95,296', 'M125,256 L125,296', // isquiotibiais
    'M94,330 Q92,352 96,372', 'M126,330 Q128,352 124,372', // gastrocnêmio
    'M90,312 Q95,316 101,312', 'M119,312 Q125,316 130,312', // fossa poplítea
  ],
}

interface Props {
  marks: BodyMark[]
  onChange?: (m: BodyMark[]) => void
  title?: boolean
}

export default function BodyMap({ marks, onChange, title = true }: Props) {
  const readOnly = !onChange
  const [level, setLevel] = useState<MarkLevel>('vermelho')
  const [kind, setKind] = useState<MarkKind>('dor')
  const [eraser, setEraser] = useState(false)
  const [tab, setTab] = useState<View>('anterior')
  const [editing, setEditing] = useState<string | null>(null)

  const byId = useMemo(() => Object.fromEntries(marks.map((m) => [m.regionId, m])), [marks])

  const apply = (regionId: string) => {
    if (readOnly) return
    const r = REGION_BY_ID[regionId]
    const existing = byId[regionId]
    if (eraser) return onChange!(marks.filter((m) => m.regionId !== regionId))
    if (existing && existing.level === level && existing.kind === kind) return onChange!(marks.filter((m) => m.regionId !== regionId))
    const mark: BodyMark = { regionId, view: r.view, side: r.side, level, kind, markedAt: new Date().toISOString() }
    onChange!(existing ? marks.map((m) => (m.regionId === regionId ? mark : m)) : [...marks, mark])
  }

  const update = (regionId: string, patch: Partial<BodyMark>) =>
    onChange?.(marks.map((m) => (m.regionId === regionId ? { ...m, ...patch, markedAt: new Date().toISOString() } : m)))

  const figure = (view: View) => {
    const regions = REGIONS.filter((r) => r.view === view).sort((a, b) => a.layer - b.layer)
    return (
      <figure className="flex flex-col items-center">
        <figcaption className="text-xs font-semibold uppercase tracking-wider text-bark-500 mb-2">
          {view === 'anterior' ? 'Vista frontal' : 'Vista posterior'}
        </figcaption>
        <svg
          viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
          className="w-full max-w-[260px] select-none touch-manipulation"
          role="group"
          aria-label={view === 'anterior' ? 'Corpo, vista frontal' : 'Corpo, vista posterior'}
        >
          <defs>
            {(['vermelho', 'amarelo'] as MarkLevel[]).map((l) => (
              <pattern key={l} id={`hatch-${l}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" fill="#fff" />
                <rect width="2.6" height="5" fill={LEVEL_COLOR[l]} />
              </pattern>
            ))}
          </defs>

          {view === 'posterior' && (
            <g pointerEvents="none">
              <ellipse cx="110" cy="36" rx="20" ry="25" fill={BASE_FILL} stroke={STROKE} strokeWidth="1.1" />
              <path d="M96,22 Q110,10 124,22 M94,32 Q110,24 126,32" stroke="#8d8a85" strokeWidth=".7" fill="none" />
            </g>
          )}

          {regions.map((r) => {
            const m = byId[r.id]
            const fill = m ? (m.kind === 'dor' ? LEVEL_COLOR[m.level] : `url(#hatch-${m.level})`) : BASE_FILL
            return (
              <path
                key={r.id}
                id={r.id}
                data-region={r.id}
                d={shapePath(r.shape)}
                fill={fill}
                stroke={STROKE}
                strokeWidth={1.1}
                strokeLinejoin="round"
                className={cx(!readOnly && 'cursor-pointer transition-[fill] duration-150', !readOnly && !m && 'hover:[fill:#E2DFD9]')}
                onClick={() => apply(r.id)}
                tabIndex={readOnly ? -1 : 0}
                role={readOnly ? undefined : 'button'}
                aria-label={regionLabel(r.id)}
                aria-pressed={readOnly ? undefined : !!m}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), apply(r.id))}
              >
                <title>{regionLabel(r.id)}{m ? ` · ${m.level} · ${KIND_TEXT[m.kind]}` : ''}</title>
              </path>
            )
          })}

          <g pointerEvents="none" stroke="#6f6b66" strokeWidth=".7" fill="none" opacity=".75">
            {DETAIL[view].map((d, i) => <path key={i} d={d} />)}
          </g>
          {view === 'anterior' && (
            <g pointerEvents="none" fill="#6f6b66">
              <ellipse cx="102" cy="33" rx="2.2" ry="1.4" /><ellipse cx="118" cy="33" rx="2.2" ry="1.4" />
              <path d="M104,47 Q110,50 116,47" stroke="#6f6b66" strokeWidth=".9" fill="none" />
            </g>
          )}
          <g fontSize="11" fontWeight="700" fill="#8d8a85" fontFamily="Figtree, sans-serif" pointerEvents="none">
            <text x="22" y="436">{view === 'anterior' ? 'D' : 'E'}</text>
            <text x="190" y="436">{view === 'anterior' ? 'E' : 'D'}</text>
          </g>
        </svg>
      </figure>
    )
  }

  const sorted = [...marks].sort((a, b) => (a.level === b.level ? regionLabel(a.regionId).localeCompare(regionLabel(b.regionId)) : a.level === 'vermelho' ? -1 : 1))

  return (
    <div>
      {title && !readOnly && (
        <div className="mb-4">
          <h3 className="text-xl">Identifique as regiões que precisam de atenção</h3>
          <p className="text-sm text-bark-500 mt-1">Escolha a cor e o tipo de indicação e toque nas regiões do corpo. Toque de novo para desmarcar.</p>
        </div>
      )}

      {!readOnly && (
        <div className="card p-3 sm:p-4 mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(['vermelho', 'amarelo'] as MarkLevel[]).map((l) => (
              <button
                type="button"
                key={l}
                onClick={() => { setLevel(l); setEraser(false) }}
                className={cx(
                  'flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition',
                  level === l && !eraser ? 'border-bark-900 bg-white' : 'border-transparent bg-linen-100 text-bark-700',
                )}
                aria-pressed={level === l && !eraser}
              >
                <span className="w-4 h-4 rounded-full" style={{ background: LEVEL_COLOR[l] }} />
                {l === 'vermelho' ? 'Vermelho' : 'Amarelo'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setEraser((e) => !e)}
              className={cx('flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition', eraser ? 'border-bark-900 bg-white' : 'border-transparent bg-linen-100 text-bark-700')}
              aria-pressed={eraser}
            >
              <Eraser size={16} /> Borracha
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-bark-500 uppercase tracking-wide">Tipo:</span>
            <Segmented size="sm" value={kind} onChange={(k) => { setKind(k); setEraser(false) }} options={[{ value: 'dor', label: 'Dor ou desconforto' }, { value: 'atencao', label: 'Mais atenção, sem dor' }]} />
          </div>
        </div>
      )}

      <Legend />

      <div className="sm:hidden flex justify-center my-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'anterior', label: 'Frente' }, { value: 'posterior', label: 'Costas' }]} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-8 items-start py-2">
        <div className={cx(tab !== 'anterior' && 'hidden sm:block')}>{figure('anterior')}</div>
        <div className={cx(tab !== 'posterior' && 'hidden sm:block')}>{figure('posterior')}</div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-bark-700 mb-2">Regiões marcadas ({marks.length})</h4>
        {marks.length === 0 ? (
          <p className="text-sm text-bark-500">Nenhuma região marcada.</p>
        ) : (
          <ul className="divide-y divide-linen-200 card overflow-hidden">
            {sorted.map((m) => (
              <li key={m.regionId} className="px-3 py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-black/10"
                    style={{ background: m.kind === 'dor' ? LEVEL_COLOR[m.level] : `repeating-linear-gradient(45deg, ${LEVEL_COLOR[m.level]} 0 3px, #fff 3px 6px)` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-bark-900">{regionLabel(m.regionId)}</div>
                    <div className="text-xs text-bark-500">
                      {m.view === 'anterior' ? 'Frente' : 'Costas'} · {m.side === 'central' ? 'Central' : m.side === 'direito' ? 'Lado direito' : 'Lado esquerdo'} · {m.level === 'vermelho' ? 'Vermelho' : 'Amarelo'} · {KIND_TEXT[m.kind]}
                      {readOnly && <> · {fmtDate(m.markedAt)}</>}
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1">
                      <button type="button" className="btn-ghost !p-2" onClick={() => setEditing(editing === m.regionId ? null : m.regionId)} aria-label="Editar"><Pencil size={15} /></button>
                      <button type="button" className="btn-ghost !p-2 text-red-700" onClick={() => onChange!(marks.filter((x) => x.regionId !== m.regionId))} aria-label="Remover"><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
                {editing === m.regionId && !readOnly && (
                  <div className="mt-2 ml-7 flex flex-wrap gap-2">
                    <Segmented size="sm" value={m.level} onChange={(l) => update(m.regionId, { level: l })} options={[{ value: 'vermelho', label: 'Vermelho' }, { value: 'amarelo', label: 'Amarelo' }]} />
                    <Segmented size="sm" value={m.kind} onChange={(k) => update(m.regionId, { kind: k })} options={[{ value: 'dor', label: 'Dor' }, { value: 'atencao', label: 'Atenção' }]} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function Legend() {
  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-bark-700 bg-linen-50 border border-linen-200 rounded-xl p-3">
      {(['vermelho', 'amarelo'] as MarkLevel[]).map((l) => (
        <div key={l} className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full" style={{ background: LEVEL_COLOR[l] }} /><b>{l === 'vermelho' ? 'Vermelho' : 'Amarelo'}:</b> {LEVEL_TEXT[l]}</div>
      ))}
      <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm bg-bark-500" /> Preenchido: dor ou desconforto</div>
      <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm" style={{ background: 'repeating-linear-gradient(45deg,#6E5443 0 2px,#fff 2px 4px)' }} /> Listrado: quer mais atenção, sem dor</div>
      <p className="sm:col-span-2 text-[11px] text-bark-500 mt-1">As cores indicam a intensidade ou prioridade que você percebe. Não são um diagnóstico clínico.</p>
    </div>
  )
}
