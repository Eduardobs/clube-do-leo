import { useState, type FormEvent } from 'react';
import { ImagePlus, Upload, X } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { STORE_CONFIG } from '../../config/store';
import { imageFallback, resolveAsset } from '../../lib/format';
import { catalogImagePath, isUploadedImage } from '../../lib/catalog-image';
import { normalizeProduct, normalizeProductCode } from '../../lib/products';
import { isQuote } from '../../lib/product-rules';
import type { Category, Product } from '../../types/product';
import { PersonalizationEditor } from './PersonalizationEditor';

interface ProductFormState {
  details: Partial<Product>;
  codigo: string;
  nome: string;
  descricao: string;
  valor: string;
  categorias: Category[];
  imagens: string[];
}

const emptyForm = (): ProductFormState => ({
  details: { modalidadePreco: 'definido' },
  codigo: '',
  nome: '',
  descricao: '',
  valor: '',
  categorias: [],
  imagens: [''],
});

function productToForm(product: Product): ProductFormState {
  return {
    details: { ...product, modalidadePreco: isQuote(product) ? 'consulta' : 'definido' },
    codigo: product.codigo,
    nome: product.nome,
    descricao: product.descricao,
    valor: String(product.valor),
    categorias: product.categorias,
    imagens: product.imagens.length ? product.imagens : [''],
  };
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface ProductEditorProps {
  initialProduct?: Product;
  products: Product[];
  onSave: (product: Product) => void;
  onClose: () => void;
}

export function ProductEditor({ initialProduct, products, onSave, onClose }: ProductEditorProps) {
  const [form, setForm] = useState(() => initialProduct ? productToForm(initialProduct) : emptyForm());
  const [formError, setFormError] = useState('');
  const editingCode = initialProduct?.codigo;

  const updateImage = (index: number, value: string) => {
    setForm(current => ({ ...current, imagens: current.imagens.map((image, position) => position === index ? value : image) }));
  };

  const uploadImages = async (index: number, files: FileList | null) => {
    if (!files?.length) return;
    try {
      const values = await Promise.all(Array.from(files, fileToDataUrl));
      setForm((current) => {
        const imagens = [...current.imagens];
        imagens.splice(index, 1, ...values);
        return { ...current, imagens };
      });
    } catch (reason) {
      console.error('Erro ao ler imagens:', reason);
      setFormError('Não foi possível ler uma das imagens selecionadas.');
    }
  };

  const submitProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const codigo = normalizeProductCode(form.codigo);
    const nome = form.nome.trim();
    const valor = form.details.modalidadePreco === 'consulta' ? 0 : Number(form.valor);
    if (!form.codigo || !nome) return setFormError('Código e nome são obrigatórios.');
    if (codigo === null) return setFormError('Informe um código inteiro, apenas com dígitos, entre 0 e 9007199254740991.');
    if (!Number.isFinite(valor) || valor < 0) return setFormError('Informe um valor numérico válido (0 ou maior).');
    if (!form.categorias.length) return setFormError('Selecione ao menos uma categoria.');
    if (products.some((product) => product.codigo === codigo && product.codigo !== editingCode)) {
      return setFormError(`Já existe um produto com o código “${codigo}”.`);
    }

    if (form.details.modalidadePreco === 'definido' && valor <= 0) return setFormError('Informe um preço maior que zero ou selecione sob consulta.');
    const imagens = form.imagens.map(image => image.trim()).filter(Boolean);
    if (imagens.some(image => !catalogImagePath(image) && !isUploadedImage(image))) {
      return setFormError('Use uma imagem em assets/ ou selecione um arquivo AVIF, GIF, JPEG, PNG ou WebP.');
    }
    const product = normalizeProduct({
      ...form.details,
      codigo,
      nome,
      descricao: form.descricao.trim(),
      valor,
      categorias: form.categorias,
      imagens,
    });
    if (!product) return setFormError('Revise os campos: quantidades devem ser inteiras entre 1 e 99; personalizações precisam de identificadores únicos e limites positivos.');
    onSave(product);
  };

  return (
    <Modal label={editingCode ? `Editar produto: ${form.nome}` : 'Novo produto'} onClose={onClose} className="modal__content--admin-form">
      <h2>{editingCode ? `Editar produto: ${form.nome}` : 'Novo produto'}</h2>
      <form onSubmit={submitProduct} className="product-editor">
        <fieldset className="editor-section">
          <legend>Identificação</legend>
          <div className="editor-grid editor-grid--identity">
            <div className="form-group"><label htmlFor="field-codigo">Código</label><input id="field-codigo" type="text" inputMode="numeric" pattern="[0-9]+" value={form.codigo} onChange={(event) => { if (/^\d*$/.test(event.target.value)) setForm({ ...form, codigo: event.target.value }); }} placeholder="Ex: 14" required /></div>
            <div className="form-group"><label htmlFor="field-nome">Nome</label><input id="field-nome" type="text" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Nome do produto" required /></div>
            <div className="form-group editor-wide"><label htmlFor="field-descricao">Descrição</label><textarea id="field-descricao" value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} placeholder="Descrição, tamanho, conteúdo..." /></div>
          </div>
          <fieldset className="form-group"><legend>Categorias</legend><div className="checkbox-group">{STORE_CONFIG.categories.map((category) => (
            <label key={category}><input type="checkbox" checked={form.categorias.includes(category)} onChange={(event) => setForm({ ...form, categorias: event.target.checked ? [...form.categorias, category] : form.categorias.filter((current) => current !== category) })} />{category}</label>
          ))}</div></fieldset>
        </fieldset>
        <fieldset className="editor-section">
          <legend>Preço e venda</legend>
          <div className="editor-grid">
            <label className="option-field">Modalidade de preço<select value={form.details.modalidadePreco} onChange={e => setForm({ ...form, details: { ...form.details, modalidadePreco: e.target.value as Product['modalidadePreco'] } })}><option value="definido">Preço definido</option><option value="consulta">Preço sob consulta</option></select></label>
            <div className="form-group"><label htmlFor="field-valor">Valor (R$)</label><input id="field-valor" disabled={form.details.modalidadePreco === 'consulta'} type="number" min="0" step="0.01" value={form.valor} onChange={(event) => setForm({ ...form, valor: event.target.value })} placeholder="0,00" /></div>
            {([['unidadeVenda', 'Unidade de venda (ex.: unidade, kit)'], ['dimensoes', 'Dimensões'], ['conteudo', 'Conteúdo do conjunto']] as const).map(([key, label]) => <label className="option-field" key={key}>{label}<input value={form.details[key] || ''} onChange={e => setForm({ ...form, details: { ...form.details, [key]: e.target.value } })} /></label>)}
            {([['quantidadeMinima', 'Quantidade mínima'], ['incremento', 'Incremento'], ['pecasPorKit', 'Peças por kit']] as const).map(([key, label]) => <label className="option-field" key={key}>{label}<input type="number" min="1" max="99" step="1" value={form.details[key] ?? ''} onChange={e => setForm({ ...form, details: { ...form.details, [key]: e.target.value ? Number(e.target.value) : undefined } })} /></label>)}
          </div>
        </fieldset>
        <fieldset className="editor-section"><legend>Imagens</legend><p>A primeira imagem é a capa do produto.</p><div className="image-list">{form.imagens.map((image, index) => (
          <div className="image-row" key={index}>
            <span className="image-label">{index === 0 ? 'Capa do produto' : `Imagem ${index + 1}`}</span>
            <input type="text" value={image} onChange={(event) => updateImage(index, event.target.value)} placeholder="assets/products/arquivo.jpg" aria-label={`Caminho da imagem ${index + 1}`} />
            <img src={resolveAsset(image)} alt="" onError={imageFallback} />
            <label className="icon-btn" title="Selecionar imagem do computador"><Upload aria-hidden="true" /><span className="sr-only">Selecionar arquivo para a imagem {index + 1}</span><input type="file" accept="image/avif,image/gif,image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => void uploadImages(index, event.target.files)} /></label>
            <button type="button" className="icon-btn icon-btn--danger" onClick={() => setForm({ ...form, imagens: form.imagens.length === 1 ? [''] : form.imagens.filter((_, current) => current !== index) })} title="Remover imagem" aria-label={`Remover imagem ${index + 1}`}><X aria-hidden="true" /></button>
          </div>
        ))}</div><button type="button" className="btn btn--ghost btn--small" onClick={() => setForm({ ...form, imagens: [...form.imagens, ''] })}><ImagePlus aria-hidden="true" /> Adicionar imagem</button></fieldset>
        <PersonalizationEditor fields={form.details.personalizacoes ?? []}
          onChange={personalizacoes => setForm({ ...form, details: { ...form.details, personalizacoes } })} />
        <div className="form-actions">
          {formError ? <p className="error-message" role="alert">{formError}</p> : null}
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary">Salvar produto</button>
        </div>
      </form>
    </Modal>
  );
}
