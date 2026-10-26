# Validação das melhorias de encomenda

Executada localmente em 26/10/2026. Nenhum deploy, publicação ou envio de mensagem real.

- `npm run check`: tipos TypeScript, 26 testes Vitest (unidade, integração e integridade) e build aprovados.
- `npm run test:e2e`: 34 testes aprovados, distribuídos entre Chromium desktop e emulação móvel.
- `git diff --check`: sem erros de whitespace.
- Capturas de catálogo e produto inspecionadas em 390 × 844; reflow sem rolagem horizontal indevida verificado também em 320 px.
- Axe sem violações sérias/críticas na vitrine, no produto e na revisão nas condições testadas. Testes adicionais verificam foco contido, Escape, retorno de foco e conteúdo de fundo inerte. Isso não substitui uma avaliação completa com leitores de tela e aparelhos físicos.

## Cenários cobertos

Preço definido; consulta explícita e migração do zero legado; mínimo de 20; incremento; kit de dez e relação 2 kits/20 peças; duas configurações do mesmo produto; edição de configuração; carrinho legado; produto removido; contagem após carregamento do catálogo; importação/exportação dos novos campos; retorno com busca/categoria/ordenação; voltar/avançar; recuperação do catálogo após erro; galeria por teclado; seleção acessível de imagem; revisão detalhada; WhatsApp bloqueado com mensagem preservada; manutenção do carrinho; exclusão de dados pessoais e textos personalizados das métricas.

A integração com WhatsApp é simulada com `window.open`; nenhum teste envia mensagens reais. O retorno da tentativa não determina se a recuperação é mostrada: reabrir/copiar permanece acessível.

## Limitações e conteúdo

O carrinho antigo não contém histórico de preços; usa as condições atuais, exibidas para revisão. A comparação automática de alterações fica disponível para linhas novas, com assinatura do catálogo. A posição da lista e o contexto de retorno dependem do armazenamento de sessão quando disponível. O limite técnico de quantidade por linha continua sendo 99.

Informações comerciais e técnicas não fornecidas permanecem ausentes ou “a combinar”. Consulte [a lista editorial por produto](pendencias-editoriais.md).
