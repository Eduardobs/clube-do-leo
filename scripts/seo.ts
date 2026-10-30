import { createHash } from 'node:crypto';
import { STORE_CONFIG } from '../src/config/store.ts';

export const SITE_URL = STORE_CONFIG.siteUrl;
export interface SeoProduct {
  modalidadePreco?: string;
  codigo: string | number;
  nome: string;
  descricao: string;
  valor: number;
  imagens: string[];
  categorias: string[];
  unidadeVenda?: string;
}

export function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function productRoute(product: SeoProduct): string {
  const slug = `${product.nome}-${product.codigo}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `/produto-${slug}/`;
}

export function productDescription(product: SeoProduct): string {
  return product.descricao.replace(/\s+/g, ' ').trim() || `${product.nome} em impressão 3D, feito sob encomenda no Clube do Léo. Consulte as condições pelo WhatsApp.`;
}

export function metaDescription(product: SeoProduct): string {
  const description = productDescription(product);
  return description.length > 155 ? `${description.slice(0, 152).replace(/\s+\S*$/, '')}…` : description;
}

export function productImages(product: SeoProduct): string[] {
  // Uploaded Data URLs and external URLs are not public catalog image routes.
  return product.imagens.filter(image => /^(?:\.\/|\/)?assets\//.test(image)).map(image => `${SITE_URL}/${image.replace(/^\.?\//, '')}`);
}

export function structuredData(data: unknown): { json: string; hash: string } {
  const json = JSON.stringify(data).replaceAll('<', '\\u003c');
  return { json, hash: `sha256-${createHash('sha256').update(json).digest('base64')}` };
}

export function productStructuredData(product: SeoProduct) {
  const url = `${SITE_URL}${productRoute(product)}`;
  return structuredData({
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'Product', '@id': `${url}#product`, url,
      name: product.nome, description: productDescription(product), sku: String(product.codigo),
      category: product.categorias.join(', '), image: productImages(product),
      ...(product.valor > 0 && product.modalidadePreco !== 'consulta' ? {
        offers: { '@type': 'Offer', url, priceCurrency: 'BRL', price: product.valor.toFixed(2), seller: { '@id': `${SITE_URL}/#organization` } },
      } : {}),
    }, {
      '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: STORE_CONFIG.name, url: `${SITE_URL}/`,
    }, {
      '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Produtos', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: product.nome, item: url },
      ],
    }],
  });
}

export function catalogStructuredData(products: SeoProduct[]) {
  return structuredData({
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: STORE_CONFIG.name, url: `${SITE_URL}/`, logo: `${SITE_URL}/assets/brand/header-logo-medallion.webp`, sameAs: [STORE_CONFIG.instagramUrl] },
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: STORE_CONFIG.name, url: `${SITE_URL}/`, inLanguage: 'pt-BR', publisher: { '@id': `${SITE_URL}/#organization` } },
      { '@type': 'CollectionPage', '@id': `${SITE_URL}/#catalog`, url: `${SITE_URL}/`, name: 'Produtos em impressão 3D', isPartOf: { '@id': `${SITE_URL}/#website` }, mainEntity: {
        '@type': 'ItemList', numberOfItems: products.length, itemListElement: products.map((product, index) => ({ '@type': 'ListItem', position: index + 1, name: product.nome, url: `${SITE_URL}${productRoute(product)}` })),
      } },
    ],
  });
}

function priceText(product: SeoProduct): string {
  return product.valor > 0 && product.modalidadePreco !== 'consulta'
    ? `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.valor)} / ${product.unidadeVenda || 'un.'}`
    : 'Preço sob consulta';
}

export function productContent(product: SeoProduct): string {
  const image = productImages(product)[0];
  return `<main class="container"><nav aria-label="Navegação estrutural"><a href="/">Produtos</a> / ${escapeHtml(product.nome)}</nav><article><h1>${escapeHtml(product.nome)}</h1>${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.nome)}" width="480" height="480" />` : ''}<p>${escapeHtml(productDescription(product))}</p><p>${escapeHtml(priceText(product))}</p><p>Feito sob encomenda. Condições e prazos combinados pelo WhatsApp.</p><p>Código ${escapeHtml(String(product.codigo))}</p><a href="/#produtos">Voltar aos produtos</a></article></main>`;
}

export function catalogContent(products: SeoProduct[]): string {
  return `<main id="produtos" class="container"><h1>Produtos em impressão 3D</h1><p>Brinquedos, jogos, decorações e presentes criativos feitos sob encomenda. Pedido pelo WhatsApp.</p><div class="product-grid">${products.map(product => `<article class="product-card"><h2><a href="${productRoute(product)}">${escapeHtml(product.nome)}</a></h2><p>${escapeHtml(metaDescription(product))}</p><p>${escapeHtml(priceText(product))}</p></article>`).join('')}</div><a href="/politica-de-precos/">Política de preços</a></main>`;
}
