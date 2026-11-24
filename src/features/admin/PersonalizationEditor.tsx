import type { PersonalizationField } from '../../types/product';

interface PersonalizationEditorProps {
  fields: PersonalizationField[];
  onChange: (fields: PersonalizationField[]) => void;
}

export function PersonalizationEditor({ fields, onChange }: PersonalizationEditorProps) {
  function update(index: number, changes: Partial<PersonalizationField>) {
    onChange(fields.map((field, position) => position === index ? { ...field, ...changes } : field));
  }

  return (
    <fieldset className="editor-section">
      <legend>Campos de personalização</legend>
      <p>Cadastre somente opções oferecidas pela loja. Limites de texto são opcionais.</p>
      {fields.map((field, index) => (
        <div className="admin-personalization" key={index}>
          <label className="option-field">Identificador
            <input required value={field.id} onChange={event => update(index, { id: event.target.value })} />
          </label>
          <label className="option-field">Rótulo
            <input required value={field.label} onChange={event => update(index, { label: event.target.value })} />
          </label>
          <label>
            <input type="checkbox" checked={field.required || false} onChange={event => update(index, { required: event.target.checked })} /> Obrigatório
          </label>
          <label className="option-field">Limite de caracteres
            <input type="number" min="1" step="1" value={field.maxLength ?? ''} onChange={event => update(index, { maxLength: event.target.value ? Number(event.target.value) : undefined })} />
          </label>
          <label className="option-field">Opções (uma por linha; vazio para texto livre)
            <textarea value={field.options?.join('\n') || ''} onChange={event => update(index, { options: event.target.value ? event.target.value.split('\n') : undefined })} />
          </label>
          <button type="button" className="btn btn--ghost" onClick={() => onChange(fields.filter((_, position) => position !== index))}>Remover campo</button>
        </div>
      ))}
      <button type="button" className="btn btn--ghost" onClick={() => onChange([...fields, { id: '', label: '' }])}>Adicionar campo de personalização</button>
    </fieldset>
  );
}
