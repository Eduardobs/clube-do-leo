import { useState, type FormEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { Modal } from '../../components/Modal';

interface CheckoutModalProps {
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function CheckoutModal({ onClose, onSubmit }: CheckoutModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length < 2) return;
    onSubmit(name.trim());
  };

  return (
    <Modal label="Enviar pedido" onClose={onClose}>
      <h2>Enviar pedido</h2>
      <p className="checkout__intro">Informe seu nome para identificarmos seu pedido no WhatsApp.</p>
      <form id="checkout-form" onSubmit={handleSubmit}>
        <label htmlFor="customer-name">Seu nome</label>
        <input id="customer-name" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Digite seu nome" required minLength={2} />
        <button type="submit" className="btn btn--primary btn--block"><MessageCircle aria-hidden="true" /> Enviar pedido pelo WhatsApp</button>
      </form>
    </Modal>
  );
}
