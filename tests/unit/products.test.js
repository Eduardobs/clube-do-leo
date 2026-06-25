import { describe, it, expect, beforeEach, vi } from 'vitest';
const { loadApp } = require('../helpers/loadApp');

const SAMPLE_PRODUCTS = [
  { codigo: 'LEM-001', nome: 'Chaveiro de acrílico', valor: 2.5, categorias: ['Lembrancinhas'], imagens: ['images/products/a.jpg'] },
  { codigo: 'FES-001', nome: 'Tubo lata personalizado', valor: 10, categorias: ['Festas'], imagens: [] },
  { codigo: 'LEM-004', nome: 'Kit cores personalizado', valor: 0, categorias: ['Lembrancinhas'], imagens: [] },
];

function setProductsDom() {
  document.body.innerHTML = `
    <div id="error-message" class="hidden"></div>
    <div id="loading-spinner"></div>
    <div id="category-filters"></div>
    <div id="product-list"></div>
    <div id="product-detail"></div>
    <div id="product-detail-modal" class="modal hidden"></div>
  `;
}

describe('ProductManager', () => {
  let ProductManager, productManager;

  beforeEach(() => {
    setProductsDom();
    ({ ProductManager } = loadApp());
    productManager = new ProductManager();
    globalThis.productManager = productManager;
  });

  describe('loadProducts', () => {
    it('loads and renders products on success', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ produtos: SAMPLE_PRODUCTS }),
      });

      await productManager.loadProducts();

      expect(productManager.products).toEqual(SAMPLE_PRODUCTS);
      expect(document.getElementById('product-list').children.length).toBe(SAMPLE_PRODUCTS.length);
      expect(document.getElementById('error-message').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('loading-spinner').classList.contains('hidden')).toBe(true);
    });

    it('shows an error message and clears the list on HTTP failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });

      await productManager.loadProducts();

      expect(document.getElementById('error-message').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('product-list').innerHTML).toBe('');
    });

    it('shows an error message when the JSON payload is malformed', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ wrongKey: [] }) });

      await productManager.loadProducts();

      expect(document.getElementById('error-message').classList.contains('hidden')).toBe(false);
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      productManager.products = SAMPLE_PRODUCTS;
      productManager.filteredProducts = [...SAMPLE_PRODUCTS];
    });

    it('filters by name, case-insensitively', () => {
      productManager.setSearch('TUBO');
      expect(productManager.filteredProducts.map((p) => p.codigo)).toEqual(['FES-001']);
    });

    it('filters by category', () => {
      productManager.setCategory('Festas');
      expect(productManager.filteredProducts.map((p) => p.codigo)).toEqual(['FES-001']);
    });

    it('combines search and category filters', () => {
      productManager.setCategory('Lembrancinhas');
      productManager.setSearch('kit');
      expect(productManager.filteredProducts.map((p) => p.codigo)).toEqual(['LEM-004']);
    });

    it('renders the empty state when no product matches', () => {
      productManager.setSearch('does-not-exist');
      expect(document.getElementById('product-list').textContent).toContain('Nenhum produto encontrado');
    });
  });

  it('getProduct finds a product by codigo or returns undefined', () => {
    productManager.products = SAMPLE_PRODUCTS;
    expect(productManager.getProduct('LEM-001')).toBe(SAMPLE_PRODUCTS[0]);
    expect(productManager.getProduct('NOPE')).toBeUndefined();
  });

  describe('renderProducts', () => {
    beforeEach(() => {
      productManager.products = SAMPLE_PRODUCTS;
      productManager.filteredProducts = [...SAMPLE_PRODUCTS];
    });

    it('escapes product names so injected markup cannot execute', () => {
      productManager.filteredProducts = [
        { codigo: 'X', nome: '<img src=x onerror=alert(1)>', valor: 1, categorias: ['Lembrancinhas'], imagens: [] },
      ];
      productManager.renderProducts();

      const list = document.getElementById('product-list');
      // Only the product's own (legitimate) thumbnail <img> should exist;
      // an unescaped nome would inject a second one.
      expect(list.querySelectorAll('img')).toHaveLength(1);
      expect(list.querySelector('.product-card__title').textContent).toBe('<img src=x onerror=alert(1)>');
    });

    it('offers "Adicionar" for priced products and "Consultar" for price-on-request ones', () => {
      productManager.renderProducts();
      expect(document.querySelector('button[data-action="add"][data-codigo="LEM-001"]')).not.toBeNull();
      expect(document.querySelector('button[data-action="consult"][data-codigo="LEM-004"]')).not.toBeNull();
      expect(document.querySelector('button[data-action="consult"][data-codigo="LEM-001"]')).toBeNull();
      expect(document.querySelector('button[data-action="add"][data-codigo="LEM-004"]')).toBeNull();
    });
  });

  describe('product detail', () => {
    beforeEach(() => {
      productManager.products = SAMPLE_PRODUCTS;
    });

    it('does nothing for an unknown product', () => {
      productManager.showProductDetail('NOPE');
      expect(document.getElementById('product-detail').innerHTML).toBe('');
    });

    it('renders the detail panel and opens the modal', () => {
      productManager.showProductDetail('LEM-001');
      expect(document.getElementById('product-detail').innerHTML).toContain('Chaveiro de acrílico');
      expect(document.getElementById('product-detail-modal').classList.contains('hidden')).toBe(false);
    });

    it('closes the detail modal', () => {
      productManager.showProductDetail('LEM-001');
      productManager.closeProductDetail();
      expect(document.getElementById('product-detail-modal').classList.contains('hidden')).toBe(true);
    });
  });
});
