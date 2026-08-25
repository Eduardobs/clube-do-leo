const PRODUCTS_PAGE_SIZE = 12;

class ProductManager {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    this.currentSearch = '';
    this.currentCategory = '';
    this.renderedCount = 0;
  }

  async loadProducts() {
    const errorMessage = document.getElementById('error-message');
    const productList = document.getElementById('product-list');
    const loadingSpinner = document.getElementById('loading-spinner');

    errorMessage.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');

    try {
      const response = await fetch('data/products.json');
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data.produtos)) {
        throw new Error('Formato inválido em products.json: chave "produtos" ausente.');
      }

      this.products = data.produtos;
      this.filteredProducts = [...this.products];

      this.renderCategoryFilters();
      this.renderProducts();
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      errorMessage.textContent = 'Não foi possível carregar os produtos. Tente novamente mais tarde.';
      errorMessage.classList.remove('hidden');
      productList.innerHTML = '';
    } finally {
      loadingSpinner.classList.add('hidden');
    }
  }

  renderCategoryFilters() {
    const container = document.getElementById('category-filters');
    const categories = CONFIG.categorias.filter((categoria) =>
      this.products.some((product) => product.categorias.includes(categoria))
    );

    const pills = ['<button type="button" class="filter-pill is-active" data-category="" aria-pressed="true">Todos</button>'];
    categories.forEach((categoria) => {
      pills.push(
        `<button type="button" class="filter-pill" data-category="${Utils.escapeHtml(categoria)}" aria-pressed="false">${Utils.escapeHtml(categoria)}</button>`
      );
    });
    container.innerHTML = pills.join('');
  }

  applyFilters() {
    const term = this.currentSearch.trim().toLowerCase();
    this.filteredProducts = this.products.filter((product) => {
      const matchesSearch = !term || product.nome.toLowerCase().includes(term);
      const matchesCategory = !this.currentCategory || product.categorias.includes(this.currentCategory);
      return matchesSearch && matchesCategory;
    });
    this.renderProducts();
  }

  setSearch(term) {
    this.currentSearch = term;
    this.applyFilters();
  }

  setCategory(category) {
    this.currentCategory = category;
    document.querySelectorAll('#category-filters .filter-pill').forEach((pill) => {
      const isActive = pill.dataset.category === category;
      pill.classList.toggle('is-active', isActive);
      pill.setAttribute('aria-pressed', String(isActive));
    });
    this.applyFilters();
  }

  buildProductCardHtml(product) {
    const priceLabel = Utils.formatPrice(product.valor);
    const mainImage = product.imagens?.[0] || '';
    return `
        <article class="product-card" data-codigo="${product.codigo}">
          <button type="button" class="product-card__details-trigger" data-action="detail" data-codigo="${product.codigo}" aria-label="Ver detalhes de ${Utils.escapeHtml(product.nome)}">
          <div class="product-card__media">
            <img src="${mainImage}" alt="${Utils.escapeHtml(product.nome)}" loading="lazy" onerror="this.src='assets/brand/logo_sem_descricao.png'">
            <span class="product-card__badge">${Utils.escapeHtml(product.categorias[0] || '')}</span>
          </div>
          <div class="product-card__body">
            <h3 class="product-card__title">${Utils.escapeHtml(product.nome)}</h3>
            <p class="product-card__price">${priceLabel}</p>
          </div>
          </button>
          <div class="product-card__actions">
            <button type="button" class="btn btn--primary" data-action="${product.valor > 0 ? 'add' : 'consult'}" data-codigo="${product.codigo}">
              <i class="fa-solid ${product.valor > 0 ? 'fa-cart-plus' : 'fa-comment-dots'}"></i>
              ${product.valor > 0 ? 'Adicionar' : 'Consultar'}
            </button>
          </div>
        </article>
      `;
  }

  renderProducts() {
    const productList = document.getElementById('product-list');
    this.renderedCount = 0;

    if (this.filteredProducts.length === 0) {
      productList.innerHTML = '<p class="empty-state">Nenhum produto encontrado para essa busca.</p>';
      return;
    }

    const firstPage = this.filteredProducts.slice(0, PRODUCTS_PAGE_SIZE);
    productList.innerHTML = firstPage.map((product) => this.buildProductCardHtml(product)).join('');
    this.renderedCount = firstPage.length;
  }

  hasMoreProducts() {
    return this.renderedCount < this.filteredProducts.length;
  }

  loadMoreProducts() {
    if (!this.hasMoreProducts()) return;

    const productList = document.getElementById('product-list');
    const nextPage = this.filteredProducts.slice(this.renderedCount, this.renderedCount + PRODUCTS_PAGE_SIZE);
    productList.insertAdjacentHTML('beforeend', nextPage.map((product) => this.buildProductCardHtml(product)).join(''));
    this.renderedCount += nextPage.length;
  }

  getProduct(codigo) {
    return this.products.find((product) => product.codigo === codigo);
  }

  showProductDetail(codigo) {
    const product = this.getProduct(codigo);
    if (!product) return;

    const priceLabel = Utils.formatPrice(product.valor);
    const detailSection = document.getElementById('product-detail');
    const images = product.imagens?.length ? product.imagens : [''];
    const thumbsHtml =
      images.length > 1
        ? `
      <div class="product-detail__thumbs">
        ${images
          .map(
            (image, index) => `
          <button type="button" class="product-detail__thumb${index === 0 ? ' is-active' : ''}" data-image="${Utils.escapeHtml(image)}">
            <img src="${image}" alt="${Utils.escapeHtml(product.nome)} - imagem ${index + 1}" loading="lazy" onerror="this.src='assets/brand/logo_sem_descricao.png'">
          </button>`
          )
          .join('')}
      </div>`
        : '';
    const subcategoriasHtml = product.subcategorias?.length
      ? `<span class="tag tag--sub">${Utils.escapeHtml(product.subcategorias.join(', '))}</span>`
      : '';
    detailSection.innerHTML = `
      <div class="product-detail__gallery">
        <img id="detail-main-image" src="${images[0]}" alt="${Utils.escapeHtml(product.nome)}" loading="lazy" onerror="this.src='assets/brand/logo_sem_descricao.png'">
        ${thumbsHtml}
      </div>
      <span class="tag">${Utils.escapeHtml(product.categorias.join(', '))}</span>
      ${subcategoriasHtml}
      <h2>${Utils.escapeHtml(product.nome)}</h2>
      <p class="product-detail__descricao">${Utils.escapeHtml(product.descricao || '')}</p>
      <p class="product-detail__price">${priceLabel}</p>
      ${
        product.valor > 0
          ? `
        <div class="quantity-stepper">
          <button type="button" data-step="-1" aria-label="Diminuir quantidade">−</button>
          <input type="number" id="detail-quantity" value="1" min="1">
          <button type="button" data-step="1" aria-label="Aumentar quantidade">+</button>
        </div>
        <button type="button" class="btn btn--primary btn--block" data-action="add" data-codigo="${product.codigo}">
          <i class="fa-solid fa-cart-plus"></i> Adicionar ao carrinho
        </button>`
          : `
        <button type="button" class="btn btn--primary btn--block" data-action="consult" data-codigo="${product.codigo}">
          <i class="fa-brands fa-whatsapp"></i> Consultar no WhatsApp
        </button>`
      }
    `;
    document.getElementById('product-detail-modal').classList.remove('hidden');
    document.querySelector('#product-detail-modal .modal__close')?.focus();
  }

  closeProductDetail() {
    document.getElementById('product-detail-modal').classList.add('hidden');
  }
}

const productManager = new ProductManager();

if (typeof module !== 'undefined') module.exports = { ProductManager, productManager, PRODUCTS_PAGE_SIZE };
