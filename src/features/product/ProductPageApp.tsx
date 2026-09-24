import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageCircle, ShoppingCart } from 'lucide-react';
import { SiteFooter } from '../../components/SiteFooter';
import { Toast } from '../../components/Toast';
import { STORE_CONFIG } from '../../config/store';
import { useCart } from '../../hooks/useCart';
import { trackStoreEvent } from '../../lib/analytics';
import { BRAND_LOGO_URL, formatPrice, imageFallback, productThumbnailUrl, resolveAsset, slugify } from '../../lib/format';
import { fetchProducts } from '../../lib/products';
import { buildConsultationMessage, openWhatsApp } from '../../lib/whatsapp';
import type { Product } from '../../types/product';

function pageSlug(): string {
  const filename = window.location.pathname.split('/').at(-1) ?? '';
  return decodeURIComponent(filename.replace(/^produto-/, '').replace(/\.html$/, ''));
}

export function ProductPageApp() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState('');
  const cart = useCart(products);
  const product = useMemo(
    () => products.find((item) => slugify(`${item.nome}-${item.codigo}`) === pageSlug()),
    [products],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal)
      .then(setProducts)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError('Não foi possível carregar este produto.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (product) {
      setSelectedImage(product.imagens[0] ?? '');
      trackStoreEvent('view_item', { product_code: product.codigo, value: product.valor });
    }
  }, [product]);

  const addToCart = () => {
    if (!product) return;
    cart.add(product.codigo, quantity);
    trackStoreEvent('add_to_cart', { product_code: product.codigo, quantity, value: product.valor });
    setToast(`${product.nome} adicionado ao carrinho.`);
  };

  return (
    <div className="product-page">
      <a className="skip-link" href="#produto">Pular para o produto</a>
      <header className="institutional-header">
        <div className="container institutional-header__inner">
          <a href="./index.html" className="brand" aria-label="Clube do Léo, página inicial"><img src={BRAND_LOGO_URL} alt="Clube do Léo" className="brand__logo" /></a>
          <a href="./index.html#produtos" className="btn btn--ghost btn--small"><ArrowLeft aria-hidden="true" /> Voltar aos produtos</a>
        </div>
      </header>
      <main id="produto" className="container product-page__main" aria-busy={loading}>
        {loading ? <div className="spinner" aria-label="Carregando produto" /> : null}
        {error || (!loading && !product) ? <div className="error-message" role="alert">{error || 'Produto não encontrado.'} <a href="./index.html">Voltar à loja</a></div> : null}
        {product ? (
          <article className="product-page__content">
            <div className="product-detail__gallery product-page__gallery">
              <img id="detail-main-image" src={resolveAsset(selectedImage)} alt={product.nome} width="800" height="800" decoding="async" fetchPriority="high" onError={imageFallback} />
              {product.imagens.length > 1 ? <div className="product-detail__thumbs" aria-label="Galeria de imagens">{product.imagens.map((image, index) => (
                <button key={`${image}-${index}`} type="button" className={`product-detail__thumb${selectedImage === image ? ' is-active' : ''}`} onClick={() => setSelectedImage(image)} aria-label={`Ver imagem ${index + 1} de ${product.nome}`}>
                  <img src={productThumbnailUrl(image)} alt="" loading="lazy" decoding="async" width="80" height="80" onError={imageFallback} />
                </button>
              ))}</div> : null}
            </div>
            <div className="product-page__info">
              <span className="tag">{product.categorias.join(', ')}</span>
              <h1>{product.nome}</h1>
              <p className="product-detail__price">{formatPrice(product.valor)}</p>
              <p className="product-detail__descricao">{product.descricao}</p>
            </div>
            <div className="product-page__purchase">
              <div className="quantity-stepper">
                <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} aria-label="Diminuir quantidade">−</button>
                <output aria-label="Quantidade">{quantity}</output>
                <button type="button" onClick={() => setQuantity((current) => Math.min(STORE_CONFIG.maxQuantityPerProduct, current + 1))} disabled={quantity >= STORE_CONFIG.maxQuantityPerProduct} aria-label="Aumentar quantidade">+</button>
              </div>
              <button type="button" className="btn btn--primary btn--block" onClick={addToCart}><ShoppingCart aria-hidden="true" /> Adicionar ao carrinho</button>
              <a className="btn btn--ghost btn--block" href="./index.html?carrinho=1"><ShoppingCart aria-hidden="true" /> Ver carrinho ({cart.count})</a>
              {product.valor <= 0 ? <button type="button" className="btn btn--whatsapp btn--block" onClick={() => { trackStoreEvent('click_whatsapp', { source: 'product_consultation', product_code: product.codigo }); openWhatsApp(buildConsultationMessage(product)); }}><MessageCircle aria-hidden="true" /> Consultar no WhatsApp</button> : null}
              <small>O valor final e a disponibilidade serão confirmados pela loja.</small>
            </div>
          </article>
        ) : null}
      </main>
      <SiteFooter compact />
      <Toast message={toast} onDismiss={() => setToast('')} actionLabel={cart.count ? 'Ver carrinho' : undefined} onAction={() => { window.location.href = './index.html?carrinho=1'; }} />
    </div>
  );
}
