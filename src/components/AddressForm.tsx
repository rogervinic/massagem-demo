import type { Address } from '../lib/types'

export const emptyAddress = (): Address => ({ street: '', number: '', complement: '', district: '', city: 'Natal/RN', reference: '' })

export default function AddressForm({ value, onChange }: { value: Address; onChange: (a: Address) => void }) {
  const set = (k: keyof Address, v: string) => onChange({ ...value, [k]: v })
  return (
    <div className="grid grid-cols-6 gap-3">
      <label className="col-span-6 sm:col-span-4"><span className="label">Rua / avenida</span><input className="input" value={value.street} onChange={(e) => set('street', e.target.value)} /></label>
      <label className="col-span-2"><span className="label">Número</span><input className="input" value={value.number} onChange={(e) => set('number', e.target.value)} /></label>
      <label className="col-span-4 sm:col-span-2"><span className="label">Complemento</span><input className="input" value={value.complement ?? ''} onChange={(e) => set('complement', e.target.value)} placeholder="Apto, bloco…" /></label>
      <label className="col-span-6 sm:col-span-2"><span className="label">Bairro</span><input className="input" value={value.district} onChange={(e) => set('district', e.target.value)} /></label>
      <label className="col-span-6 sm:col-span-2"><span className="label">Cidade</span><input className="input" value={value.city} onChange={(e) => set('city', e.target.value)} /></label>
      <label className="col-span-6"><span className="label">Ponto de referência</span><input className="input" value={value.reference ?? ''} onChange={(e) => set('reference', e.target.value)} placeholder="Opcional" /></label>
    </div>
  )
}
