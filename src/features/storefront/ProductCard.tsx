import { MessageCircle, ShoppingCart } from 'lucide-react';
import { formatPrice, imageFallback, resolveAsset } from '../../lib/format';
import type { Product } from '../../types/product';

interface ProductCardProps {
  product: Product;
  onDetails: (product: Product) => void;
  onAdd: (product: Product) => void;
  onConsult: (product: Product) => void;
}

export function ProductCard({ product, onDetails, onAdd, onConsult }: ProductCardProps) {
  const isPriced = product.valor > 0;
  return (
    <article className="product-card">
      <button type="button" className="product-card__details-trigger" onClick={() => onDetails(product)} aria-label={`Ver detalhes de ${product.nome}`}>
        <div className="product-card__media">
          <img src={resolveAsset(product.imagens[0])} alt={product.nome} loading="lazy" onError={imageFallback} />
          <span className="product-card__badge">{product.categorias[0]}</span>
        </div>
        <div className="product-card__body">
          <h2 className="product-card__title">{product.nome}</h2>
          <p className="product-card__price">{formatPrice(product.valor)}</p>
        </div>
      </button>
      <div className="product-card__actions">
        <button type="button" className="btn btn--primary" onClick={() => isPriced ? onAdd(product) : onConsult(product)}>
          {isPriced ? <ShoppingCart aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
          {isPriced ? 'Adicionar' : 'Consultar'}
        </button>
      </div>
    </article>
  );
}
