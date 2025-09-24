document.addEventListener('DOMContentLoaded', () => {
  // Garantir estado inicial correto
  document.getElementById('product-list').classList.remove('hidden');
  document.getElementById('error-message').classList.add('hidden');
  document.getElementById('nome-loja').textContent = CONFIG.loja.nome;

  productManager.loadProducts();

  document.getElementById('toggle-cart').addEventListener('click', () => {
    const cartModal = document.getElementById('cart-modal');
    cartModal.classList.remove('hidden');
  });

  // Event listener para botão Limpar Carrinho
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
    const whatsapp = document.getElementById('whatsapp').value;
    try {
      whatsappManager.sendMessages(whatsapp);
      document.getElementById('finalize-modal').classList.add('hidden');
      document.getElementById('product-list').classList.remove('hidden');
    } catch (error) {
      console.error('Erro ao enviar mensagem pelo WhatsApp:', error);
      cartManager.showToast('Erro ao enviar o pedido. Tente novamente.');
    }
  });

  // Máscara para o campo de WhatsApp
  document.getElementById('whatsapp').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    e.target.value = value;
  });

  // Eventos para filtros
  document.getElementById('filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const searchTerm = document.getElementById('search').value;
    productManager.filterProducts(searchTerm);
  });

  document.getElementById('clear-filters').addEventListener('click', () => {
    document.getElementById('search').value = '';
    productManager.filterProducts('');
  });
});