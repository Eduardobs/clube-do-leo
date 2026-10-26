import { expect, test } from '@playwright/test';

test('galeria não sobrepõe descrição ao rolar no desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/produto-estrela-sensorial-1/');
  const gallery = page.locator('.product-page__gallery');
  const description = page.locator('.product-page__description');
  await expect(page.getByRole('heading', { name: 'Estrela Sensorial', exact: true })).toBeVisible();
  await expect(page.locator('.product-detail__thumb')).toHaveCount(4);
  await description.scrollIntoViewIfNeeded();
  const galleryBox = await gallery.boundingBox();
  const descriptionBox = await description.boundingBox();
  expect(galleryBox!.y + galleryBox!.height).toBeLessThanOrEqual(descriptionBox!.y);
});

test('título da aba acompanha o produto mesmo com template sem substituição', async ({ page }) => {
  await page.route('**/produto-*/', async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/<title>.*?<\/title>/, '<title>__PRODUCT_TITLE__ | Clube do Léo</title>');
    await route.fulfill({ response, body: html });
  });
  await page.goto('/produto-cubo-infinito-2/');
  await expect(page).toHaveTitle('Cubo infinito | Clube do Léo');
  await page.goto('/produto-estrela-sensorial-1/');
  await expect(page).toHaveTitle('Estrela Sensorial | Clube do Léo');
});
