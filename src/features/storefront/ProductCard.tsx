import { ShoppingCart } from 'lucide-react';
import { formatPrice, imageFallback, productPageUrl, productThumbnailUrl } from '../../lib/format';
import type { Product } from '../../types/product';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const descriptionLines = product.descricao.split('\n').map((line) => line.trim()).filter((line) => line.length > 15);
  const summary = descriptionLines[1] ?? descriptionLines[0];
  return (
    <article className="product-card">
      <a className="product-card__details-trigger" href={productPageUrl(product.nome, product.codigo)} aria-label={`Ver detalhes de ${product.nome}`}>
        <div className="product-card__media">
          <img src={productThumbnailUrl(product.imagens[0])} alt={product.nome} loading="lazy" decoding="async" width="480" height="480" onError={imageFallback} />
          <span className="product-card__badge">{product.categorias[0]}</span>
        </div>
        <div className="product-card__body">
          <h2 className="product-card__title">{product.nome}</h2>
          {summary ? <p className="product-card__summary">{summary}</p> : null}
          <p className="product-card__price">{formatPrice(product.valor)}</p>
        </div>
      </a>
      <div className="product-card__actions">
        <button type="button" className="btn btn--primary" onClick={() => onAdd(product)}>
          <ShoppingCart aria-hidden="true" /> Adicionar
        </button>
      </div>
    </article>
  );
}
