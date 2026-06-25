class CartManager {
  constructor() {
    this.cart = JSON.parse(sessionStorage.getItem('cart')) || [];
  }

  addToCart(codigo, quantity = 1) {
    quantity = parseInt(quantity, 10);
    if (isNaN(quantity) || quantity < 1) quantity = 1;

    const product = productManager.getProduct(codigo);
    if (!product) return;

    const existingItem = this.cart.find((item) => item.codigo === codigo);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.cart.push({ codigo, quantity });
    }

    this.saveCart();
    this.renderCart();
    this.showToast(`${product.nome} adicionado ao carrinho!`);
  }

  removeFromCart(codigo) {
    this.cart = this.cart.filter((item) => item.codigo !== codigo);
    this.saveCart();
    this.renderCart();
  }

  updateQuantity(codigo, quantity) {
    quantity = parseInt(quantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      this.removeFromCart(codigo);
      return;
    }
    const item = this.cart.find((item) => item.codigo === codigo);
    if (item) {
      item.quantity = quantity;
      this.saveCart();
      this.renderCart();
    }
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
    this.renderCart();
  }

  saveCart() {
    sessionStorage.setItem('cart', JSON.stringify(this.cart));
  }

  getTotal() {
    return this.cart.reduce((total, item) => {
      const product = productManager.getProduct(item.codigo);
      return product ? total + product.valor * item.quantity : total;
    }, 0);
  }

  getItemCount() {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
  }

  renderCart() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartCount = document.getElementById('cart-count');

    if (this.cart.length === 0) {
      cartItems.innerHTML = '<p class="empty-state">Seu carrinho está vazio. Adicione produtos para continuar!</p>';
    } else {
      cartItems.innerHTML = this.cart
        .map((item) => {
          const product = productManager.getProduct(item.codigo);
          if (!product) return '';
          const itemTotal = product.valor * item.quantity;
          return `
          <div class="cart-item">
            <img src="${product.imagens?.[0] || ''}" alt="${Utils.escapeHtml(product.nome)}" loading="lazy" onerror="this.src='assets/logo_sem_descricao.png'">
            <div class="cart-item__details">
              <h4>${Utils.escapeHtml(product.nome)}</h4>
              <p>${Utils.formatPrice(product.valor)} x ${item.quantity} = ${Utils.formatPrice(itemTotal)}</p>
            </div>
            <div class="cart-item__actions">
              <input type="number" value="${item.quantity}" min="1" data-action="update-quantity" data-codigo="${item.codigo}">
              <button type="button" class="btn-icon" data-action="remove" data-codigo="${item.codigo}" aria-label="Remover item">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        `;
        })
        .join('');
    }

    cartTotal.textContent = Utils.formatPrice(this.getTotal());
    cartCount.textContent = this.getItemCount();
  }

  openCart() {
    document.getElementById('cart-modal').classList.remove('hidden');
  }

  closeCart() {
    document.getElementById('cart-modal').classList.add('hidden');
  }
}

const cartManager = new CartManager();

if (typeof module !== 'undefined') module.exports = { CartManager, cartManager };
