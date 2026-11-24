import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STORE_CONFIG } from '../../src/config/store';
import { useCart } from '../../src/features/cart/useCart';
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

  it('migra somente campos de carrinho e remove cópias legadas após salvar', () => {
    const legacy = JSON.stringify([{ codigo: ' 1 ', quantity: 2, id: {}, catalogSignature: 12,
      cliente: 'Nome de teste', personalizacoes: { nome: 'Léo', cor: [] } }]);
    localStorage.setItem('cart', legacy);
    sessionStorage.setItem('cart', legacy);
    const { result } = renderHook(() => useCart([product]));
    const expected = [{ codigo: '1', quantity: 2, personalizacoes: { nome: 'Léo' } }];
    expect(result.current.items).toEqual(expected);
    for (const storage of [localStorage, sessionStorage]) {
      expect(JSON.parse(storage.getItem('clubeDoLeo.cart')!)).toEqual(expected);
      expect(storage.getItem('cart')).toBeNull();
    }
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

it('agrupa configurações equivalentes mesmo quando as chaves chegam em outra ordem', () => {
  const products = [{
    ...product,
    personalizacoes: [{ id: 'cor', label: 'Cor' }, { id: 'nome', label: 'Nome' }],
  }];
  const { result } = renderHook(() => useCart(products));
  act(() => {
    result.current.add('1', 2, { nome: 'Ana', cor: 'Azul' });
    result.current.add('1', 1, { cor: 'Azul', nome: 'Ana' });
  });
  expect(result.current.items).toHaveLength(1);
  expect(result.current.summary).toMatchObject({ count: 3, total: 30, canCheckout: true });
});

it('usa os itens sincronizados de outra aba como base para a próxima alteração', () => {
  const products = [product];
  const { result } = renderHook(() => useCart(products));
  act(() => {
    localStorage.setItem('clubeDoLeo.cart', JSON.stringify([{ codigo: '1', quantity: 4 }]));
    window.dispatchEvent(new StorageEvent('storage', { key: 'clubeDoLeo.cart' }));
    result.current.add('1', 2);
  });
  expect(result.current.summary.count).toBe(6);
  expect(JSON.parse(localStorage.getItem('clubeDoLeo.cart')!)).toMatchObject([{ codigo: '1', quantity: 6 }]);
});

it('descarta a cópia da sessão quando os dados do site são apagados em outra aba', () => {
  const { result } = renderHook(() => useCart([product]));
  act(() => result.current.add('1', 2));
  act(() => {
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }));
  });
  expect(result.current.items).toEqual([]);
  expect(sessionStorage.getItem('clubeDoLeo.cart')).toBeNull();
  expect(localStorage.getItem('clubeDoLeo.cart')).toBeNull();
});
