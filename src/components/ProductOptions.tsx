import type { Product } from '../types/product';
export function ProductOptions({ product, values, onChange }: { product: Product; values: Record<string, string>; onChange: (values: Record<string, string>) => void }) {
  return <>{product.personalizacoes?.map(field => <label className="option-field" key={field.id}>
    {field.label} {field.required ? '(obrigatório)' : '(opcional)'}
    {field.options ? <select required={field.required} value={values[field.id] || ''} onChange={e => onChange({ ...values, [field.id]: e.target.value })}><option value="">Selecione</option>{field.options.map(option => <option key={option}>{option}</option>)}</select>
      : <textarea required={field.required} maxLength={field.maxLength} rows={2} value={values[field.id] || ''} onChange={e => onChange({ ...values, [field.id]: e.target.value })} />}
    {field.maxLength ? <small>Até {field.maxLength} caracteres.</small> : null}
  </label>)}</>;
}
