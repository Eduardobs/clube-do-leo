import { memo, useMemo } from 'react';
import { ArrowUpDown, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import type { Product } from '../../../types/product';
import { CatalogCategories } from './CatalogCategories';
import { ProductCard } from './ProductCard';
import { filterProducts, indexSearchText } from './filterProducts';
import { useCatalogNavigation } from './useCatalogNavigation';

interface ProductCatalogProps {
  products: Product[];
  loading: boolean;
  failed: boolean;
  retry: () => void;
  onAdd: (product: Product) => void;
}

export const ProductCatalog = memo(function ProductCatalog({ products, loading, failed, retry, onAdd }: ProductCatalogProps) {
  const { filters, update, clear, visibleCount, showMore } = useCatalogNavigation(loading);
  const { search, category, sort, mode, maxPrice } = filters;
  const index = useMemo(() => indexSearchText(products), [products]);
  const filteredProducts = useMemo(() => filterProducts(index, filters), [index, filters]);

  return (
    <section id="produtos" className="catalog container" aria-busy={loading}>
      <div className="catalog__heading">
        <h1>Produtos em <em>impressão 3D</em></h1>
        <p>Feitos sob encomenda. Pedido pelo WhatsApp.</p>
      </div>
      <div className="catalog__toolbar" role="search" aria-label="Buscar e ordenar produtos">
        <div className="search-box">
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="catalog-search">Buscar produto</label>
          <input id="catalog-search" type="search" value={search} onChange={(event) => update({ search: event.target.value })} placeholder="Buscar produtos" />
          {search ? <button type="button" className="search-box__clear" onClick={() => update({ search: '' })} aria-label="Limpar busca"><X aria-hidden="true" /></button> : null}
        </div>
        <label className="sort-control">
          <span><ArrowUpDown aria-hidden="true" /> Ordenar por</span>
          <select value={sort} onChange={(event) => update({ sort: event.target.value as typeof sort })}>
            <option value="catalog">Destaques</option>
            <option value="name">Nome</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </label>
      </div>
      <CatalogCategories activeCategory={category} onCategoryChange={category => update({ category })} />
      <div className="catalog__options">
        <details className="catalog-filter-panel" open={mode !== 'todos' || !!maxPrice || undefined}>
          <summary><SlidersHorizontal aria-hidden="true" />Filtrar por preço</summary>
          <div className="catalog-filters">
            <label>Modalidade de preço<select value={mode} onChange={e => update({ mode: e.target.value })}><option value="todos">Todos</option><option value="definido">Preço definido</option><option value="consulta">Sob consulta</option></select></label>
            <label>Preço definido até (R$)<input type="number" min="0" value={maxPrice} onChange={e => update({ maxPrice: e.target.value })} /></label>
            {search || category || mode !== 'todos' || maxPrice || sort !== 'catalog' ? <button type="button" className="btn btn--ghost" onClick={clear}>Limpar filtros</button> : null}
          </div>
        </details>
        {sort.startsWith('price') ? <p>Produtos sob consulta aparecem após os produtos com preço definido.</p> : null}
        {!loading && !failed ? (
          <div className="catalog__meta">
            <p className="catalog__count" aria-live="polite"><strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}</p>
            {category ? <button type="button" className="active-filter" onClick={() => update({ category: null })}>Categoria: {category}<X aria-hidden="true" /></button> : null}
          </div>
        ) : null}
      </div>
      {loading ? (
        <div className="product-grid product-grid--loading" aria-label="Carregando produtos">
          {Array.from({ length: 8 }, (_, index) => <div key={index} className="product-skeleton" aria-hidden="true"><span /><i /><i /></div>)}
        </div>
      ) : null}
      {failed ? <p className="error-message" role="alert">Não foi possível carregar os produtos. Tente novamente mais tarde. <button type="button" onClick={retry}>Tentar novamente</button></p> : null}
      {!loading && !failed ? (
        <div className="product-grid">
          {filteredProducts.length ? filteredProducts.slice(0, visibleCount).map((product, index) => (
            <ProductCard key={product.codigo} product={product} priority={index < 2} onAdd={onAdd} />
          )) : (
            <div className="empty-state">
              <span className="empty-state__icon"><SearchX aria-hidden="true" /></span>
              <h3>Nenhum produto por aqui</h3>
              <p>Tente buscar outro termo ou volte a ver todo o nosso catálogo.</p>
              <button type="button" className="btn btn--ghost" onClick={clear}>Limpar filtros</button>
            </div>
          )}
        </div>
      ) : null}
      {!loading && !failed && visibleCount < filteredProducts.length ? <button type="button" className="btn catalog__load-more" onClick={() => showMore(filteredProducts.length)}>Exibir mais produtos</button> : null}
    </section>
  );
});
