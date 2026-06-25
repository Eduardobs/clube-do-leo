import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
const { loadApp } = require('../helpers/loadApp');

const SAMPLE_PRODUCTS = [
  { codigo: 'LEM-001', nome: 'Chaveiro de acrílico', valor: 2.5, categorias: ['Lembrancinhas'], imagens: [] },
  { codigo: 'LEM-002', nome: 'Lápis preto personalizado', valor: 2.0, categorias: ['Lembrancinhas'], imagens: [] },
  { codigo: 'LEM-004', nome: 'Kit cores personalizado', valor: 0, categorias: ['Lembrancinhas'], imagens: [] },
];

function setCartDom() {
  document.body.innerHTML = `
    <div id="toast" class="hidden"></div>
    <div id="cart-modal" class="hidden"></div>
    <div id="cart-items"></div>
    <div id="cart-total"></div>
    <div id="cart-count"></div>
  `;
}

describe('CartManager', () => {
  let CartManager, ProductManager, cartManager, productManager;

  beforeEach(() => {
    sessionStorage.clear();
    setCartDom();
    ({ CartManager, ProductManager } = loadApp());
    productManager = new ProductManager();
    productManager.products = SAMPLE_PRODUCTS;
    globalThis.productManager = productManager;
    cartManager = new CartManager();
    globalThis.cartManager = cartManager;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts empty when sessionStorage has no cart', () => {
    expect(cartManager.cart).toEqual([]);
  });

  it('restores a previously saved cart from sessionStorage', () => {
    sessionStorage.setItem('cart', JSON.stringify([{ codigo: 'LEM-001', quantity: 3 }]));
    const restored = new CartManager();
    expect(restored.cart).toEqual([{ codigo: 'LEM-001', quantity: 3 }]);
  });

  it('adds a new product to the cart with default quantity 1', () => {
    cartManager.addToCart('LEM-001');
    expect(cartManager.cart).toEqual([{ codigo: 'LEM-001', quantity: 1 }]);
  });

  it('increments quantity when adding an already-present product', () => {
    cartManager.addToCart('LEM-001', 2);
    cartManager.addToCart('LEM-001', 3);
    expect(cartManager.cart).toEqual([{ codigo: 'LEM-001', quantity: 5 }]);
  });

  it('falls back to quantity 1 for invalid quantities', () => {
    cartManager.addToCart('LEM-001', 0);
    expect(cartManager.cart[0].quantity).toBe(1);

    cartManager.addToCart('LEM-002', 'not-a-number');
    expect(cartManager.cart.find((i) => i.codigo === 'LEM-002').quantity).toBe(1);
  });

  it('silently ignores unknown product codes', () => {
    cartManager.addToCart('DOES-NOT-EXIST');
    expect(cartManager.cart).toEqual([]);
  });

  it('removes an item from the cart', () => {
    cartManager.addToCart('LEM-001');
    cartManager.addToCart('LEM-002');
    cartManager.removeFromCart('LEM-001');
    expect(cartManager.cart).toEqual([{ codigo: 'LEM-002', quantity: 1 }]);
  });

  it('updates an existing item quantity', () => {
    cartManager.addToCart('LEM-001');
    cartManager.updateQuantity('LEM-001', 5);
    expect(cartManager.cart[0].quantity).toBe(5);
  });

  it('removes the item when the updated quantity is invalid', () => {
    cartManager.addToCart('LEM-001');
    cartManager.updateQuantity('LEM-001', 0);
    expect(cartManager.cart).toEqual([]);
  });

  it('clears the cart', () => {
    cartManager.addToCart('LEM-001');
    cartManager.clearCart();
    expect(cartManager.cart).toEqual([]);
  });

  it('persists the cart to sessionStorage on every mutation', () => {
    cartManager.addToCart('LEM-001', 2);
    expect(JSON.parse(sessionStorage.getItem('cart'))).toEqual([{ codigo: 'LEM-001', quantity: 2 }]);
  });

  it('computes the total price, skipping items whose product no longer exists', () => {
    cartManager.addToCart('LEM-001', 2); // 2.5 * 2 = 5
    cartManager.addToCart('LEM-002', 1); // 2.0 * 1 = 2
    cartManager.cart.push({ codigo: 'GHOST', quantity: 99 }); // not in catalog, must be ignored

    expect(cartManager.getTotal()).toBe(7);
  });

  it('computes the total item count across all lines', () => {
    cartManager.addToCart('LEM-001', 2);
    cartManager.addToCart('LEM-002', 3);
    expect(cartManager.getItemCount()).toBe(5);
  });

  it('renders an empty-state message when the cart has no items', () => {
    cartManager.renderCart();
    expect(document.getElementById('cart-items').textContent).toContain('vazio');
    expect(document.getElementById('cart-total').textContent).toBe('Sob consulta');
    expect(document.getElementById('cart-count').textContent).toBe('0');
  });

  it('renders item rows with escaped names and the correct total/count', () => {
    cartManager.addToCart('LEM-001', 2);
    cartManager.renderCart();

    const itemsHtml = document.getElementById('cart-items').innerHTML;
    expect(itemsHtml).toContain('Chaveiro de acrílico');
    expect(document.getElementById('cart-total').textContent).toBe('R$ 5,00');
    expect(document.getElementById('cart-count').textContent).toBe('2');
  });

  it('opens and closes the cart modal', () => {
    cartManager.openCart();
    expect(document.getElementById('cart-modal').classList.contains('hidden')).toBe(false);
    cartManager.closeCart();
    expect(document.getElementById('cart-modal').classList.contains('hidden')).toBe(true);
  });

  it('shows a toast and hides it again after the timeout', () => {
    vi.useFakeTimers();
    cartManager.showToast('Produto adicionado!');
    const toast = document.getElementById('toast');
    expect(toast.textContent).toBe('Produto adicionado!');
    expect(toast.classList.contains('hidden')).toBe(false);

    vi.advanceTimersByTime(3000);
    expect(toast.classList.contains('hidden')).toBe(true);
  });
});
