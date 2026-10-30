import { ArrowLeft, Tag } from 'lucide-react';
import { SiteFooter } from '../../components/SiteFooter';
import { PageHeader } from '../../components/PageHeader';

import { catalogUrl } from '../../lib/navigation';

export function PricingPolicyApp() {
  return (
    <div className="institutional-page">
      <a className="skip-link" href="#politica-precos">Pular para a política de preços</a>
      <PageHeader>
        <a href={catalogUrl()} className="btn btn--ghost btn--small"><ArrowLeft aria-hidden="true" /> Voltar à loja</a>
      </PageHeader>
      <main id="politica-precos" className="container institutional-main">
        <article className="institutional-card">
          <p className="institutional-card__eyebrow"><Tag aria-hidden="true" /> Compra transparente</p>
          <h1>Política de preços</h1>
          <section>
            <h2>Preços do catálogo</h2>
            <p>Os preços dos produtos apresentados neste site podem sofrer alterações sem aviso prévio.</p>
          </section>
          <section>
            <h2>Produção sob encomenda</h2>
            <p>Todos os produtos são feitos sob encomenda. Produzimos após a confirmação do pedido. Prazo de produção e entrega combinados pelo WhatsApp.</p>
          </section>
          <section>
            <h2>Valores e orçamentos</h2>
            <p>Produtos com preço definido exibem o valor por unidade de venda. Produtos com preço sob consulta exigem orçamento e não integram o subtotal dos produtos com preço definido.</p>
          </section>
          <section>
            <h2>Entrega e personalização</h2>
            <p>Entrega e eventuais personalizações são combinadas separadamente com a loja. O prazo de produção é diferente do prazo de transporte.</p>
          </section>
          <section>
            <h2>Confirmação do pedido</h2>
            <p>Adicionar ao carrinho ou abrir o WhatsApp não confirma contratação, pagamento ou início da produção. Envie a solicitação e combine as condições finais com a loja.</p>
          </section>
          <a href={catalogUrl()} className="btn btn--primary">Ver produtos</a>
        </article>
      </main>
      <SiteFooter compact />
    </div>
  );
}
