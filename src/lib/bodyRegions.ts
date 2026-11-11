import type { Side, View } from './types'

// Geometria do mapa corporal (viewBox 0 0 220 440).
// Os formatos são desenhados do lado esquerdo da tela e espelhados.
// Vista anterior: lado esquerdo da tela = lado DIREITO da pessoa.
// Vista posterior: lado esquerdo da tela = lado ESQUERDO da pessoa.

export type Shape =
  | { type: 'poly'; pts: [number, number][] }
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }

export interface RegionDef {
  id: string
  view: View
  key: string
  name: string // nome base, ex.: "Ombro"
  feminine: boolean
  side: Side
  shape: Shape
  layer: number // ordem de desenho (maior = por cima)
}

export const VIEWBOX = { w: 220, h: 440 }
const mirror = (pts: [number, number][]): [number, number][] => pts.map(([x, y]) => [VIEWBOX.w - x, y])

const defs: RegionDef[] = []

function central(view: View, key: string, name: string, feminine: boolean, shape: Shape, layer = 1) {
  defs.push({ id: `${view}.${key}`, view, key, name, feminine, side: 'central', shape, layer })
}

function bilateral(view: View, key: string, name: string, feminine: boolean, pts: [number, number][], layer = 1) {
  const screenLeft: Side = view === 'anterior' ? 'direito' : 'esquerdo'
  const screenRight: Side = screenLeft === 'direito' ? 'esquerdo' : 'direito'
  const code = (s: Side) => (s === 'direito' ? 'dir' : 'esq')
  defs.push({ id: `${view}.${key}.${code(screenLeft)}`, view, key, name, feminine, side: screenLeft, shape: { type: 'poly', pts }, layer })
  defs.push({ id: `${view}.${key}.${code(screenRight)}`, view, key, name, feminine, side: screenRight, shape: { type: 'poly', pts: mirror(pts) }, layer })
}

// Membros compartilhados entre as vistas
const ARM: [number, number][] = [[57, 112], [74, 120], [73, 148], [69, 172], [52, 172], [49, 146], [51, 126]]
const FOREARM: [number, number][] = [[52, 176], [69, 176], [66, 204], [59, 232], [46, 232], [43, 205]]
const HAND: [number, number][] = [[46, 236], [59, 236], [61, 252], [57, 268], [48, 270], [42, 258], [42, 245]]
const SHOULDER: [number, number][] = [[64, 92], [79, 88], [83, 99], [77, 119], [64, 122], [55, 111], [56, 99]]
const KNEE: [number, number][] = [[86, 304], [103, 302], [104, 322], [87, 324]]

// ---------- Vista anterior ----------
central('anterior', 'cabeca', 'Cabeça', true, { type: 'ellipse', cx: 110, cy: 36, rx: 20, ry: 25 })
central('anterior', 'cervical', 'Região cervical', true, { type: 'poly', pts: [[100, 58], [120, 58], [122, 80], [98, 80]] })
bilateral('anterior', 'trapezio', 'Trapézio superior', false, [[98, 70], [98, 82], [80, 87], [64, 91], [71, 83], [87, 77]], 2)
bilateral('anterior', 'ombro', 'Ombro', false, SHOULDER, 2)
bilateral('anterior', 'peitoral', 'Peitoral', false, [[83, 89], [109, 91], [109, 126], [95, 132], [83, 126], [78, 110]])
bilateral('anterior', 'braco', 'Braço', false, ARM)
bilateral('anterior', 'antebraco', 'Antebraço', false, FOREARM)
bilateral('anterior', 'mao', 'Mão', true, HAND)
central('anterior', 'abdomen', 'Abdômen', false, {
  type: 'poly',
  pts: [[82, 130], [96, 135], [110, 134], [124, 135], [138, 130], [140, 160], [136, 189], [110, 195], [84, 189], [80, 160]],
})
bilateral('anterior', 'quadril', 'Quadril', false, [[84, 192], [109, 198], [109, 222], [96, 226], [80, 221], [78, 205]])
bilateral('anterior', 'coxa', 'Coxa', true, [[80, 225], [96, 229], [108, 227], [106, 260], [103, 299], [86, 301], [80, 270], [77, 245]])
bilateral('anterior', 'joelho', 'Joelho', false, KNEE)
bilateral('anterior', 'perna', 'Perna', true, [[87, 327], [103, 325], [103, 358], [100, 389], [90, 389], [86, 358]])
bilateral('anterior', 'tornozelo', 'Tornozelo', false, [[90, 392], [100, 392], [101, 403], [89, 403]])
bilateral('anterior', 'pe', 'Pé', false, [[88, 406], [101, 406], [104, 419], [102, 430], [83, 430], [84, 417]])

// ---------- Vista posterior ----------
central('posterior', 'cervical', 'Região cervical', true, { type: 'poly', pts: [[100, 58], [120, 58], [121, 78], [99, 78]] }, 3)
central('posterior', 'dorsal', 'Região dorsal', true, { type: 'poly', pts: [[80, 116], [140, 116], [141, 145], [138, 167], [82, 167], [79, 145]] }, 1)
bilateral('posterior', 'trapezio', 'Trapézio', false, [[100, 68], [110, 68], [110, 118], [97, 104], [84, 93], [66, 90], [80, 82], [95, 76]], 2)
bilateral('posterior', 'escapula', 'Escápula', true, [[86, 99], [105, 107], [104, 128], [93, 140], [84, 132], [82, 113]], 3)
bilateral('posterior', 'ombro', 'Ombro', false, SHOULDER, 3)
central('posterior', 'lombar', 'Região lombar', true, { type: 'poly', pts: [[82, 170], [138, 170], [140, 196], [110, 200], [80, 196]] })
bilateral('posterior', 'gluteo', 'Glúteo', false, [[80, 199], [109, 203], [109, 240], [96, 246], [82, 240], [77, 220]])
bilateral('posterior', 'braco', 'Braço', false, ARM)
bilateral('posterior', 'antebraco', 'Antebraço', false, FOREARM)
bilateral('posterior', 'mao', 'Mão', true, HAND)
bilateral('posterior', 'coxa', 'Posterior da coxa', false, [[80, 245], [96, 250], [108, 247], [106, 270], [103, 299], [86, 301], [80, 275]])
bilateral('posterior', 'joelho', 'Joelho (posterior)', false, KNEE)
bilateral('posterior', 'panturrilha', 'Panturrilha', true, [[87, 327], [103, 325], [105, 350], [100, 377], [90, 377], [85, 350]])
bilateral('posterior', 'calcaneo', 'Tendão calcâneo', false, [[91, 380], [99, 380], [99, 402], [91, 402]])
bilateral('posterior', 'pe', 'Pé', false, [[88, 405], [102, 405], [103, 418], [100, 429], [88, 429], [86, 418]])

export const REGIONS: RegionDef[] = defs
export const REGION_BY_ID: Record<string, RegionDef> = Object.fromEntries(defs.map((d) => [d.id, d]))

export function regionLabel(id: string, withView = false) {
  const r = REGION_BY_ID[id]
  if (!r) return id
  let s = r.name
  if (r.side !== 'central') s += ' ' + (r.side === 'direito' ? (r.feminine ? 'direita' : 'direito') : r.feminine ? 'esquerda' : 'esquerdo')
  if (withView) s += ` (${r.view === 'anterior' ? 'frente' : 'costas'})`
  return s
}

/** Converte polígono em caminho suave (Catmull-Rom fechado). */
export function smoothPath(pts: [number, number][], tension = 0.35) {
  const n = pts.length
  const p = (i: number) => pts[(i + n) % n]
  let d = `M${p(0)[0]},${p(0)[1]}`
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2)
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 2, p1[1] + ((p2[1] - p0[1]) * tension) / 2]
    const c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 2, p2[1] - ((p3[1] - p1[1]) * tension) / 2]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`
  }
  return d + 'Z'
}

export function shapePath(s: Shape) {
  if (s.type === 'ellipse') {
    const { cx, cy, rx, ry } = s
    return `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0Z`
  }
  return smoothPath(s.pts)
}
