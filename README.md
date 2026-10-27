# Clube do Léo

Catálogo estático em React e TypeScript, com carrinho, busca, filtros, galeria de produtos, painel de edição e envio de pedidos pelo WhatsApp.

## Tecnologias

- React 19 e TypeScript
- Vite para desenvolvimento e build
- Vitest e Testing Library
- Playwright e axe-core para fluxos ponta a ponta e acessibilidade
- Lucide para ícones locais no bundle
- GitHub Actions e GitHub Pages

## Desenvolvimento

Requer Node.js 24 ou mais recente.

```bash
npm ci
npm run dev
```

O Vite disponibiliza as três rotas do projeto sem expor a extensão dos arquivos:

- `/`: vitrine pública;
- `/admin/`: editor local de produtos (não vinculado na vitrine);
- `/politica-de-precos/`: política de preços.

## Catálogo

O arquivo [`data/products.json`](data/products.json) continua sendo a fonte de dados. As imagens ficam em `assets/products/` e seus caminhos são registrados no JSON.

O editor local funciona inteiramente no navegador e não publica alterações. Os rascunhos ficam no `localStorage`; para publicar, baixe o `products.json`, substitua `data/products.json` no repositório e faça commit. Imagens enviadas pelo editor são incorporadas como Data URL; para manter o repositório leve, prefira salvar as imagens em `assets/products/` e informar o caminho no formulário.

## Qualidade e build

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Ou execute todas as validações com:

```bash
npm run check
```

O build é gerado em `dist/`. Além das três entradas principais, ele gera uma rota limpa e indexável para cada produto, `sitemap.xml` e `robots.txt`. Cada rota é publicada como um diretório com `index.html`, formato compatível com GitHub Pages, e os recursos usam caminhos a partir da raiz do domínio. O build também copia as imagens WebP publicadas, `data/products.json`, `CNAME` e `.nojekyll`.

## Publicação

O workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) valida, compila e publica o conteúdo de `dist/` a cada push na branch `master`. No GitHub, configure **Settings → Pages → Build and deployment → Source** como **GitHub Actions**.

## Segurança e métricas

As medidas de proteção, a mitigação contra iframes e os cabeçalhos necessários
no proxy/CDN estão descritos em [Segurança](docs/seguranca.md).

- Nunca coloque tokens em variáveis `VITE_*` ou no JavaScript gerado. O fechamento atual usa somente `wa.me` e não requer segredo.
- As páginas usam CSP e política de referência via HTML. Cabeçalhos que dependem da resposta HTTP, como `X-Content-Type-Options`, `Permissions-Policy` e `frame-ancestors`, exigem um proxy/CDN configurável, pois o GitHub Pages não oferece configuração de cabeçalhos por projeto.
- Ative **Secret scanning** e **Push protection** nas configurações do repositório. O Dependabot já acompanha npm e GitHub Actions.
- A vitrine emite eventos locais `view_item`, `add_to_cart`, `begin_checkout` e `click_whatsapp`, sem nome ou observações do cliente. Eles são enviados a `window.dataLayer` apenas quando uma ferramenta de métricas já tiver criado essa fila.

## Produtos sob encomenda

`modalidadePreco` aceita `definido` e `consulta`. Dados legados com `valor: 0` são normalizados como consulta. A consulta não entra no subtotal nem aceita nova adição ao carrinho; itens antigos continuam visíveis e podem seguir como solicitação de orçamento na revisão.

Campos opcionais exibidos e editáveis: `unidadeVenda`, `quantidadeMinima`, `incremento`, `pecasPorKit`, `dimensoes` e `conteudo`. A quantidade representa a unidade comercial (kits quando `unidadeVenda: "kit"`). Mínimos e incrementos seguem `mínimo + n × incremento`. O limite técnico existente de 99 unidades comerciais por linha permanece em `STORE_CONFIG`. Os campos legados `resumo` e `informacoesPersonalizacao` continuam normalizados para preservar importações antigas, mas não são exibidos nem editados.

`personalizacoes` recebe campos `{ id, label, required?, maxLength?, options? }`. Sem `options`, o campo aceita texto; com opções, apresenta seleção. Cadastre apenas condições confirmadas pela loja. Todos esses campos podem ser editados e exportados no painel local. Material, cuidados, indicação de uso e prazo de produção foram retirados do editor e da apresentação; eventuais valores legados continuam preservados no JSON por compatibilidade.

O carrinho preserva registros antigos e guarda identificador da linha, configurações e assinatura das condições do produto em novos registros. Mudanças de preço/configuração exigem revisão; produtos removidos ficam sinalizados e não entram na contagem ou no subtotal. Sem assinatura em um carrinho antigo, não é possível comparar o preço histórico: a interface informa que usa as condições atuais.

Busca, categoria, ordenação, modalidade e teto de preço ficam na URL (`busca`, `categoria`, `ordem`, `preco`, `ate`). O contexto de retorno e posição/carregamento da lista usam `sessionStorage` quando permitido pelo navegador.

Os eventos existentes são preservados; `personalization_started` e `request_quote` complementam o fluxo. `click_whatsapp` identifica tentativas, inclusive recuperação, nunca venda confirmada. Textos personalizados e dados do cliente não são enviados às métricas. Testes de navegador simulam `window.open`, sem mensagens reais.

Consulte [as pendências editoriais por produto](docs/pendencias-editoriais.md) antes de completar informações comerciais e técnicas.
