import { useState } from 'react';
import { ShoppingBasket } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { ProductOptions } from '../../components/ProductOptions';
import { formatPrice, imageFallback, productPageUrl, productThumbnailUrl } from '../../lib/format';
import { configurationError, increment, isQuote, minimum, normalizeQuantity, quantityLabel } from '../../lib/product-rules';
import { itemKey, type CartSummary } from './summary';

interface CartModalProps {
  summary: CartSummary;
  onClose: () => void; onClear: () => void; onRemove: (id: string) => void;
  onUpdate: (id: string, quantity: number) => void;
  onConfigure: (id: string, values: Record<string, string>) => void;
  onCheckout: () => void;
}
export function CartModal({ summary, onClose, onClear, onRemove, onUpdate, onConfigure, onCheckout }: CartModalProps) {
  const [editing, setEditing] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const { lines, total, hasPricedItems, canCheckout } = summary;
  return <Modal label="Carrinho de compras" onClose={onClose} className="modal__content--cart">
    <h2>Carrinho de compras</h2>
    <p className="cart-intro">Os itens e suas personalizações ficam salvos neste navegador. Use “Limpar” para apagar o carrinho.</p>
    <div className="cart-items" aria-live="polite">
      {!lines.length ? <div className="cart-empty"><ShoppingBasket aria-hidden="true" /><p>Seu carrinho está vazio.</p><button type="button" className="btn btn--primary" onClick={onClose}>Continuar no catálogo</button></div> : lines.map(({ item, product: p, issue }) => {
        const key = itemKey(item);
        if (!p) return <div key={key} className="cart-item"><p role="alert">Produto {item.codigo} removido do catálogo. Não integra a contagem nem o subtotal. Remova-o para continuar.</p><button onClick={() => onRemove(key)}>Remover item {item.codigo}</button></div>;
        return <article className="cart-item cart-item--configured" key={key}>
          <div className="cart-item__overview">
            <img src={productThumbnailUrl(p.imagens[0])} alt="" width="64" height="64" loading="lazy" onError={imageFallback} />
            <div className="cart-item__details"><a href={productPageUrl(p.nome, p.codigo)}><h3>{p.nome}</h3></a><p>{quantityLabel(p, item.quantity)}</p>
            <p>{isQuote(p) ? 'Preço sob consulta — fora do subtotal' : `${formatPrice(p.valor)} / ${p.unidadeVenda || 'unidade'} × ${item.quantity} = ${formatPrice(p.valor * item.quantity)}`}</p>
            {Object.entries(item.personalizacoes || {}).map(([key, value]) => <p key={key}>{p.personalizacoes?.find(f => f.id === key)?.label || key}: {value}</p>)}
            {isQuote(p) ? <p><a href={productPageUrl(p.nome, p.codigo)}>Solicitar orçamento pelo WhatsApp</a> ou incluir na revisão como solicitação de orçamento.</p> : null}
            {issue ? <p role="alert">{issue}</p> : null}
            </div>
          </div>
          <div className="cart-item__actions">
            <button className="quantity-button" disabled={item.quantity <= minimum(p)} onClick={() => onUpdate(key, item.quantity - increment(p))} aria-label={`Diminuir quantidade de ${p.nome}`}>−</button>
            <output aria-label={`Quantidade de ${p.nome}`}>{item.quantity}</output>
            <button className="quantity-button" disabled={normalizeQuantity(p, item.quantity + increment(p)) === item.quantity} onClick={() => onUpdate(key, item.quantity + increment(p))} aria-label={`Aumentar quantidade de ${p.nome}`}>+</button>
            {p.personalizacoes?.length || issue ? (
              <button className="btn btn--ghost" onClick={() => {
                setEditing(key);
                setValues(item.personalizacoes || {});
                setError('');
              }}>{p.personalizacoes?.length ? 'Editar configurações' : 'Revisar condições do item'}</button>
            ) : null}
            <button className="btn btn--ghost" onClick={() => onRemove(key)} aria-label={`Remover ${p.nome}`}>Remover</button>
          </div>
          {editing === key ? <form onSubmit={e => { e.preventDefault(); const validValues = Object.fromEntries(Object.entries(values).filter(([id]) => p.personalizacoes?.some(f => f.id === id))); const issue = configurationError(p, validValues); if (issue) { setError(issue); return; } onConfigure(key, validValues); setEditing(''); }}>
            <ProductOptions product={p} values={values} onChange={setValues} /><p>Mínimo {minimum(p)}, incremento {increment(p)}. Ao salvar, a quantidade será ajustada se necessário e as condições atuais serão usadas.</p>
            {error ? <p role="alert">{error}</p> : null}<button className="btn btn--primary" type="submit">Salvar configurações</button><button type="button" className="btn btn--ghost" onClick={() => setEditing('')}>Cancelar</button>
          </form> : null}
        </article>;
      })}
    </div>
    {lines.length > 0 && <div className="cart-footer"><button className="btn btn--ghost" onClick={() => { if (window.confirm('Deseja remover todos os produtos do carrinho?')) { onClear(); setEditing(''); setError(''); } }} disabled={!lines.length}>Limpar</button>
      <p className="cart-total">{!hasPricedItems ? <strong>Orçamento a combinar — sem subtotal definido</strong> : <>Subtotal dos produtos: <strong>{total ? formatPrice(total) : 'R$ 0,00'}</strong></>}<small>Entrega a combinar. Itens sob consulta não integram o subtotal.</small></p>
      {!canCheckout ? <p role="status">Corrija os itens sinalizados antes de revisar.</p> : null}
      <button className="btn btn--primary" onClick={onCheckout} disabled={!canCheckout || Boolean(editing)}>Revisar pedido</button>
    </div>}
  </Modal>;
}
