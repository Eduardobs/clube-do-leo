import { STORE_CONFIG } from '../config/store';
import type { Category, PersonalizationField, Product, ProductsFile } from '../types/product';

const categorySet = new Set<string>(STORE_CONFIG.categories);

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && categorySet.has(value);
}

export function normalizeProductCode(value: unknown): string | null {
  const code = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!/^\d+$/.test(code) || !Number.isSafeInteger(Number(code))) return null;
  return String(Number(code));
}

export function serializeProducts(products: Product[]): string {
  return JSON.stringify({ produtos: products.map(product => ({ ...product, codigo: Number(product.codigo) })) }, null, 2);
}

function isPersonalizationField(value: unknown): value is PersonalizationField {
  if (!value || typeof value !== 'object') return false;
  const field = value as Record<string, unknown>;
  if (typeof field.id !== 'string' || !field.id.trim()) return false;
  if (typeof field.label !== 'string' || !field.label.trim()) return false;
  if (field.required !== undefined && typeof field.required !== 'boolean') return false;
  if (field.maxLength !== undefined && (!Number.isSafeInteger(field.maxLength) || Number(field.maxLength) < 1)) return false;
  return field.options === undefined || (
    Array.isArray(field.options) && field.options.length > 0 &&
    field.options.every(option => typeof option === 'string' && option.trim())
  );
}

export function normalizeProduct(value: unknown): Product | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const codigo = normalizeProductCode(candidate.codigo);
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
    const fields = candidate.personalizacoes;
    if (!Array.isArray(fields) || !fields.every(isPersonalizationField)) return null;
    if (new Set(fields.map(field => field.id)).size !== fields.length) return null;
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
  const produtos: Product[] = [];
  const codes = new Set<string>();
  for (const entry of source) {
    const product = normalizeProduct(entry);
    if (!product) throw new Error('products.json contém um ou mais produtos inválidos.');
    codes.add(product.codigo);
    produtos.push(product);
  }
  if (codes.size !== produtos.length) throw new Error('products.json contém códigos de produto duplicados.');

  return { produtos };
}

export async function fetchProducts(signal?: AbortSignal): Promise<Product[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/products.json`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
  return parseProductsFile(await response.json()).produtos;
}
