document.addEventListener('DOMContentLoaded', () => {
  productManager.loadProducts();
  document.getElementById('nome-loja').textContent = CONFIG.loja.nome;

  document.getElementById('toggle-cart').addEventListener('click', () => {
    const cartModal = document.getElementById('cart-modal');
    cartModal.classList.remove('hidden');
  });

  document.getElementById('finalize++;
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
    whatsappManager.sendMessages(whatsapp);
    document.getElementById('finalize-modal').classList.add('hidden');
    document.getElementById('product-list').classList.remove('hidden');
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
    const variation = document.getElementById('variation-filter').value;
    productManager.filterProducts(searchTerm, variation);
  });

  document.getElementById('clear-filters').addEventListener('click', () => {
    document.getElementById('search').value = '';
    document.getElementById('variation-filter').value = '';
    productManager.filterProducts('', '');
  });
});