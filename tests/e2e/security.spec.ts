import { expect, test } from '@playwright/test';

const routes = ['/', '/admin/', '/politica-de-precos/', '/produto-cubo-infinito-2/'];

test.beforeEach(async ({ context }) => {
  // Let the hostile test origin reach the loopback server in recent Chromium.
  await context.grantPermissions(['local-network-access']);
});

for (const route of routes) {
  test(`bloqueia a aplicação em iframe externo: ${route}`, async ({ page }) => {
    await page.route('http://localhost:4173/embedding-test', request => request.fulfill({
      contentType: 'text/html',
      body: `<iframe src="http://127.0.0.1:4173${route}"></iframe>`,
    }));
    await page.goto('http://localhost:4173/embedding-test');
    const frame = page.frameLocator('iframe');
    await expect(frame.locator('body')).toBeHidden();
    await expect.poll(async () => {
      const embedded = page.frames().find(candidate => candidate.url() === `http://127.0.0.1:4173${route}`);
      return embedded?.evaluate(() => document.readyState === 'complete' && !document.getElementById('root'));
    }).toBe(true);
    await expect(frame.locator('html')).not.toHaveAttribute('data-standalone');
  });

  test(`abre normalmente fora de iframe: ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('data-standalone', '');
    await expect(page.locator('#root')).toBeVisible();
  });
}

test('mantém o conteúdo oculto em iframe sem JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await context.grantPermissions(['local-network-access']);
  const page = await context.newPage();
  await page.route('http://localhost:4173/embedding-test', request => request.fulfill({
    contentType: 'text/html',
    body: '<iframe src="http://127.0.0.1:4173/produto-cubo-infinito-2/"></iframe>',
  }));
  await page.goto('http://localhost:4173/embedding-test');
  await expect(page.frameLocator('iframe').locator('body')).toBeHidden();
  await context.close();
});
