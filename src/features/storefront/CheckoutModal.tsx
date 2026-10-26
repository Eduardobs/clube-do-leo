import { type FormEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { formatPrice } from '../../lib/format';

import type { CartItem, Product } from '../../types/product';
import { findProduct, quantityLabel, isQuote } from '../../lib/products';
import { WhatsAppRecovery } from '../../components/WhatsAppRecovery';
interface CheckoutModalProps {
  items: CartItem[]; products: Product[]; message: string;
  name: string; notes: string; onNameChange: (value: string) => void; onNotesChange: (value: string) => void; onEdit: () => void;
  itemCount: number;
  total: number;
  hasUnpricedItems: boolean;
  onClose: () => void;
  onSubmit: (name: string, notes: string) => void;
}

export function CheckoutModal({ itemCount, total, hasUnpricedItems, onClose, onSubmit, items, products, message, name, notes, onNameChange: setName, onNotesChange: setNotes, onEdit }: CheckoutModalProps) {

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length < 2) return;
    onSubmit(name.trim(), notes.trim());
  };

  return (
    <Modal label="Enviar pedido" onClose={onClose}>
      <h2>Enviar pedido</h2>
      <p className="checkout__intro">Revise o resumo e informe seu nome. O carrinho será mantido até você decidir limpá-lo.</p>
      <div className="checkout__summary" aria-label="Resumo do pedido">
        <span>{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
        {items.some(item => { const p = findProduct(products, item.codigo); return p && !isQuote(p); }) ? <strong>Subtotal dos produtos: {formatPrice(total)}</strong> : <strong>Orçamento a combinar — sem subtotal definido</strong>}
        {hasUnpricedItems ? <small>Há solicitação de orçamento fora do subtotal.</small> : null}
      </div>
      <ul>{items.map((item, index) => { const p = findProduct(products, item.codigo); return p ? <li key={item.id || index}><strong>{p.nome} · Código {p.codigo}</strong><p>{quantityLabel(p, item.quantity)} · {isQuote(p) ? 'Solicitação de orçamento' : formatPrice(p.valor * item.quantity)}</p>{Object.entries(item.personalizacoes || {}).map(([key, value]) => <p key={key}>{p.personalizacoes?.find(f => f.id === key)?.label || key}: {value}</p>)}</li> : null; })}</ul>
      <p>Feito sob encomenda. Entrega a combinar, separada do prazo de produção. Condições finais combinadas com a loja.</p>
      <button type="button" className="btn btn--ghost" onClick={onEdit}>Voltar à edição do carrinho</button>
      <form id="checkout-form" onSubmit={handleSubmit}>
        <label htmlFor="customer-name">Seu nome</label>
        <input id="customer-name" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Digite seu nome" required minLength={2} maxLength={80} autoComplete="name" />
        <label htmlFor="customer-notes">Observações <small>(opcional)</small></label>
        <textarea id="customer-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Alguma dúvida para a loja?" maxLength={500} rows={4} />
        <button type="submit" className="btn btn--primary btn--block"><MessageCircle aria-hidden="true" /> Preparar pedido no WhatsApp</button>
      </form>
      {message ? <WhatsAppRecovery message={message} kind="pedido" /> : null}
    </Modal>
  );
}
