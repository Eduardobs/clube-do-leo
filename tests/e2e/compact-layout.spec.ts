import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`exibe os produtos na abertura em ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('.product-card').first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const header = await page.locator('header').boundingBox();
    const photo = await page.locator('.product-card__media').first().boundingBox();
    expect(header!.height).toBeLessThanOrEqual(74);
    expect(photo!.y).toBeLessThanOrEqual(360);
    // At least 150px of the first photograph is visible above the mobile action bar.
    expect(photo!.y + 150).toBeLessThan(viewport.height - (viewport.width < 769 ? 70 : 0));
    if (viewport.height >= 800) await expect(page.locator('.product-card__price').first()).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('páginas de apoio e editor permanecem compactos e acessíveis no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/produto-cubo-infinito-2/', '/politica-de-precos/', '/admin/']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (route === '/admin/') await expect(page.locator('.admin-table tbody tr').first()).toBeVisible();
    expect((await page.locator('header').boundingBox())!.height).toBeLessThanOrEqual(66);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
  }
});
