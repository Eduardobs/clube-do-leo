import { ShoppingCart, Trash2 } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { STORE_CONFIG } from '../../config/store';
import { formatPrice, imageFallback, productThumbnailUrl } from '../../lib/format';
import { findProduct } from '../../lib/products';
import type { CartItem, Product } from '../../types/product';

interface CartModalProps {
  items: CartItem[];
  products: Product[];
  total: number;
  onClose: () => void;
  onClear: () => void;
  onRemove: (codigo: string) => void;
  onUpdate: (codigo: string, quantity: number) => void;
  onCheckout: () => void;
}

export function CartModal({ items, products, total, onClose, onClear, onRemove, onUpdate, onCheckout }: CartModalProps) {
  return (
    <Modal label="Carrinho de compras" onClose={onClose} className="modal__content--cart">
      <h2><ShoppingCart aria-hidden="true" /> Carrinho de compras</h2>
      <div className="cart-items">
        {items.length === 0 ? <p className="empty-state">Seu carrinho está vazio. Adicione produtos para continuar!</p> : items.map((item) => {
          const product = findProduct(products, item.codigo);
          if (!product) return null;
          return (
            <div className="cart-item" key={item.codigo}>
              <img src={productThumbnailUrl(product.imagens[0])} alt={product.nome} loading="lazy" decoding="async" width="56" height="56" onError={imageFallback} />
              <div className="cart-item__details">
                <h3>{product.nome}</h3>
                <p>{product.valor > 0 ? `${formatPrice(product.valor)} × ${item.quantity} = ${formatPrice(product.valor * item.quantity)}` : `${item.quantity} un. — valor a confirmar`}</p>
              </div>
              <div className="cart-item__actions">
                <button type="button" className="quantity-button" onClick={() => onUpdate(item.codigo, item.quantity - 1)} aria-label={`Diminuir quantidade de ${product.nome}`}>−</button>
                <output aria-label={`Quantidade de ${product.nome}`}>{item.quantity}</output>
                <button type="button" className="quantity-button" onClick={() => onUpdate(item.codigo, item.quantity + 1)} disabled={item.quantity >= STORE_CONFIG.maxQuantityPerProduct} aria-label={`Aumentar quantidade de ${product.nome}`}>+</button>
                <button type="button" className="btn-icon" onClick={() => onRemove(item.codigo)} aria-label={`Remover ${product.nome}`}><Trash2 aria-hidden="true" /></button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="cart-footer">
        <button type="button" className="btn btn--ghost" onClick={onClear} disabled={!items.length}><Trash2 aria-hidden="true" /> Limpar</button>
        <p className="cart-total">Subtotal estimado: <strong>{items.length ? formatPrice(total) : 'R$ 0,00'}</strong><small>Valor final confirmado pela loja.</small></p>
        <button type="button" className="btn btn--primary" onClick={onCheckout} disabled={!items.length}><ShoppingCart aria-hidden="true" /> Revisar pedido</button>
      </div>
    </Modal>
  );
}
