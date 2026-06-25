const DRAFT_KEY = 'clubeDoLeo.admin.draft';

class AdminManager {
  constructor() {
    this.products = [];
    this.filtered = [];
    this.search = '';
    this.editingCodigo = null;
  }

  async init() {
    this.cacheElements();
    this.bindEvents();
    await this.loadInitial();
  }

  cacheElements() {
    this.el = {
      tableBody: document.getElementById('product-table-body'),
      emptyState: document.getElementById('empty-state'),
      errorMessage: document.getElementById('error-message'),
      loadingSpinner: document.getElementById('loading-spinner'),
      search: document.getElementById('admin-search'),
      newProductBtn: document.getElementById('new-product-btn'),
      exportBtn: document.getElementById('export-btn'),
      importBtn: document.getElementById('import-btn'),
      importFileInput: document.getElementById('import-file-input'),
      modal: document.getElementById('product-modal'),
      modalTitle: document.getElementById('product-modal-title'),
      form: document.getElementById('product-form'),
      formError: document.getElementById('form-error'),
      codigo: document.getElementById('field-codigo'),
      nome: document.getElementById('field-nome'),
      descricao: document.getElementById('field-descricao'),
      valor: document.getElementById('field-valor'),
      categoriaCheckboxes: document.getElementById('categoria-checkboxes'),
      subcategoriaCheckboxes: document.getElementById('subcategoria-checkboxes'),
      imageList: document.getElementById('image-list'),
      addImageBtn: document.getElementById('add-image-btn'),
      toast: document.getElementById('toast'),
    };
  }

  bindEvents() {
    this.el.search.addEventListener('input', (e) => {
      this.search = e.target.value;
      this.applyFilter();
    });

    this.el.newProductBtn.addEventListener('click', () => this.openModal());
    this.el.exportBtn.addEventListener('click', () => this.exportJson());
    this.el.importBtn.addEventListener('click', () => this.el.importFileInput.click());
    this.el.importFileInput.addEventListener('change', (e) => this.importJson(e.target.files[0]));
    this.el.addImageBtn.addEventListener('click', () => this.addImageRow(''));

    this.el.categoriaCheckboxes.addEventListener('change', () => {
      const selectedCategorias = [...this.el.categoriaCheckboxes.querySelectorAll('input:checked')].map((i) => i.value);
      const keptSubcategorias = [...this.el.subcategoriaCheckboxes.querySelectorAll('input:checked')].map((i) => i.value);
      this.renderSubcategoryCheckboxes(selectedCategorias, keptSubcategorias);
    });

    this.el.tableBody.addEventListener('click', (e) => {
      const editBtn = e.target.closest('button[data-action="edit"]');
      const deleteBtn = e.target.closest('button[data-action="delete"]');
      if (editBtn) this.openModal(editBtn.dataset.codigo);
      if (deleteBtn) this.deleteProduct(deleteBtn.dataset.codigo);
    });

    this.el.imageList.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('button[data-action="remove-image"]');
      if (removeBtn) removeBtn.closest('.image-row').remove();
    });

    this.el.imageList.addEventListener('input', (e) => {
      const input = e.target.closest('input[data-role="image-path"]');
      if (input) input.nextElementSibling.src = input.value || 'assets/logo_sem_descricao.png';
    });

    this.el.form.addEventListener('submit', (e) => this.handleSubmit(e));

    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.closeModal());
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  async loadInitial() {
    this.el.loadingSpinner.classList.remove('hidden');
    let fetched = null;
    try {
      fetched = await this.fetchProducts();
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      this.el.errorMessage.textContent =
        'Não foi possível carregar data/products.json automaticamente. Use "Importar JSON" para carregar o arquivo manualmente.';
      this.el.errorMessage.classList.remove('hidden');
    }
    this.el.loadingSpinner.classList.add('hidden');

    const draft = this.readDraft();
    if (draft) {
      const keepDraft = confirm(
        'Encontramos um rascunho de alterações não exportadas desta sessão.\n\nOK = continuar editando o rascunho\nCancelar = descartar e carregar o arquivo original'
      );
      this.products = keepDraft ? draft : fetched || [];
      if (!keepDraft) this.clearDraft();
    } else {
      this.products = fetched || [];
    }

    this.applyFilter();
  }

  async fetchProducts() {
    const response = await fetch('data/products.json');
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (!Array.isArray(data.produtos)) {
      throw new Error('Formato inválido em products.json: chave "produtos" ausente.');
    }
    return data.produtos;
  }

  saveDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(this.products));
  }

  readDraft() {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  applyFilter() {
    const term = this.search.trim().toLowerCase();
    this.filtered = !term
      ? [...this.products]
      : this.products.filter(
          (p) => p.nome.toLowerCase().includes(term) || p.codigo.toLowerCase().includes(term)
        );
    this.renderTable();
  }

  renderTable() {
    this.el.emptyState.classList.toggle('hidden', this.filtered.length > 0);

    this.el.tableBody.innerHTML = this.filtered
      .map((product) => {
        const thumb = product.imagens?.[0] || 'assets/logo_sem_descricao.png';
        const categorias = (product.categorias || [])
          .map((c) => `<span class="badge">${Utils.escapeHtml(c)}</span>`)
          .join('');
        const subcategorias = (product.subcategorias || [])
          .map((s) => `<span class="badge badge--sub">${Utils.escapeHtml(s)}</span>`)
          .join('');
        return `
        <tr>
          <td><img class="admin-table__thumb" src="${Utils.escapeHtml(thumb)}" alt="${Utils.escapeHtml(product.nome)}" onerror="this.src='assets/logo_sem_descricao.png'"></td>
          <td>${Utils.escapeHtml(product.codigo)}</td>
          <td class="admin-table__name">
            <strong>${Utils.escapeHtml(product.nome)}</strong>
            <span>${Utils.escapeHtml(product.descricao || '')}</span>
          </td>
          <td><div class="badge-list">${categorias}${subcategorias}</div></td>
          <td>${Utils.formatPrice(product.valor)}</td>
          <td>
            <div class="admin-table__actions">
              <button type="button" class="icon-btn" data-action="edit" data-codigo="${Utils.escapeHtml(product.codigo)}" title="Editar">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button type="button" class="icon-btn icon-btn--danger" data-action="delete" data-codigo="${Utils.escapeHtml(product.codigo)}" title="Excluir">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>`;
      })
      .join('');
  }

  getCategoryOptions() {
    const fromData = this.products.flatMap((p) => p.categorias || []);
    return [...new Set([...CONFIG.categorias, ...fromData])];
  }

  renderCategoryCheckboxes(selected = []) {
    this.el.categoriaCheckboxes.innerHTML = this.getCategoryOptions()
      .map(
        (categoria) => `
        <label>
          <input type="checkbox" value="${Utils.escapeHtml(categoria)}" ${selected.includes(categoria) ? 'checked' : ''}>
          ${Utils.escapeHtml(categoria)}
        </label>`
      )
      .join('');
  }

  getSubcategoryOptions(selectedCategorias = []) {
    return [...new Set(selectedCategorias.flatMap((categoria) => CONFIG.subcategorias?.[categoria] || []))];
  }

  renderSubcategoryCheckboxes(selectedCategorias = [], selectedSubcategorias = []) {
    const options = this.getSubcategoryOptions(selectedCategorias);
    this.el.subcategoriaCheckboxes.innerHTML = options
      .map(
        (subcategoria) => `
        <label>
          <input type="checkbox" value="${Utils.escapeHtml(subcategoria)}" ${selectedSubcategorias.includes(subcategoria) ? 'checked' : ''}>
          ${Utils.escapeHtml(subcategoria)}
        </label>`
      )
      .join('');
  }

  addImageRow(value) {
    const row = document.createElement('div');
    row.className = 'image-row';
    row.innerHTML = `
      <input type="text" data-role="image-path" placeholder="images/products/arquivo.jpg" value="${Utils.escapeHtml(value)}">
      <img src="${Utils.escapeHtml(value) || 'assets/logo_sem_descricao.png'}" alt="" onerror="this.src='assets/logo_sem_descricao.png'">
      <button type="button" class="icon-btn icon-btn--danger" data-action="remove-image" title="Remover imagem">
        <i class="fa-solid fa-xmark"></i>
      </button>`;
    this.el.imageList.appendChild(row);
  }

  openModal(codigo) {
    this.editingCodigo = codigo || null;
    const product = codigo ? this.products.find((p) => p.codigo === codigo) : null;

    this.el.modalTitle.textContent = product ? `Editar produto: ${product.nome}` : 'Novo produto';
    this.el.formError.classList.add('hidden');
    this.el.codigo.value = product?.codigo || '';
    this.el.nome.value = product?.nome || '';
    this.el.descricao.value = product?.descricao || '';
    this.el.valor.value = product?.valor ?? '';

    this.renderCategoryCheckboxes(product?.categorias || []);
    this.renderSubcategoryCheckboxes(product?.categorias || [], product?.subcategorias || []);

    this.el.imageList.innerHTML = '';
    (product?.imagens?.length ? product.imagens : ['']).forEach((img) => this.addImageRow(img));

    this.el.modal.classList.remove('hidden');
    this.el.codigo.focus();
  }

  closeModal() {
    this.el.modal.classList.add('hidden');
  }

  showFormError(message) {
    this.el.formError.textContent = message;
    this.el.formError.classList.remove('hidden');
  }

  handleSubmit(event) {
    event.preventDefault();

    const codigo = this.el.codigo.value.trim();
    const nome = this.el.nome.value.trim();
    const descricao = this.el.descricao.value.trim();
    const valorRaw = this.el.valor.value.trim();
    const valor = valorRaw === '' ? 0 : Number(valorRaw);
    const categorias = [...this.el.categoriaCheckboxes.querySelectorAll('input:checked')].map((i) => i.value);
    const subcategorias = [...this.el.subcategoriaCheckboxes.querySelectorAll('input:checked')].map((i) => i.value);
    const imagens = [...this.el.imageList.querySelectorAll('input[data-role="image-path"]')]
      .map((i) => i.value.trim())
      .filter(Boolean);

    if (!codigo || !nome) {
      this.showFormError('Código e nome são obrigatórios.');
      return;
    }
    if (Number.isNaN(valor) || valor < 0) {
      this.showFormError('Informe um valor numérico válido (0 ou maior).');
      return;
    }
    if (categorias.length === 0) {
      this.showFormError('Selecione ao menos uma categoria.');
      return;
    }

    const duplicate = this.products.find((p) => p.codigo === codigo && p.codigo !== this.editingCodigo);
    if (duplicate) {
      this.showFormError(`Já existe um produto com o código "${codigo}".`);
      return;
    }

    const productData = { codigo, nome, descricao, valor, imagens, categorias };
    if (subcategorias.length > 0) productData.subcategorias = subcategorias;

    if (this.editingCodigo) {
      const index = this.products.findIndex((p) => p.codigo === this.editingCodigo);
      this.products[index] = productData;
    } else {
      this.products.push(productData);
    }

    this.saveDraft();
    this.applyFilter();
    this.closeModal();
    this.showToast(this.editingCodigo ? 'Produto atualizado.' : 'Produto adicionado.');
  }

  deleteProduct(codigo) {
    const product = this.products.find((p) => p.codigo === codigo);
    if (!product) return;
    if (!confirm(`Excluir o produto "${product.nome}" (${codigo})? Essa ação não pode ser desfeita.`)) return;

    this.products = this.products.filter((p) => p.codigo !== codigo);
    this.saveDraft();
    this.applyFilter();
    this.showToast('Produto excluído.');
  }

  exportJson() {
    const json = JSON.stringify({ produtos: this.products }, null, 2) + '\n';
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.showToast('Arquivo baixado. Substitua data/products.json e comite as alterações.');
  }

  importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.produtos)) {
          throw new Error('Chave "produtos" ausente ou inválida.');
        }
        this.products = data.produtos;
        this.saveDraft();
        this.applyFilter();
        this.showToast('JSON importado com sucesso.');
      } catch (error) {
        console.error('Erro ao importar JSON:', error);
        alert(`Não foi possível importar o arquivo: ${error.message}`);
      }
    };
    reader.readAsText(file);
    this.el.importFileInput.value = '';
  }

  showToast(message) {
    this.el.toast.textContent = message;
    this.el.toast.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.el.toast.classList.add('hidden'), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const adminManager = new AdminManager();
  adminManager.init();
});

if (typeof module !== 'undefined') module.exports = { AdminManager, DRAFT_KEY };
