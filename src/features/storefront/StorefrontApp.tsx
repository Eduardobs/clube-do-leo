import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Search, ShoppingCart, Store } from 'lucide-react';
import { SiteFooter } from '../../components/SiteFooter';
import { Toast } from '../../components/Toast';
import { STORE_CONFIG } from '../../config/store';
import { useCart } from '../../hooks/useCart';
import { fetchProducts } from '../../lib/products';
import { buildConsultationMessage, buildOrderMessage, openWhatsApp } from '../../lib/whatsapp';
import type { Category, Product } from '../../types/product';
import { CartModal } from './CartModal';
import { CheckoutModal } from './CheckoutModal';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { StoreHeader } from './StoreHeader';

const PAGE_SIZE = 12;

export function StorefrontApp() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
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
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return products.filter((product) =>
      (!term || product.nome.toLocaleLowerCase('pt-BR').includes(term)) &&
      (!category || product.categorias.includes(category)),
    );
  }, [category, products, search]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [category, search]);

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
    setDetailProduct(null);
    setToast(`${product.nome} adicionado ao carrinho!`);
  };

  const consultProduct = (product: Product) => openWhatsApp(buildConsultationMessage(product));

  const startCheckout = () => {
    if (!cart.items.length) {
      setToast('Carrinho vazio! Adicione itens antes de finalizar.');
      return;
    }
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const sendOrder = (customerName: string) => {
    openWhatsApp(buildOrderMessage(customerName, cart.items, products));
    cart.clear();
    setCheckoutOpen(false);
  };

  return (
    <>
      <StoreHeader activeCategory={category} cartCount={cart.count} onCategoryChange={setCategory} onOpenCart={() => setCartOpen(true)} />
      <main>
        <section id="produtos" className="catalog container" aria-busy={loading}>
          <div className="catalog__controls">
            <label className="search-box">
              <Search aria-hidden="true" />
              <span className="sr-only">Buscar produto</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto..." />
            </label>
          </div>
          {loading ? <div className="spinner" aria-label="Carregando produtos" /> : null}
          {error ? <p className="error-message" role="alert">{error}</p> : null}
          {!loading && !error ? (
            <div className="product-grid">
              {filteredProducts.length ? filteredProducts.slice(0, visibleCount).map((product) => (
                <ProductCard key={product.codigo} product={product} onDetails={setDetailProduct} onAdd={addToCart} onConsult={consultProduct} />
              )) : <p className="empty-state">Nenhum produto encontrado para essa busca.</p>}
            </div>
          ) : null}
          <div ref={sentinelRef} className="load-more-sentinel" aria-hidden="true" />
        </section>
      </main>
      <SiteFooter />

      <nav className="mobile-nav" aria-label="Ações rápidas">
        <a href="#produtos" className="mobile-nav__item"><Store aria-hidden="true" /><span>Produtos</span></a>
        <button type="button" className="mobile-nav__item mobile-nav__cart" onClick={() => setCartOpen(true)} aria-label="Abrir carrinho">
          <ShoppingCart aria-hidden="true" /><span>Carrinho</span>
          <small>{cart.count ? `${cart.count} ${cart.count === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}</small>
        </button>
        <a href={`https://wa.me/${STORE_CONFIG.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="mobile-nav__item mobile-nav__whatsapp">
          <MessageCircle aria-hidden="true" /><span>WhatsApp</span>
        </a>
      </nav>

      {detailProduct ? <ProductDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} onAdd={addToCart} onConsult={consultProduct} /> : null}
      {cartOpen ? <CartModal items={cart.items} products={products} total={cart.total} onClose={() => setCartOpen(false)} onClear={cart.clear} onRemove={cart.remove} onUpdate={cart.updateQuantity} onCheckout={startCheckout} /> : null}
      {checkoutOpen ? <CheckoutModal onClose={() => setCheckoutOpen(false)} onSubmit={sendOrder} /> : null}
      <Toast message={toast} onDismiss={dismissToast} actionLabel={cart.items.length ? 'Ver carrinho' : undefined} onAction={() => setCartOpen(true)} />
    </>
  );
}
