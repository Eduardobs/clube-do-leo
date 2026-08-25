# Clube do Léo

Catálogo estático de produtos, carrinho e envio de pedidos via WhatsApp.

## Estrutura

```text
assets/
  brand/       # logos e identidade visual
  products/    # imagens de produtos
data/          # dados de domínio versionados (products.json)
src/
  config/      # configuração da loja
  shared/      # utilitários reutilizáveis
  features/    # regras e interface por funcionalidade
  pages/       # inicialização específica de cada página
styles/        # estilos globais, responsivos e administrativos
tests/         # testes unitários, de integração e integridade
index.html     # vitrine pública (ponto de entrada de deploy)
admin.html     # painel administrativo
```

As páginas HTML permanecem na raiz para compatibilidade com hospedagens estáticas, como GitHub Pages. Os scripts são carregados na ordem explícita de suas dependências, pois o projeto não usa bundler.

## Desenvolvimento

Use um servidor HTTP local para que o navegador possa carregar `data/products.json`. Por exemplo:

```bash
npx serve .
```

## Qualidade

```bash
npm test
npm run test:coverage
```

Os testes também verificam referências locais, o contrato de `products.json` e a ligação entre o HTML e o JavaScript.
