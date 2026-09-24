# Clube do Léo

Catálogo estático em React e TypeScript, com carrinho, busca, filtros, galeria de produtos, painel de edição e envio de pedidos pelo WhatsApp.

## Tecnologias

- React 19 e TypeScript
- Vite para desenvolvimento e build
- Vitest e Testing Library
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
- `/admin.html`: painel de produtos;
- `/politica-de-precos.html`: política de preços.

## Catálogo

O arquivo [`data/products.json`](data/products.json) continua sendo a fonte de dados. As imagens ficam em `assets/products/` e seus caminhos são registrados no JSON.

O painel administrativo funciona inteiramente no navegador. Alterações ficam como rascunho no `localStorage`; para publicá-las, baixe o `products.json` pelo painel, substitua `data/products.json` no repositório e faça commit. Imagens enviadas pelo painel são incorporadas como Data URL; para manter o repositório leve, prefira salvar as imagens em `assets/products/` e informar o caminho no formulário.

## Qualidade e build

```bash
npm run typecheck
npm test
npm run build
```

Ou execute todas as validações com:

```bash
npm run check
```

O build é gerado em `dist/`. A configuração usa caminhos relativos e copia `assets/`, `data/products.json`, `CNAME` e `.nojekyll`, portanto funciona tanto no domínio personalizado quanto no subdiretório padrão do GitHub Pages.

## Publicação

O workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) valida, compila e publica o conteúdo de `dist/` a cada push na branch `master`. No GitHub, configure **Settings → Pages → Build and deployment → Source** como **GitHub Actions**.
