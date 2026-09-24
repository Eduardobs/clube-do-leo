import { useState } from 'react';
import { MessageCircle, ShoppingCart } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { formatPrice, imageFallback, resolveAsset } from '../../lib/format';
import type { Product } from '../../types/product';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAdd: (product: Product, quantity: number) => void;
  onConsult: (product: Product) => void;
}

export function ProductDetailModal({ product, onClose, onAdd, onConsult }: ProductDetailModalProps) {
  const images = product.imagens.length ? product.imagens : [''];
  const [selectedImage, setSelectedImage] = useState(images[0]);
  const [quantity, setQuantity] = useState(1);

  return (
    <Modal label={`Detalhes de ${product.nome}`} onClose={onClose}>
      <div id="product-detail">
        <div className="product-detail__gallery">
          <img id="detail-main-image" src={resolveAsset(selectedImage)} alt={product.nome} onError={imageFallback} />
          {images.length > 1 ? (
            <div className="product-detail__thumbs" aria-label="Galeria de imagens">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={`product-detail__thumb${selectedImage === image ? ' is-active' : ''}`}
                  onClick={() => setSelectedImage(image)}
                  aria-label={`Ver imagem ${index + 1} de ${product.nome}`}
                >
                  <img src={resolveAsset(image)} alt="" loading="lazy" onError={imageFallback} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <span className="tag">{product.categorias.join(', ')}</span>
        <h2>{product.nome}</h2>
        <p className="product-detail__descricao">{product.descricao}</p>
        <p className="product-detail__price">{formatPrice(product.valor)}</p>
        {product.valor > 0 ? (
          <>
            <div className="quantity-stepper">
              <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} aria-label="Diminuir quantidade">−</button>
              <input type="number" value={quantity} min="1" onChange={(event) => setQuantity(Math.max(1, Number.parseInt(event.target.value, 10) || 1))} aria-label="Quantidade" />
              <button type="button" onClick={() => setQuantity((current) => current + 1)} aria-label="Aumentar quantidade">+</button>
            </div>
            <button type="button" className="btn btn--primary btn--block" onClick={() => onAdd(product, quantity)}>
              <ShoppingCart aria-hidden="true" /> Adicionar ao carrinho
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--primary btn--block" onClick={() => onConsult(product)}>
            <MessageCircle aria-hidden="true" /> Consultar no WhatsApp
          </button>
        )}
      </div>
    </Modal>
  );
}
