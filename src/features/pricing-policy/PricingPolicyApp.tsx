import { ArrowLeft, Tag } from 'lucide-react';
import { SiteFooter } from '../../components/SiteFooter';
import { PageHeader } from '../../components/PageHeader';

import { catalogUrl } from '../../lib/navigation';

const sections = [
  { id: 'precos', title: 'Preços do catálogo', text: 'Os preços dos produtos apresentados neste site podem sofrer alterações sem aviso prévio.' },
  { id: 'producao', title: 'Produção sob encomenda', text: 'Todos os produtos são feitos sob encomenda. Produzimos após a confirmação do pedido. Prazo de produção e entrega combinados pelo WhatsApp.' },
  { id: 'orcamentos', title: 'Valores e orçamentos', text: 'Produtos com preço definido exibem o valor por unidade de venda. Produtos com preço sob consulta exigem orçamento e não integram o subtotal dos produtos com preço definido.' },
  { id: 'entrega', title: 'Entrega e personalização', text: 'Entrega e eventuais personalizações são combinadas separadamente com a loja. O prazo de produção é diferente do prazo de transporte.' },
  { id: 'confirmacao', title: 'Confirmação do pedido', text: 'Adicionar ao carrinho ou abrir o WhatsApp não confirma contratação, pagamento ou início da produção. Envie a solicitação e combine as condições finais com a loja.' },
];

export function PricingPolicyApp() {
  return (
    <div className="institutional-page">
      <a className="skip-link" href="#politica-precos">Pular para a política de preços</a>
      <PageHeader>
        <a href={catalogUrl()} className="btn btn--ghost btn--small"><ArrowLeft aria-hidden="true" /> Voltar à loja</a>
      </PageHeader>
      <main id="politica-precos" className="container institutional-main">
        <article className="institutional-card">
          <div className="policy-heading">
            <Tag aria-hidden="true" />
            <h1>Política de preços</h1>
          </div>
          <nav className="policy-nav" aria-label="Tópicos da política">
            {sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
          </nav>
          <div className="policy-sections">
            {sections.map(section => (
              <section key={section.id} id={section.id}>
                <h2>{section.title}</h2>
                <p>{section.text}</p>
              </section>
            ))}
            <a href={catalogUrl()} className="btn btn--primary">Ver produtos</a>
          </div>
        </article>
      </main>
      <SiteFooter compact />
    </div>
  );
}
