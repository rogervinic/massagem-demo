import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from 'lucide-react'
import { useStore } from '../../lib/store'
import * as api from '../../lib/api'
import type { AnamnesisAnswers } from '../../lib/types'
import { emptyAnswers } from '../../lib/seed'
import { REGIONS, regionLabel } from '../../lib/bodyRegions'
import BodyMap from '../../components/BodyMap'
import AnamnesisView, { CONDITIONS, GOALS, PRESSURE, SKIN, YESNO } from '../../components/AnamnesisView'
import { Choice, MultiChoice, attempt, toast } from '../../components/ui'
import { cx, fmtDate } from '../../lib/util'

const STEPS = ['Informações gerais', 'Histórico de saúde', 'Pele', 'Musculoesquelético', 'Mapa corporal', 'Preferências', 'Revisão e envio']

function Q({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <div className="py-4 border-b border-linen-100 last:border-0">
      <p className="font-medium text-bark-900 mb-1">{title}</p>
      {hint && <p className="text-xs text-bark-500 mb-2">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  )
}

function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null
  return <div className="fade-in mt-3">{children}</div>
}

export default function Anamnesis() {
  const { db, session, run } = useStore()
  const nav = useNavigate()
  const latest = api.myAnamnesis(db, session!)
  const client = api.myClient(db, session!)
  const draftKey = `salvia-anamnese-rascunho-${client.id}`

  const [a, setA] = useState<AnamnesisAnswers>(() => {
    try {
      const d = localStorage.getItem(draftKey)
      if (d) return JSON.parse(d)
    } catch { /* ignora */ }
    if (latest) return structuredClone(latest.answers)
    const age = client.birthDate ? String(Math.floor((Date.now() - new Date(client.birthDate).getTime()) / 31557600000)) : ''
    return { ...emptyAnswers(), fullName: client.name, age }
  })
  const [step, setStep] = useState(0)
  const [consent, setConsent] = useState(false)
  const [editing, setEditing] = useState(!latest)

  useEffect(() => {
    if (!editing) return
    try { localStorage.setItem(draftKey, JSON.stringify(a)) } catch { /* ignora */ }
  }, [a, editing, draftKey])

  const set = <K extends keyof AnamnesisAnswers>(k: K, v: AnamnesisAnswers[K]) => setA((x) => ({ ...x, [k]: v }))

  const validate = (i: number): string | null => {
    if (i === 0 && !a.fullName.trim()) return 'Informe seu nome completo.'
    if (i === 1) {
      if (!a.conditions.length) return 'Marque ao menos uma opção sobre condições de saúde.'
      if (a.conditions.includes('outra') && !a.conditionsOther.trim()) return 'Especifique a outra condição.'
      if (!a.continuousMeds || !a.allergies) return 'Responda sobre medicamentos e alergias.'
      if (a.continuousMeds === 'sim' && !a.medsDetail.trim()) return 'Informe quais medicamentos.'
      if (a.allergies === 'sim' && !a.allergiesDetail.trim()) return 'Especifique a alergia.'
    }
    if (i === 2) {
      if (!a.skin.length) return 'Marque ao menos uma opção sobre a pele.'
      if (a.skin.includes('outra') && !a.skinOther.trim()) return 'Especifique a outra condição da pele.'
      if (!a.productSensitivity) return 'Responda sobre sensibilidade a produtos.'
      if (a.productSensitivity === 'sim' && !a.productSensitivityDetail.trim()) return 'Especifique a sensibilidade.'
    }
    if (i === 3) {
      if (!a.pain || !a.injury || !a.mobilityLimit) return 'Responda as três perguntas.'
      if (a.injury === 'sim' && !a.injuryDetail.trim()) return 'Especifique a lesão.'
      if (a.mobilityLimit === 'sim' && !a.mobilityDetail.trim()) return 'Especifique a limitação.'
    }
    if (i === 4 && a.pain === 'sim' && !a.marks.some((m) => m.kind === 'dor'))
      return 'Você informou que sente dor: marque no mapa pelo menos uma região como "Dor ou desconforto".'
    if (i === 5) {
      if (!a.pregnant || !a.avoidRegions || !a.goal || !a.pressure) return 'Responda as perguntas de preferências.'
      if (a.avoidRegions === 'sim' && !a.avoidRegionIds.length && !a.avoidText.trim()) return 'Selecione ou descreva as regiões a evitar.'
      if (a.goal === 'outro' && !a.goalOther.trim()) return 'Descreva seu objetivo.'
    }
    return null
  }

  const next = () => {
    const err = validate(step)
    if (err) return toast(err, 'err')
    setStep((s) => Math.min(6, s + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const back = () => { setStep((s) => Math.max(0, s - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const submit = () => {
    for (let i = 0; i < 6; i++) {
      const err = validate(i)
      if (err) { setStep(i); return toast(err, 'err') }
    }
    const ok = attempt(() => run((db) => api.submitAnamnesis(db, session!, a, consent)), 'Anamnese enviada. Obrigado!')
    if (ok) {
      try { localStorage.removeItem(draftKey) } catch { /* ignora */ }
      setEditing(false)
      nav('/cliente')
    }
  }

  if (!editing && latest) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl">Minha anamnese</h1>
            <p className="text-sm text-bark-500 mt-1">Versão {latest.version} · atualizada em {fmtDate(latest.submittedAt)} · consentimento {latest.consentVersion}</p>
          </div>
          <button className="btn-primary" onClick={() => { setA(structuredClone(latest.answers)); setStep(0); setConsent(false); setEditing(true) }}>Atualizar informações</button>
        </div>
        <div className="card p-5 mb-6"><AnamnesisView a={latest.answers} /></div>
        <div className="card p-5"><BodyMap marks={latest.answers.marks} title={false} /></div>
      </div>
    )
  }

  const regionsForAvoid = (view: 'anterior' | 'posterior') => REGIONS.filter((r) => r.view === view)

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl">Anamnese</h1>
      <p className="text-sm text-bark-500 mt-1 mb-5">Leva uns 5 minutos. Suas respostas ficam salvas como rascunho enquanto você preenche.</p>

      {/* progresso */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-bark-500 mb-2">
          <span>Etapa {step + 1} de 7 · <b className="text-bark-700">{STEPS[step]}</b></span>
          <span>{Math.round(((step + 1) / 7) * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-linen-200 overflow-hidden">
          <div className="h-full bg-sage-500 transition-all duration-500" style={{ width: `${((step + 1) / 7) * 100}%` }} />
        </div>
        <div className="hidden sm:flex gap-1 mt-3">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => i < step && setStep(i)} className={cx('flex-1 text-[11px] py-1 rounded-md transition', i === step ? 'bg-sage-100 text-sage-700 font-semibold' : i < step ? 'text-bark-700 hover:bg-linen-200' : 'text-bark-500/60 cursor-default')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5 sm:p-6 fade-in" key={step}>
        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="sm:col-span-2"><span className="label">Nome completo</span><input className="input" value={a.fullName} onChange={(e) => set('fullName', e.target.value)} /></label>
            <label><span className="label">Idade</span><input className="input" inputMode="numeric" value={a.age} onChange={(e) => set('age', e.target.value.replace(/\D/g, '').slice(0, 3))} /></label>
            <label><span className="label">Profissão</span><input className="input" value={a.profession} onChange={(e) => set('profession', e.target.value)} /></label>
            <label className="sm:col-span-2"><span className="label">O que te levou a procurar a massagem?</span><input className="input" placeholder="Ex.: dores nas costas depois do trabalho" value={a.mainGoalText} onChange={(e) => set('mainGoalText', e.target.value)} /></label>
          </div>
        )}

        {step === 1 && (
          <>
            <Q title="Possui alguma das seguintes condições?" hint="Marque todas que se aplicam.">
              <MultiChoice value={a.conditions} onChange={(v) => set('conditions', v)} options={CONDITIONS} exclusive="nenhuma" />
              <Reveal show={a.conditions.includes('outra')}><input className="input" placeholder="Qual condição?" value={a.conditionsOther} onChange={(e) => set('conditionsOther', e.target.value)} /></Reveal>
            </Q>
            <Q title="Faz uso contínuo de medicamentos?">
              <Choice name="medicamentos" value={a.continuousMeds} onChange={(v) => set('continuousMeds', v)} options={YESNO} />
              <Reveal show={a.continuousMeds === 'sim'}><input className="input" placeholder="Quais?" value={a.medsDetail} onChange={(e) => set('medsDetail', e.target.value)} /></Reveal>
            </Q>
            <Q title="Possui alguma alergia conhecida?">
              <Choice name="alergias" value={a.allergies} onChange={(v) => set('allergies', v)} options={YESNO} />
              <Reveal show={a.allergies === 'sim'}><input className="input" placeholder="Especifique" value={a.allergiesDetail} onChange={(e) => set('allergiesDetail', e.target.value)} /></Reveal>
            </Q>
          </>
        )}

        {step === 2 && (
          <>
            <Q title="Apresenta alguma das seguintes condições na pele atualmente?">
              <MultiChoice value={a.skin} onChange={(v) => set('skin', v)} options={SKIN} exclusive="nenhuma" />
              <Reveal show={a.skin.includes('outra') || a.skin.some((s) => s !== 'nenhuma' && s !== 'outra')}>
                <input className="input" placeholder="Especifique (local, há quanto tempo…)" value={a.skinOther} onChange={(e) => set('skinOther', e.target.value)} />
              </Reveal>
            </Q>
            <Q title="Tem alergia ou sensibilidade a produtos usados em massagem, como óleos, cremes ou cosméticos?">
              <Choice name="sensibilidade" value={a.productSensitivity} onChange={(v) => set('productSensitivity', v)} options={YESNO} />
              <Reveal show={a.productSensitivity === 'sim'}><input className="input" placeholder="Especifique" value={a.productSensitivityDetail} onChange={(e) => set('productSensitivityDetail', e.target.value)} /></Reveal>
            </Q>
          </>
        )}

        {step === 3 && (
          <>
            <Q title="Sente dores ou desconfortos em alguma região do corpo?" hint="Se sim, você vai marcar as regiões no mapa da próxima etapa.">
              <Choice name="dor" value={a.pain} onChange={(v) => set('pain', v)} options={YESNO} />
            </Q>
            <Q title="Possui alguma lesão muscular ou articular diagnosticada?">
              <Choice name="lesao" value={a.injury} onChange={(v) => set('injury', v)} options={YESNO} />
              <Reveal show={a.injury === 'sim'}><input className="input" placeholder="Especifique" value={a.injuryDetail} onChange={(e) => set('injuryDetail', e.target.value)} /></Reveal>
            </Q>
            <Q title="Apresenta alguma limitação de movimento?">
              <Choice name="limitacao" value={a.mobilityLimit} onChange={(v) => set('mobilityLimit', v)} options={YESNO} />
              <Reveal show={a.mobilityLimit === 'sim'}><input className="input" placeholder="Especifique" value={a.mobilityDetail} onChange={(e) => set('mobilityDetail', e.target.value)} /></Reveal>
            </Q>
          </>
        )}

        {step === 4 && (
          <>
            {a.pain === 'sim' && (
              <div className="mb-4 rounded-xl bg-[#F3E7DA] text-clay-600 text-sm px-4 py-3">Você informou que sente dor. Marque ao menos uma região como <b>Dor ou desconforto</b>.</div>
            )}
            <BodyMap marks={a.marks} onChange={(m) => set('marks', m)} />
          </>
        )}

        {step === 5 && (
          <>
            <Q title="Está gestante?">
              <Choice name="gestante" value={a.pregnant} onChange={(v) => set('pregnant', v)} options={[...YESNO, { value: 'na' as const, label: 'Não se aplica' }]} />
            </Q>
            <Q title="Existe alguma região do corpo que não deseja receber massagem?">
              <Choice name="evitar" value={a.avoidRegions} onChange={(v) => set('avoidRegions', v)} options={YESNO} />
              <Reveal show={a.avoidRegions === 'sim'}>
                {(['anterior', 'posterior'] as const).map((view) => (
                  <div key={view} className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-bark-500 mb-2">{view === 'anterior' ? 'Frente' : 'Costas'}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {regionsForAvoid(view).map((r) => {
                        const on = a.avoidRegionIds.includes(r.id)
                        return (
                          <button type="button" key={r.id} onClick={() => set('avoidRegionIds', on ? a.avoidRegionIds.filter((x) => x !== r.id) : [...a.avoidRegionIds, r.id])}
                            className={cx('rounded-full border px-3 py-1 text-xs font-medium transition', on ? 'bg-bark-700 border-bark-700 text-white' : 'bg-white border-linen-300 text-bark-700 hover:border-bark-500')}>
                            {regionLabel(r.id)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <input className="input" placeholder="Ou descreva por escrito" value={a.avoidText} onChange={(e) => set('avoidText', e.target.value)} />
              </Reveal>
            </Q>
            <Q title="Qual é o seu principal objetivo com a massagem?">
              <Choice name="objetivo" value={a.goal} onChange={(v) => set('goal', v)} options={GOALS} />
              <Reveal show={a.goal === 'outro'}><input className="input" placeholder="Qual?" value={a.goalOther} onChange={(e) => set('goalOther', e.target.value)} /></Reveal>
            </Q>
            <Q title="Qual intensidade de pressão prefere?">
              <Choice name="pressao" value={a.pressure} onChange={(v) => set('pressure', v)} options={PRESSURE} />
            </Q>
            <Q title="Quer acrescentar alguma informação importante sobre sua saúde ou sobre o atendimento?">
              <textarea className="input min-h-[96px]" value={a.extraInfo} onChange={(e) => set('extraInfo', e.target.value)} placeholder="Opcional" />
            </Q>
          </>
        )}

        {step === 6 && (
          <>
            <h3 className="text-xl mb-1">Revise suas respostas</h3>
            <p className="text-sm text-bark-500 mb-4">Se algo estiver errado, volte e corrija antes de enviar.</p>
            <AnamnesisView a={a} />
            <div className="flex flex-wrap gap-2 mb-6">
              {STEPS.slice(0, 6).map((s, i) => <button key={s} className="btn-secondary !py-1.5 !text-xs" onClick={() => setStep(i)}>Editar: {s}</button>)}
            </div>
            <div className="rounded-2xl border border-sage-200 bg-sage-100/40 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="text-sage-600 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-bark-700 space-y-2">
                  <p className="font-semibold text-bark-900">Consentimento para tratamento de dados de saúde (LGPD)</p>
                  <p>As informações desta anamnese são dados pessoais sensíveis (art. 11 da Lei 13.709/2018). Elas serão usadas apenas para planejar e realizar seus atendimentos com segurança, ficam acessíveis somente à profissional responsável e não são compartilhadas com terceiros.</p>
                  <p>Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento, respeitados os prazos legais de guarda. Versão do termo: <b>{api.CONSENT_VERSION}</b>.</p>
                  <label className="flex items-start gap-2 pt-1 cursor-pointer">
                    <input type="checkbox" className="mt-1 w-4 h-4 accent-[#5B6E50]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    <span>Li e concordo com o tratamento dos meus dados de saúde para essa finalidade.</span>
                  </label>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between mt-5 gap-3">
        {step > 0 ? <button className="btn-secondary" onClick={back}><ArrowLeft size={16} /> Voltar</button> : latest ? <button className="btn-ghost" onClick={() => setEditing(false)}>Cancelar</button> : <span />}
        {step < 6 ? (
          <button className="btn-primary" onClick={next}>Continuar <ArrowRight size={16} /></button>
        ) : (
          <button className="btn-primary" disabled={!consent} onClick={submit}><Check size={16} /> Enviar anamnese</button>
        )}
      </div>
    </div>
  )
}
