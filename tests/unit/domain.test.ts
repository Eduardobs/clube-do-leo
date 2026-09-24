import { describe, expect, it } from 'vitest';
import { formatPrice, normalizeSearchText, slugify } from '../../src/lib/format';
import { cartItemCount, cartTotal, parseProductsFile } from '../../src/lib/products';
import { buildConsultationMessage, buildDetailedOrderMessage, buildOrderMessage } from '../../src/lib/whatsapp';
import type { Product } from '../../src/types/product';

const products: Product[] = [
  { codigo: '1', nome: 'Produto A', descricao: '', valor: 12.5, imagens: [], categorias: ['Jogos'] },
  { codigo: '2', nome: 'Produto B', descricao: '', valor: 10, imagens: [], categorias: ['Brinquedos'] },
];

describe('domínio do catálogo', () => {
  it('valida e normaliza products.json', () => {
    expect(parseProductsFile({ produtos: products }).produtos).toEqual(products);
    expect(() => parseProductsFile({ items: [] })).toThrow('chave "produtos"');
    expect(() => parseProductsFile({ produtos: [{ ...products[0], categorias: ['Inválida'] }] })).toThrow('produtos inválidos');
    expect(() => parseProductsFile({ produtos: [products[0], products[0]] })).toThrow('duplicados');
  });

  it('formata preços e mantém itens sob consulta', () => {
    expect(formatPrice(12.5)).toBe('R$ 12,50');
    expect(formatPrice(1234.5)).toBe('R$ 1.234,50');
    expect(formatPrice(0)).toBe('Sob consulta');
  });

  it('normaliza buscas e endereços sem depender de acentos', () => {
    expect(normalizeSearchText('  Presépio com Três Peças  ')).toBe('presepio com tres pecas');
    expect(slugify('Maçã & Chaveiro')).toBe('maca-chaveiro');
  });

  it('calcula total e quantidade ignorando produtos removidos do catálogo', () => {
    const cart = [{ codigo: '1', quantity: 2 }, { codigo: 'ausente', quantity: 4 }];
    expect(cartTotal(cart, products)).toBe(25);
    expect(cartItemCount(cart)).toBe(6);
  });

  it('gera mensagens de consulta e pedido para WhatsApp', () => {
    expect(buildConsultationMessage(products[0])).toContain('Produto A');
    const message = buildOrderMessage('  Maria  ', [{ codigo: '1', quantity: 2 }], products);
    expect(message).toContain('2 x R$ 12,50 = R$ 25,00');
    expect(message).toContain('*Cliente:* Maria');
    const detailed = buildDetailedOrderMessage(
      { orderId: 'CDL-20260924-ABC', customerName: 'Maria', notes: 'Azul' },
      [{ codigo: '1', quantity: 2 }],
      products,
    );
    expect(detailed).toContain('*Referência:* CDL-20260924-ABC');
    expect(detailed).toContain('*Subtotal estimado: R$ 25,00*');
    expect(detailed).toContain('*Observações:* Azul');
  });
});
