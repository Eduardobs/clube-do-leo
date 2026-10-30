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
    act(() => result.current.add(product.codigo, 10000));
    expect(result.current.items).toMatchObject([{ codigo: '1', quantity: STORE_CONFIG.maxQuantityPerProduct }]);
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

it('separa personalizações, respeita incrementos e permite editar somente uma linha', () => {
  const configured: Product = { ...product, quantidadeMinima: 20, incremento: 5, personalizacoes: [{ id: 'nome', label: 'Nome', required: true, maxLength: 30 }] };
  const { result } = renderHook(() => useCart([configured]));
  act(() => { expect(result.current.add('1', 1)).toBe(false); result.current.add('1', 21, { nome: 'Ana' }); result.current.add('1', 20, { nome: 'Leo' }); });
  expect(result.current.items.map(i => i.quantity)).toEqual([25, 20]);
  const id = result.current.items[0].id!;
  act(() => result.current.configure(id, { nome: 'Maria' }));
  expect(result.current.items.map(i => i.personalizacoes?.nome)).toEqual(['Maria', 'Leo']);
  act(() => result.current.updateQuantity(id, 26));
  expect(result.current.items.map(i => i.quantity)).toEqual([30, 20]);
  act(() => result.current.remove(id));
  expect(result.current.items).toHaveLength(1);
});

it('preserva consulta legada mas impede nova adição ao carrinho', () => {
  localStorage.setItem('cart', '[]');
  localStorage.setItem('clubeDoLeo.cart', JSON.stringify([{ codigo: '1', quantity: 2 }]));
  const { result } = renderHook(() => useCart([{ ...product, modalidadePreco: 'consulta', valor: 20 }]));
  expect(result.current.total).toBe(0);
  expect(result.current.items).toHaveLength(1);
  act(() => expect(result.current.add('1')).toBe(false));
});

it('recalcula a contagem após carregar o catálogo e exclui produtos removidos', () => {
  localStorage.setItem('clubeDoLeo.cart', JSON.stringify([{ codigo: '1', quantity: 2 }, { codigo: 'removido', quantity: 3 }]));
  const { result, rerender } = renderHook(({ products }) => useCart(products), { initialProps: { products: [] as Product[] } });
  expect(result.current.count).toBe(0);
  rerender({ products: [product] });
  expect(result.current.count).toBe(2);
  expect(result.current.items).toHaveLength(2);
});
