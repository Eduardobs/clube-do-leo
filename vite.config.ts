import { createHash } from 'node:crypto';
import { copyFileSync, cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function copyStaticFiles(): Plugin {
  let outputDirectory = 'dist';

  return {
    name: 'copy-static-files',
    apply: 'build',
    configResolved(config) {
      outputDirectory = config.build.outDir;
    },
    writeBundle() {
      const output = resolve(import.meta.dirname, outputDirectory);
      mkdirSync(resolve(output, 'data'), { recursive: true });
      mkdirSync(resolve(output, 'assets/products'), { recursive: true });
      const productsDirectory = resolve(import.meta.dirname, 'assets/products');
      for (const filename of readdirSync(productsDirectory)) {
        if (filename.endsWith('.webp')) copyFileSync(resolve(productsDirectory, filename), resolve(output, 'assets/products', filename));
      }
      cpSync(resolve(productsDirectory, 'thumbs'), resolve(output, 'assets/products/thumbs'), { recursive: true });
      cpSync(resolve(import.meta.dirname, 'data/products.json'), resolve(output, 'data/products.json'));
      cpSync(resolve(import.meta.dirname, 'CNAME'), resolve(output, 'CNAME'));
      cpSync(resolve(import.meta.dirname, '.nojekyll'), resolve(output, '.nojekyll'));
    },
  };
}

interface CatalogProduct {
  codigo: string;
  nome: string;
  descricao: string;
  valor: number;
  imagens: string[];
  categorias: string[];
}

const SITE_URL = 'https://clubedoleo.com.br';

function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function generateProductPages(): Plugin {
  let outputDirectory = 'dist';
  return {
    name: 'generate-product-pages',
    apply: 'build',
    configResolved(config) {
      outputDirectory = config.build.outDir;
    },
    writeBundle() {
      const output = resolve(import.meta.dirname, outputDirectory);
      const templatePath = resolve(output, 'product.html');
      const template = readFileSync(templatePath, 'utf8');
      const { produtos } = JSON.parse(readFileSync(resolve(import.meta.dirname, 'data/products.json'), 'utf8')) as { produtos: CatalogProduct[] };
      const urls = [`${SITE_URL}/`, `${SITE_URL}/politica-de-precos.html`];

      for (const product of produtos) {
        const slug = slugify(`${product.nome}-${product.codigo}`);
        const filename = `produto-${slug}.html`;
        const url = `${SITE_URL}/${filename}`;
        const compactDescription = product.descricao.replace(/\s+/g, ' ').trim();
        const description = compactDescription.length > 155
          ? `${compactDescription.slice(0, 152).replace(/\s+\S*$/, '')}…`
          : compactDescription;
        const images = product.imagens.map((image) => `${SITE_URL}/${image.replace(/^\.?\//, '')}`);
        const jsonLd = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.nome,
          description,
          sku: product.codigo,
          category: product.categorias.join(', '),
          image: images,
          ...(product.valor > 0 ? {
            offers: {
              '@type': 'Offer',
              url,
              priceCurrency: 'BRL',
              price: product.valor.toFixed(2),
            },
          } : {}),
        }).replaceAll('<', '\\u003c');
        const jsonHash = createHash('sha256').update(jsonLd).digest('base64');
        const fallback = `<article><h1>${escapeHtml(product.nome)}</h1><p>${escapeHtml(description)}</p><p><a href="./index.html#produtos">Voltar aos produtos</a></p></article>`;
        const page = template
          .replaceAll('__PRODUCT_TITLE__', escapeHtml(product.nome))
          .replaceAll('__PRODUCT_DESCRIPTION__', escapeHtml(description))
          .replaceAll('__PRODUCT_IMAGE__', escapeHtml(images[0] ?? `${SITE_URL}/assets/brand/header-logo-medallion.webp`))
          .replaceAll('__PRODUCT_URL__', url)
          .replaceAll('__PRODUCT_JSON_HASH__', `sha256-${jsonHash}`)
          .replace('__PRODUCT_JSON_LD__', jsonLd)
          .replace('__PRODUCT_FALLBACK__', fallback);
        writeFileSync(resolve(output, filename), page);
        urls.push(url);
      }

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`;
      writeFileSync(resolve(output, 'sitemap.xml'), sitemap);
      writeFileSync(resolve(output, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin.html\nSitemap: ${SITE_URL}/sitemap.xml\n`);
      rmSync(templatePath);
    },
  };
}

function serveProductPagesInDevelopment(): Plugin {
  return {
    name: 'serve-product-pages-in-development',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        if (/^\/produto-[^/]+\.html$/.test(pathname)) request.url = '/product.html';
        next();
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serveProductPagesInDevelopment(), react(), copyStaticFiles(), generateProductPages()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        storefront: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        pricingPolicy: resolve(import.meta.dirname, 'politica-de-precos.html'),
        product: resolve(import.meta.dirname, 'product.html'),
      },
    },
  },
});
