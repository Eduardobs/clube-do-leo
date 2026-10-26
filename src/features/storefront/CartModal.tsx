import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { ProductOptions } from '../../components/ProductOptions';
import { formatPrice, productPageUrl } from '../../lib/format';
import { configurationError, findProduct, increment, isQuote, itemIssue, itemKey, minimum, normalizeQuantity, quantityLabel } from '../../lib/products';
import type { CartItem, Product } from '../../types/product';
interface CartModalProps {
  items: CartItem[]; products: Product[]; total: number;
  onClose: () => void; onClear: () => void; onRemove: (id: string) => void;
  onUpdate: (id: string, quantity: number) => void;
  onConfigure: (id: string, values: Record<string, string>) => void;
  onCheckout: () => void;
}
export function CartModal({ items, products, total, onClose, onClear, onRemove, onUpdate, onConfigure, onCheckout }: CartModalProps) {
  const [editing, setEditing] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const blocked = items.some(item => { const p = findProduct(products, item.codigo); return !p || Boolean(itemIssue(p, item)); });
  return <Modal label="Carrinho de compras" onClose={onClose} className="modal__content--cart">
    <h2>Carrinho de compras</h2>
    <p>Valores e condições atuais do catálogo. Confira os itens antes de enviar.</p>
    <p>Feito sob encomenda. Produzimos após a confirmação do pedido. Prazo de produção e entrega combinados pelo WhatsApp.</p>
    <div className="cart-items" aria-live="polite">
      {!items.length ? <p>Seu carrinho está vazio.</p> : items.map(item => {
        const p = findProduct(products, item.codigo); const key = itemKey(item);
        if (!p) return <div key={key} className="cart-item"><p role="alert">Produto {item.codigo} removido do catálogo. Não integra a contagem nem o subtotal. Remova-o para continuar.</p><button onClick={() => onRemove(key)}>Remover item {item.codigo}</button></div>;
        const issue = itemIssue(p, item);
        return <article className="cart-item cart-item--configured" key={key}>
          <div><a href={productPageUrl(p.nome, p.codigo)}><h3>{p.nome}</h3></a><p>{quantityLabel(p, item.quantity)}</p>
            <p>{isQuote(p) ? 'Preço sob consulta — fora do subtotal' : `${formatPrice(p.valor)} / ${p.unidadeVenda || 'unidade'} × ${item.quantity} = ${formatPrice(p.valor * item.quantity)}`}</p>
            <small>Feito sob encomenda</small>
            {Object.entries(item.personalizacoes || {}).map(([key, value]) => <p key={key}>{p.personalizacoes?.find(f => f.id === key)?.label || key}: {value}</p>)}
            {isQuote(p) ? <p><a href={productPageUrl(p.nome, p.codigo)}>Solicitar orçamento pelo WhatsApp</a> ou incluir na revisão como solicitação de orçamento.</p> : null}
            {issue ? <p role="alert">{issue}</p> : null}
          </div>
          <div className="cart-item__actions">
            <button className="quantity-button" disabled={item.quantity <= minimum(p)} onClick={() => onUpdate(key, item.quantity - increment(p))} aria-label={`Diminuir quantidade de ${p.nome}`}>−</button>
            <output aria-label={`Quantidade de ${p.nome}`}>{item.quantity}</output>
            <button className="quantity-button" disabled={normalizeQuantity(p, item.quantity + increment(p)) === item.quantity} onClick={() => onUpdate(key, item.quantity + increment(p))} aria-label={`Aumentar quantidade de ${p.nome}`}>+</button>
            {p.personalizacoes?.length ? <button className="btn btn--ghost" onClick={() => { setEditing(key); setValues(item.personalizacoes || {}); setError(''); }}>Editar configurações</button> : issue ? <button className="btn btn--ghost" onClick={() => { setEditing(key); setValues(item.personalizacoes || {}); setError(''); }}>Revisar condições do item</button> : null}
            <button className="btn btn--ghost" onClick={() => onRemove(key)} aria-label={`Remover ${p.nome}`}>Remover</button>
          </div>
          {editing === key ? <form onSubmit={e => { e.preventDefault(); const validValues = Object.fromEntries(Object.entries(values).filter(([id]) => p.personalizacoes?.some(f => f.id === id))); const issue = configurationError(p, validValues); if (issue) { setError(issue); return; } onConfigure(key, validValues); setEditing(''); }}>
            <ProductOptions product={p} values={values} onChange={setValues} /><p>Mínimo {minimum(p)}, incremento {increment(p)}. Ao salvar, a quantidade será ajustada se necessário e as condições atuais serão usadas.</p>
            {error ? <p role="alert">{error}</p> : null}<button className="btn btn--primary" type="submit">Salvar configurações</button><button type="button" className="btn btn--ghost" onClick={() => setEditing('')}>Cancelar</button>
          </form> : null}
        </article>;
      })}
    </div>
    <div className="cart-footer"><button className="btn btn--ghost" onClick={() => { if (window.confirm('Deseja remover todos os produtos do carrinho?')) { onClear(); setEditing(''); setError(''); } }} disabled={!items.length}>Limpar</button>
      <p className="cart-total">{items.length && !items.some(item => { const p = findProduct(products, item.codigo); return p && !isQuote(p); }) ? <strong>Orçamento a combinar — sem subtotal definido</strong> : <>Subtotal dos produtos: <strong>{total ? formatPrice(total) : 'R$ 0,00'}</strong></>}<small>Entrega a combinar. Itens sob consulta não integram o subtotal.</small></p>
      {blocked ? <p role="status">Corrija os itens sinalizados antes de revisar.</p> : null}
      <button className="btn btn--primary" onClick={onCheckout} disabled={!items.length || blocked || Boolean(editing)}>Revisar pedido</button>
    </div>
  </Modal>;
}
