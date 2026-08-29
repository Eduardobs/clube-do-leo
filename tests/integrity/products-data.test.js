import { describe, it, expect } from 'vitest';

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const CONFIG = require(path.join(ROOT_DIR, 'src', 'config', 'store.js'));
const data = require(path.join(ROOT_DIR, 'data', 'products.json'));

describe('data/products.json integrity', () => {
  it('has a top-level "produtos" array', () => {
    expect(Array.isArray(data.produtos)).toBe(true);
    expect(data.produtos.length).toBeGreaterThan(0);
  });

  it('every product has a well-formed codigo, nome and valor', () => {
    data.produtos.forEach((product) => {
      expect(typeof product.codigo).toBe('string');
      expect(product.codigo.trim()).not.toBe('');
      expect(typeof product.nome).toBe('string');
      expect(product.nome.trim()).not.toBe('');
      expect(typeof product.valor).toBe('number');
      expect(Number.isNaN(product.valor)).toBe(false);
      expect(product.valor).toBeGreaterThanOrEqual(0);
    });
  });

  it('every product has at least one categoria, taken from CONFIG.categorias', () => {
    data.produtos.forEach((product) => {
      expect(Array.isArray(product.categorias)).toBe(true);
      expect(product.categorias.length).toBeGreaterThan(0);
      product.categorias.forEach((categoria) => {
        expect(CONFIG.categorias).toContain(categoria);
      });
    });
  });

  it('has no duplicate product codes', () => {
    const codes = data.produtos.map((p) => p.codigo);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('every referenced image file exists on disk', () => {
    const missing = [];
    data.produtos.forEach((product) => {
      (product.imagens || []).forEach((imagePath) => {
        if (!fs.existsSync(path.join(ROOT_DIR, imagePath))) {
          missing.push(`${product.codigo}: ${imagePath}`);
        }
      });
    });
    expect(missing).toEqual([]);
  });

  it('imagens, when present, is always an array of non-empty strings', () => {
    data.produtos.forEach((product) => {
      expect(Array.isArray(product.imagens)).toBe(true);
      product.imagens.forEach((img) => {
        expect(typeof img).toBe('string');
        expect(img.trim()).not.toBe('');
      });
    });
  });

  it('does not contain subcategorias', () => {
    data.produtos.forEach((product) => {
      expect(product).not.toHaveProperty('subcategorias');
    });
  });
});
