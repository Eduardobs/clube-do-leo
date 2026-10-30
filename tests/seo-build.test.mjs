import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const output = resolve(import.meta.dirname, '../dist');
const read = path => readFileSync(resolve(output, path), 'utf8');
const site = 'https://clubedoleo.com.br';
const products = JSON.parse(read('data/products.json')).produtos;
const xml = new JSDOM(read('sitemap.xml'), { contentType: 'text/xml' }).window.document;
const urls = [...xml.querySelectorAll('loc')].map(node => node.textContent);

test('sitemap cobre todas as páginas públicas e não inclui o editor', () => {
  assert.equal(urls.length, products.length + 2);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(!urls.some(url => url.includes('/admin')));
  assert.ok(read('robots.txt').includes(`Sitemap: ${site}/sitemap.xml`));
  assert.ok(new JSDOM(read('admin/index.html')).window.document.querySelector('meta[name="robots"]').content.includes('noindex'));
});

for (const url of urls) {
  test(`HTML público e metadados válidos: ${url}`, () => {
    const path = new URL(url).pathname;
    const html = read(`${path.slice(1)}index.html`);
    const document = new JSDOM(html).window.document;
    assert.ok(!/__PRODUCT_\w+__/.test(html));
    assert.equal(document.documentElement.lang, 'pt-BR');
    assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1);
    assert.equal(document.querySelector('link[rel="canonical"]').href, url);
    assert.ok(document.title.length > 10);
    assert.ok(document.querySelector('meta[name="description"]').content.length > 20);
    assert.equal(document.querySelector('meta[property="og:url"]').content, url);
    assert.ok(document.querySelector('meta[name="twitter:image"]'));
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      JSON.parse(script.textContent);
      const hash = createHash('sha256').update(script.textContent).digest('base64');
      assert.ok(document.querySelector('meta[http-equiv="Content-Security-Policy"]').content.includes(`sha256-${hash}`));
    }
    const image = new URL(document.querySelector('meta[property="og:image"]').content);
    assert.ok(existsSync(resolve(output, image.pathname.slice(1))));
    if (path === '/') {
      assert.equal(document.querySelectorAll('h1').length, 1);
      assert.equal(document.querySelectorAll('a[href^="/produto-"]').length, products.length);
      for (const link of document.querySelectorAll('a[href^="/produto-"]')) {
        assert.ok(urls.includes(`${site}${link.getAttribute('href')}`));
      }
    } else if (path.startsWith('/produto-')) {
      const graph = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
      const product = graph.find(item => item['@type'] === 'Product');
      const source = products.find(item => String(item.codigo) === product.sku);
      assert.ok(source);
      assert.equal(document.querySelector('h1').textContent, source.nome);
      assert.ok(document.querySelector('main').textContent.includes(source.descricao.replace(/\s+/g, ' ').trim()));
      assert.equal(Boolean(product.offers), source.valor > 0 && source.modalidadePreco !== 'consulta');
      assert.ok(graph.some(item => item['@type'] === 'BreadcrumbList'));
    }
  });
}
