import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const path = require('node:path');
const { loadApp, SRC_DIR } = require('../helpers/loadApp');
const { readBodyFixture } = require('../helpers/htmlFixture');

const SAMPLE_PRODUCT = {
  codigo: 'LEM-001',
  nome: 'Chaveiro de acrílico',
  descricao: 'Personalizável frente e verso',
  valor: 2.5,
  imagens: ['assets/products/a.jpg'],
  categorias: ['Jogos'],
};

function loadAdminManager() {
  loadApp();
  document.body.innerHTML = readBodyFixture('admin.html');
  const { AdminManager, DRAFT_KEY } = require(path.join(SRC_DIR, 'features', 'admin', 'admin.js'));
  const admin = new AdminManager();
  admin.cacheElements();
  admin.bindEvents();
  return { admin, DRAFT_KEY };
}

function fillForm(
  admin,
  { codigo = '', nome = '', descricao = '', valor = '', categorias = [], imagens = [''] } = {}
) {
  admin.el.codigo.value = codigo;
  admin.el.nome.value = nome;
  admin.el.descricao.value = descricao;
  admin.el.valor.value = valor;
  admin.renderCategoryCheckboxes(categorias);
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
        { ...SAMPLE_PRODUCT, codigo: 'FES-001', nome: 'Tubo lata personalizado', categorias: ['Jogos'] },
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

    it('does not include categories found only in product data', () => {
      admin.products = [{ ...SAMPLE_PRODUCT, categorias: ['Canecas', 'Promoção'] }];
      expect(admin.getCategoryOptions()).toEqual(globalThis.CONFIG.categorias);
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
      expect(admin.el.categoriaCheckboxes.querySelector('input[value="Jogos"]').checked).toBe(true);
    });

    it('closeModal hides the modal again', () => {
      admin.openModal();
      admin.closeModal();
      expect(admin.el.modal.classList.contains('hidden')).toBe(true);
    });
  });

  describe('product images', () => {
    it('allows selecting multiple image files from every image row', () => {
      admin.openModal();

      expect(admin.el.imageList.querySelector('input[data-role="image-file"]').multiple).toBe(true);
    });

    it('creates one row per selected image and keeps the selection order', async () => {
      admin.openModal();
      const fileInput = admin.el.imageList.querySelector('input[data-role="image-file"]');
      const files = [
        new File(['first'], 'first.png', { type: 'image/png' }),
        new File(['second'], 'second.jpg', { type: 'image/jpeg' }),
        new File(['third'], 'third.webp', { type: 'image/webp' }),
      ];
      Object.defineProperty(fileInput, 'files', { value: files, configurable: true });

      fileInput.dispatchEvent(new Event('change', { bubbles: true }));

      expect(admin.el.imageList.children).toHaveLength(3);
      await vi.waitFor(() => {
        const paths = [...admin.el.imageList.querySelectorAll('input[data-role="image-path"]')].map(
          (input) => input.value
        );
        expect(paths).toEqual([
          'data:image/png;base64,Zmlyc3Q=',
          'data:image/jpeg;base64,c2Vjb25k',
          'data:image/webp;base64,dGhpcmQ=',
        ]);
      });
    });

    it('adds extra rows next to the edited row without removing existing images', async () => {
      admin.el.imageList.innerHTML = '';
      admin.addImageRow('assets/products/existing-a.jpg');
      admin.addImageRow('assets/products/existing-b.jpg');
      const fileInput = admin.el.imageList.children[0].querySelector('input[data-role="image-file"]');
      Object.defineProperty(fileInput, 'files', {
        value: [
          new File(['new-a'], 'new-a.png', { type: 'image/png' }),
          new File(['new-b'], 'new-b.png', { type: 'image/png' }),
        ],
        configurable: true,
      });

      fileInput.dispatchEvent(new Event('change', { bubbles: true }));

      expect(admin.el.imageList.children).toHaveLength(3);
      await vi.waitFor(() => {
        const paths = [...admin.el.imageList.querySelectorAll('input[data-role="image-path"]')].map(
          (input) => input.value
        );
        expect(paths).toEqual([
          'data:image/png;base64,bmV3LWE=',
          'data:image/png;base64,bmV3LWI=',
          'assets/products/existing-b.jpg',
        ]);
      });
    });
  });

  describe('handleSubmit validation', () => {
    it('requires codigo and nome', () => {
      fillForm(admin, { codigo: '', nome: '', valor: '1', categorias: ['Jogos'] });
      admin.handleSubmit(fakeEvent);

      expect(admin.products).toHaveLength(0);
      expect(admin.el.formError.classList.contains('hidden')).toBe(false);
      expect(admin.el.formError.textContent).toContain('obrigatórios');
    });

    it('rejects a negative valor', () => {
      fillForm(admin, { codigo: 'X-1', nome: 'Produto', valor: '-3', categorias: ['Jogos'] });
      admin.handleSubmit(fakeEvent);
      expect(admin.products).toHaveLength(0);
      expect(admin.el.formError.textContent).toContain('valor numérico válido');
    });

    it('treats an empty valor as 0 ("Sob consulta"), which is valid', () => {
      fillForm(admin, { codigo: 'X-1', nome: 'Produto', valor: '', categorias: ['Jogos'] });
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
      fillForm(admin, { codigo: 'LEM-001', nome: 'Outro produto', valor: '1', categorias: ['Jogos'] });
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
        categorias: ['Jogos'],
      });
      admin.handleSubmit(fakeEvent);

      expect(admin.products).toHaveLength(1);
      expect(admin.products[0].nome).toBe('Chaveiro de acrílico (atualizado)');
      expect(admin.products[0].valor).toBe(3);
    });
  });

  describe('handleSubmit persistence', () => {
    it('preserves line breaks pasted into the product description', () => {
      admin.openModal();
      fillForm(admin, {
        codigo: 'NEW-2',
        nome: 'Produto com descrição formatada',
        descricao: 'Primeiro parágrafo\n\n• Primeiro item\n• Segundo item',
        valor: '10',
        categorias: ['Jogos'],
      });

      admin.handleSubmit(fakeEvent);

      expect(admin.products[0].descricao).toBe('Primeiro parágrafo\n\n• Primeiro item\n• Segundo item');
      expect(JSON.parse(localStorage.getItem(DRAFT_KEY))[0].descricao).toBe(
        'Primeiro parágrafo\n\n• Primeiro item\n• Segundo item'
      );
    });

    it('creates a new product, saves a draft, closes the modal and shows a toast', () => {
      admin.openModal();
      fillForm(admin, {
        codigo: 'NEW-1',
        nome: 'Produto novo',
        valor: '9.9',
        categorias: ['Jogos'],
        imagens: ['assets/products/novo.jpg'],
      });
      admin.handleSubmit(fakeEvent);

      expect(admin.products).toEqual([
        {
          codigo: 'NEW-1',
          nome: 'Produto novo',
          descricao: '',
          valor: 9.9,
          imagens: ['assets/products/novo.jpg'],
          categorias: ['Jogos'],
        },
      ]);
      expect(JSON.parse(localStorage.getItem(DRAFT_KEY))).toEqual(admin.products);
      expect(admin.el.modal.classList.contains('hidden')).toBe(true);
      expect(admin.el.toast.classList.contains('hidden')).toBe(false);
      expect(admin.el.toast.textContent).toContain('adicionado');
    });

    it('does not save subcategorias', () => {
      admin.openModal();
      fillForm(admin, {
        codigo: 'NEW-3',
        nome: 'Produto sem subcategoria',
        valor: '9.9',
        categorias: ['Jogos'],
        imagens: ['assets/products/novo.jpg'],
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
