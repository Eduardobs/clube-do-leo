import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STORE_CONFIG } from '../../src/config/store';
import { useCart } from '../../src/hooks/useCart';
import type { Product } from '../../src/types/product';

const product: Product = {
  codigo: '1',
  nome: 'Produto',
  descricao: '',
  valor: 10,
  imagens: [],
  categorias: ['Jogos'],
};

describe('carrinho', () => {
  it('limita quantidades adicionadas', () => {
    const { result } = renderHook(() => useCart([product]));
    act(() => result.current.add(product.codigo, 1000));
    expect(result.current.items).toEqual([{ codigo: '1', quantity: STORE_CONFIG.maxQuantityPerProduct }]);
  });

  it('não apaga itens persistidos enquanto o catálogo está vazio ou incompleto', async () => {
    localStorage.setItem('clubeDoLeo.cart', JSON.stringify([
      { codigo: '1', quantity: 2 },
      { codigo: 'removido', quantity: 1 },
    ]));
    const { result, rerender } = renderHook(
      ({ products }) => useCart(products),
      { initialProps: { products: [] as Product[] } },
    );
    expect(result.current.items).toHaveLength(2);
    rerender({ products: [product] });
    await waitFor(() => expect(result.current.items).toEqual([
      { codigo: '1', quantity: 2 },
      { codigo: 'removido', quantity: 1 },
    ]));
    expect(JSON.parse(localStorage.getItem('clubeDoLeo.cart') ?? '[]')).toEqual([
      { codigo: '1', quantity: 2 },
      { codigo: 'removido', quantity: 1 },
    ]);
  });

  it('migra um carrinho salvo na sessão para o armazenamento persistente', () => {
    sessionStorage.setItem('clubeDoLeo.cart', JSON.stringify([{ codigo: '1', quantity: 2 }]));
    const { result } = renderHook(() => useCart([product]));
    expect(result.current.items).toEqual([{ codigo: '1', quantity: 2 }]);
    expect(JSON.parse(localStorage.getItem('clubeDoLeo.cart') ?? '[]')).toEqual([{ codigo: '1', quantity: 2 }]);
    expect(JSON.parse(sessionStorage.getItem('clubeDoLeo.cart') ?? '[]')).toEqual([{ codigo: '1', quantity: 2 }]);
  });
});
