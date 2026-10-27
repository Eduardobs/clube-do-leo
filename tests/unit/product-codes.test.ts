import { describe, expect, it } from 'vitest';
import { normalizeProductCode, parseProductsFile, serializeProducts } from '../../src/lib/products';

const product = { codigo: 12, nome: 'Produto', valor: 10, categorias: ['Jogos'] };

describe('códigos inteiros de produtos', () => {
  it.each(['abc', '1.5', '1e2', '-1', '+1', '', ' ', 1.5, -1, null, true, 9007199254740992])('rejeita código inválido %s', codigo => {
    expect(normalizeProductCode(codigo)).toBeNull();
    expect(() => parseProductsFile({ produtos: [{ ...product, codigo }] })).toThrow();
  });

  it('aceita JSON numérico e converte códigos antigos na exportação', () => {
    const parsed = parseProductsFile({ produtos: [product, { ...product, codigo: '002' }] });
    expect(parsed.produtos.map(p => p.codigo)).toEqual(['12', '2']);
    expect(JSON.parse(serializeProducts(parsed.produtos)).produtos.map((p: { codigo: number }) => p.codigo)).toEqual([12, 2]);
  });

  it('rejeita duplicatas com zeros à esquerda', () => {
    expect(() => parseProductsFile({ produtos: [product, { ...product, codigo: '012' }] })).toThrow(/duplicados/);
  });
});
