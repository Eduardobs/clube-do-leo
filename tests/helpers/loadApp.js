const path = require('node:path');

const JS_DIR = path.join(__dirname, '..', '..', 'js');

/**
 * The site's scripts are plain global scripts (no ES modules / bundler),
 * loaded in this exact order by <script> tags in index.html / admin.html.
 * Requiring them here in the same order and exposing them on globalThis
 * reproduces that browser loading order for tests.
 */
function loadApp() {
  // Globals must be assigned right after each require (not batched at the
  // end): whatsapp.js's top-level `new WhatsAppManager()` reads the bare
  // `CONFIG` global as soon as it is required, same as a real <script> load.
  const CONFIG = require(path.join(JS_DIR, 'config.js'));
  globalThis.CONFIG = CONFIG;

  const Utils = require(path.join(JS_DIR, 'utils.js'));
  globalThis.Utils = Utils;

  const { ProductManager, productManager } = require(path.join(JS_DIR, 'products.js'));
  globalThis.ProductManager = ProductManager;
  globalThis.productManager = productManager;

  const { CartManager, cartManager } = require(path.join(JS_DIR, 'cart.js'));
  globalThis.CartManager = CartManager;
  globalThis.cartManager = cartManager;

  const { WhatsAppManager, whatsappManager } = require(path.join(JS_DIR, 'whatsapp.js'));
  globalThis.WhatsAppManager = WhatsAppManager;
  globalThis.whatsappManager = whatsappManager;

  return { CONFIG, Utils, ProductManager, productManager, CartManager, cartManager, WhatsAppManager, whatsappManager };
}

module.exports = { loadApp, JS_DIR };
