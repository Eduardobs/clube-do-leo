import { STORE_CONFIG } from '../config/store';
import type { CartItem, Category, Product, ProductsFile } from '../types/product';

const categorySet = new Set<string>(STORE_CONFIG.categories);

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && categorySet.has(value);
}

export function normalizeProduct(value: unknown): Product | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const codigo = typeof candidate.codigo === 'string' ? candidate.codigo.trim() : '';
  const nome = typeof candidate.nome === 'string' ? candidate.nome.trim() : '';
  const descricao = typeof candidate.descricao === 'string' ? candidate.descricao : '';
  const valor = typeof candidate.valor === 'number' ? candidate.valor : Number.NaN;
  const imagens = Array.isArray(candidate.imagens)
    ? candidate.imagens.filter((image): image is string => typeof image === 'string' && image.trim().length > 0)
    : [];
  const categorias = Array.isArray(candidate.categorias)
    ? candidate.categorias.filter(isCategory)
    : [];

  if (!codigo || !nome || !Number.isFinite(valor) || valor < 0 || categorias.length === 0) return null;

  const extras: Partial<Product> = {};
  for (const key of ['resumo', 'unidadeVenda', 'dimensoes', 'material', 'conteudo', 'cuidados', 'indicacaoUso', 'prazoProducao', 'informacoesPersonalizacao'] as const) {
    if (typeof candidate[key] === 'string') extras[key] = candidate[key].trim();
  }
  for (const key of ['quantidadeMinima', 'incremento', 'pecasPorKit'] as const) {
    if (candidate[key] !== undefined) {
      if (!Number.isSafeInteger(candidate[key]) || Number(candidate[key]) < 1 || Number(candidate[key]) > STORE_CONFIG.maxQuantityPerProduct) return null;
      extras[key] = Number(candidate[key]);
    }
  }
  if (candidate.personalizacoes !== undefined) {
    if (!Array.isArray(candidate.personalizacoes)) return null;
    const fields = candidate.personalizacoes as Product['personalizacoes'];
    if (fields?.some(f => !f || typeof f.id !== 'string' || !f.id.trim() || typeof f.label !== 'string' || !f.label.trim() || (f.required !== undefined && typeof f.required !== 'boolean') || (f.maxLength !== undefined && (!Number.isSafeInteger(f.maxLength) || f.maxLength < 1)) || (f.options !== undefined && (!Array.isArray(f.options) || !f.options.length || f.options.some(o => typeof o !== 'string' || !o.trim()))))) return null;
    if (new Set(fields?.map(f => f.id)).size !== fields?.length) return null;
    extras.personalizacoes = fields;
  }
  if (candidate.modalidadePreco !== undefined && !['definido', 'consulta'].includes(String(candidate.modalidadePreco))) return null;
  const modalidadePreco = candidate.modalidadePreco === 'consulta' || valor === 0 ? 'consulta' : 'definido';
  return { codigo, nome, descricao, valor, imagens, categorias, ...extras, modalidadePreco };
}

export function parseProductsFile(value: unknown): ProductsFile {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { produtos?: unknown }).produtos)) {
    throw new Error('Formato inválido em products.json: chave "produtos" ausente.');
  }

  const source = (value as { produtos: unknown[] }).produtos;
  const produtos = source.map(normalizeProduct);
  if (produtos.some((product) => product === null)) {
    throw new Error('products.json contém um ou mais produtos inválidos.');
  }

  const validProducts = produtos as Product[];
  if (new Set(validProducts.map((product) => product.codigo)).size !== validProducts.length) {
    throw new Error('products.json contém códigos de produto duplicados.');
  }

  return { produtos: validProducts };
}

export async function fetchProducts(signal?: AbortSignal): Promise<Product[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/products.json`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
  return parseProductsFile(await response.json()).produtos;
}

export function findProduct(products: Product[], codigo: string): Product | undefined {
  return products.find((product) => product.codigo === codigo);
}

export function cartTotal(cart: CartItem[], products: Product[]): number {
  return cart.reduce((total, item) => {
    const product = findProduct(products, item.codigo);
    return product && !isQuote(product) ? total + product.valor * item.quantity : total;
  }, 0);
}

export function cartItemCount(cart: CartItem[]): number {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

export const isQuote = (p: Product) => p.modalidadePreco === 'consulta' || (!p.modalidadePreco && p.valor === 0);
export const minimum = (p: Product) => p.quantidadeMinima ?? 1;
export const increment = (p: Product) => p.incremento ?? 1;
export function normalizeQuantity(p: Product, q: number): number {
  const max = minimum(p) + Math.floor((STORE_CONFIG.maxQuantityPerProduct - minimum(p)) / increment(p)) * increment(p);
  return Math.min(max, minimum(p) + Math.ceil((Math.max(minimum(p), Number.isFinite(q) ? q : minimum(p)) - minimum(p)) / increment(p)) * increment(p));
}
export const quantityLabel = (p: Product, q: number) => `${q} ${p.unidadeVenda === 'kit' ? (q === 1 ? 'kit' : 'kits') : p.unidadeVenda === 'unidade' ? (q === 1 ? 'unidade' : 'unidades') : p.unidadeVenda || 'un.'}${p.pecasPorKit ? ` · ${q * p.pecasPorKit} peças` : ''}`;
export const productSignature = (p: Product) => JSON.stringify([p.valor, p.modalidadePreco, p.unidadeVenda, p.quantidadeMinima, p.incremento, p.pecasPorKit, p.personalizacoes]);
export function configurationError(p: Product, values: Record<string, string> = {}): string {
  for (const f of p.personalizacoes ?? []) {
    const value = values[f.id]?.trim() || '';
    if (f.required && !value) return `Preencha ${f.label}.`;
    if (f.maxLength && value.length > f.maxLength) return `${f.label}: limite de ${f.maxLength} caracteres.`;
    if (value && f.options && !f.options.includes(value)) return `Revise ${f.label}.`;
  }
  if (Object.keys(values).some(key => !p.personalizacoes?.some(f => f.id === key))) return 'As opções mudaram. Revise a personalização.';
  return '';
}
export const itemKey = (item: CartItem) => item.id || item.codigo;
export function itemIssue(p: Product, item: CartItem): string {
  if (normalizeQuantity(p, item.quantity) !== item.quantity) return 'Revise a quantidade mínima e o incremento.';
  if (configurationError(p, item.personalizacoes)) return configurationError(p, item.personalizacoes);
  if (item.catalogSignature && item.catalogSignature !== productSignature(p)) return 'As condições do produto mudaram. Revise e salve o item.';
  return '';
}
