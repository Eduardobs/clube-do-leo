import { useState, type FormEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { formatPrice } from '../../lib/format';

interface CheckoutModalProps {
  itemCount: number;
  total: number;
  hasUnpricedItems: boolean;
  onClose: () => void;
  onSubmit: (name: string, notes: string) => void;
}

export function CheckoutModal({ itemCount, total, hasUnpricedItems, onClose, onSubmit }: CheckoutModalProps) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

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
        <strong>Subtotal estimado: {formatPrice(total)}</strong>
        {hasUnpricedItems ? <small>Há item com valor a confirmar.</small> : null}
      </div>
      <form id="checkout-form" onSubmit={handleSubmit}>
        <label htmlFor="customer-name">Seu nome</label>
        <input id="customer-name" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Digite seu nome" required minLength={2} maxLength={80} autoComplete="name" />
        <label htmlFor="customer-notes">Observações <small>(opcional)</small></label>
        <textarea id="customer-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: preferência de cor ou alguma dúvida" maxLength={500} rows={4} />
        <button type="submit" className="btn btn--primary btn--block"><MessageCircle aria-hidden="true" /> Preparar pedido no WhatsApp</button>
      </form>
    </Modal>
  );
}
