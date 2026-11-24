import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, Download, FileUp, HardDrive, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Toast } from '../../components/Toast';
import { formatPrice, imageFallback, productThumbnailUrl } from '../../lib/format';
import { fetchProducts, parseProductsFile, serializeProducts } from '../../lib/products';
import { isQuote } from '../../lib/product-rules';
import { discardDraft, readDraft, saveDraft } from './draft';
import { ProductEditor } from './ProductEditor';
import type { Product } from '../../types/product';

export function AdminApp() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [toast, setToast] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal)
      .then((fetched) => {
        if (controller.signal.aborted) return;
        const draft = readDraft();
        if (!draft) {
          setProducts(fetched);
          return;
        }
        const keepDraft = window.confirm(
          'Encontramos um rascunho de alterações não exportadas desta sessão.\n\nOK = continuar editando o rascunho\nCancelar = descartar e carregar o arquivo original',
        );
        setProducts(keepDraft ? draft : fetched);
        if (!keepDraft) discardDraft();
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        console.error('Erro ao carregar produtos:', reason);
        setLoadError('Não foi possível carregar data/products.json automaticamente. Use “Importar JSON” para carregar o arquivo manualmente.');
        const draft = readDraft();
        if (draft) setProducts(draft);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const sortedProducts = useMemo(() => [...products].sort((a, b) => Number(a.codigo) - Number(b.codigo)), [products]);
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return term ? sortedProducts.filter(product => product.nome.toLocaleLowerCase('pt-BR').includes(term) || product.codigo.includes(term)) : sortedProducts;
  }, [sortedProducts, search]);

  const commitProducts = (next: Product[], message: string) => {
    setProducts(next);
    setToast(saveDraft(next) ? message : `${message} O rascunho não pôde ser salvo neste navegador.`);
  };

  const saveProduct = (product: Product) => {
    if (editing && editing !== 'new') {
      commitProducts(products.map(current => current.codigo === editing.codigo ? product : current), 'Produto atualizado.');
    } else {
      commitProducts([...products, product], 'Produto adicionado.');
    }
    setEditing(null);
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
      <PageHeader>
        <a href="/" className="btn btn--ghost btn--small"><ArrowLeft aria-hidden="true" /> Voltar à loja</a>
      </PageHeader>
      <main id="editor-produtos" className="container admin-main">
        <div className="admin-heading">
          <div><h1>Editor do catálogo</h1><p>Organize produtos, imagens e opções de personalização.</p></div>
          <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}><Plus aria-hidden="true" /> Novo produto</button>
        </div>
        <aside className="admin-notice" role="note">
          <HardDrive aria-hidden="true" /><div><strong>Rascunho local</strong>
          <p>As alterações ficam neste navegador. Para publicá-las, baixe o arquivo e substitua <code>data/products.json</code> no repositório.</p></div>
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
          </div>
        </div>
        {loading ? <div className="spinner" aria-label="Carregando produtos" /> : null}
        {loadError ? <p className="error-message" role="alert">{loadError}</p> : null}
        <p className="admin-count" aria-live="polite">{search ? `${filteredProducts.length} de ` : ''}{products.length} {products.length === 1 ? 'produto' : 'produtos'}</p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption className="sr-only">Produtos do catálogo local</caption>
            <thead><tr><th>Imagem</th><th>Código</th><th>Nome</th><th>Categorias</th><th>Valor</th><th>Ações</th></tr></thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.codigo} data-category={product.categorias[0]}>
                  <td className="admin-table__image"><img className="admin-table__thumb" src={productThumbnailUrl(product.imagens[0])} alt="" width="56" height="56" loading="lazy" decoding="async" onError={imageFallback} /></td>
                  <td className="admin-table__code">{product.codigo}</td>
                  <td className="admin-table__name"><strong>{product.nome}</strong><span>{product.descricao}</span></td>
                  <td className="admin-table__categories"><div className="badge-list">{product.categorias.map((category) => <span className="badge category-label" data-category={category} key={category}>{category}</span>)}</div></td>
                  <td className="admin-table__price">{isQuote(product) ? 'Preço sob consulta' : formatPrice(product.valor)}</td>
                  <td className="admin-table__actions-cell"><div className="admin-table__actions">
                    <button type="button" className="icon-btn" onClick={() => setEditing(product)} title="Editar" aria-label={`Editar ${product.nome}`}><Pencil aria-hidden="true" /></button>
                    <button type="button" className="icon-btn icon-btn--danger" onClick={() => deleteProduct(product)} title="Excluir" aria-label={`Excluir ${product.nome}`}><Trash2 aria-hidden="true" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !filteredProducts.length ? <p className="empty-state">Nenhum produto encontrado.</p> : null}
        </div>
      </main>

      {editing && (
        <ProductEditor
          initialProduct={editing === 'new' ? undefined : editing}
          products={products}
          onSave={saveProduct}
          onClose={() => setEditing(null)}
        />
      )}
      <Toast message={toast} onDismiss={() => setToast('')} />
    </>
  );
}
