import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle, ShoppingCart } from 'lucide-react';
import { SiteFooter } from '../../components/SiteFooter';
import { Toast } from '../../components/Toast';
import { useCart } from '../../hooks/useCart';
import { trackStoreEvent } from '../../lib/analytics';
import { BRAND_LOGO_URL, formatPrice, imageFallback, productThumbnailUrl, resolveAsset, slugify } from '../../lib/format';
import { fetchProducts, isQuote, minimum, increment, normalizeQuantity, quantityLabel, configurationError } from '../../lib/products';
import { buildConsultationMessage, openWhatsApp } from '../../lib/whatsapp';
import type { Product } from '../../types/product';

import { Modal } from '../../components/Modal';
import { ProductOptions } from '../../components/ProductOptions';
import { WhatsAppRecovery } from '../../components/WhatsAppRecovery';
import { catalogUrl } from '../../lib/navigation';

function pageSlug(): string {
  const route = window.location.pathname.split('/').filter(Boolean).at(-1) ?? '';
  return decodeURIComponent(route.replace(/^produto-/, '').replace(/\.html$/, ''));
}

export function ProductPageApp() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [options, setOptions] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [zoom, setZoom] = useState(false);
  const [retry, setRetry] = useState(0);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const cart = useCart(products);
  const product = useMemo(
    () => products.find((item) => slugify(`${item.nome}-${item.codigo}`) === pageSlug()),
    [products],
  );

  useEffect(() => {
    setLoading(true); setError('');
    const controller = new AbortController();
    fetchProducts(controller.signal)
      .then(setProducts)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError('Não foi possível carregar este produto.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (product) {
      setSelectedImage(product.imagens[0] ?? '');
      setQuantity(minimum(product));
      trackStoreEvent('view_item', { product_code: product.codigo, value: product.valor });
    }
  }, [product]);

  const addToCart = () => {
    if (!product) return;
    const issue = configurationError(product, options);
    if (issue) { setFormError(issue); return; }
    setFormError('');
    if (isQuote(product)) {
      const prepared = buildConsultationMessage(product, quantity, options);
      setMessage(prepared);
      trackStoreEvent('request_quote', { product_code: product.codigo, quantity });
      trackStoreEvent('click_whatsapp', { kind: 'orcamento', product_code: product.codigo });
      openWhatsApp(prepared);
      return;
    }
    cart.add(product.codigo, quantity, options);
    trackStoreEvent('add_to_cart', { product_code: product.codigo, quantity, value: product.valor });
    setToast(`${product.nome} adicionado ao carrinho.`);
  };

  return (
    <div className="product-page">
      <a className="skip-link" href="#produto">Pular para o produto</a>
      <header className="institutional-header">
        <div className="container institutional-header__inner">
          <a href={catalogUrl()} className="brand" aria-label="Clube do Léo, página inicial"><img src={BRAND_LOGO_URL} alt="Clube do Léo" className="brand__logo" /></a>
          <a href={catalogUrl()} className="btn btn--ghost btn--small"><ArrowLeft aria-hidden="true" /> Voltar aos produtos</a>
        </div>
      </header>
      <main id="produto" className="container product-page__main" aria-busy={loading}>
        {loading ? <div className="spinner" aria-label="Carregando produto" /> : null}
        {error || (!loading && !product) ? <div className="error-message" role="alert">{error || 'Produto não encontrado.'} {error ? <button type="button" onClick={() => setRetry(r => r + 1)}>Tentar novamente</button> : null} <a href={catalogUrl()}>Voltar à loja</a></div> : null}
        {product ? (
          <article className="product-page__content">
            <div className="product-detail__gallery product-page__gallery">
              <button type="button" className="gallery-enlarge" aria-label="Ampliar imagem" onClick={() => setZoom(true)}><img id="detail-main-image" src={resolveAsset(selectedImage)} alt={product.nome} width="800" height="800" decoding="async" fetchPriority="high" onError={imageFallback} /></button>
              {product.imagens.length > 1 ? <div className="product-detail__thumbs" aria-label="Galeria de imagens">{product.imagens.map((image, index) => (
                <button key={`${image}-${index}`} type="button" className={`product-detail__thumb${selectedImage === image ? ' is-active' : ''}`} aria-pressed={selectedImage === image} onClick={() => setSelectedImage(image)} aria-label={`Ver imagem ${index + 1} de ${product.nome}`}>
                  <img src={productThumbnailUrl(image)} alt="" loading="lazy" decoding="async" width="80" height="80" onError={imageFallback} />
                </button>
              ))}</div> : null}
            </div>
            <div className="product-page__info">
              <span className="tag">{product.categorias.join(', ')}</span>
              <h1>{product.nome}</h1>
              <p className="product-detail__code">Código {product.codigo}</p>
            </div>
            <form id="purchase" className="product-page__purchase" onSubmit={event => { event.preventDefault(); addToCart(); }}>
              <p className="product-detail__price">{isQuote(product) ? 'Preço sob consulta' : `${formatPrice(product.valor)} / ${product.unidadeVenda || 'unidade'}`}</p>
              <strong>Feito sob encomenda</strong>
              <p>Produzimos após a confirmação do pedido. Prazo de produção e entrega combinados pelo WhatsApp.</p>
              <small>Entrega e eventuais personalizações combinadas com a loja.</small>
              <ProductOptions product={product} values={options} onChange={values => { if (!Object.keys(options).length) trackStoreEvent('personalization_started', { product_code: product.codigo }); setOptions(values); }} />
              {formError ? <p role="alert">{formError}</p> : null}
              <p>{quantityLabel(product, quantity)} · Mínimo {minimum(product)}</p>
              <div className="quantity-stepper">
                <button type="button" onClick={() => setQuantity((current) => normalizeQuantity(product, current - increment(product)))} disabled={quantity <= minimum(product)} aria-label="Diminuir quantidade">−</button>
                <output aria-label="Quantidade">{quantity}</output>
                <button type="button" onClick={() => setQuantity((current) => normalizeQuantity(product, current + increment(product)))} disabled={normalizeQuantity(product, quantity + increment(product)) === quantity} aria-label="Aumentar quantidade">+</button>
              </div>
              <button type="submit" className="btn btn--primary btn--block">{isQuote(product) ? <MessageCircle aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}{isQuote(product) ? 'Solicitar orçamento pelo WhatsApp' : 'Adicionar ao carrinho'}</button>
              <a className="btn btn--ghost btn--block" href={catalogUrl(true)}>Ver carrinho ({cart.count})</a>
              <small>Adicionar ao carrinho ou abrir o WhatsApp não confirma contratação, pagamento ou produção.</small>
              {message ? <WhatsAppRecovery message={message} kind="orcamento" /> : null}
            </form>
            <section className="product-page__description" aria-label="Especificações e descrição">
              <h2>Sobre o produto</h2>
              <dl>{([['dimensoes', 'Dimensões'], ['conteudo', 'Conteúdo do conjunto']] as const).map(([key, label]) => product[key] ? <div key={key}><dt>{label}</dt><dd>{product[key]}</dd></div> : null)}</dl>
              <p className="product-detail__descricao">{product.descricao}</p>
            </section>
            <div className="product-mobile-action"><span>{isQuote(product) ? 'Preço sob consulta' : formatPrice(product.valor)}</span><button className="btn btn--primary" type="button" onClick={() => { const form = document.getElementById('purchase') as HTMLFormElement | null; if (!product.personalizacoes?.some(f => f.required)) { form?.requestSubmit(); return; } form?.scrollIntoView({ block: 'start' }); form?.querySelector<HTMLElement>('textarea, select, button[type="submit"]')?.focus(); }}>{product.personalizacoes?.some(f => f.required) ? 'Personalizar' : isQuote(product) ? 'Solicitar orçamento' : 'Adicionar ao carrinho'}</button></div>
          </article>
        ) : null}
      </main>
      {zoom && product ? <Modal label="Imagem ampliada" onClose={() => setZoom(false)}><div onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setSelectedImage(product.imagens[(product.imagens.indexOf(selectedImage) + (e.key === 'ArrowRight' ? 1 : product.imagens.length - 1)) % product.imagens.length]); } }} onTouchStart={e => { e.currentTarget.dataset.start = String(e.touches[0].clientX); }} onTouchEnd={e => { const delta = e.changedTouches[0].clientX - Number(e.currentTarget.dataset.start); if (Math.abs(delta) > 40) setSelectedImage(product.imagens[(product.imagens.indexOf(selectedImage) + (delta < 0 ? 1 : product.imagens.length - 1)) % product.imagens.length]); }}>
        <img className="zoom-image" src={resolveAsset(selectedImage)} alt={product.nome} />
        <div className="gallery-navigation">
        <button type="button" className="btn btn--ghost gallery-navigation__arrow" aria-label="Imagem anterior" onClick={() => setSelectedImage(product.imagens[(product.imagens.indexOf(selectedImage) + product.imagens.length - 1) % product.imagens.length])}><ChevronLeft aria-hidden="true" /></button>
        <span aria-live="polite"> Imagem {product.imagens.indexOf(selectedImage) + 1} de {product.imagens.length} </span>
        <button type="button" className="btn btn--ghost gallery-navigation__arrow" aria-label="Próxima imagem" onClick={() => setSelectedImage(product.imagens[(product.imagens.indexOf(selectedImage) + 1) % product.imagens.length])}><ChevronRight aria-hidden="true" /></button>
        </div>
      </div></Modal> : null}
      <SiteFooter compact />
      <Toast message={toast} onDismiss={() => setToast('')} actionLabel={cart.count ? 'Ver carrinho' : undefined} onAction={() => { window.location.href = catalogUrl(true); }} />
    </div>
  );
}
