import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpDown, BadgeCheck, Factory, MessageCircle, PackageCheck, Search, SearchX, ShoppingCart, Store, X } from 'lucide-react';
import { SiteFooter } from '../../components/SiteFooter';
import { Toast } from '../../components/Toast';
import { STORE_CONFIG } from '../../config/store';
import { useCart } from '../../hooks/useCart';
import { trackStoreEvent } from '../../lib/analytics';
import { normalizeSearchText } from '../../lib/format';
import { fetchProducts, findProduct } from '../../lib/products';
import { buildDetailedOrderMessage, createOrderId, openWhatsApp } from '../../lib/whatsapp';
import type { Category, Product } from '../../types/product';
import { CartModal } from './CartModal';
import { CheckoutModal } from './CheckoutModal';
import { ProductCard } from './ProductCard';
import { StoreHeader } from './StoreHeader';

const PAGE_SIZE = 12;
const productNameCollator = new Intl.Collator('pt-BR');

export function StorefrontApp() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<'catalog' | 'name' | 'price-asc' | 'price-desc'>('catalog');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast, setToast] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const trustStripRef = useRef<HTMLDivElement>(null);
  const cart = useCart(products);

  useEffect(() => {
    const strip = trustStripRef.current;
    if (!strip || typeof window.matchMedia !== 'function') return;

    const mobileViewport = window.matchMedia('(max-width: 768px)');
    let activeItem = 0;
    let intervalId: number | undefined;

    const scrollToNextItem = () => {
      const items = Array.from(strip.querySelectorAll<HTMLElement>(':scope > p'));
      if (items.length < 2) return;

      activeItem = (activeItem + 1) % items.length;
      const itemRect = items[activeItem].getBoundingClientRect();
      const stripRect = strip.getBoundingClientRect();
      const centeredItemPosition = strip.scrollLeft + itemRect.left - stripRect.left
        - (strip.clientWidth - itemRect.width) / 2;

      strip.scrollTo({ left: Math.max(0, centeredItemPosition), behavior: 'smooth' });
    };

    const updateAutoScroll = () => {
      window.clearInterval(intervalId);
      intervalId = undefined;

      if (mobileViewport.matches) {
        activeItem = 0;
        intervalId = window.setInterval(scrollToNextItem, 4000);
      }
    };

    updateAutoScroll();
    mobileViewport.addEventListener('change', updateAutoScroll);

    return () => {
      window.clearInterval(intervalId);
      mobileViewport.removeEventListener('change', updateAutoScroll);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal)
      .then(setProducts)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        console.error('Erro ao carregar produtos:', reason);
        setError('Não foi possível carregar os produtos. Tente novamente mais tarde.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

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
        (!term || searchText.includes(term)) &&
        (!category || product.categorias.includes(category)),
      )
      .map(({ product }) => product);
    if (sort === 'name') return [...matches].sort((a, b) => productNameCollator.compare(a.nome, b.nome));
    if (sort === 'price-asc') return [...matches].sort((a, b) => (a.valor || Number.POSITIVE_INFINITY) - (b.valor || Number.POSITIVE_INFINITY));
    if (sort === 'price-desc') return [...matches].sort((a, b) => b.valor - a.valor);
    return matches;
  }, [category, indexedProducts, search, sort]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [category, search, sort]);

  useEffect(() => {
    if (loading || new URLSearchParams(window.location.search).get('carrinho') !== '1') return;
    setCartOpen(true);
    window.history.replaceState({}, '', `${window.location.pathname}#produtos`);
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
    cart.add(product.codigo, quantity);
    trackStoreEvent('add_to_cart', { product_code: product.codigo, quantity, value: product.valor });
    setToast(`${product.nome} adicionado ao carrinho!`);
  }, [cart.add]);

  const startCheckout = () => {
    if (!cart.items.length) {
      setToast('Carrinho vazio! Adicione itens antes de finalizar.');
      return;
    }
    setCartOpen(false);
    setCheckoutOpen(true);
    trackStoreEvent('begin_checkout', { item_count: cart.count, value: cart.total });
  };

  const sendOrder = (customerName: string, notes: string) => {
    const orderId = createOrderId();
    trackStoreEvent('click_whatsapp', { order_id: orderId, item_count: cart.count, value: cart.total });
    openWhatsApp(buildDetailedOrderMessage({ orderId, customerName, notes }, cart.items, products));
    setCheckoutOpen(false);
    setToast(`Pedido ${orderId} preparado. Seu carrinho foi mantido.`);
  };

  const hasUnpricedItems = cart.items.some((item) => (findProduct(products, item.codigo)?.valor ?? 0) <= 0);

  return (
    <>
      <a className="skip-link" href="#produtos">Pular para os produtos</a>
      <StoreHeader activeCategory={category} cartCount={cart.count} onCategoryChange={setCategory} onOpenCart={() => setCartOpen(true)} />
      <main>
        <section className="trust-strip" aria-label="Diferenciais da loja">
          <div ref={trustStripRef} className="container trust-strip__inner" tabIndex={0} aria-label="Deslize para conhecer os diferenciais da loja">
            <p><Factory aria-hidden="true" /><span><strong>Produção própria</strong>Feito com carinho em impressão 3D</span></p>
            <p><BadgeCheck aria-hidden="true" /><span><strong>Compra sem surpresa</strong>Confira o subtotal antes de enviar</span></p>
            <p><MessageCircle aria-hidden="true" /><span><strong>Atendimento próximo</strong>Finalize direto com a gente no WhatsApp</span></p>
          </div>
        </section>
        <section id="produtos" className="catalog container" aria-busy={loading}>
          <div className="catalog__toolbar" role="search" aria-label="Buscar e ordenar produtos">
            <div className="search-box">
              <Search aria-hidden="true" />
              <label className="sr-only" htmlFor="catalog-search">Buscar produto</label>
              <input id="catalog-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="O que você está procurando?" />
              {search ? <button type="button" className="search-box__clear" onClick={() => setSearch('')} aria-label="Limpar busca"><X aria-hidden="true" /></button> : null}
            </div>
            <label className="sort-control">
              <span><ArrowUpDown aria-hidden="true" /> Ordenar por</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                <option value="catalog">Ordem do catálogo</option>
                <option value="name">Nome</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </label>
          </div>
          {!loading && !error ? (
            <div className="catalog__meta">
              <p className="catalog__count" aria-live="polite"><strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}</p>
              {category ? <button type="button" className="active-filter" onClick={() => setCategory(null)}>Categoria: {category}<X aria-hidden="true" /></button> : null}
            </div>
          ) : null}
          {loading ? (
            <div className="product-grid product-grid--loading" aria-label="Carregando produtos">
              {Array.from({ length: 8 }, (_, index) => <div key={index} className="product-skeleton" aria-hidden="true"><span /><i /><i /></div>)}
            </div>
          ) : null}
          {error ? <p className="error-message" role="alert">{error}</p> : null}
          {!loading && !error ? (
            <div className="product-grid">
              {filteredProducts.length ? filteredProducts.slice(0, visibleCount).map((product) => (
                <ProductCard key={product.codigo} product={product} onAdd={addToCart} />
              )) : (
                <div className="empty-state">
                  <span className="empty-state__icon"><SearchX aria-hidden="true" /></span>
                  <h3>Nenhum produto por aqui</h3>
                  <p>Tente buscar outro termo ou volte a ver todo o nosso catálogo.</p>
                  <button type="button" className="btn btn--ghost" onClick={() => { setSearch(''); setCategory(null); }}>Limpar filtros</button>
                </div>
              )}
            </div>
          ) : null}
          <div ref={sentinelRef} className="load-more-sentinel" aria-hidden="true" />
        </section>
        <section className="how-it-works" aria-labelledby="como-comprar">
          <div className="container">
            <div className="how-it-works__heading">
              <p className="section-eyebrow"><PackageCheck aria-hidden="true" /> Simples e seguro</p>
              <h2 id="como-comprar">Seu pedido em três passos</h2>
              <p>Escolha com calma. Antes de confirmar, você ainda conversa com a gente para combinar todos os detalhes.</p>
            </div>
            <ol className="purchase-steps">
              <li><span>01</span><div><strong>Escolha seus favoritos</strong><p>Adicione quantos produtos quiser ao carrinho.</p></div></li>
              <li><span>02</span><div><strong>Revise seu pedido</strong><p>Confira itens, quantidades e o subtotal estimado.</p></div></li>
              <li><span>03</span><div><strong>Combine pelo WhatsApp</strong><p>Envie o pedido e confirme cores, prazo e entrega.</p></div></li>
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
        <button type="button" className="mobile-nav__item mobile-nav__cart" onClick={() => setCartOpen(true)} aria-label="Abrir carrinho">
          <ShoppingCart aria-hidden="true" /><span>Carrinho</span>
          <small>{cart.count ? `${cart.count} ${cart.count === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}</small>
        </button>
        <a href={`https://wa.me/${STORE_CONFIG.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="mobile-nav__item mobile-nav__whatsapp" onClick={() => trackStoreEvent('click_whatsapp', { source: 'mobile_navigation' })}>
          <MessageCircle aria-hidden="true" /><span>WhatsApp</span>
        </a>
      </nav>

      {cartOpen ? <CartModal items={cart.items} products={products} total={cart.total} onClose={() => setCartOpen(false)} onClear={cart.clear} onRemove={cart.remove} onUpdate={cart.updateQuantity} onCheckout={startCheckout} /> : null}
      {checkoutOpen ? <CheckoutModal itemCount={cart.count} total={cart.total} hasUnpricedItems={hasUnpricedItems} onClose={() => setCheckoutOpen(false)} onSubmit={sendOrder} /> : null}
      <Toast message={toast} onDismiss={dismissToast} actionLabel={cart.items.length ? 'Ver carrinho' : undefined} onAction={() => setCartOpen(true)} />
    </>
  );
}
