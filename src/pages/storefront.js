document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  await productManager.loadProducts();
  cartManager.renderCart();

  const loadMoreSentinel = document.getElementById('load-more-sentinel');
  if (typeof IntersectionObserver === 'undefined') {
    while (productManager.hasMoreProducts()) productManager.loadMoreProducts();
  } else {
    const infiniteScrollObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) productManager.loadMoreProducts();
      },
      { rootMargin: '300px' }
    );
    infiniteScrollObserver.observe(loadMoreSentinel);
  }

  document.getElementById('search-input').addEventListener('input', (e) => {
    productManager.setSearch(e.target.value);
  });

  document.querySelector('.header-pills').addEventListener('click', (e) => {
    const button = e.target.closest('.header-pill[data-category]');
    if (!button) return;
    const category = productManager.currentCategory === button.dataset.category ? '' : button.dataset.category;
    productManager.setCategory(category);
  });

  document.getElementById('product-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (btn) {
      const { action, codigo } = btn.dataset;
      if (action === 'add') cartManager.addToCart(codigo, 1);
      if (action === 'consult') whatsappManager.consultarProduto(codigo);
      if (action === 'detail') productManager.showProductDetail(codigo);
      return;
    }

    const card = e.target.closest('.product-card');
    if (card) productManager.showProductDetail(card.dataset.codigo);
  });

  document.getElementById('product-detail').addEventListener('click', (e) => {
    const thumbBtn = e.target.closest('button[data-image]');
    if (thumbBtn) {
      document.getElementById('detail-main-image').src = thumbBtn.dataset.image;
      thumbBtn.parentElement.querySelectorAll('.product-detail__thumb').forEach((thumb) => {
        thumb.classList.toggle('is-active', thumb === thumbBtn);
      });
      return;
    }

    const stepBtn = e.target.closest('button[data-step]');
    if (stepBtn) {
      const input = document.getElementById('detail-quantity');
      input.value = Math.max(1, parseInt(input.value || '1', 10) + parseInt(stepBtn.dataset.step, 10));
      return;
    }

    const actionBtn = e.target.closest('button[data-action]');
    if (!actionBtn) return;
    const { action, codigo } = actionBtn.dataset;
    if (action === 'add') {
      const quantity = document.getElementById('detail-quantity')?.value || 1;
      cartManager.addToCart(codigo, quantity);
      productManager.closeProductDetail();
    }
    if (action === 'consult') {
      whatsappManager.consultarProduto(codigo);
    }
  });

  document.getElementById('cart-btn').addEventListener('click', () => cartManager.openCart());

  document.querySelector('.mobile-nav').addEventListener('click', (e) => {
    const action = e.target.closest('[data-mobile-action]')?.dataset.mobileAction;
    if (action === 'cart') cartManager.openCart();
  });

  document.getElementById('toast-cart-action').addEventListener('click', () => cartManager.openCart());

  document.getElementById('cart-items').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="remove"]');
    if (btn) cartManager.removeFromCart(btn.dataset.codigo);
  });

  document.getElementById('cart-items').addEventListener('change', (e) => {
    const input = e.target.closest('input[data-action="update-quantity"]');
    if (input) cartManager.updateQuantity(input.dataset.codigo, input.value);
  });

  document.getElementById('clear-cart-btn').addEventListener('click', () => cartManager.clearCart());

  document.getElementById('finalize-btn').addEventListener('click', () => {
    if (cartManager.cart.length === 0) {
      cartManager.showToast('Carrinho vazio!');
      return;
    }
    cartManager.closeCart();
    document.getElementById('checkout-modal').classList.remove('hidden');
    document.querySelector('#checkout-modal .modal__close')?.focus();
  });

  const checkoutForm = document.getElementById('checkout-form');
  const nameInput = document.getElementById('customer-name');

  nameInput.addEventListener('invalid', () => {
    if (nameInput.validity.valueMissing) {
      nameInput.setCustomValidity('Por favor, informe seu nome.');
    } else if (nameInput.validity.tooShort) {
      nameInput.setCustomValidity('O nome deve ter pelo menos 2 caracteres.');
    }
  });

  nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));

  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (whatsappManager.sendOrder(nameInput.value)) {
      document.getElementById('checkout-modal').classList.add('hidden');
      nameInput.value = '';
    }
  });

  document.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', (e) => e.target.closest('.modal').classList.add('hidden'));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach((modal) => modal.classList.add('hidden'));
    }

    if (e.key === 'Tab') {
      const modal = document.querySelector('.modal:not(.hidden)');
      if (!modal) return;
      const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]')]
        .filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
});
