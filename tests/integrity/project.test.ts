import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ProductsFile } from '../../src/types/product';

const root = resolve(import.meta.dirname, '../..');

describe('integridade do projeto', () => {
  it('mantém todas as imagens referenciadas no products.json', () => {
    const data = JSON.parse(readFileSync(resolve(root, 'data/products.json'), 'utf8')) as ProductsFile;
    const missing = data.produtos.flatMap((product) => product.imagens.filter((image) => !existsSync(resolve(root, image))));
    expect(missing).toEqual([]);
  });

  it.each(['index.html', 'admin.html', 'politica-de-precos.html'])('%s possui uma entrada TypeScript e o root React', (file) => {
    const html = readFileSync(resolve(root, file), 'utf8');
    expect(html).toContain('id="root"');
    expect(html).toMatch(/src="\/src\/entries\/.+\.tsx"/);
  });
});
