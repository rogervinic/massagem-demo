import type { ReactNode } from 'react'
import type { AnamnesisAnswers } from '../lib/types'
import { regionLabel } from '../lib/bodyRegions'

export const CONDITIONS = [
  { value: 'hipertensao', label: 'Hipertensão arterial' },
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'cardiaco', label: 'Problemas cardíacos' },
  { value: 'circulatorio', label: 'Problemas circulatórios' },
  { value: 'nenhuma', label: 'Nenhuma das opções' },
  { value: 'outra', label: 'Outra condição' },
]
export const SKIN = [
  { value: 'feridas', label: 'Feridas ou lesões na pele' },
  { value: 'irritacoes', label: 'Irritações cutâneas' },
  { value: 'infeccoes', label: 'Infecções na pele' },
  { value: 'manchas', label: 'Manchas ou alterações que precisam de atenção' },
  { value: 'nenhuma', label: 'Nenhuma das opções' },
  { value: 'outra', label: 'Outra condição' },
]
export const GOALS = [
  { value: 'relaxamento', label: 'Relaxamento' },
  { value: 'alivio', label: 'Alívio de dores e desconfortos' },
  { value: 'tensoes', label: 'Redução de tensões musculares' },
  { value: 'bemestar', label: 'Bem-estar geral' },
  { value: 'outro', label: 'Outro' },
]
export const PRESSURE = [
  { value: 'leve', label: 'Leve' },
  { value: 'moderada', label: 'Moderada' },
  { value: 'intensa', label: 'Intensa' },
  { value: 'naosei', label: 'Ainda não sei' },
]
export const YESNO = [{ value: 'sim' as const, label: 'Sim' }, { value: 'nao' as const, label: 'Não' }]

const lbl = (list: { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v
const yn = (v: string) => (v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : v === 'na' ? 'Não se aplica' : '—')

function Row({ k, children, alert }: { k: string; children: ReactNode; alert?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-[220px_1fr] gap-x-4 gap-y-0.5 py-2 border-b border-linen-100 last:border-0">
      <dt className="text-xs sm:text-sm text-bark-500">{k}</dt>
      <dd className={alert ? 'text-sm font-semibold text-clay-600' : 'text-sm text-bark-900'}>{children || '—'}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-sage-600 mb-1">{title}</h4>
      <dl>{children}</dl>
    </section>
  )
}

export default function AnamnesisView({ a }: { a: AnamnesisAnswers }) {
  const conds = a.conditions.map((c) => lbl(CONDITIONS, c)).join(', ')
  const skin = a.skin.map((c) => lbl(SKIN, c)).join(', ')
  return (
    <div>
      <Section title="1 · Informações gerais">
        <Row k="Nome completo">{a.fullName}</Row>
        <Row k="Idade">{a.age}</Row>
        <Row k="Profissão">{a.profession}</Row>
        <Row k="O que busca com a massagem">{a.mainGoalText}</Row>
      </Section>
      <Section title="2 · Histórico de saúde">
        <Row k="Condições" alert={a.conditions.some((c) => c !== 'nenhuma')}>{conds}{a.conditionsOther && ` · ${a.conditionsOther}`}</Row>
        <Row k="Medicamentos contínuos" alert={a.continuousMeds === 'sim'}>{yn(a.continuousMeds)}{a.medsDetail && ` · ${a.medsDetail}`}</Row>
        <Row k="Alergias" alert={a.allergies === 'sim'}>{yn(a.allergies)}{a.allergiesDetail && ` · ${a.allergiesDetail}`}</Row>
      </Section>
      <Section title="3 · Condições da pele">
        <Row k="Condições atuais" alert={a.skin.some((c) => c !== 'nenhuma')}>{skin}{a.skinOther && ` · ${a.skinOther}`}</Row>
        <Row k="Sensibilidade a produtos" alert={a.productSensitivity === 'sim'}>{yn(a.productSensitivity)}{a.productSensitivityDetail && ` · ${a.productSensitivityDetail}`}</Row>
      </Section>
      <Section title="4 · Musculoesquelético">
        <Row k="Dores ou desconfortos">{yn(a.pain)}</Row>
        <Row k="Lesão diagnosticada" alert={a.injury === 'sim'}>{yn(a.injury)}{a.injuryDetail && ` · ${a.injuryDetail}`}</Row>
        <Row k="Limitação de movimento" alert={a.mobilityLimit === 'sim'}>{yn(a.mobilityLimit)}{a.mobilityDetail && ` · ${a.mobilityDetail}`}</Row>
      </Section>
      <Section title="5 · Mapa corporal">
        <Row k="Regiões marcadas">{a.marks.length ? `${a.marks.length} região(ões): ` + a.marks.map((m) => regionLabel(m.regionId)).join(', ') : 'Nenhuma'}</Row>
      </Section>
      <Section title="6 · Preferências">
        <Row k="Gestante" alert={a.pregnant === 'sim'}>{yn(a.pregnant)}</Row>
        <Row k="Regiões para evitar" alert={a.avoidRegions === 'sim'}>
          {yn(a.avoidRegions)}
          {a.avoidRegionIds.length > 0 && ` · ${a.avoidRegionIds.map((r) => regionLabel(r, true)).join(', ')}`}
          {a.avoidText && ` · ${a.avoidText}`}
        </Row>
        <Row k="Objetivo principal">{a.goal ? lbl(GOALS, a.goal) : ''}{a.goalOther && ` · ${a.goalOther}`}</Row>
        <Row k="Pressão preferida">{a.pressure ? lbl(PRESSURE, a.pressure) : ''}</Row>
        <Row k="Informações adicionais">{a.extraInfo}</Row>
      </Section>
    </div>
  )
}
