import { expect, test } from '@playwright/test';

test('cadastra, valida e reedita os dados do produto no rascunho local', async ({ page }) => {
  await page.goto('/admin/');
  await expect(page.locator('.admin-table__name').first()).toBeVisible();
  await page.getByRole('button', { name: 'Novo produto' }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Código', { exact: true }).fill('9991');
  await editor.getByLabel('Nome', { exact: true }).fill('Peça para teste');
  await editor.getByLabel('Modalidade de preço').selectOption('consulta');
  await expect(editor.getByLabel('Valor (R$)')).toBeDisabled();
  await editor.getByRole('button', { name: 'Salvar produto' }).click();
  await expect(editor.getByRole('alert')).toHaveText('Selecione ao menos uma categoria.');
  await editor.getByRole('checkbox', { name: 'Decorações' }).check();
  await editor.getByLabel('Caminho da imagem 1').fill('assets/products/cubo-infinito-1.webp');
  const preview = editor.locator('.image-row img');
  await expect(preview).toHaveAttribute('src', /assets\/products\/cubo-infinito-1\.webp$/);
  await expect.poll(() => preview.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await editor.getByRole('button', { name: 'Salvar produto' }).click();
  await expect(editor).toHaveCount(0);

  page.once('dialog', dialog => dialog.accept());
  await page.reload();
  await page.getByRole('searchbox').fill('9991');
  await page.getByRole('button', { name: 'Editar Peça para teste' }).click();
  await expect(editor.getByLabel('Modalidade de preço')).toHaveValue('consulta');
  await expect(editor.getByLabel('Caminho da imagem 1')).toHaveValue('assets/products/cubo-infinito-1.webp');
  await editor.getByLabel('Nome', { exact: true }).fill('Nome temporário');
  await editor.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.locator('.admin-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.admin-table tbody')).toContainText('Peça para teste');
});
