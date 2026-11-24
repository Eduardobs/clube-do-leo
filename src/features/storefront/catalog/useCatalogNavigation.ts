import { useEffect, useState } from 'react';
import { catalogParams, saveCatalog } from '../../../lib/navigation';
import { isCategory } from '../../../lib/products';
import type { CatalogFilters } from './filterProducts';

const PAGE_SIZE = 12;
const defaultFilters: CatalogFilters = { search: '', category: null, sort: 'catalog', mode: 'todos', maxPrice: '' };

function readFilters(): CatalogFilters {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('categoria');
  const sort = params.get('ordem');
  const mode = params.get('preco');
  const price = params.get('ate') ?? '';
  return {
    search: params.get('busca') || '',
    category: isCategory(category) ? category : null,
    sort: sort === 'name' || sort === 'price-asc' || sort === 'price-desc' ? sort : 'catalog',
    mode: mode === 'consulta' || mode === 'definido' ? mode : 'todos',
    maxPrice: /^\d+(?:\.\d+)?$/.test(price) && Number.isFinite(Number(price)) ? price : '',
  };
}

const positionKey = () => {
  const query = catalogParams(window.location.search).toString();
  return `catalog-position:${query ? `?${query}` : ''}`;
};

export function useCatalogNavigation(loading: boolean) {
  const [filters, setFilters] = useState(readFilters);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const restore = () => setFilters(readFilters());
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    const next = catalogParams(window.location.search);
    if (current.get('carrinho') === '1') next.set('carrinho', '1');
    const { search, category, sort, mode, maxPrice } = filters;
    const values = { busca: search, categoria: category, ordem: sort === 'catalog' ? '' : sort, preco: mode === 'todos' ? '' : mode, ate: maxPrice };
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    if (query !== window.location.search.slice(1)) {
      const url = `${window.location.pathname}${query ? `?${query}` : ''}#produtos`;
      if ([...current.keys()].some(key => key !== 'carrinho' && !Object.hasOwn(values, key))) {
        window.history.replaceState({}, '', url);
      } else {
        window.history.pushState({}, '', url);
      }
    }
    saveCatalog(query);
  }, [filters]);

  useEffect(() => {
    const remember = () => {
      try {
        sessionStorage.setItem(positionKey(), JSON.stringify({ count: visibleCount, y: window.scrollY }));
      } catch { /* A navegação funciona sem armazenamento. */ }
    };
    window.addEventListener('pagehide', remember);
    return () => window.removeEventListener('pagehide', remember);
  }, [visibleCount]);

  useEffect(() => {
    let count = PAGE_SIZE;
    let y = 0;
    try {
      const saved = JSON.parse(sessionStorage.getItem(positionKey()) || 'null');
      if (Number.isSafeInteger(saved?.count) && saved.count >= PAGE_SIZE) count = saved.count;
      if (Number.isFinite(saved?.y) && saved.y > 0) y = saved.y;
    } catch { /* Sem posição salva. */ }
    setVisibleCount(count);
    if (!loading && y) {
      const frame = requestAnimationFrame(() => window.scrollTo(0, y));
      return () => cancelAnimationFrame(frame);
    }
  }, [filters, loading]);

  return {
    filters,
    update: (changes: Partial<CatalogFilters>) => setFilters(current => ({ ...current, ...changes })),
    clear: () => setFilters(defaultFilters),
    visibleCount,
    showMore: (total: number) => setVisibleCount(count => Math.min(count + PAGE_SIZE, total)),
  };
}
