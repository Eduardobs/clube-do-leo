import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, Factory, MessageCircle, ShoppingCart, Store } from 'lucide-react';
import { SiteFooter } from '../../components/SiteFooter';
import { Toast } from '../../components/Toast';
import { STORE_CONFIG } from '../../config/store';
import { useCart } from '../cart/useCart';
import { trackStoreEvent } from '../../lib/analytics';
import { useProducts } from '../../hooks/useProducts';
import { normalizeQuantity } from '../../lib/product-rules';
import { formatOrderMessage, createOrderId, openWhatsApp } from '../../lib/whatsapp';
import { catalogParams, saveCatalog } from '../../lib/navigation';
import type { Product } from '../../types/product';
import { CartModal } from '../cart/CartModal';
import { CheckoutModal } from '../cart/CheckoutModal';
import { ProductCatalog } from './catalog/ProductCatalog';
import { StoreHeader } from './StoreHeader';

export function StorefrontApp() {
  const { products, loading, failed, retry } = useProducts();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [preparedMessage, setPreparedMessage] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const cart = useCart(products);

  useEffect(() => {
    if (loading || new URLSearchParams(window.location.search).get('carrinho') !== '1') return;
    const next = catalogParams(window.location.search);
    setCartOpen(true);
    window.history.replaceState({}, '', `/${next.size ? `?${next}` : ''}#produtos`);
    saveCatalog(next.toString());
  }, [loading]);

  useEffect(() => {
    setPreparedMessage('');
  }, [customerName, notes, cart.items]);

  const clearCheckoutDetails = () => {
    setPreparedMessage('');
    setCustomerName('');
    setNotes('');
  };

  const closeOrder = () => {
    setCartOpen(false);
    setCheckoutOpen(false);
    clearCheckoutDetails();
  };

  const dismissToast = useCallback(() => setToast(''), []);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    quantity = normalizeQuantity(product, quantity);
    if (!cart.add(product.codigo, quantity)) return;
    trackStoreEvent('add_to_cart', { product_code: product.codigo, quantity, value: product.valor });
    setToast(`${product.nome} adicionado ao carrinho!`);
  }, [cart.add]);

  const startCheckout = () => {
    if (!cart.summary.canCheckout) {
      setToast('Carrinho vazio! Adicione itens antes de finalizar.');
      return;
    }
    setCartOpen(false);
    setCheckoutOpen(true);
    trackStoreEvent('begin_checkout', { item_count: cart.count, value: cart.total });
  };

  const sendOrder = (customerName: string, notes: string) => {
    if (!cart.summary.canCheckout) return;
    const orderId = createOrderId();
    trackStoreEvent('click_whatsapp', { kind: !cart.summary.hasPricedItems ? 'orcamento' : 'pedido', item_count: cart.count, value: cart.total });
    const message = formatOrderMessage({ orderId, customerName, notes }, cart.summary);
    setPreparedMessage(message);
    openWhatsApp(message);
    setToast(`Pedido ${orderId} preparado. Seu carrinho foi mantido.`);
  };

  return (
    <>
      <a className="skip-link" href="#produtos">Pular para os produtos</a>
      <StoreHeader cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      <main>
        <ProductCatalog products={products} loading={loading} failed={failed} retry={retry} onAdd={addToCart} />
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

      {cartOpen ? <CartModal summary={cart.summary} onClose={closeOrder} onClear={() => { cart.clear(); clearCheckoutDetails(); }} onRemove={cart.remove} onUpdate={cart.updateQuantity} onConfigure={cart.configure} onCheckout={startCheckout} /> : null}
      {checkoutOpen ? <CheckoutModal summary={cart.summary} message={preparedMessage} name={customerName} notes={notes} onNameChange={setCustomerName} onNotesChange={setNotes} onEdit={() => { setCheckoutOpen(false); setCartOpen(true); }} onClose={closeOrder} onSubmit={sendOrder} /> : null}
      <Toast message={toast} onDismiss={dismissToast} actionLabel={cart.items.length ? 'Ver carrinho' : undefined} onAction={() => setCartOpen(true)} />
    </>
  );
}
