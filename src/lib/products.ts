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

  return { codigo, nome, descricao, valor, imagens, categorias };
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
    return product ? total + product.valor * item.quantity : total;
  }, 0);
}

export function cartItemCount(cart: CartItem[]): number {
  return cart.reduce((total, item) => total + item.quantity, 0);
}
