import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { renderProductPage } from '../scripts/seo.ts';

const output = resolve(import.meta.dirname, '../dist');
const read = path => readFileSync(resolve(output, path), 'utf8');
const site = 'https://clubedoleo.com.br';
const products = JSON.parse(read('data/products.json')).produtos;
const xml = new JSDOM(read('sitemap.xml'), { contentType: 'text/xml' }).window.document;
const urls = [...xml.querySelectorAll('loc')].map(node => node.textContent);

test('publica uma política restritiva antes de carregar recursos em cada entrada', () => {
  for (const route of ['', 'admin/', 'politica-de-precos/', 'produto-cubo-infinito-2/']) {
    const document = new JSDOM(read(route + 'index.html')).window.document;
    const policy = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    assert.equal(document.head.querySelector('link, script, style, meta[http-equiv]'), policy);
    const directives = policy.content.split('; ');
    for (const directive of ["default-src 'none'", "base-uri 'none'", "form-action 'none'",
      "connect-src 'self'", "font-src 'self'", "style-src 'self'", "img-src 'self' data:", "worker-src 'none'"]) {
      assert.ok(directives.includes(directive), route + ' ' + directive);
    }
    assert.match(directives.find(value => value.startsWith('script-src')), /^script-src 'self'( 'sha256-[A-Za-z0-9+/]+=*')*$/);
    assert.equal(document.querySelector('meta[name="referrer"]').content, 'no-referrer');
  }
});

test('preserva marcadores literais do catálogo no HTML, nos atributos e no JSON-LD', () => {
  const template = readFileSync(resolve(output, '../product.html'), 'utf8');
  const product = {
    ...products[0],
    nome: 'Peça "__PRODUCT_JSON_LD__" & <Leo>',
    descricao: 'Detalhes __PRODUCT_FALLBACK__ e __PRODUCT_IMAGE__.',
    imagens: ['assets/../private.webp', 'https://example.invalid/image.webp', './assets/products/peça.webp'],
  };
  const document = new JSDOM(renderProductPage(template, product)).window.document;
  assert.equal(document.querySelector('meta[property="og:title"]').content, product.nome);
  assert.equal(document.querySelector('meta[name="description"]').content, product.descricao);
  assert.equal(document.querySelector('h1').textContent, product.nome);
  assert.equal(document.querySelector('main img').getAttribute('src'), '/assets/products/peça.webp');
  const json = document.querySelector('script[type="application/ld+json"]').textContent;
  const item = JSON.parse(json)['@graph'][0];
  assert.equal(item.name, product.nome);
  assert.equal(item.description, product.descricao);
  assert.deepEqual(item.image, [site + '/assets/products/peça.webp']);
  const hash = createHash('sha256').update(json).digest('base64');
  assert.ok(document.querySelector('meta[http-equiv="Content-Security-Policy"]').content.includes(`sha256-${hash}`));
});

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
