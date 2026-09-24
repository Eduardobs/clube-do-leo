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
    expect(data.produtos.flatMap((product) => product.imagens).every((image) => image.endsWith('.webp'))).toBe(true);
    const missingThumbnails = data.produtos.flatMap((product) => product.imagens.filter((image) => {
      const thumbnail = image.replace('assets/products/', 'assets/products/thumbs/');
      return !existsSync(resolve(root, thumbnail));
    }));
    expect(missingThumbnails).toEqual([]);
  });

  it.each(['index.html', 'admin.html', 'politica-de-precos.html'])('%s possui uma entrada TypeScript e o root React', (file) => {
    const html = readFileSync(resolve(root, file), 'utf8');
    expect(html).toContain('id="root"');
    expect(html).toMatch(/src="\/src\/entries\/.+\.tsx"/);
  });

  it('mantém o template de páginas de produto com metadados sociais e dados estruturados', () => {
    const html = readFileSync(resolve(root, 'product.html'), 'utf8');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('src="/src/entries/product.tsx"');
  });
});
