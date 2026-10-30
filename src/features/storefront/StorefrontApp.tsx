import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpDown, BadgeCheck, Factory, MessageCircle, PackageCheck, Search, SearchX, ShoppingCart, Store, X } from 'lucide-react';
import { SiteFooter } from '../../components/SiteFooter';
import { Toast } from '../../components/Toast';
import { STORE_CONFIG } from '../../config/store';
import { useCart } from '../../hooks/useCart';
import { trackStoreEvent } from '../../lib/analytics';
import { normalizeSearchText } from '../../lib/format';
import { fetchProducts, findProduct, isQuote, itemIssue, normalizeQuantity } from '../../lib/products';
import { buildDetailedOrderMessage, createOrderId, openWhatsApp } from '../../lib/whatsapp';
import { saveCatalog } from '../../lib/navigation';
import type { Category, Product } from '../../types/product';
import { CartModal } from './CartModal';
import { CheckoutModal } from './CheckoutModal';
import { ProductCard } from './ProductCard';
import { CatalogCategories, StoreHeader } from './StoreHeader';

const PAGE_SIZE = 12;
const params = () => new URLSearchParams(window.location.search);
const readCategory = () => STORE_CONFIG.categories.find(c => c === params().get('categoria')) || null;
const readSort = () => { const s = params().get('ordem'); return s === 'name' || s === 'price-asc' || s === 'price-desc' ? s : 'catalog'; };
const productNameCollator = new Intl.Collator('pt-BR');

export function StorefrontApp() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(() => params().get('busca') || '');
  const [category, setCategory] = useState<Category | null>(readCategory);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<'catalog' | 'name' | 'price-asc' | 'price-desc'>(readSort);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [mode, setMode] = useState(() => params().get('preco') || 'todos');
  const [maxPrice, setMaxPrice] = useState(() => params().get('ate') || '');
  const [retry, setRetry] = useState(0);
  const [preparedMessage, setPreparedMessage] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cart = useCart(products);

  useEffect(() => {
    const restore = () => { setSearch(params().get('busca') || ''); setCategory(readCategory()); setSort(readSort()); setMode(params().get('preco') || 'todos'); setMaxPrice(params().get('ate') || ''); };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries({ busca: search, categoria: category || '', ordem: sort === 'catalog' ? '' : sort, preco: mode === 'todos' ? '' : mode, ate: maxPrice })) {
      if (value) next.set(key, value); else next.delete(key);
    }
    const query = next.toString();
    if (query !== window.location.search.slice(1)) window.history.pushState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}#produtos`);
    saveCatalog(query);
  }, [search, category, sort, mode, maxPrice]);
  useEffect(() => {
    const remember = () => { try { sessionStorage.setItem(`catalog-position:${window.location.search}`, JSON.stringify({ count: visibleCount, y: window.scrollY })); } catch { /* optional */ } };
    window.addEventListener('pagehide', remember);
    return () => window.removeEventListener('pagehide', remember);
  }, [visibleCount]);
  useEffect(() => {
    setLoading(true); setError('');
    const controller = new AbortController();
    fetchProducts(controller.signal)
      .then(setProducts)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        console.error('Erro ao carregar produtos:', reason);
        setError('Não foi possível carregar os produtos. Tente novamente mais tarde.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const indexedProducts = useMemo(() => products.map((product) => ({
    product,
    searchText: normalizeSearchText([
      product.nome,
      product.codigo,
      product.descricao,
      ...product.categorias,
    ].join(' ')),
  })), [products]);

  const filteredProducts = useMemo(() => {
    const term = normalizeSearchText(search);
    const matches = indexedProducts
      .filter(({ product, searchText }) =>
        (!term || term.split(/\s+/).every(word => searchText.includes(word))) &&
        (mode === 'todos' || (mode === 'consulta' ? isQuote(product) : !isQuote(product))) &&
        (!maxPrice || (!isQuote(product) && product.valor <= Number(maxPrice))) &&
        (!category || product.categorias.includes(category)),
      )
      .map(({ product }) => product);
    if (sort === 'name') return [...matches].sort((a, b) => productNameCollator.compare(a.nome, b.nome));
    if (sort === 'price-asc' || sort === 'price-desc') return [...matches].sort((a, b) => Number(isQuote(a)) - Number(isQuote(b)) || (isQuote(a) ? 0 : sort === 'price-asc' ? a.valor - b.valor : b.valor - a.valor));
    return matches;
  }, [category, indexedProducts, search, sort, mode, maxPrice]);

  useEffect(() => {
    let count = PAGE_SIZE; let y = 0;
    try { const stored = JSON.parse(sessionStorage.getItem(`catalog-position:${window.location.search}`) || 'null'); if (stored) { count = stored.count; y = stored.y; } } catch { /* optional */ }
    setVisibleCount(count);
    if (!loading && y) requestAnimationFrame(() => window.scrollTo(0, y));
  }, [category, search, sort, mode, maxPrice, loading]);

  useEffect(() => {
    if (loading || new URLSearchParams(window.location.search).get('carrinho') !== '1') return;
    setCartOpen(true);
    const next = params(); next.delete('carrinho'); window.history.replaceState({}, '', `/${next.size ? `?${next}` : ''}#produtos`); saveCatalog(next.toString());
  }, [loading]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= filteredProducts.length) return;
    if (!('IntersectionObserver' in window)) {
      setVisibleCount(filteredProducts.length);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((current) => Math.min(current + PAGE_SIZE, filteredProducts.length));
      },
      { rootMargin: '300px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredProducts.length, visibleCount]);

  const dismissToast = useCallback(() => setToast(''), []);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    quantity = normalizeQuantity(product, quantity);
    if (!cart.add(product.codigo, quantity)) return;
    trackStoreEvent('add_to_cart', { product_code: product.codigo, quantity, value: product.valor });
    setToast(`${product.nome} adicionado ao carrinho!`);
  }, [cart.add]);

  const startCheckout = () => {
    if (!cart.items.length || cart.items.some(item => { const p = findProduct(products, item.codigo); return !p || itemIssue(p, item); })) {
      setToast('Carrinho vazio! Adicione itens antes de finalizar.');
      return;
    }
    setCartOpen(false);
    setCheckoutOpen(true);
    trackStoreEvent('begin_checkout', { item_count: cart.count, value: cart.total });
  };

  const sendOrder = (customerName: string, notes: string) => {
    const orderId = createOrderId();
    trackStoreEvent('click_whatsapp', { kind: cart.items.every(item => { const p = findProduct(products, item.codigo); return p && isQuote(p); }) ? 'orcamento' : 'pedido', order_id: orderId, item_count: cart.count, value: cart.total });
    const message = buildDetailedOrderMessage({ orderId, customerName, notes }, cart.items, products);
    setPreparedMessage(message);
    openWhatsApp(message);
    setToast(`Pedido ${orderId} preparado. Seu carrinho foi mantido.`);
  };

  const hasUnpricedItems = cart.items.some((item) => (findProduct(products, item.codigo) ? isQuote(findProduct(products, item.codigo)!) : false));

  return (
    <>
      <a className="skip-link" href="#produtos">Pular para os produtos</a>
      <StoreHeader cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      <main>
        <section id="produtos" className="catalog container" aria-busy={loading}>
          <div className="catalog__heading">
            <h1>Produtos em impressão 3D</h1>
            <p>Feitos sob encomenda. Pedido pelo WhatsApp.</p>
          </div>
          <div className="catalog__toolbar" role="search" aria-label="Buscar e ordenar produtos">
            <div className="search-box">
              <Search aria-hidden="true" />
              <label className="sr-only" htmlFor="catalog-search">Buscar produto</label>
              <input id="catalog-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produtos" />
              {search ? <button type="button" className="search-box__clear" onClick={() => setSearch('')} aria-label="Limpar busca"><X aria-hidden="true" /></button> : null}
            </div>
            <label className="sort-control">
              <span><ArrowUpDown aria-hidden="true" /> Ordenar por</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                <option value="catalog">Destaques</option>
                <option value="name">Nome</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </label>
          </div>
          <CatalogCategories activeCategory={category} onCategoryChange={setCategory} />
          <div className="catalog__options">
            <details className="catalog-filter-panel" open={mode !== 'todos' || !!maxPrice || undefined}>
              <summary>Filtrar por preço</summary>
              <div className="catalog-filters">
                <label>Modalidade de preço<select value={mode} onChange={e => setMode(e.target.value)}><option value="todos">Todos</option><option value="definido">Preço definido</option><option value="consulta">Sob consulta</option></select></label>
                <label>Preço definido até (R$)<input type="number" min="0" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} /></label>
                {search || category || mode !== 'todos' || maxPrice || sort !== 'catalog' ? <button type="button" className="btn btn--ghost" onClick={() => { setSearch(''); setCategory(null); setSort('catalog'); setMode('todos'); setMaxPrice(''); }}>Limpar filtros</button> : null}
              </div>
            </details>
            {sort.startsWith('price') ? <p>Produtos sob consulta aparecem após os produtos com preço definido.</p> : null}
            {!loading && !error ? (
              <div className="catalog__meta">
                <p className="catalog__count" aria-live="polite"><strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}</p>
                {category ? <button type="button" className="active-filter" onClick={() => setCategory(null)}>Categoria: {category}<X aria-hidden="true" /></button> : null}
              </div>
            ) : null}
          </div>
          {loading ? (
            <div className="product-grid product-grid--loading" aria-label="Carregando produtos">
              {Array.from({ length: 8 }, (_, index) => <div key={index} className="product-skeleton" aria-hidden="true"><span /><i /><i /></div>)}
            </div>
          ) : null}
          {error ? <p className="error-message" role="alert">{error} <button type="button" onClick={() => setRetry(r => r + 1)}>Tentar novamente</button></p> : null}
          {!loading && !error ? (
            <div className="product-grid">
              {filteredProducts.length ? filteredProducts.slice(0, visibleCount).map((product, index) => (
                <ProductCard key={product.codigo} product={product} priority={index < 2} onAdd={addToCart} />
              )) : (
                <div className="empty-state">
                  <span className="empty-state__icon"><SearchX aria-hidden="true" /></span>
                  <h3>Nenhum produto por aqui</h3>
                  <p>Tente buscar outro termo ou volte a ver todo o nosso catálogo.</p>
                  <button type="button" className="btn btn--ghost" onClick={() => { setSearch(''); setCategory(null); setSort('catalog'); setMode('todos'); setMaxPrice(''); }}>Limpar filtros</button>
                </div>
              )}
            </div>
          ) : null}
          {visibleCount < filteredProducts.length ? <button type="button" className="btn btn--ghost" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>Carregar mais</button> : null}
          <div ref={sentinelRef} className="load-more-sentinel" aria-hidden="true" />
        </section>
        <section className="trust-strip" aria-label="Diferenciais da loja">
          <div className="container trust-strip__inner">
            <p><Factory aria-hidden="true" /><span><strong>Produção própria</strong>Feito sob encomenda</span></p>
            <p><BadgeCheck aria-hidden="true" /><span><strong>Confirmação pelo WhatsApp</strong>Combine as condições antes da produção</span></p>
            <p><MessageCircle aria-hidden="true" /><span><strong>Atendimento próximo</strong>Envie sua solicitação pelo WhatsApp</span></p>
          </div>
        </section>
        <section className="how-it-works" aria-labelledby="como-comprar">
          <div className="container">
            <div className="how-it-works__heading">
              <p className="section-eyebrow"><PackageCheck aria-hidden="true" /> Simples e seguro</p>
              <h2 id="como-comprar">Seu pedido em três passos</h2>
              <p>Produzimos após a confirmação do pedido. Prazo de produção e entrega combinados pelo WhatsApp.</p>
            </div>
            <ol className="purchase-steps">
              <li><span>01</span><div><strong>Escolha seus favoritos</strong><p>Adicione produtos com preço definido ou solicite orçamento.</p></div></li>
              <li><span>02</span><div><strong>Revise seu pedido</strong><p>Confira itens, quantidades e o subtotal dos produtos.</p></div></li>
              <li><span>03</span><div><strong>Combine pelo WhatsApp</strong><p>Confirme o pedido, o prazo de produção e a entrega.</p></div></li>
            </ol>
            <a className="how-it-works__cta" href={`https://wa.me/${STORE_CONFIG.whatsappNumber}`} target="_blank" rel="noopener noreferrer" onClick={() => trackStoreEvent('click_whatsapp', { source: 'purchase_steps' })}>
              Ficou com alguma dúvida? Fale com a gente <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />

      <nav className="mobile-nav" aria-label="Ações rápidas">
        <a href="#produtos" className="mobile-nav__item"><Store aria-hidden="true" /><span>Produtos</span></a>
        <button type="button" className="mobile-nav__item mobile-nav__cart" onClick={() => setCartOpen(true)}>
          <ShoppingCart aria-hidden="true" /><span><span className="sr-only">Abrir </span>Carrinho</span>
          <small>{cart.count ? `${cart.count} ${cart.count === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}</small>
        </button>
        <a href={`https://wa.me/${STORE_CONFIG.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="mobile-nav__item mobile-nav__whatsapp" onClick={() => trackStoreEvent('click_whatsapp', { source: 'mobile_navigation' })}>
          <MessageCircle aria-hidden="true" /><span>WhatsApp</span>
        </a>
      </nav>

      {cartOpen ? <CartModal items={cart.items} products={products} total={cart.total} onClose={() => setCartOpen(false)} onClear={cart.clear} onRemove={cart.remove} onUpdate={cart.updateQuantity} onConfigure={cart.configure} onCheckout={startCheckout} /> : null}
      {checkoutOpen ? <CheckoutModal items={cart.items} products={products} message={preparedMessage} name={customerName} notes={notes} onNameChange={setCustomerName} onNotesChange={setNotes} onEdit={() => { setCheckoutOpen(false); setCartOpen(true); }} itemCount={cart.count} total={cart.total} hasUnpricedItems={hasUnpricedItems} onClose={() => setCheckoutOpen(false)} onSubmit={sendOrder} /> : null}
      <Toast message={toast} onDismiss={dismissToast} actionLabel={cart.items.length ? 'Ver carrinho' : undefined} onAction={() => setCartOpen(true)} />
    </>
  );
}
