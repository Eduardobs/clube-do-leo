class CartManager {
  constructor() {
    this.cart = JSON.parse(sessionStorage.getItem('cart')) || [];
    this.renderCart();
  }

  addToCart(productId, variation, quantity) {
    console.log(`Adicionando ao carrinho: productId=${productId}, variation=${variation}, quantity=${quantity}`);
    quantity = parseInt(quantity);
    if (isNaN(quantity) || quantity < 1) {
      console.warn('Quantidade inválida:', quantity);
      alert('Quantidade inválida');
      return;
    }
    const product = productManager.products.find(p => p.id === productId);
    if (!product) {
      console.error('Produto não encontrado:', productId);
      alert('Produto não encontrado');
      return;
    }
    // Garantir que a variação seja válida
    const validVariation = variation && product.variacoes.includes(variation) ? variation : product.variacoes[0] || '';
    const existingItem = this.cart.find(item => item.id === productId && item.variation === validVariation);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.cart.push({
        id: productId,
        variation: validVariation,
        quantity,
        valor: product.valor,
        imagem: product.imagem || 'assets/placeholder.jpg'
      });
    }
    this.saveCart();
    this.renderCart();
    this.showToast(`${product.nome} (${validVariation || 'Sem variação'}) adicionado ao carrinho!`);
    productManager.closeProductDetail();
  }

  removeFromCart(productId, variation) {
    this.cart = this.cart.filter(item => !(item.id === productId && item.variation === variation));
    this.saveCart();
    this.renderCart();
  }

  updateQuantity(productId, variation, quantity) {
    quantity = parseInt(quantity);
    if (isNaN(quantity) || quantity < 1) {
      this.removeFromCart(productId, variation);
      return;
    }
    const item = this.cart.find(item => item.id === productId && item.variation === variation);
    if (item) {
      item.quantity = quantity;
      this.saveCart();
      this.renderCart();
    }
  }

  clearCart() {
    if (confirm('Tem certeza que deseja limpar todo o carrinho? Todos os itens serão removidos.')) {
      this.cart = [];
      this.saveCart();
      this.renderCart();
      document.getElementById('cart-modal').classList.remove('hidden');
    }
  }

  saveCart() {
    sessionStorage.setItem('cart', JSON.stringify(this.cart));
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.innerHTML += '<span class="close-toast" onclick="this.parentElement.classList.add(\'hidden\')">&times;</span>';
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.innerHTML = '';
    }, 3000);
  }

  renderCart() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const floatingCartCount = document.getElementById('floating-cart-count');
    cartItems.innerHTML = '';
    let total = 0;
    let itemCount = 0;

    if (this.cart.length === 0) {
      cartItems.innerHTML = '<p class="no-items">Seu carrinho está vazio. Adicione produtos para continuar!</p>';
    }

    this.cart.forEach((item, index) => {
      const product = productManager.products.find(p => p.id === item.id);
      if (!product) {
        console.warn('Produto não encontrado no carrinho:', item.id);
        return;
      }
      const itemTotal = item.quantity * item.valor;
      total += itemTotal;
      itemCount += item.quantity;

      const cartItem = document.createElement('div');
      cartItem.className = 'cart-item';
      cartItem.style.animationDelay = `${index * 0.1}s`;
      const imgSrc = item.imagem || 'assets/placeholder.jpg';
      cartItem.innerHTML = `
        <img src="${imgSrc}" alt="${product.nome}" loading="lazy" onerror="this.src='assets/placeholder.jpg'; this.style.background='linear-gradient(45deg, #BC9A6A, #D2B48C)'; this.alt='Imagem não disponível';">
        <div class="cart-item-details">
          <h4>${product.nome} (${item.variation || 'Sem variação'})</h4>
          <p>${CONFIG.sistema.moeda} ${item.valor.toFixed(2)} x ${item.quantity} = ${CONFIG.sistema.moeda} ${itemTotal.toFixed(2)}</p>
        </div>
        <div class="cart-item-actions">
          <input type="number" value="${item.quantity}" min="1" onchange="cartManager.updateQuantity('${item.id}', '${item.variation}', this.value)">
          <button class="btn secondary" onclick="cartManager.removeFromCart('${item.id}', '${item.variation}')"><i class="fas fa-trash"></i> Remover</button>
        </div>
      `;
      cartItems.appendChild(cartItem);
    });

    cartTotal.textContent = `${CONFIG.sistema.moeda} ${total.toFixed(2)}`;
    floatingCartCount.textContent = itemCount;
  }

  closeCart() {
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) {
      cartModal.classList.add('hidden');
      console.log('Carrinho fechado');
    } else {
      console.error('Modal do carrinho não encontrado');
    }
  }
}

const cartManager = new CartManager();