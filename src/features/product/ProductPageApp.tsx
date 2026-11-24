import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageCircle, ShoppingCart } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { Toast } from '../../components/Toast';
import { useCart } from '../cart/useCart';
import { trackStoreEvent } from '../../lib/analytics';
import { formatPrice, slugify } from '../../lib/format';
import { isQuote, minimum, increment, normalizeQuantity, quantityLabel, configurationError } from '../../lib/product-rules';
import { buildConsultationMessage, openWhatsApp } from '../../lib/whatsapp';
import { useProducts } from '../../hooks/useProducts';

import { ProductGallery } from './ProductGallery';
import { ProductOptions } from '../../components/ProductOptions';
import { WhatsAppRecovery } from '../../components/WhatsAppRecovery';
import { catalogUrl } from '../../lib/navigation';

function pageSlug(): string {
  const route = window.location.pathname.split('/').filter(Boolean).at(-1) ?? '';
  try {
    return decodeURIComponent(route.replace(/^produto-/, '').replace(/\.html$/, ''));
  } catch {
    return '';
  }
}

export function ProductPageApp() {
  const { products, loading, failed, retry } = useProducts();
  const [quantity, setQuantity] = useState(1);
  const [options, setOptions] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const cart = useCart(products);
  const product = useMemo(() => {
    const slug = pageSlug();
    const code = slug.split('-').at(-1);
    const match = products.find(item => item.codigo === code);
    return match && slugify(`${match.nome}-${match.codigo}`) === slug ? match : undefined;
  }, [products]);

  useEffect(() => {
    document.title = `${product ? product.nome : loading ? 'Produto' : failed ? 'Erro ao carregar produto' : 'Produto não encontrado'} | Clube do Léo`;
  }, [product, loading, failed]);

  useEffect(() => {
    if (product) {
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
      <PageHeader>
        <a href={catalogUrl()} className="btn btn--ghost btn--small"><ArrowLeft aria-hidden="true" /> Voltar aos produtos</a>
        <a href={catalogUrl(true)} className="page-header__cart" aria-label={`Abrir carrinho com ${cart.count} itens`}><ShoppingCart aria-hidden="true" /><span>{cart.count}</span></a>
      </PageHeader>
      <main id="produto" className="container product-page__main" aria-busy={loading}>
        {loading ? <div className="spinner" aria-label="Carregando produto" /> : null}
        {failed || (!loading && !product) ? <div className="error-message" role="alert">{failed ? 'Não foi possível carregar este produto.' : 'Produto não encontrado.'} {failed ? <button type="button" onClick={retry}>Tentar novamente</button> : null} <a href={catalogUrl()}>Voltar à loja</a></div> : null}
        {product ? (
          <article className="product-page__content">
            <ProductGallery key={product.codigo} product={product} />
            <div className="product-page__summary">
              <div className="product-page__info">
                <div className="product-tags">{product.categorias.map(category => <span className="category-label" data-category={category} key={category}>{category}</span>)}</div>
                <h1>{product.nome}</h1>
                <p className="product-detail__code">Código {product.codigo}</p>
              </div>
              <form id="purchase" className="product-page__purchase" onSubmit={event => { event.preventDefault(); addToCart(); }}>
                <p className="product-detail__price">{isQuote(product) ? 'Preço sob consulta' : `${formatPrice(product.valor)} / ${product.unidadeVenda || 'unidade'}`}</p>
                <p className="purchase-note"><strong>Feito sob encomenda.</strong> Prazo de produção, entrega e personalizações combinados pelo WhatsApp antes da produção.</p>
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
                <small className="purchase-disclaimer">Adicionar ao carrinho ou abrir o WhatsApp não confirma contratação, pagamento ou produção.</small>
                {message ? <WhatsAppRecovery message={message} kind="orcamento" /> : null}
              </form>
            </div>
            <section className="product-page__description" aria-label="Especificações e descrição">
              <h2>Sobre o produto</h2>
              <dl>{([['dimensoes', 'Dimensões'], ['conteudo', 'Conteúdo do conjunto']] as const).map(([key, label]) => product[key] ? <div key={key}><dt>{label}</dt><dd>{product[key]}</dd></div> : null)}</dl>
              <p className="product-detail__descricao">{product.descricao}</p>
            </section>
            <div className="product-mobile-action"><span>{isQuote(product) ? 'Preço sob consulta' : formatPrice(product.valor)}</span><button className="btn btn--primary" type="button" onClick={() => { const form = document.getElementById('purchase') as HTMLFormElement | null; if (!product.personalizacoes?.some(f => f.required)) { form?.requestSubmit(); return; } form?.scrollIntoView({ block: 'start' }); form?.querySelector<HTMLElement>('textarea, select, button[type="submit"]')?.focus(); }}>{product.personalizacoes?.some(f => f.required) ? 'Personalizar' : isQuote(product) ? 'Solicitar orçamento' : 'Adicionar ao carrinho'}</button></div>
          </article>
        ) : null}
      </main>
      <SiteFooter compact />
      <Toast message={toast} onDismiss={() => setToast('')} actionLabel={cart.count ? 'Ver carrinho' : undefined} onAction={() => { window.location.href = catalogUrl(true); }} />
    </div>
  );
}
