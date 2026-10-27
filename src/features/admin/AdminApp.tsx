import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, Download, FileUp, ImagePlus, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Toast } from '../../components/Toast';
import { STORE_CONFIG } from '../../config/store';
import { BRAND_LOGO_URL, formatPrice, imageFallback, productThumbnailUrl, resolveAsset } from '../../lib/format';
import { fetchProducts, parseProductsFile, normalizeProduct, normalizeProductCode, serializeProducts, isQuote } from '../../lib/products';
import type { Category, Product } from '../../types/product';

const DRAFT_KEY = 'clubeDoLeo.admin.draft';

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

function readDraft(): Product[] | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return parseProductsFile({ produtos: JSON.parse(raw) }).produtos;
  } catch {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // O painel continua utilizável mesmo quando o navegador bloqueia armazenamento local.
    }
    return null;
  }
}

function saveDraft(products: Product[]): boolean {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(products.map(product => ({ ...product, codigo: Number(product.codigo) }))));
    return true;
  } catch (reason) {
    console.warn('Não foi possível salvar o rascunho local:', reason);
    return false;
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AdminApp() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal)
      .then((fetched) => {
        const draft = readDraft();
        if (!draft) {
          setProducts(fetched);
          return;
        }
        const keepDraft = window.confirm(
          'Encontramos um rascunho de alterações não exportadas desta sessão.\n\nOK = continuar editando o rascunho\nCancelar = descartar e carregar o arquivo original',
        );
        setProducts(keepDraft ? draft : fetched);
        if (!keepDraft) localStorage.removeItem(DRAFT_KEY);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        console.error('Erro ao carregar produtos:', reason);
        setLoadError('Não foi possível carregar data/products.json automaticamente. Use “Importar JSON” para carregar o arquivo manualmente.');
        const draft = readDraft();
        if (draft) setProducts(draft);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const filtered = term
      ? products.filter((product) => product.nome.toLocaleLowerCase('pt-BR').includes(term) || product.codigo.toLocaleLowerCase('pt-BR').includes(term))
      : products;
    return [...filtered].sort((a, b) => Number(a.codigo) - Number(b.codigo));
  }, [products, search]);

  const commitProducts = (next: Product[], message: string) => {
    setProducts(next);
    setToast(saveDraft(next) ? message : `${message} O rascunho não pôde ser salvo neste navegador.`);
  };

  const openForm = (product?: Product) => {
    setEditingCode(product?.codigo ?? null);
    setForm(product ? productToForm(product) : emptyForm());
    setFormError('');
  };

  const updateImage = (index: number, value: string) => {
    setForm((current) => current ? { ...current, imagens: current.imagens.map((image, currentIndex) => currentIndex === index ? value : image) } : current);
  };

  const uploadImages = async (index: number, files: FileList | null) => {
    if (!files?.length) return;
    try {
      const values = await Promise.all(Array.from(files, fileToDataUrl));
      setForm((current) => {
        if (!current) return current;
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
    if (!form) return;
    const codigo = normalizeProductCode(form.codigo);
    const nome = form.nome.trim();
    const valor = form.details.modalidadePreco === 'consulta' ? 0 : form.valor.trim() === '' ? 0 : Number(form.valor);
    if (!form.codigo || !nome) return setFormError('Código e nome são obrigatórios.');
    if (codigo === null) return setFormError('Informe um código inteiro, apenas com dígitos, entre 0 e 9007199254740991.');
    if (!Number.isFinite(valor) || valor < 0) return setFormError('Informe um valor numérico válido (0 ou maior).');
    if (!form.categorias.length) return setFormError('Selecione ao menos uma categoria.');
    if (products.some((product) => product.codigo === codigo && product.codigo !== editingCode)) {
      return setFormError(`Já existe um produto com o código “${codigo}”.`);
    }

    if (form.details.modalidadePreco === 'definido' && valor <= 0) return setFormError('Informe um preço maior que zero ou selecione sob consulta.');
    const product = normalizeProduct({
      ...form.details,
      codigo,
      nome,
      descricao: form.descricao.trim(),
      valor,
      categorias: form.categorias,
      imagens: form.imagens.map((image) => image.trim()).filter(Boolean),
    });
    if (!product) return setFormError('Revise os campos: quantidades devem ser inteiras entre 1 e 99; personalizações precisam de identificadores únicos e limites positivos.');
    const next = editingCode
      ? products.map((current) => current.codigo === editingCode ? product : current)
      : [...products, product];
    commitProducts(next, editingCode ? 'Produto atualizado.' : 'Produto adicionado.');
    setForm(null);
  };

  const deleteProduct = (product: Product) => {
    if (!window.confirm(`Excluir o produto “${product.nome}” (${product.codigo})? Essa ação não pode ser desfeita.`)) return;
    commitProducts(products.filter((current) => current.codigo !== product.codigo), 'Produto excluído.');
  };

  const exportJson = () => {
    const blob = new Blob([`${serializeProducts(products)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products.json';
    link.click();
    URL.revokeObjectURL(url);
    setToast('Arquivo baixado. Substitua data/products.json e comite as alterações.');
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const imported = parseProductsFile(JSON.parse(await file.text())).produtos;
      commitProducts(imported, 'JSON importado com sucesso.');
      setLoadError('');
    } catch (reason) {
      console.error('Erro ao importar JSON:', reason);
      window.alert(`Não foi possível importar o arquivo: ${reason instanceof Error ? reason.message : 'formato inválido'}`);
    }
  };

  return (
    <>
      <a className="skip-link" href="#editor-produtos">Pular para o editor</a>
      <header className="admin-header">
        <div className="container admin-header__inner">
          <a href="/" className="brand"><img src={BRAND_LOGO_URL} alt="Clube do Léo" className="brand__logo" /></a>
          <h1 className="admin-header__title">Editor local do catálogo</h1>
          <a href="/" className="btn btn--ghost btn--small"><ArrowLeft aria-hidden="true" /> Voltar à loja</a>
        </div>
      </header>
      <main id="editor-produtos" className="container admin-main">
        <aside className="admin-notice" role="note">
          <strong>Editor local — alterações não são publicadas automaticamente.</strong>
          <span>Baixe o arquivo ao terminar, substitua <code>data/products.json</code> no repositório e publique manualmente.</span>
        </aside>
        <div className="admin-toolbar">
          <label className="search-box">
            <Search aria-hidden="true" /><span className="sr-only">Buscar por nome ou código</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou código..." />
          </label>
          <div className="admin-toolbar__actions">
            <button type="button" className="btn btn--ghost" onClick={() => importInputRef.current?.click()}><FileUp aria-hidden="true" /> Importar JSON</button>
            <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importJson} />
            <button type="button" className="btn btn--ghost" onClick={exportJson}><Download aria-hidden="true" /> Baixar products.json</button>
            <button type="button" className="btn btn--primary" onClick={() => openForm()}><Plus aria-hidden="true" /> Novo produto</button>
          </div>
        </div>
        {loading ? <div className="spinner" aria-label="Carregando produtos" /> : null}
        {loadError ? <p className="error-message" role="alert">{loadError}</p> : null}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Imagem</th><th>Código</th><th>Nome</th><th>Categorias</th><th>Valor</th><th>Ações</th></tr></thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.codigo}>
                  <td><img className="admin-table__thumb" src={productThumbnailUrl(product.imagens[0])} alt={product.nome} onError={imageFallback} /></td>
                  <td>{product.codigo}</td>
                  <td className="admin-table__name"><strong>{product.nome}</strong><span>{product.descricao}</span></td>
                  <td><div className="badge-list">{product.categorias.map((category) => <span className="badge" key={category}>{category}</span>)}</div></td>
                  <td>{isQuote(product) ? 'Preço sob consulta' : formatPrice(product.valor)}</td>
                  <td><div className="admin-table__actions">
                    <button type="button" className="icon-btn" onClick={() => openForm(product)} title="Editar" aria-label={`Editar ${product.nome}`}><Pencil aria-hidden="true" /></button>
                    <button type="button" className="icon-btn icon-btn--danger" onClick={() => deleteProduct(product)} title="Excluir" aria-label={`Excluir ${product.nome}`}><Trash2 aria-hidden="true" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !filteredProducts.length ? <p className="empty-state">Nenhum produto encontrado.</p> : null}
        </div>
      </main>

      {form ? (
        <Modal label={editingCode ? `Editar produto: ${form.nome}` : 'Novo produto'} onClose={() => setForm(null)} className="modal__content--admin-form">
          <h2>{editingCode ? `Editar produto: ${form.nome}` : 'Novo produto'}</h2>
          {formError ? <p className="error-message" role="alert">{formError}</p> : null}
          <form onSubmit={submitProduct}>
            <div className="form-group"><label htmlFor="field-codigo">Código</label><input id="field-codigo" type="text" inputMode="numeric" pattern="[0-9]+" value={form.codigo} onChange={(event) => { if (/^\d*$/.test(event.target.value)) setForm({ ...form, codigo: event.target.value }); }} placeholder="Ex: 14" required /></div>
            <div className="form-group"><label htmlFor="field-nome">Nome</label><input id="field-nome" type="text" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Nome do produto" required /></div>
            <div className="form-group"><label htmlFor="field-descricao">Descrição</label><textarea id="field-descricao" value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} placeholder="Descrição, tamanho, conteúdo..." /></div>
            <div className="form-group"><label htmlFor="field-valor">Valor (R$)</label><input id="field-valor" disabled={form.details.modalidadePreco === 'consulta'} type="number" min="0" step="0.01" value={form.valor} onChange={(event) => setForm({ ...form, valor: event.target.value })} placeholder="0,00" /></div>
            <label className="option-field">Modalidade de preço<select value={form.details.modalidadePreco} onChange={e => setForm({ ...form, details: { ...form.details, modalidadePreco: e.target.value as Product['modalidadePreco'] } })}><option value="definido">Preço definido</option><option value="consulta">Preço sob consulta</option></select></label>
            {([['unidadeVenda', 'Unidade de venda (ex.: unidade, kit)'], ['dimensoes', 'Dimensões'], ['conteudo', 'Conteúdo do conjunto']] as const).map(([key, label]) => <label className="option-field" key={key}>{label}<input value={form.details[key] || ''} onChange={e => setForm({ ...form, details: { ...form.details, [key]: e.target.value } })} /></label>)}
            {([['quantidadeMinima', 'Quantidade mínima'], ['incremento', 'Incremento'], ['pecasPorKit', 'Peças por kit']] as const).map(([key, label]) => <label className="option-field" key={key}>{label}<input type="number" min="1" max="99" step="1" value={form.details[key] ?? ''} onChange={e => setForm({ ...form, details: { ...form.details, [key]: e.target.value ? Number(e.target.value) : undefined } })} /></label>)}
            <fieldset><legend>Campos de personalização</legend><p>Cadastre somente opções oferecidas pela loja. Limites de texto são opcionais.</p>
              {(form.details.personalizacoes || []).map((field, index) => <div className="admin-personalization" key={index}>
                {(['id', 'label'] as const).map(key => <label className="option-field" key={key}>{key === 'id' ? 'Identificador' : 'Rótulo'}<input required value={field[key]} onChange={e => setForm({ ...form, details: { ...form.details, personalizacoes: form.details.personalizacoes?.map((f, i) => i === index ? { ...f, [key]: e.target.value } : f) } })} /></label>)}
                <label><input type="checkbox" checked={field.required || false} onChange={e => setForm({ ...form, details: { ...form.details, personalizacoes: form.details.personalizacoes?.map((f, i) => i === index ? { ...f, required: e.target.checked } : f) } })} /> Obrigatório</label>
                <label className="option-field">Limite de caracteres<input type="number" min="1" step="1" value={field.maxLength || ''} onChange={e => setForm({ ...form, details: { ...form.details, personalizacoes: form.details.personalizacoes?.map((f, i) => i === index ? { ...f, maxLength: e.target.value ? Number(e.target.value) : undefined } : f) } })} /></label>
                <label className="option-field">Opções (uma por linha; vazio para texto livre)<textarea value={field.options?.join('\n') || ''} onChange={e => setForm({ ...form, details: { ...form.details, personalizacoes: form.details.personalizacoes?.map((f, i) => i === index ? { ...f, options: e.target.value ? e.target.value.split('\n') : undefined } : f) } })} /></label>
                <button type="button" onClick={() => setForm({ ...form, details: { ...form.details, personalizacoes: form.details.personalizacoes?.filter((_, i) => i !== index) } })}>Remover campo</button>
              </div>)}
              <button type="button" className="btn btn--ghost" onClick={() => setForm({ ...form, details: { ...form.details, personalizacoes: [...(form.details.personalizacoes || []), { id: '', label: '' }] } })}>Adicionar campo de personalização</button>
            </fieldset>
            <fieldset className="form-group"><legend>Categorias</legend><div className="checkbox-group">{STORE_CONFIG.categories.map((category) => (
              <label key={category}><input type="checkbox" checked={form.categorias.includes(category)} onChange={(event) => setForm({ ...form, categorias: event.target.checked ? [...form.categorias, category] : form.categorias.filter((current) => current !== category) })} />{category}</label>
            ))}</div></fieldset>
            <fieldset className="form-group"><legend>Imagens</legend><div className="image-list">{form.imagens.map((image, index) => (
              <div className="image-row" key={index}>
                <input type="text" value={image} onChange={(event) => updateImage(index, event.target.value)} placeholder="assets/products/arquivo.jpg" aria-label={`Caminho da imagem ${index + 1}`} />
                <img src={resolveAsset(image)} alt="" onError={imageFallback} />
                <label className="icon-btn" title="Selecionar imagem do computador"><Upload aria-hidden="true" /><span className="sr-only">Selecionar imagem</span><input type="file" accept="image/*" multiple className="hidden" onChange={(event) => void uploadImages(index, event.target.files)} /></label>
                <button type="button" className="icon-btn icon-btn--danger" onClick={() => setForm({ ...form, imagens: form.imagens.length === 1 ? [''] : form.imagens.filter((_, current) => current !== index) })} title="Remover imagem" aria-label={`Remover imagem ${index + 1}`}><X aria-hidden="true" /></button>
              </div>
            ))}</div><button type="button" className="btn btn--ghost btn--small" onClick={() => setForm({ ...form, imagens: [...form.imagens, ''] })}><ImagePlus aria-hidden="true" /> Adicionar imagem</button></fieldset>
            <div className="form-actions"><button type="button" className="btn btn--ghost" onClick={() => setForm(null)}>Cancelar</button><button type="submit" className="btn btn--primary">Salvar produto</button></div>
          </form>
        </Modal>
      ) : null}
      <Toast message={toast} onDismiss={() => setToast('')} />
    </>
  );
}
