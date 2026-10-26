import { ArrowLeft, Tag } from 'lucide-react';
import { SiteFooter } from '../../components/SiteFooter';
import { BRAND_LOGO_URL } from '../../lib/format';

import { catalogUrl } from '../../lib/navigation';

export function PricingPolicyApp() {
  return (
    <div className="institutional-page">
      <a className="skip-link" href="#politica-precos">Pular para a política de preços</a>
      <header className="institutional-header">
        <div className="container institutional-header__inner">
          <a href={catalogUrl()} className="brand" aria-label="Clube do Léo, página inicial">
            <img src={BRAND_LOGO_URL} alt="Clube do Léo" className="brand__logo" />
          </a>
          <a href={catalogUrl()} className="btn btn--ghost btn--small"><ArrowLeft aria-hidden="true" /> Voltar à loja</a>
        </div>
      </header>
      <main id="politica-precos" className="container institutional-main">
        <article className="institutional-card">
          <span className="institutional-card__icon" aria-hidden="true"><Tag /></span>
          <p className="institutional-card__eyebrow">Informação importante</p>
          <h1>Política de preços</h1>
          <p>Os preços dos produtos apresentados neste site podem sofrer alterações sem aviso prévio.</p>
          <p>Todos os produtos são feitos sob encomenda. Produzimos após a confirmação do pedido. Prazo de produção e entrega combinados pelo WhatsApp.</p>
          <p>Produtos com preço definido exibem o valor por unidade de venda. Produtos com preço sob consulta exigem orçamento e não integram o subtotal dos produtos com preço definido.</p>
          <p>Entrega e eventuais personalizações são combinadas separadamente com a loja. O prazo de produção é diferente do prazo de transporte.</p>
          <p>Adicionar ao carrinho ou abrir o WhatsApp não confirma contratação, pagamento ou início da produção. Envie a solicitação e combine as condições finais com a loja.</p>
          <a href={catalogUrl()} className="btn btn--primary">Ver produtos</a>
        </article>
      </main>
      <SiteFooter compact />
    </div>
  );
}
