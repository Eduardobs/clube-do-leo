import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.dataLayer = [];
    window.open = (() => null) as typeof window.open;
  });
});

test('orçamento respeita mínimo e mantém recuperação quando WhatsApp não abre', async ({ page }) => {
  await page.goto('/produto-enfeite-de-chimarrao-58/');
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('20');
  await expect(page.getByRole('button', { name: 'Diminuir quantidade' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Identidade da empresa para personalização (obrigatório)', exact: true }).fill('Marca de teste');
  await page.getByRole('button', { name: 'Solicitar orçamento pelo WhatsApp', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abrir WhatsApp novamente' })).toBeVisible();
  await expect(page.getByLabel('Mensagem para copiar')).toHaveValue(/Solicitação de orçamento[\s\S]*20 unidade[\s\S]*Marca de teste/);
  await expect(page.getByLabel('Mensagem para copiar')).not.toHaveValue(/R\$/);
  await page.getByRole('button', { name: 'Copiar mensagem' }).click();
  await expect(page.getByRole('textbox', { name: 'Identidade da empresa para personalização (obrigatório)', exact: true })).toHaveValue('Marca de teste');
  const events = await page.evaluate(() => JSON.stringify(window.dataLayer));
  expect(events).toContain('request_quote');
  expect(events).not.toContain('Marca de teste');
});

test('kits e duas personalizações persistem separados, editáveis e na revisão', async ({ page }) => {
  await page.goto('/produto-ponteira-de-lapis-10un-29/');
  await page.getByLabel('Nomes para as ponteiras').fill('Ana');
  await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
  await page.getByLabel('Nomes para as ponteiras').fill('Léo');
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click();
  await expect(page.locator('#purchase')).toContainText('2 kits · 20 peças');
  await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
  await page.getByRole('link', { name: 'Ver carrinho (3)' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.cart-item')).toHaveCount(2);
  await dialog.getByRole('button', { name: 'Editar configurações' }).first().click();
  await dialog.getByLabel('Nomes para as ponteiras').fill('Maria');
  await dialog.getByRole('button', { name: 'Salvar configurações' }).click();
  await dialog.getByRole('button', { name: 'Revisar pedido' }).click();
  await expect(dialog).toContainText('Maria');
  await expect(dialog).toContainText('Léo');
  await expect(dialog).toContainText('2 kits · 20 peças');
  await page.getByLabel('Seu nome').fill('Cliente de teste');
  await page.getByRole('button', { name: 'Preparar pedido no WhatsApp' }).click();
  await expect(page.getByLabel('Mensagem para copiar')).toHaveValue(/Maria[\s\S]*Léo/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Seu nome')).toHaveValue('Cliente de teste');
  expect(await page.evaluate(() => JSON.stringify(window.dataLayer))).not.toContain('Cliente de teste');
});

test('retorno e histórico preservam busca, categoria e ordenação', async ({ page }) => {
  await page.goto('/?busca=cubo&categoria=Brinquedos&ordem=price-desc');
  await page.getByRole('link').filter({ has: page.getByRole('heading', { name: 'Cubo infinito' }) }).click();
  await page.getByRole('link', { name: 'Voltar aos produtos' }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('cubo');
  await expect(page.locator('.sort-control select')).toHaveValue('price-desc');
  await expect(page.getByRole('button', { name: 'Brinquedos', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.sort-control select').selectOption('name');
  await page.goBack();
  await expect(page.locator('.sort-control select')).toHaveValue('price-desc');
  await page.goForward();
  await expect(page.locator('.sort-control select')).toHaveValue('name');
});

test('carrinho legado sinaliza removidos e configurações obrigatórias', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('clubeDoLeo.cart', JSON.stringify([{ codigo: '58', quantity: 1 }, { codigo: 'removido', quantity: 5 }])));
  await page.goto('/?carrinho=1');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Produto removido removido do catálogo');
  await expect(dialog.getByRole('button', { name: 'Revisar pedido' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Remover item removido' }).click();
  await dialog.getByRole('button', { name: 'Editar configurações' }).click();
  await dialog.getByRole('textbox', { name: 'Identidade da empresa para personalização (obrigatório)', exact: true }).fill('Identidade');
  await dialog.getByRole('button', { name: 'Salvar configurações' }).click();
  await expect(dialog).toContainText('20 unidade');
  await dialog.getByRole('button', { name: 'Revisar pedido' }).click();
  await page.getByLabel('Seu nome').fill('Maria');
  await page.getByRole('button', { name: 'Preparar pedido no WhatsApp' }).click();
  await expect(page.getByLabel('Mensagem para copiar')).toHaveValue(/Solicitação de orçamento/);
  await expect(page.getByLabel('Mensagem para copiar')).not.toHaveValue(/Subtotal/);
});

test('falha do catálogo permite tentar novamente sem perder carrinho', async ({ page }) => {
  let fail = true;
  await page.route('**/data/products.json', route => fail ? route.abort() : route.continue());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar');
  fail = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Cubo infinito' })).toBeVisible();
});

test('mobile aproxima ação, mantém categorias legíveis e suporta teclado e zoom', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.locator('.header-pill').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  expect(await page.locator('.header-pills').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.locator('.header-pills').scrollIntoViewIfNeeded();
  for (const category of ['Todos', 'Jogos', 'Brinquedos', 'Decorações', 'Utilidades']) await expect(page.getByRole('button', { name: category, exact: true })).toBeInViewport();
  await page.goto('/produto-cubo-infinito-2/');
  await expect(page.getByRole('heading', { name: 'Cubo infinito' })).toBeVisible();
  await expect(page.locator('#purchase')).not.toContainText('Incremento');
  const action = await page.locator('#purchase button[type=submit]').boundingBox();
  const description = await page.locator('.product-page__description').boundingBox();
  expect(action!.y).toBeLessThan(1100);
  expect(action!.y).toBeLessThan(description!.y);
  await page.getByRole('button', { name: 'Ampliar imagem' }).click();
  await expect(page.locator('#root')).toHaveAttribute('inert', '');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Imagem anterior' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Ampliar imagem' })).toBeFocused();
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
});

test('galeria alterna imagens por teclado e filtros não consideram orçamento como zero', async ({ page }) => {
  await page.goto('/produto-estrela-sensorial-1/');
  await page.getByRole('button', { name: 'Ver imagem 2 de Estrela Sensorial' }).click();
  await expect(page.getByRole('button', { name: 'Ver imagem 2 de Estrela Sensorial' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Ampliar imagem' }).click();
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('dialog')).toContainText('Imagem 3 de 4');
  await page.keyboard.press('Escape');
  await page.goto('/?preco=consulta&ordem=price-asc');
  await expect(page.locator('.product-card')).toHaveCount(3);
  await expect(page.locator('.product-card').first()).toContainText('Preço sob consulta');
  await page.getByLabel('Preço definido até').fill('30');
  await expect(page.getByText('Nenhum produto por aqui')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).first().click();
  await expect(page.locator('.product-card').first()).toContainText('Estrela Sensorial');
});

test('revisão acessível, foco contido e capturas de celular', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Cubo infinito' })).toBeVisible();
  await page.screenshot({ path: `/tmp/clube-catalog-${testInfo.project.name}.png` });
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).first().click();
  await page.getByRole('button', { name: /^Abrir carrinho/i }).click();
  await expect(page.locator('.toast-group')).toBeHidden();
  await page.getByRole('button', { name: 'Revisar pedido' }).click();
  await expect(page.getByRole('button', { name: 'Fechar', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Preparar pedido no WhatsApp' })).toBeFocused();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
  await page.keyboard.press('Escape');
  await page.goto('/produto-cubo-infinito-2/');
  await expect(page.getByRole('heading', { name: 'Cubo infinito' })).toBeVisible();
  await page.screenshot({ path: `/tmp/clube-product-${testInfo.project.name}.png`, fullPage: true });
});


test('limpar exige confirmação e produto sem personalização não oferece edição', async ({ page }) => {
  await page.goto('/produto-cubo-infinito-2/');
  await page.locator('#purchase').getByRole('button', { name: 'Adicionar ao carrinho' }).click();
  await page.getByRole('link', { name: 'Ver carrinho (1)' }).click();
  const cart = page.getByRole('dialog', { name: 'Carrinho de compras' });
  await expect(cart.getByRole('button', { name: 'Editar configurações' })).toHaveCount(0);
  page.once('dialog', async dialog => { expect(dialog.type()).toBe('confirm'); await dialog.dismiss(); });
  await cart.getByRole('button', { name: 'Limpar', exact: true }).click();
  await expect(cart).toContainText('Cubo infinito');
  page.once('dialog', async dialog => { await dialog.accept(); });
  await cart.getByRole('button', { name: 'Limpar', exact: true }).click();
  await expect(cart).toContainText('Seu carrinho está vazio.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('clubeDoLeo.cart') || '[]'))).toEqual([]);
});
