import { memo } from 'react';
import { ShoppingCart } from 'lucide-react';
import { formatPrice, imageFallback, productPageUrl, productThumbnailUrl } from '../../../lib/format';
import type { Product } from '../../../types/product';

import { isQuote } from '../../../lib/product-rules';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  priority?: boolean;
}

export const ProductCard = memo(function ProductCard({ product, onAdd, priority = false }: ProductCardProps) {
  const quote = isQuote(product);
  const url = productPageUrl(product.nome, product.codigo);
  return (
    <article className="product-card">
      <a className="product-card__details-trigger" href={url}>
        <div className="product-card__media">
          <img src={productThumbnailUrl(product.imagens[0])} alt="" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" width="480" height="480" onError={imageFallback} />
          <span className="product-card__code">Código {product.codigo}</span>
        </div>
        <div className="product-card__body">
          <span className="product-card__badge category-label" data-category={product.categorias[0]}>{product.categorias[0]}</span>
          <h2 className="product-card__title">{product.nome}</h2>
          {product.pecasPorKit ? <p className="product-card__composition">{product.pecasPorKit} peças por kit</p> : null}
          <div className="product-card__buying-info">
            <p className={`product-card__price${quote ? ' product-card__price--quote' : ''}`}>{quote ? 'Preço sob consulta' : <>{formatPrice(product.valor)}<span className="product-card__unit"> / {product.unidadeVenda || 'un.'}</span></>}<small className="made-to-order">Feito sob encomenda</small></p>
          </div>
        </div>
      </a>
      <div className="product-card__actions">
        {quote || product.personalizacoes?.length ? <a className="btn btn--primary" href={url}>{quote ? 'Solicitar orçamento' : 'Personalizar'}</a> : <button type="button" className="btn btn--primary" onClick={() => onAdd(product)}><ShoppingCart aria-hidden="true" /> Adicionar ao carrinho</button>}

      </div>
    </article>
  );
});
