class ProductManager {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
  }

  async loadProducts() {
    const errorMessage = document.getElementById('error-message');
    const productList = document.getElementById('product-list');
    const loadingSpinner = document.getElementById('loading-spinner');

    errorMessage.classList.add('hidden');
    productList.classList.remove('hidden');
    loadingSpinner.style.display = 'block';

    try {
      const response = await fetch('data/products.json');
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Arquivo products.json não encontrado. Verifique o caminho do arquivo.');
        } else {
          throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      if (!data.produtos || !Array.isArray(data.produtos)) {
        throw new Error('Formato inválido no products.json: chave "produtos" ausente ou não é um array.');
      }

      this.products = data.produtos;
      this.filteredProducts = [...this.products];

      // Validar estrutura de cada produto
      this.products.forEach(product => {
        if (!product.id || !product.nome || !product.valor || !Array.isArray(product.variacoes) || !Array.isArray(product.categoria)) {
          console.warn(`Produto inválido detectado: ${JSON.stringify(product)}`);
        }
      });

      this.populateCategoryFilter();
      this.renderProducts();
      errorMessage.classList.add('hidden');
      console.log('Produtos carregados com sucesso:', this.products);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error.message);
      errorMessage.textContent = error.message;
      errorMessage.classList.remove('hidden');
      productList.innerHTML = '';
    } finally {
      loadingSpinner.style.display = 'none';
    }
  }

  populateCategoryFilter() {
    const categoryFilter = document.getElementById('category-filter');
    // Extrair todas as categorias únicas de todos os produtos
    const categories = [...new Set(this.products.flatMap(product => product.categoria || []))];
    categoryFilter.innerHTML = '<option value="">Todas as Categorias</option>';
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  filterProducts(searchTerm, category) {
    this.filteredProducts = this.products.filter(product => {
      const matchesSearch = product.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !category || (Array.isArray(product.categoria) && product.categoria.includes(category));
      return matchesSearch && matchesCategory;
    });
    this.renderProducts();
  }

  renderProducts() {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';
    if (this.filteredProducts.length === 0) {
      productList.innerHTML = '<p class="no-products">Nenhum produto encontrado.</p>';
      return;
    }
    this.filteredProducts.forEach(product => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card';
      productCard.innerHTML = `
        <img src="${product.imagem}" alt="${product.nome}" loading="lazy">
        <h3>${product.nome}</h3>
        <p>${(product.categoria || []).join(', ')}</p>
        <p>${CONFIG.sistema.moeda} ${product.valor.toFixed(2)}</p>
        <div class="product-card-actions">
          <button class="btn-detail" onclick="productManager.showProductDetail('${product.id}')"><i class="fas fa-eye"></i> Ver Detalhes</button>
          <button class="btn" onclick="cartManager.addToCart('${product.id}', '${product.variacoes[0] || ''}', 1)"><i class="fas fa-cart-plus"></i> Adicionar ao Carrinho</button>
        </div>
      `;
      productList.appendChild(productCard);
    });
  }

  showProductDetail(productId) {
    console.log('Exibindo detalhes do produto:', productId);
    const product = this.products.find(p => p.id === productId);
    if (!product) {
      console.error('Produto não encontrado:', productId);
      return;
    }
    const detailSection = document.getElementById('product-detail');
    const modal = document.getElementById('product-detail-modal');
    detailSection.innerHTML = `
      <h2>${product.nome}</h2>
      <img src="${product.imagem}" alt="${product.nome}" loading="lazy">
      <p>${product.descricao}</p>
      <p>Categoria: ${(product.categoria || []).join(', ')}</p>
      <p>${CONFIG.sistema.moeda} ${product.valor.toFixed(2)}</p>
      <select id="variation-${product.id}">
        ${(Array.isArray(product.variacoes) ? product.variacoes : []).map(v => `<option value="${v}">${v}</option>`).join('')}
      </select>
      <input type="number" id="quantity-${product.id}" value="1" min="1">
      <button class="btn" onclick="cartManager.addToCart('${product.id}', document.getElementById('variation-${product.id}').value, document.getElementById('quantity-${product.id}').value)">Adicionar ao Carrinho</button>
    `;
    modal.classList.remove('hidden');
  }

  closeProductDetail() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) {
      modal.classList.add('hidden');
      console.log('Modal de detalhes fechado');
    } else {
      console.error('Modal de detalhes não encontrado');
    }
  }
}

const productManager = new ProductManager();