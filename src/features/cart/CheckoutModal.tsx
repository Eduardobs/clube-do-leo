import { type FormEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { formatPrice } from '../../lib/format';

import { itemKey, type CartSummary } from './summary';
import { quantityLabel, isQuote } from '../../lib/product-rules';
import { WhatsAppRecovery } from '../../components/WhatsAppRecovery';
interface CheckoutModalProps {
  summary: CartSummary;
  message: string;
  name: string; notes: string; onNameChange: (value: string) => void; onNotesChange: (value: string) => void; onEdit: () => void;
  onClose: () => void;
  onSubmit: (name: string, notes: string) => void;
}

export function CheckoutModal({ summary, onClose, onSubmit, message, name, notes, onNameChange: setName, onNotesChange: setNotes, onEdit }: CheckoutModalProps) {

  const { count: itemCount, total, hasPricedItems, hasQuoteItems } = summary;
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length < 2) return;
    onSubmit(name.trim(), notes.trim());
  };

  return (
    <Modal label="Enviar pedido" onClose={onClose} className="modal__content--checkout">
      <h2>Enviar pedido</h2>
      <p className="checkout__intro">Ao abrir o WhatsApp, você compartilha com o serviço os itens, seu nome e as observações. Confira a mensagem antes de enviá-la à loja.</p>
      <div className="checkout__summary" aria-label="Resumo do pedido">
        <span>{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
        {hasPricedItems ? <strong>Subtotal dos produtos: {formatPrice(total)}</strong> : <strong>Orçamento a combinar — sem subtotal definido</strong>}
        {hasQuoteItems ? <small>Há solicitação de orçamento fora do subtotal.</small> : null}
      </div>
      <ul className="checkout-items" aria-label="Itens do pedido">
        {summary.lines.map(({ item, product }) => product && (
          <li key={itemKey(item)}>
            <strong>{product.nome} · Código {product.codigo}</strong>
            <p>{quantityLabel(product, item.quantity)} · {isQuote(product) ? 'Solicitação de orçamento' : formatPrice(product.valor * item.quantity)}</p>
            {Object.entries(item.personalizacoes || {}).map(([key, value]) => (
              <p key={key}>{product.personalizacoes?.find(field => field.id === key)?.label || key}: {value}</p>
            ))}
          </li>
        ))}
      </ul>
      <p>Feito sob encomenda. Entrega a combinar, separada do prazo de produção. Condições finais combinadas com a loja.</p>
      <button type="button" className="btn btn--ghost" onClick={onEdit}>Voltar à edição do carrinho</button>
      <form id="checkout-form" onSubmit={handleSubmit}>
        <h3>Seus dados</h3>
        <label htmlFor="customer-name">Seu nome</label>
        <input id="customer-name" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Digite seu nome" required minLength={2} maxLength={80} autoComplete="name" />
        <label htmlFor="customer-notes">Observações <small>(opcional)</small></label>
        <textarea id="customer-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Alguma dúvida para a loja?" maxLength={500} rows={4} />
        <button type="submit" disabled={!summary.canCheckout} className="btn btn--primary btn--block"><MessageCircle aria-hidden="true" /> Preparar pedido no WhatsApp</button>
      </form>
      {message ? <WhatsAppRecovery message={message} kind="pedido" /> : null}
    </Modal>
  );
}
