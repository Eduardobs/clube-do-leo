import { useCallback, useEffect, useMemo, useState } from 'react';
import { STORE_CONFIG } from '../config/store';
import type { CartItem, Product } from '../types/product';
import { cartItemCount, cartTotal, findProduct, isQuote, normalizeQuantity, configurationError, productSignature, itemKey } from '../lib/products';

const STORAGE_KEY = 'clubeDoLeo.cart';
const LEGACY_STORAGE_KEY = 'cart';

function readStoredValue(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(storage: Storage, items: CartItem[]): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

function readCart(): CartItem[] {
  try {
    const localCart = readStoredValue(localStorage, STORAGE_KEY);
    const legacyLocalCart = readStoredValue(localStorage, LEGACY_STORAGE_KEY);
    const sessionCart = readStoredValue(sessionStorage, STORAGE_KEY)
      ?? readStoredValue(sessionStorage, LEGACY_STORAGE_KEY);
    const stored = localCart ?? sessionCart ?? legacyLocalCart;
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
    if (!localCart && (sessionCart || legacyLocalCart)) writeStoredValue(localStorage, items);
    return items;
  } catch {
    return [];
  }
}

export function useCart(products: Product[]) {
  const [items, setItemsState] = useState<CartItem[]>(readCart);

  const setItems = useCallback((updater: (current: CartItem[]) => CartItem[]) => {
    setItemsState((current) => {
      const next = updater(current);
      const savedLocally = writeStoredValue(localStorage, next);
      const savedInSession = writeStoredValue(sessionStorage, next);
      if (!savedLocally && !savedInSession) console.warn('Não foi possível persistir o carrinho.');
      return next;
    });
  }, []);

  useEffect(() => {
    const syncCart = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setItemsState(readCart());
    };
    window.addEventListener('storage', syncCart);
    return () => window.removeEventListener('storage', syncCart);
  }, []);

  const add = useCallback(
    (codigo: string, rawQuantity = 1, personalizacoes: Record<string, string> = {}) => {
      const product = findProduct(products, codigo);
      if (!product || isQuote(product) || configurationError(product, personalizacoes)) return false;
      const quantity = normalizeQuantity(product, rawQuantity);
      const signature = JSON.stringify(Object.entries(personalizacoes).sort());
      setItems((current) => {
        const existing = current.find(item => item.codigo === codigo && JSON.stringify(Object.entries(item.personalizacoes || {}).sort()) === signature);
        return existing ? current.map(item => item === existing ? { ...item, quantity: normalizeQuantity(product, item.quantity + quantity) } : item)
          : [...current, { codigo, quantity, id: crypto.randomUUID(), personalizacoes, catalogSignature: productSignature(product) }];
      });
      return true;
    },
    [products, setItems],
  );

  const remove = useCallback((codigo: string) => {
    setItems((current) => current.filter((item) => itemKey(item) !== codigo));
  }, [setItems]);

  const updateQuantity = useCallback((codigo: string, rawQuantity: number) => {
    const quantity = Number.parseInt(String(rawQuantity), 10);
    setItems((current) =>
      !Number.isFinite(quantity) || quantity < 1
        ? current.filter((item) => itemKey(item) !== codigo)
        : current.map((item) => (
          itemKey(item) === codigo
            ? { ...item, quantity: normalizeQuantity(findProduct(products, item.codigo)!, quantity) }
            : item
        )),
    );
  }, [products, setItems]);

  const configure = useCallback((id: string, values: Record<string, string>) => {
    setItems(current => current.map(item => {
      const product = findProduct(products, item.codigo);
      return itemKey(item) === id && product ? { ...item, personalizacoes: values, quantity: normalizeQuantity(product, item.quantity), catalogSignature: productSignature(product) } : item;
    }));
  }, [products, setItems]);
  const clear = useCallback(() => setItems(() => []), [setItems]);
  const total = useMemo(() => cartTotal(items, products), [items, products]);
  const count = useMemo(() => cartItemCount(items.filter(item => findProduct(products, item.codigo))), [items, products]);

  return { items, total, count, add, remove, updateQuantity, configure, clear };
}
