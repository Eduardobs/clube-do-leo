document.addEventListener('DOMContentLoaded', async () => {
  // Garantir estado inicial correto
  document.getElementById('product-list').classList.remove('hidden');
  document.getElementById('error-message').classList.add('hidden');
  document.getElementById('nome-loja').textContent = CONFIG.loja.nome;

  // Carregar produtos antes de qualquer interação
  await productManager.loadProducts();

  document.getElementById('floating-cart-btn').addEventListener('click', () => {
    const cartModal = document.getElementById('cart-modal');
    cartModal.classList.remove('hidden');
  });

  document.getElementById('clear-cart').addEventListener('click', () => {
    cartManager.clearCart();
  });

  document.getElementById('finalize-purchase').addEventListener('click', () => {
    if (cartManager.cart.length === 0) {
      alert('Carrinho vazio!');
      return;
    }
    document.getElementById('cart-modal').classList.add('hidden');
    document.getElementById('product-list').classList.add('hidden');
    document.getElementById('finalize-modal').classList.remove('hidden');
  });

  document.getElementById('finalize-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const customerName = document.getElementById('customer-name').value;
    try {
      whatsappManager.sendMessages(customerName);
      document.getElementById('finalize-modal').classList.add('hidden');
      document.getElementById('product-list').classList.remove('hidden');
    } catch (error) {
      console.error('Erro ao enviar mensagem pelo WhatsApp:', error);
      cartManager.showToast('Erro ao enviar o pedido. Tente novamente.');
    }
  });

  // Eventos para filtros
  document.getElementById('filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const searchTerm = document.getElementById('search').value;
    const category = document.getElementById('category-filter').value;
    productManager.filterProducts(searchTerm, category);
  });

  document.getElementById('clear-filters').addEventListener('click', () => {
    document.getElementById('search').value = '';
    document.getElementById('category-filter').value = '';
    productManager.filterProducts('', '');
  });
});