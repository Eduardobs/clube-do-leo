import { normalizeSearchText } from '../../../lib/format';
import { isQuote } from '../../../lib/product-rules';
import type { Category, Product } from '../../../types/product';

export interface CatalogFilters {
  search: string;
  category: Category | null;
  sort: 'catalog' | 'name' | 'price-asc' | 'price-desc';
  mode: string;
  maxPrice: string;
}

const nameCollator = new Intl.Collator('pt-BR');

export function indexSearchText(products: Product[]) {
  return products.map(product => ({
    product,
    text: normalizeSearchText([product.nome, product.codigo, product.descricao, ...product.categorias].join(' ')),
  }));
}

export function filterProducts(index: ReturnType<typeof indexSearchText>, filters: CatalogFilters): Product[] {
  const { category, sort, mode, maxPrice } = filters;
  const term = normalizeSearchText(filters.search);
  const words = term ? term.split(/\s+/) : [];
  const ceiling = maxPrice ? Number(maxPrice) : undefined;
  const matches: Product[] = [];
  for (const { product, text } of index) {
    if (category && !product.categorias.includes(category)) continue;
    const quote = isQuote(product);
    if (mode !== 'todos' && (mode === 'consulta') !== quote) continue;
    if (ceiling !== undefined && (quote || product.valor > ceiling || Number.isNaN(ceiling))) continue;
    if (words.every(word => text.includes(word))) matches.push(product);
  }

  if (sort === 'name') matches.sort((a, b) => nameCollator.compare(a.nome, b.nome));
  if (sort === 'price-asc' || sort === 'price-desc') {
    matches.sort((a, b) => {
      const quoteA = isQuote(a);
      const quoteB = isQuote(b);
      if (quoteA || quoteB) return Number(quoteA) - Number(quoteB);
      return sort === 'price-asc' ? a.valor - b.valor : b.valor - a.valor;
    });
  }
  return matches;
}
