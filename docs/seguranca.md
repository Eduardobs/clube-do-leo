# Medidas de segurança

## Publicação

O job de build recebe somente `contents: read`. O checkout não persiste credenciais
no Git local. Somente o job de deploy recebe `pages: write` e `id-token: write`,
e usa o ambiente `github-pages`. Configure as regras desse ambiente no GitHub
conforme a política de publicação do repositório.

Na montagem de `dist/`, a cópia de fotos e miniaturas seleciona arquivos
regulares com extensão `.webp`. As fontes Poppins e DM Serif Display e suas
licenças acompanham o site.

## Rede e dados do cliente

As quatro páginas carregam os recursos do próprio site. A leitura de
`/data/products.json` omite credenciais e recusa redirecionamentos. A CSP de
produção permite scripts e estilos do site, hashes do JSON-LD e imagens locais
ou incorporadas. A política de referência é `no-referrer`.

O navegador guarda os cinco filtros do catálogo na sessão para restaurar a
lista. O carrinho persiste os itens e os textos de personalização para a
próxima visita. Em um dispositivo compartilhado, o botão **Limpar** apaga esses
dados. O editor guarda seus rascunhos no navegador onde foram criados.

Nome, observações e mensagem preparada ficam na memória durante a revisão.
Fechar o fluxo descarta esses dados. Abrir o WhatsApp transmite a mensagem ao
serviço na URL de `wa.me`. O cliente confirma o envio à loja na conversa.

## Proteção contra clickjacking

As quatro entradas HTML ocultam o corpo da página até que a aplicação confirme
que está na janela principal. Dentro de um iframe, a inicialização remove o
conteúdo e interrompe a montagem do React. Isso também protege os rascunhos do
editor contra interações induzidas por sobreposição. Se o JavaScript estiver
desativado ou falhar ao carregar, o conteúdo permanece oculto, inclusive fora de
iframes. Não há redirecionamento da janela superior.

Essa é uma mitigação para a hospedagem estática atual. A proteção primária é
impedir o enquadramento por cabeçalhos HTTP. No proxy/CDN que atender o domínio,
configure estas respostas em todas as rotas, inclusive `/admin/` e produtos:

```http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Exemplo para Nginx, dentro do bloco `server` que atende o site:

```nginx
add_header Content-Security-Policy "frame-ancestors 'none'" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

Preserve a CSP existente no HTML: a política adicional de resposta restringe os
ancestrais e complementa as restrições de scripts e recursos existentes.
Verifique a herança de `add_header` se houver blocos `location` com cabeçalhos próprios.
O GitHub Pages não aplica esse exemplo nem arquivos `_headers`; a configuração
precisa ser instalada no proxy/CDN. Não adicione `frame-ancestors` à meta tag,
pois o navegador ignora essa diretiva nesse formato.

Referência: [MDN: frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).

## Dependências

Execute `npm audit` com acesso ao registro npm. Vitest e `@vitest/coverage-v8`
exigem no mínimo a versão 5.0.3 para corrigir os avisos
[GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) e
[GHSA-xp26-3454-mjgp](https://github.com/advisories/GHSA-xp26-3454-mjgp).
Os testes usam `vitest run`; não exponha servidores de testes à rede pública.
O workflow bloqueia a publicação quando `npm audit --audit-level=moderate`
encontra vulnerabilidades moderadas, altas ou críticas, inclusive em ferramentas
de desenvolvimento. Falhas ao consultar o registro também interrompem o build.
