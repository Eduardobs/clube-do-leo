import { STORE_CONFIG } from '../../config/store';
import type { CartItem } from '../../types/product';

export const STORAGE_KEY = 'clubeDoLeo.cart';
const LEGACY_STORAGE_KEY = 'cart';

function readStoredValue(storage: 'localStorage' | 'sessionStorage', key: string): string | null {
  try {
    return window[storage].getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(storage: 'localStorage' | 'sessionStorage', serialized: string): boolean {
  try {
    window[storage].setItem(STORAGE_KEY, serialized);
    window[storage].removeItem(LEGACY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function readCart(): CartItem[] {
  try {
    const localCart = readStoredValue('localStorage', STORAGE_KEY);
    const sessionCart = readStoredValue('sessionStorage', STORAGE_KEY);
    const legacySession = readStoredValue('sessionStorage', LEGACY_STORAGE_KEY);
    const legacyLocal = readStoredValue('localStorage', LEGACY_STORAGE_KEY);
    const stored = localCart ?? sessionCart ?? legacySession ?? legacyLocal;
    if (!stored) return [];
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value)) return [];
    const items = value.filter(
      (item): item is CartItem =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as CartItem).codigo === 'string' &&
        Number.isInteger((item as CartItem).quantity) &&
        (item as CartItem).quantity > 0,
    ).map((item) => ({
      codigo: item.codigo.trim(),
      quantity: Math.min(item.quantity, STORE_CONFIG.maxQuantityPerProduct),
      id: typeof item.id === 'string' ? item.id : undefined,
      personalizacoes: item.personalizacoes && typeof item.personalizacoes === 'object' && !Array.isArray(item.personalizacoes)
        ? Object.fromEntries(Object.entries(item.personalizacoes).filter(([, value]) => typeof value === 'string'))
        : undefined,
      catalogSignature: typeof item.catalogSignature === 'string' ? item.catalogSignature : undefined,
    })).filter(item => item.codigo);
    const serialized = JSON.stringify(items);
    if (localCart !== serialized || legacyLocal !== null) writeStoredValue('localStorage', serialized);
    if ((sessionCart === stored && sessionCart !== serialized) || legacySession !== null) {
      writeStoredValue('sessionStorage', serialized);
    }
    return items;
  } catch {
    return [];
  }
}

export function discardSessionCart(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch { /* O carrinho também funciona só em memória. */ }
}

export function saveCart(items: CartItem[]): void {
  const serialized = JSON.stringify(items);
  const local = writeStoredValue('localStorage', serialized);
  const session = writeStoredValue('sessionStorage', serialized);
  if (!local && !session) console.warn('Não foi possível persistir o carrinho.');
}
