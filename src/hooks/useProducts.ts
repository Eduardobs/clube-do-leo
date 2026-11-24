import { useCallback, useEffect, useState } from 'react';
import { fetchProducts } from '../lib/products';
import type { Product } from '../types/product';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    async function load() {
      try {
        const catalog = await fetchProducts(controller.signal);
        if (!controller.signal.aborted) setProducts(catalog);
      } catch (reason) {
        if (!controller.signal.aborted) {
          console.error('Erro ao carregar produtos:', reason);
          setFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt(current => current + 1), []);
  return { products, loading, failed, retry };
}
