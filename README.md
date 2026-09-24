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

O Vite disponibiliza as três entradas do projeto:

- `/index.html`: vitrine pública;
- `/admin.html`: editor local de produtos (não vinculado na vitrine);
- `/politica-de-precos.html`: política de preços.

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

O build é gerado em `dist/`. Além das três entradas principais, ele gera uma página indexável para cada produto, `sitemap.xml` e `robots.txt`. A configuração usa caminhos relativos e copia as imagens WebP publicadas, `data/products.json`, `CNAME` e `.nojekyll`.

## Publicação

O workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) valida, compila e publica o conteúdo de `dist/` a cada push na branch `master`. No GitHub, configure **Settings → Pages → Build and deployment → Source** como **GitHub Actions**.

## Segurança e métricas

- Nunca coloque tokens em variáveis `VITE_*` ou no JavaScript gerado. O fechamento atual usa somente `wa.me` e não requer segredo.
- As páginas usam CSP e política de referência via HTML. Cabeçalhos que dependem da resposta HTTP, como `X-Content-Type-Options`, `Permissions-Policy` e `frame-ancestors`, exigem um proxy/CDN configurável, pois o GitHub Pages não oferece configuração de cabeçalhos por projeto.
- Ative **Secret scanning** e **Push protection** nas configurações do repositório. O Dependabot já acompanha npm e GitHub Actions.
- A vitrine emite eventos locais `view_item`, `add_to_cart`, `begin_checkout` e `click_whatsapp`, sem nome ou observações do cliente. Eles são enviados a `window.dataLayer` apenas quando uma ferramenta de métricas já tiver criado essa fila.
