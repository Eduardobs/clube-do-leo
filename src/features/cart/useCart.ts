import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CartItem, Product } from '../../types/product';
import { configurationError, isQuote, normalizeQuantity, productSignature } from '../../lib/product-rules';
import { indexProducts, itemKey, summarizeCart } from './summary';
import { discardSessionCart, readCart, saveCart, STORAGE_KEY } from './storage';

export function useCart(products: Product[]) {
  const [items, setItemsState] = useState<CartItem[]>(readCart);

  const currentItems = useRef(items);
  const productsByCode = useMemo(() => indexProducts(products), [products]);

  const setItems = useCallback((updater: (current: CartItem[]) => CartItem[]) => {
    const next = updater(currentItems.current);
    currentItems.current = next;
    setItemsState(next);
    saveCart(next);
  }, []);

  useEffect(() => {
    const syncCart = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      if ((event.newValue === null || event.newValue === '[]') && event.storageArea === window.localStorage) {
        discardSessionCart();
      }
      const next = readCart();
      currentItems.current = next;
      setItemsState(next);
    };
    window.addEventListener('storage', syncCart);
    return () => window.removeEventListener('storage', syncCart);
  }, []);

  const add = useCallback(
    (codigo: string, rawQuantity = 1, personalizacoes: Record<string, string> = {}) => {
      const product = productsByCode.get(codigo);
      if (!product || isQuote(product) || configurationError(product, personalizacoes)) return false;
      const quantity = normalizeQuantity(product, rawQuantity);
      const entries = Object.entries(personalizacoes);
      setItems(current => {
        const existing = current.find(item => {
          if (item.codigo !== codigo) return false;
          const values = item.personalizacoes ?? {};
          return Object.keys(values).length === entries.length &&
            entries.every(([key, value]) => Object.hasOwn(values, key) && values[key] === value);
        });
        if (existing) {
          return current.map(item => item === existing
            ? { ...item, quantity: normalizeQuantity(product, item.quantity + quantity) }
            : item);
        }
        return [...current, { codigo, quantity, id: crypto.randomUUID(), personalizacoes, catalogSignature: productSignature(product) }];
      });
      return true;
    },
    [productsByCode, setItems],
  );

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => itemKey(item) !== id));
  }, [setItems]);

  const updateQuantity = useCallback((id: string, rawQuantity: number) => {
    const quantity = Number.parseInt(String(rawQuantity), 10);
    if (!Number.isFinite(quantity) || quantity < 1) {
      remove(id);
      return;
    }
    setItems(current => current.map(item => {
      if (itemKey(item) !== id) return item;
      const product = productsByCode.get(item.codigo);
      return product ? { ...item, quantity: normalizeQuantity(product, quantity) } : item;
    }));
  }, [productsByCode, remove, setItems]);

  const configure = useCallback((id: string, values: Record<string, string>) => {
    setItems(current => current.map(item => {
      if (itemKey(item) !== id) return item;
      const product = productsByCode.get(item.codigo);
      return product ? {
        ...item,
        personalizacoes: values,
        quantity: normalizeQuantity(product, item.quantity),
        catalogSignature: productSignature(product),
      } : item;
    }));
  }, [productsByCode, setItems]);

  const clear = useCallback(() => setItems(() => []), [setItems]);
  const summary = useMemo(() => summarizeCart(items, productsByCode), [items, productsByCode]);

  return { items, summary, total: summary.total, count: summary.count, add, remove, updateQuantity, configure, clear };
}
