import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const path = require('node:path');
const { loadApp, JS_DIR } = require('../helpers/loadApp');
const { readBodyFixture } = require('../helpers/htmlFixture');

const SAMPLE_PRODUCT = {
  codigo: 'LEM-001',
  nome: 'Chaveiro de acrílico',
  descricao: 'Personalizável frente e verso',
  valor: 2.5,
  imagens: ['images/products/a.jpg'],
  categorias: ['Balões'],
};

function loadAdminManager() {
  loadApp();
  document.body.innerHTML = readBodyFixture('admin.html');
  const { AdminManager, DRAFT_KEY } = require(path.join(JS_DIR, 'admin.js'));
  const admin = new AdminManager();
  admin.cacheElements();
  admin.bindEvents();
  return { admin, DRAFT_KEY };
}

function fillForm(
  admin,
  { codigo = '', nome = '', descricao = '', valor = '', categorias = [], subcategorias = [], imagens = [''] } = {}
) {
  admin.el.codigo.value = codigo;
  admin.el.nome.value = nome;
  admin.el.descricao.value = descricao;
  admin.el.valor.value = valor;
  admin.renderCategoryCheckboxes(categorias);
  admin.renderSubcategoryCheckboxes(categorias, subcategorias);
  admin.el.imageList.innerHTML = '';
  imagens.forEach((img) => admin.addImageRow(img));
}

const fakeEvent = { preventDefault: () => {} };

describe('AdminManager', () => {
  let admin, DRAFT_KEY;

  beforeEach(() => {
    localStorage.clear();
    ({ admin, DRAFT_KEY } = loadAdminManager());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('applyFilter', () => {
    beforeEach(() => {
      admin.products = [
        SAMPLE_PRODUCT,
        { ...SAMPLE_PRODUCT, codigo: 'FES-001', nome: 'Tubo lata personalizado', categorias: ['Balões'] },
      ];
    });

    it('shows every product when the search term is empty', () => {
      admin.applyFilter();
      expect(admin.filtered).toHaveLength(2);
      expect(admin.el.emptyState.classList.contains('hidden')).toBe(true);
    });

    it('filters by product name, case-insensitively', () => {
      admin.search = 'TUBO';
      admin.applyFilter();
      expect(admin.filtered.map((p) => p.codigo)).toEqual(['FES-001']);
    });

    it('filters by codigo', () => {
      admin.search = 'lem-001';
      admin.applyFilter();
      expect(admin.filtered.map((p) => p.codigo)).toEqual(['LEM-001']);
    });

    it('shows the empty state when nothing matches', () => {
      admin.search = 'nothing-matches-this';
      admin.applyFilter();
      expect(admin.filtered).toHaveLength(0);
      expect(admin.el.emptyState.classList.contains('hidden')).toBe(false);
    });

    it('reacts to typing in the real search input (bindEvents wiring)', () => {
      admin.el.search.value = 'tubo';
      admin.el.search.dispatchEvent(new Event('input'));
      expect(admin.search).toBe('tubo');
      expect(admin.filtered.map((p) => p.codigo)).toEqual(['FES-001']);
    });
  });

  describe('getCategoryOptions', () => {
    it('returns the configured categories when there is no product data', () => {
      expect(admin.getCategoryOptions()).toEqual(globalThis.CONFIG.categorias);
    });

    it('appends categories found in the data that are not in CONFIG, without duplicates', () => {
      admin.products = [{ ...SAMPLE_PRODUCT, categorias: ['Canecas', 'Promoção'] }];
      expect(admin.getCategoryOptions()).toEqual([...globalThis.CONFIG.categorias, 'Promoção']);
    });
  });

  describe('subcategorias', () => {
    it('getSubcategoryOptions returns the options for the selected categorias, deduped', () => {
      expect(admin.getSubcategoryOptions(['Canecas'])).toEqual(globalThis.CONFIG.subcategorias.Canecas);
      expect(admin.getSubcategoryOptions(['Garrafas', 'Camisetas'])).toEqual([
        ...globalThis.CONFIG.subcategorias.Garrafas,
        ...globalThis.CONFIG.subcategorias.Camisetas,
      ]);
    });

    it('getSubcategoryOptions returns nothing for categorias without configured subcategorias', () => {
      expect(admin.getSubcategoryOptions(['Balões'])).toEqual([]);
      expect(admin.getSubcategoryOptions([])).toEqual([]);
    });

    it('renderSubcategoryCheckboxes checks the previously selected subcategorias', () => {
      admin.renderSubcategoryCheckboxes(['Canecas'], ['Cerâmica']);
      expect(admin.el.subcategoriaCheckboxes.querySelector('input[value="Cerâmica"]').checked).toBe(true);
      expect(admin.el.subcategoriaCheckboxes.querySelector('input[value="Jarro"]').checked).toBe(false);
    });

    it('re-renders the subcategoria checkboxes when the categoria selection changes (bindEvents wiring)', () => {
      admin.renderCategoryCheckboxes([]);
      admin.el.categoriaCheckboxes.querySelector('input[value="Canecas"]').click();
      expect(admin.el.subcategoriaCheckboxes.querySelectorAll('input').length).toBe(
        globalThis.CONFIG.subcategorias.Canecas.length
      );
    });
  });

  describe('openModal', () => {
    it('resets the form for a new product', () => {
      admin.openModal();
      expect(admin.editingCodigo).toBeNull();
      expect(admin.el.modalTitle.textContent).toBe('Novo produto');
      expect(admin.el.codigo.value).toBe('');
      expect(admin.el.imageList.children).toHaveLength(1);
      expect(admin.el.modal.classList.contains('hidden')).toBe(false);
    });

    it('populates the form when editing an existing product', () => {
      admin.products = [SAMPLE_PRODUCT];
      admin.openModal('LEM-001');

      expect(admin.editingCodigo).toBe('LEM-001');
      expect(admin.el.modalTitle.textContent).toContain('Chaveiro de acrílico');
      expect(admin.el.codigo.value).toBe('LEM-001');
      expect(admin.el.nome.value).toBe('Chaveiro de acrílico');
      expect(admin.el.valor.value).toBe('2.5');
      expect(admin.el.categoriaCheckboxes.querySelector('input[value="Balões"]').checked).toBe(true);
    });

    it('populates the subcategoria checkboxes when editing an existing product', () => {
      admin.products = [{ ...SAMPLE_PRODUCT, categorias: ['Canecas'], subcategorias: ['Cerâmica'] }];
      admin.openModal('LEM-001');

      expect(admin.el.subcategoriaCheckboxes.querySelector('input[value="Cerâmica"]').checked).toBe(true);
      expect(admin.el.subcategoriaCheckboxes.querySelector('input[value="Jarro"]').checked).toBe(false);
    });

    it('closeModal hides the modal again', () => {
      admin.openModal();
      admin.closeModal();
      expect(admin.el.modal.classList.contains('hidden')).toBe(true);
    });
  });

  describe('handleSubmit validation', () => {
    it('requires codigo and nome', () => {
      fillForm(admin, { codigo: '', nome: '', valor: '1', categorias: ['Balões'] });
      admin.handleSubmit(fakeEvent);

      expect(admin.products).toHaveLength(0);
      expect(admin.el.formError.classList.contains('hidden')).toBe(false);
      expect(admin.el.formError.textContent).toContain('obrigatórios');
    });

    it('rejects a negative valor', () => {
      fillForm(admin, { codigo: 'X-1', nome: 'Produto', valor: '-3', categorias: ['Balões'] });
      admin.handleSubmit(fakeEvent);
      expect(admin.products).toHaveLength(0);
      expect(admin.el.formError.textContent).toContain('valor numérico válido');
    });

    it('treats an empty valor as 0 ("Sob consulta"), which is valid', () => {
      fillForm(admin, { codigo: 'X-1', nome: 'Produto', valor: '', categorias: ['Balões'] });
      admin.handleSubmit(fakeEvent);
      expect(admin.products).toHaveLength(1);
      expect(admin.products[0].valor).toBe(0);
    });

    it('requires at least one category', () => {
      fillForm(admin, { codigo: 'X-1', nome: 'Produto', valor: '1', categorias: [] });
      admin.handleSubmit(fakeEvent);
      expect(admin.products).toHaveLength(0);
      expect(admin.el.formError.textContent).toContain('categoria');
    });

    it('rejects a codigo that is already used by another product', () => {
      admin.products = [SAMPLE_PRODUCT];
      admin.openModal(); // new product, editingCodigo stays null
      fillForm(admin, { codigo: 'LEM-001', nome: 'Outro produto', valor: '1', categorias: ['Balões'] });
      admin.handleSubmit(fakeEvent);

      expect(admin.products).toHaveLength(1);
      expect(admin.el.formError.textContent).toContain('Já existe um produto');
    });

    it('allows keeping the same codigo while editing that same product', () => {
      admin.products = [SAMPLE_PRODUCT];
      admin.openModal('LEM-001');
      fillForm(admin, {
        codigo: 'LEM-001',
        nome: 'Chaveiro de acrílico (atualizado)',
        valor: '3',
        categorias: ['Balões'],
      });
      admin.handleSubmit(fakeEvent);

      expect(admin.products).toHaveLength(1);
      expect(admin.products[0].nome).toBe('Chaveiro de acrílico (atualizado)');
      expect(admin.products[0].valor).toBe(3);
    });
  });

  describe('handleSubmit persistence', () => {
    it('creates a new product, saves a draft, closes the modal and shows a toast', () => {
      admin.openModal();
      fillForm(admin, {
        codigo: 'NEW-1',
        nome: 'Produto novo',
        valor: '9.9',
        categorias: ['Balões'],
        imagens: ['images/products/novo.jpg'],
      });
      admin.handleSubmit(fakeEvent);

      expect(admin.products).toEqual([
        {
          codigo: 'NEW-1',
          nome: 'Produto novo',
          descricao: '',
          valor: 9.9,
          imagens: ['images/products/novo.jpg'],
          categorias: ['Balões'],
        },
      ]);
      expect(JSON.parse(localStorage.getItem(DRAFT_KEY))).toEqual(admin.products);
      expect(admin.el.modal.classList.contains('hidden')).toBe(true);
      expect(admin.el.toast.classList.contains('hidden')).toBe(false);
      expect(admin.el.toast.textContent).toContain('adicionado');
    });

    it('includes subcategorias in the saved product when any are selected', () => {
      admin.openModal();
      fillForm(admin, {
        codigo: 'NEW-2',
        nome: 'Caneca personalizada',
        valor: '12.5',
        categorias: ['Canecas'],
        subcategorias: ['Cerâmica'],
        imagens: ['images/products/caneca.jpg'],
      });
      admin.handleSubmit(fakeEvent);

      expect(admin.products[0].subcategorias).toEqual(['Cerâmica']);
    });

    it('omits the subcategorias key when none are selected', () => {
      admin.openModal();
      fillForm(admin, {
        codigo: 'NEW-3',
        nome: 'Produto sem subcategoria',
        valor: '9.9',
        categorias: ['Balões'],
        imagens: ['images/products/novo.jpg'],
      });
      admin.handleSubmit(fakeEvent);

      expect(admin.products[0]).not.toHaveProperty('subcategorias');
    });
  });

  describe('deleteProduct', () => {
    beforeEach(() => {
      admin.products = [SAMPLE_PRODUCT];
    });

    it('keeps the product when the user cancels the confirmation', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      admin.deleteProduct('LEM-001');
      expect(admin.products).toHaveLength(1);
    });

    it('removes the product and saves a draft when confirmed', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      admin.deleteProduct('LEM-001');

      expect(admin.products).toHaveLength(0);
      expect(JSON.parse(localStorage.getItem(DRAFT_KEY))).toEqual([]);
      expect(admin.el.toast.textContent).toContain('excluído');
    });

    it('does nothing for an unknown codigo', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      admin.deleteProduct('NOPE');
      expect(admin.products).toHaveLength(1);
    });

    it('table action buttons delegate to openModal/deleteProduct (bindEvents wiring)', () => {
      const openModalSpy = vi.spyOn(admin, 'openModal');
      const deleteSpy = vi.spyOn(admin, 'deleteProduct').mockImplementation(() => {});
      admin.applyFilter();

      admin.el.tableBody.querySelector('button[data-action="edit"]').click();
      expect(openModalSpy).toHaveBeenCalledWith('LEM-001');

      admin.el.tableBody.querySelector('button[data-action="delete"]').click();
      expect(deleteSpy).toHaveBeenCalledWith('LEM-001');
    });
  });

  describe('draft persistence helpers', () => {
    it('saves, reads and clears a draft from localStorage', () => {
      admin.products = [SAMPLE_PRODUCT];
      admin.saveDraft();
      expect(admin.readDraft()).toEqual([SAMPLE_PRODUCT]);

      admin.clearDraft();
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
      expect(admin.readDraft()).toBeNull();
    });

    it('ignores a corrupted draft instead of throwing', () => {
      localStorage.setItem(DRAFT_KEY, 'not-json');
      expect(admin.readDraft()).toBeNull();
    });
  });

  describe('importJson', () => {
    it('imports a valid products file, saves a draft and shows a toast', async () => {
      const file = new File([JSON.stringify({ produtos: [SAMPLE_PRODUCT] })], 'products.json', {
        type: 'application/json',
      });

      admin.importJson(file);

      await vi.waitFor(() => expect(admin.products).toEqual([SAMPLE_PRODUCT]));
      expect(JSON.parse(localStorage.getItem(DRAFT_KEY))).toEqual([SAMPLE_PRODUCT]);
      expect(admin.el.toast.textContent).toContain('importado');
    });

    it('alerts the user and keeps existing data when the file is invalid', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      admin.products = [SAMPLE_PRODUCT];
      const file = new File(['{"notProdutos": []}'], 'broken.json', { type: 'application/json' });

      admin.importJson(file);

      await vi.waitFor(() => expect(alertSpy).toHaveBeenCalled());
      expect(admin.products).toEqual([SAMPLE_PRODUCT]);
    });
  });

  describe('exportJson', () => {
    it('triggers a download of the current products as JSON', () => {
      admin.products = [SAMPLE_PRODUCT];
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake-url');
      globalThis.URL.revokeObjectURL = vi.fn();
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      admin.exportJson();

      expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
      expect(admin.el.toast.textContent).toContain('baixado');
    });
  });
});
