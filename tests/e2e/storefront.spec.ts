import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.open = ((url?: string | URL) => {
      (window as typeof window & { __lastWhatsAppUrl?: string }).__lastWhatsAppUrl = String(url ?? '');
      return window;
    }) as typeof window.open;
  });
});

test('monta o pedido no WhatsApp sem apagar o carrinho', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Adicionar' }).first().click();
  await page.getByRole('button', { name: /^abrir carrinho/i }).click();
  await page.getByRole('button', { name: 'Revisar pedido' }).click();
  await page.getByLabel('Seu nome').fill('Maria');
  await page.getByLabel(/Observações/).fill('Prefiro a cor azul');
  await page.getByRole('button', { name: /Preparar pedido no WhatsApp/i }).click();

  const whatsappUrl = await page.evaluate(() => (window as typeof window & { __lastWhatsAppUrl?: string }).__lastWhatsAppUrl);
  expect(whatsappUrl).toContain('https://wa.me/');
  expect(decodeURIComponent(whatsappUrl ?? '')).toContain('Prefiro a cor azul');
  expect(await page.evaluate(() => localStorage.getItem('clubeDoLeo.cart'))).not.toBe('[]');
});

test('mantém o carrinho ao visitar a política de preços e voltar à loja', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Adicionar' }).first().click();
  await page.getByRole('link', { name: 'Política de preços' }).click();
  await page.getByRole('link', { name: 'Voltar à loja' }).click();
  await page.getByRole('button', { name: /^abrir carrinho/i }).click();
  await expect(page.getByRole('dialog', { name: 'Carrinho de compras' })).toContainText('Estrela Sensorial');
});

test('mantém o carrinho da vitrine ao abrir uma página de produto', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Adicionar' }).first().click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('clubeDoLeo.cart')))
    .toBe('[{"codigo":"1","quantity":1}]');

  await page.getByRole('link', { name: 'Ver detalhes de Cubo infinito' }).click();

  await expect(page.getByRole('heading', { name: 'Cubo infinito' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver carrinho (1)' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver carrinho (1)' }).click();
  await expect(page.getByRole('dialog', { name: 'Carrinho de compras' })).toContainText('Estrela Sensorial');
});

test('não apaga o carrinho se o catálogo falhar na troca de página', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Adicionar' }).first().click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('clubeDoLeo.cart')))
    .toBe('[{"codigo":"1","quantity":1}]');
  await page.route('**/data/products.json', (route) => route.abort());

  await page.getByRole('link', { name: 'Ver detalhes de Cubo infinito' }).click();

  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar este produto.');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('clubeDoLeo.cart')))
    .toBe('[{"codigo":"1","quantity":1}]');
});

test('mantém o produto no carrinho ao voltar da página de detalhes', async ({ page }) => {
  await page.goto('/produto-cubo-infinito-2.html');
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
  await expect(page.getByRole('link', { name: 'Ver carrinho (1)' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver carrinho (1)' }).click();
  await expect(page.getByRole('dialog', { name: 'Carrinho de compras' })).toContainText('Cubo infinito');
});

test('página inicial não apresenta violações sérias de acessibilidade', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Cubo infinito' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('página de produto possui conteúdo e metadados próprios', async ({ page }) => {
  await page.goto('/produto-cubo-infinito-2.html');
  await expect(page).toHaveTitle(/Cubo infinito \| Clube do Léo/);
  await expect(page.getByRole('heading', { name: 'Cubo infinito' })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://clubedoleo.com.br/produto-cubo-infinito-2.html');
  const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
  expect(structuredData).toContain('Product');
});

test('layout móvel não cria rolagem horizontal', async ({ page }) => {
  await page.goto('/');
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
