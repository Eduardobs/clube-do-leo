import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
const { loadApp } = require('../helpers/loadApp');

const SAMPLE_PRODUCTS = [
  { codigo: 'LEM-001', nome: 'Chaveiro de acrílico', valor: 2.5, categorias: ['Lembrancinhas'], imagens: [] },
  { codigo: 'FES-001', nome: 'Tubo lata personalizado', valor: 10, categorias: ['Festas'], imagens: [] },
];

function setDom() {
  document.body.innerHTML = `
    <div id="toast" class="hidden"></div>
    <div id="cart-items"></div>
    <div id="cart-total"></div>
    <div id="cart-count"></div>
  `;
}

describe('WhatsAppManager', () => {
  let WhatsAppManager, CartManager, ProductManager, whatsappManager, cartManager, productManager, openSpy;

  beforeEach(() => {
    sessionStorage.clear();
    setDom();
    ({ WhatsAppManager, CartManager, ProductManager } = loadApp());

    productManager = new ProductManager();
    productManager.products = SAMPLE_PRODUCTS;
    globalThis.productManager = productManager;

    cartManager = new CartManager();
    globalThis.cartManager = cartManager;

    whatsappManager = new WhatsAppManager();
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the WhatsApp number from CONFIG', () => {
    expect(whatsappManager.whatsappNumber).toBe(globalThis.CONFIG.whatsapp.number);
  });

  describe('consultarProduto', () => {
    it('opens a WhatsApp link asking about the product', () => {
      whatsappManager.consultarProduto('LEM-001');

      expect(openSpy).toHaveBeenCalledTimes(1);
      const [url, target] = openSpy.mock.calls[0];
      expect(url).toContain(`https://wa.me/${globalThis.CONFIG.whatsapp.number}?text=`);
      expect(decodeURIComponent(url.split('text=')[1])).toContain('Chaveiro de acrílico');
      expect(target).toBe('_blank');
    });

    it('does nothing for an unknown product', () => {
      whatsappManager.consultarProduto('NOPE');
      expect(openSpy).not.toHaveBeenCalled();
    });
  });

  describe('sendOrder', () => {
    it('refuses to send and shows a toast when the cart is empty', () => {
      const result = whatsappManager.sendOrder('Maria');

      expect(result).toBe(false);
      expect(openSpy).not.toHaveBeenCalled();
      expect(document.getElementById('toast').textContent).toContain('vazio');
    });

    it('builds the order message, opens WhatsApp and clears the cart on success', () => {
      cartManager.addToCart('LEM-001', 2); // 2.5 * 2 = 5
      cartManager.addToCart('FES-001', 1); // 10 * 1 = 10

      const result = whatsappManager.sendOrder('  Maria  ');

      expect(result).toBe(true);
      expect(openSpy).toHaveBeenCalledTimes(1);

      const message = decodeURIComponent(openSpy.mock.calls[0][0].split('text=')[1]);
      expect(message).toContain('Chaveiro de acrílico');
      expect(message).toContain('Tubo lata personalizado');
      expect(message).toContain('Total: R$ 15,00');
      expect(message).toContain('*Cliente:* Maria');
      expect(message).not.toContain('  Maria');

      expect(cartManager.cart).toEqual([]);
    });
  });
});
