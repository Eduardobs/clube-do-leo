import { parseProductsFile } from '../../lib/products';
import type { Product } from '../../types/product';

const DRAFT_KEY = 'clubeDoLeo.admin.draft';

export function readDraft(): Product[] | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return parseProductsFile({ produtos: JSON.parse(raw) }).produtos;
  } catch {
    discardDraft();
    return null;
  }
}

export function saveDraft(products: Product[]): boolean {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(products.map(product => ({ ...product, codigo: Number(product.codigo) }))));
    return true;
  } catch (reason) {
    console.warn('Não foi possível salvar o rascunho local:', reason);
    return false;
  }
}

export function discardDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch { /* O painel também funciona sem armazenamento local. */ }
}
