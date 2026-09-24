import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, Factory, MessageCircle, Search, ShoppingCart, Store } from 'lucide-react';
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
  const cart = useCart(products);

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

  const filteredProducts = useMemo(() => {
    const term = normalizeSearchText(search);
    const matches = products.filter((product) =>
      (!term || normalizeSearchText([
        product.nome,
        product.codigo,
        product.descricao,
        ...product.categorias,
      ].join(' ')).includes(term)) &&
      (!category || product.categorias.includes(category)),
    );
    if (sort === 'name') return [...matches].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (sort === 'price-asc') return [...matches].sort((a, b) => (a.valor || Number.POSITIVE_INFINITY) - (b.valor || Number.POSITIVE_INFINITY));
    if (sort === 'price-desc') return [...matches].sort((a, b) => b.valor - a.valor);
    return matches;
  }, [category, products, search, sort]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [category, search]);

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

  const addToCart = (product: Product, quantity = 1) => {
    cart.add(product.codigo, quantity);
    trackStoreEvent('add_to_cart', { product_code: product.codigo, quantity, value: product.valor });
    setToast(`${product.nome} adicionado ao carrinho!`);
  };

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
        <section id="produtos" className="catalog container" aria-busy={loading}>
          <div className="catalog__controls">
            <label className="search-box">
              <Search aria-hidden="true" />
              <span className="sr-only">Buscar produto</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto..." />
            </label>
            <label className="sort-control">
              <span>Ordenar por</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                <option value="catalog">Ordem do catálogo</option>
                <option value="name">Nome</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </label>
          </div>
          {!loading && !error ? <p className="catalog__count" aria-live="polite">{filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'}</p> : null}
          {loading ? <div className="spinner" aria-label="Carregando produtos" /> : null}
          {error ? <p className="error-message" role="alert">{error}</p> : null}
          {!loading && !error ? (
            <div className="product-grid">
              {filteredProducts.length ? filteredProducts.slice(0, visibleCount).map((product) => (
                <ProductCard key={product.codigo} product={product} onAdd={addToCart} />
              )) : <p className="empty-state">Nenhum produto encontrado para essa busca.</p>}
            </div>
          ) : null}
          <div ref={sentinelRef} className="load-more-sentinel" aria-hidden="true" />
        </section>
        <section className="trust-strip" aria-label="Diferenciais da loja">
          <div className="container trust-strip__inner">
            <p><Factory aria-hidden="true" /><span><strong>Produção própria</strong>Produtos impressos em 3D</span></p>
            <p><BadgeCheck aria-hidden="true" /><span><strong>Pedido transparente</strong>Subtotal antes de chamar</span></p>
            <p><MessageCircle aria-hidden="true" /><span><strong>Atendimento próximo</strong>Confirmação pelo WhatsApp</span></p>
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
