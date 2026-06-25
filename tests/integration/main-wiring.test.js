import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const path = require('node:path');
const { loadApp, JS_DIR } = require('../helpers/loadApp');
const { readBodyFixture } = require('../helpers/htmlFixture');

let app;

// jsdom doesn't implement IntersectionObserver; stub it so main.js's
// infinite-scroll wiring can be exercised and the triggering callback
// inspected, instead of erroring out or silently falling back.
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.observedTargets = [];
    MockIntersectionObserver.lastInstance = this;
  }
  observe(target) {
    this.observedTargets.push(target);
  }
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = MockIntersectionObserver;

// Exercises the real index.html markup + main.js wiring together, so a typo
// in either an element id or an event handler shows up as a failing test
// instead of a silently broken page in production.
beforeEach(async () => {
  document.body.innerHTML = readBodyFixture('index.html');
  app = loadApp();

  vi.spyOn(app.productManager, 'setSearch').mockImplementation(() => {});
  vi.spyOn(app.productManager, 'setCategory').mockImplementation(() => {});
  vi.spyOn(app.productManager, 'showProductDetail').mockImplementation(() => {});
  vi.spyOn(app.productManager, 'closeProductDetail').mockImplementation(() => {});
  vi.spyOn(app.productManager, 'loadProducts').mockResolvedValue();
  vi.spyOn(app.productManager, 'loadMoreProducts').mockImplementation(() => {});
  vi.spyOn(app.cartManager, 'addToCart').mockImplementation(() => {});
  vi.spyOn(app.cartManager, 'removeFromCart').mockImplementation(() => {});
  vi.spyOn(app.cartManager, 'updateQuantity').mockImplementation(() => {});
  vi.spyOn(app.cartManager, 'clearCart').mockImplementation(() => {});
  vi.spyOn(app.cartManager, 'openCart').mockImplementation(() => {});
  vi.spyOn(app.cartManager, 'closeCart').mockImplementation(() => {});
  vi.spyOn(app.cartManager, 'showToast').mockImplementation(() => {});
  vi.spyOn(app.cartManager, 'renderCart').mockImplementation(() => {});
  app.cartManager.cart = [];
  vi.spyOn(app.whatsappManager, 'consultarProduto').mockImplementation(() => {});
  vi.spyOn(app.whatsappManager, 'sendOrder').mockReturnValue(true);

  // require() caches main.js after the first call in this file, so the
  // DOMContentLoaded listener is registered exactly once on this document.
  require(path.join(JS_DIR, 'main.js'));
  document.dispatchEvent(new Event('DOMContentLoaded'));

  // The handler is async and does its DOM wiring after `await loadProducts()`;
  // flush the microtask queue so that wiring has happened before assertions run.
  await new Promise((resolve) => setTimeout(resolve, 0));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('main.js DOM wiring (index.html)', () => {
  it('sets the footer year and loads products on boot', () => {
    expect(document.getElementById('year').textContent).toBe(String(new Date().getFullYear()));
    expect(app.productManager.loadProducts).toHaveBeenCalledTimes(1);
  });

  it('observes the load-more sentinel for infinite scroll', () => {
    const sentinel = document.getElementById('load-more-sentinel');
    expect(MockIntersectionObserver.lastInstance.observedTargets).toContain(sentinel);
  });

  it('loads more products when the sentinel becomes visible', () => {
    MockIntersectionObserver.lastInstance.callback([{ isIntersecting: true }]);
    expect(app.productManager.loadMoreProducts).toHaveBeenCalled();
  });

  it('does not load more products when the sentinel is not intersecting', () => {
    MockIntersectionObserver.lastInstance.callback([{ isIntersecting: false }]);
    expect(app.productManager.loadMoreProducts).not.toHaveBeenCalled();
  });

  it('wires the search input to productManager.setSearch', () => {
    const input = document.getElementById('search-input');
    input.value = 'chaveiro';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.productManager.setSearch).toHaveBeenCalledWith('chaveiro');
  });

  it('wires category filter pills to productManager.setCategory', () => {
    document.getElementById('category-filters').innerHTML =
      '<button type="button" class="filter-pill" data-category="Festas">Festas</button>';
    document.querySelector('.filter-pill').click();
    expect(app.productManager.setCategory).toHaveBeenCalledWith('Festas');
  });

  it('delegates product-list button clicks by data-action', () => {
    document.getElementById('product-list').innerHTML = `
      <button type="button" data-action="detail" data-codigo="LEM-001">Ver</button>
      <button type="button" data-action="add" data-codigo="LEM-001">Add</button>
      <button type="button" data-action="consult" data-codigo="LEM-002">Consultar</button>
    `;
    const [detailBtn, addBtn, consultBtn] = document.querySelectorAll('#product-list button');

    detailBtn.click();
    expect(app.productManager.showProductDetail).toHaveBeenCalledWith('LEM-001');

    addBtn.click();
    expect(app.cartManager.addToCart).toHaveBeenCalledWith('LEM-001', 1);

    consultBtn.click();
    expect(app.whatsappManager.consultarProduto).toHaveBeenCalledWith('LEM-002');
  });

  it('opens the cart modal from the cart button', () => {
    document.getElementById('cart-btn').click();
    expect(app.cartManager.openCart).toHaveBeenCalled();
  });

  it('wires cart item remove/update controls', () => {
    document.getElementById('cart-items').innerHTML = `
      <button type="button" data-action="remove" data-codigo="LEM-001">x</button>
      <input data-action="update-quantity" data-codigo="LEM-001" value="3">
    `;
    document.querySelector('#cart-items button[data-action="remove"]').click();
    expect(app.cartManager.removeFromCart).toHaveBeenCalledWith('LEM-001');

    const qtyInput = document.querySelector('#cart-items input[data-action="update-quantity"]');
    qtyInput.value = '5';
    qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
    expect(app.cartManager.updateQuantity).toHaveBeenCalledWith('LEM-001', '5');
  });

  it('wires the clear-cart button', () => {
    document.getElementById('clear-cart-btn').click();
    expect(app.cartManager.clearCart).toHaveBeenCalled();
  });

  it('shows a toast instead of checking out when the cart is empty', () => {
    app.cartManager.cart = [];
    document.getElementById('finalize-btn').click();
    expect(app.cartManager.showToast).toHaveBeenCalled();
    expect(document.getElementById('checkout-modal').classList.contains('hidden')).toBe(true);
  });

  it('closes the cart and opens checkout when the cart has items', () => {
    app.cartManager.cart = [{ codigo: 'LEM-001', quantity: 1 }];
    document.getElementById('finalize-btn').click();
    expect(app.cartManager.closeCart).toHaveBeenCalled();
    expect(document.getElementById('checkout-modal').classList.contains('hidden')).toBe(false);
  });

  it('sends the order and resets the form on a successful checkout submit', () => {
    document.getElementById('checkout-modal').classList.remove('hidden');
    const nameInput = document.getElementById('customer-name');
    nameInput.value = 'Maria';

    document
      .getElementById('checkout-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(app.whatsappManager.sendOrder).toHaveBeenCalledWith('Maria');
    expect(document.getElementById('checkout-modal').classList.contains('hidden')).toBe(true);
    expect(nameInput.value).toBe('');
  });

  it('keeps the checkout form open when sendOrder reports failure', () => {
    app.whatsappManager.sendOrder.mockReturnValue(false);
    document.getElementById('checkout-modal').classList.remove('hidden');
    const nameInput = document.getElementById('customer-name');
    nameInput.value = 'Maria';

    document
      .getElementById('checkout-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(document.getElementById('checkout-modal').classList.contains('hidden')).toBe(false);
    expect(nameInput.value).toBe('Maria');
  });

  it('closes every open modal on Escape', () => {
    document.getElementById('cart-modal').classList.remove('hidden');
    document.getElementById('checkout-modal').classList.remove('hidden');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(document.getElementById('cart-modal').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('checkout-modal').classList.contains('hidden')).toBe(true);
  });

  it('closes a modal when a [data-close] element inside it is clicked', () => {
    const modal = document.getElementById('cart-modal');
    modal.classList.remove('hidden');
    modal.querySelector('[data-close]').click();
    expect(modal.classList.contains('hidden')).toBe(true);
  });

  describe('product detail interactions', () => {
    beforeEach(() => {
      document.getElementById('product-detail').innerHTML = `
        <div class="product-detail__gallery">
          <img id="detail-main-image" src="a.jpg">
          <div class="product-detail__thumbs">
            <button type="button" class="product-detail__thumb is-active" data-image="a.jpg"><img></button>
            <button type="button" class="product-detail__thumb" data-image="b.jpg"><img></button>
          </div>
        </div>
        <div class="quantity-stepper">
          <button type="button" data-step="-1">-</button>
          <input type="number" id="detail-quantity" value="1" min="1">
          <button type="button" data-step="1">+</button>
        </div>
        <button type="button" data-action="add" data-codigo="LEM-001">Adicionar</button>
        <button type="button" data-action="consult" data-codigo="LEM-002">Consultar</button>
      `;
    });

    it('switches the main image and active thumb when a thumbnail is clicked', () => {
      document.querySelector('button[data-image="b.jpg"]').click();
      expect(document.getElementById('detail-main-image').src).toContain('b.jpg');
      expect(document.querySelector('button[data-image="b.jpg"]').classList.contains('is-active')).toBe(true);
      expect(document.querySelector('button[data-image="a.jpg"]').classList.contains('is-active')).toBe(false);
    });

    it('increments and clamps the quantity stepper to a minimum of 1', () => {
      const qty = document.getElementById('detail-quantity');
      document.querySelector('button[data-step="1"]').click();
      expect(qty.value).toBe('2');

      qty.value = '1';
      document.querySelector('button[data-step="-1"]').click();
      document.querySelector('button[data-step="-1"]').click();
      expect(qty.value).toBe('1');
    });

    it('adds the product with the current quantity and closes the detail modal', () => {
      document.getElementById('detail-quantity').value = '4';
      document.querySelector('button[data-action="add"]').click();

      expect(app.cartManager.addToCart).toHaveBeenCalledWith('LEM-001', '4');
      expect(app.productManager.closeProductDetail).toHaveBeenCalled();
    });

    it('asks about the product on WhatsApp from the detail panel', () => {
      document.querySelector('button[data-action="consult"]').click();
      expect(app.whatsappManager.consultarProduto).toHaveBeenCalledWith('LEM-002');
    });
  });
});
