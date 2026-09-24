import { ArrowLeft, Tag } from 'lucide-react';
import { SiteFooter } from '../../components/SiteFooter';
import { BRAND_LOGO_URL } from '../../lib/format';

export function PricingPolicyApp() {
  return (
    <div className="institutional-page">
      <header className="institutional-header">
        <div className="container institutional-header__inner">
          <a href="./index.html" className="brand" aria-label="Clube do Léo, página inicial">
            <img src={BRAND_LOGO_URL} alt="Clube do Léo" className="brand__logo" />
          </a>
          <a href="./index.html" className="btn btn--ghost btn--small"><ArrowLeft aria-hidden="true" /> Voltar à loja</a>
        </div>
      </header>
      <main className="container institutional-main">
        <article className="institutional-card">
          <span className="institutional-card__icon" aria-hidden="true"><Tag /></span>
          <p className="institutional-card__eyebrow">Informação importante</p>
          <h1>Política de preços</h1>
          <p>Os preços dos produtos apresentados neste site podem sofrer alterações sem aviso prévio.</p>
          <p>O valor final e a disponibilidade dos itens serão confirmados no momento do pedido pelo WhatsApp.</p>
          <a href="./index.html#produtos" className="btn btn--primary">Ver produtos</a>
        </article>
      </main>
      <SiteFooter compact />
    </div>
  );
}
