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
    return true;
  } catch {
    return false;
  }
}

export function readCart(): CartItem[] {
  try {
    const localCart = readStoredValue('localStorage', STORAGE_KEY);
    const stored = localCart
      ?? readStoredValue('sessionStorage', STORAGE_KEY)
      ?? readStoredValue('sessionStorage', LEGACY_STORAGE_KEY)
      ?? readStoredValue('localStorage', LEGACY_STORAGE_KEY);
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
      ...item,
      personalizacoes: item.personalizacoes && typeof item.personalizacoes === 'object' ? Object.fromEntries(Object.entries(item.personalizacoes).filter(([,v]) => typeof v === 'string')) : undefined,
      codigo: item.codigo.trim(),
      quantity: Math.min(item.quantity, STORE_CONFIG.maxQuantityPerProduct),
    }));
    if (localCart === null) writeStoredValue('localStorage', JSON.stringify(items));
    return items;
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  const serialized = JSON.stringify(items);
  const local = writeStoredValue('localStorage', serialized);
  const session = writeStoredValue('sessionStorage', serialized);
  if (!local && !session) console.warn('Não foi possível persistir o carrinho.');
}
