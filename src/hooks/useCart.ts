import { useCallback, useEffect, useMemo, useState } from 'react';
import { STORE_CONFIG } from '../config/store';
import type { CartItem, Product } from '../types/product';
import { cartItemCount, cartTotal, findProduct } from '../lib/products';

const STORAGE_KEY = 'clubeDoLeo.cart';

function readCart(): CartItem[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem('cart');
    if (!stored) return [];
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is CartItem =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as CartItem).codigo === 'string' &&
        Number.isInteger((item as CartItem).quantity) &&
        (item as CartItem).quantity > 0,
    ).map((item) => ({
      codigo: item.codigo.trim(),
      quantity: Math.min(item.quantity, STORE_CONFIG.maxQuantityPerProduct),
    }));
  } catch {
    return [];
  }
}

export function useCart(products: Product[], catalogReady = true) {
  const [items, setItemsState] = useState<CartItem[]>(readCart);

  const setItems = useCallback((updater: (current: CartItem[]) => CartItem[]) => {
    setItemsState((current) => {
      const next = updater(current);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (reason) {
        console.warn('Não foi possível persistir o carrinho nesta sessão:', reason);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!catalogReady) return;
    const productCodes = new Set(products.map((product) => product.codigo));
    setItems((current) => {
      const next = current.filter((item) => productCodes.has(item.codigo));
      return next.length === current.length ? current : next;
    });
  }, [catalogReady, products, setItems]);

  const add = useCallback(
    (codigo: string, rawQuantity = 1) => {
      if (!findProduct(products, codigo)) return false;
      const parsed = Number.parseInt(String(rawQuantity), 10);
      const quantity = Math.min(
        Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
        STORE_CONFIG.maxQuantityPerProduct,
      );
      setItems((current) => {
        const existing = current.find((item) => item.codigo === codigo);
        return existing
          ? current.map((item) =>
              item.codigo === codigo
                ? { ...item, quantity: Math.min(item.quantity + quantity, STORE_CONFIG.maxQuantityPerProduct) }
                : item,
            )
          : [...current, { codigo, quantity }];
      });
      return true;
    },
    [products, setItems],
  );

  const remove = useCallback((codigo: string) => {
    setItems((current) => current.filter((item) => item.codigo !== codigo));
  }, [setItems]);

  const updateQuantity = useCallback((codigo: string, rawQuantity: number) => {
    const quantity = Number.parseInt(String(rawQuantity), 10);
    setItems((current) =>
      !Number.isFinite(quantity) || quantity < 1
        ? current.filter((item) => item.codigo !== codigo)
        : current.map((item) => (
          item.codigo === codigo
            ? { ...item, quantity: Math.min(quantity, STORE_CONFIG.maxQuantityPerProduct) }
            : item
        )),
    );
  }, [setItems]);

  const clear = useCallback(() => setItems(() => []), [setItems]);
  const total = useMemo(() => cartTotal(items, products), [items, products]);
  const count = useMemo(() => cartItemCount(items), [items]);

  return { items, total, count, add, remove, updateQuantity, clear };
}
