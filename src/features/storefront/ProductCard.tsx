import { memo } from 'react';
import { ArrowUpRight, ShoppingCart } from 'lucide-react';
import { formatPrice, imageFallback, productPageUrl, productThumbnailUrl } from '../../lib/format';
import type { Product } from '../../types/product';

import { isQuote } from '../../lib/products';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export const ProductCard = memo(function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <article className="product-card">
      <a className="product-card__details-trigger" href={productPageUrl(product.nome, product.codigo)} aria-label={`Ver detalhes de ${product.nome}`}>
        <div className="product-card__media">
          <img src={productThumbnailUrl(product.imagens[0])} alt={product.nome} loading="lazy" decoding="async" width="480" height="480" onError={imageFallback} />
          <span className="product-card__badge" data-category={product.categorias[0]}>{product.categorias[0]}</span>
        </div>
        <div className="product-card__body">
          <h2 className="product-card__title">{product.nome}</h2>
          <p className="product-card__code">Código {product.codigo}</p>
          {product.pecasPorKit ? <p className="product-card__composition">{product.pecasPorKit} peças por kit</p> : null}
          <div className="product-card__buying-info">
            <p className={`product-card__price${isQuote(product) ? ' product-card__price--quote' : ''}`}>{isQuote(product) ? 'Preço sob consulta' : `${formatPrice(product.valor)} / ${product.unidadeVenda || 'un.'}`}<small className="made-to-order">Feito sob encomenda</small></p>
            <span className="product-card__details-hint">Ver detalhes <ArrowUpRight aria-hidden="true" /></span>
          </div>
        </div>
      </a>
      <div className="product-card__actions">
        {isQuote(product) || product.personalizacoes?.length ? <a className="btn btn--primary" href={productPageUrl(product.nome, product.codigo)}>{isQuote(product) ? 'Solicitar orçamento' : 'Personalizar'}</a> : <button type="button" className="btn btn--primary" onClick={() => onAdd(product)}><ShoppingCart aria-hidden="true" /> Adicionar ao carrinho</button>}

      </div>
    </article>
  );
});
