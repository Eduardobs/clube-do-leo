import { useState } from 'react';
import { openWhatsApp } from '../lib/whatsapp';
import { trackStoreEvent } from '../lib/analytics';
export function WhatsAppRecovery({ message, kind }: { message: string; kind: 'pedido' | 'orcamento' }) {
  const [status, setStatus] = useState('');
  return <section className="whatsapp-recovery" aria-label="Mensagem preparada">
    <p role="status">Mensagem preparada. Você ainda precisa enviá-la no WhatsApp. Abrir o aplicativo não confirma contratação, pagamento ou produção.</p>
    <button type="button" className="btn btn--whatsapp" onClick={() => { trackStoreEvent('click_whatsapp', { kind, source: 'retry' }); openWhatsApp(message); }}>Abrir WhatsApp novamente</button>
    <button type="button" className="btn btn--ghost" onClick={async () => { try { await navigator.clipboard.writeText(message); setStatus('Mensagem copiada.'); } catch { setStatus('Selecione e copie a mensagem abaixo.'); } }}>Copiar mensagem</button>
    <label className="option-field">Mensagem para copiar<textarea aria-label="Mensagem para copiar" readOnly value={message} rows={6} /></label><p role="status">{status}</p>
  </section>;
}
