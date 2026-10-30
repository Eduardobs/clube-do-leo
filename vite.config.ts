import { copyFileSync, cpSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { catalogContent, catalogStructuredData, escapeHtml, metaDescription, productContent, productImages, productRoute, productStructuredData, SITE_URL, type SeoProduct } from './scripts/seo.ts';

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
      mkdirSync(resolve(output, 'assets/brand'), { recursive: true });
      copyFileSync(resolve(import.meta.dirname, 'assets/brand/header-logo-medallion.webp'), resolve(output, 'assets/brand/header-logo-medallion.webp'));
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
      const { produtos } = JSON.parse(readFileSync(resolve(import.meta.dirname, 'data/products.json'), 'utf8')) as { produtos: SeoProduct[] };
      const urls = [`${SITE_URL}/`, `${SITE_URL}/politica-de-precos/`];

      for (const product of produtos) {
        const route = productRoute(product).slice(1, -1);
        const url = `${SITE_URL}/${route}/`;
        const description = metaDescription(product);
        const images = productImages(product);
        const { json: jsonLd, hash: jsonHash } = productStructuredData(product);
        const fallback = productContent(product);
        const page = template
          .replaceAll('__PRODUCT_TITLE__', () => escapeHtml(product.nome))
          .replaceAll('__PRODUCT_DESCRIPTION__', () => escapeHtml(description))
          .replaceAll('__PRODUCT_IMAGE__', () => escapeHtml(images[0] ?? `${SITE_URL}/assets/brand/header-logo-medallion.webp`))
          .replaceAll('__PRODUCT_URL__', () => url)
          .replaceAll('__PRODUCT_JSON_HASH__', () => jsonHash)
          .replace('__PRODUCT_JSON_LD__', () => jsonLd)
          .replace('__PRODUCT_FALLBACK__', () => fallback);
        const routeDirectory = resolve(output, route);
        mkdirSync(routeDirectory, { recursive: true });
        writeFileSync(resolve(routeDirectory, 'index.html'), page);
        urls.push(url);
      }

      const catalogPath = resolve(output, 'index.html');
      const catalogSchema = catalogStructuredData(produtos);
      writeFileSync(catalogPath, readFileSync(catalogPath, 'utf8')
        .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => `<script type="application/ld+json">${catalogSchema.json}</script>`)
        .replace("sha256-J/NbQMXd0JUay1Gtn5URyHhkrk/vujxjNuk5NikunWs=", catalogSchema.hash)
        .replace('<div id="root"></div>', () => `<div id="root">${catalogContent(produtos)}</div>`));

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`;
      writeFileSync(resolve(output, 'sitemap.xml'), sitemap);
      writeFileSync(resolve(output, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${SITE_URL}/sitemap.xml\n`);
      rmSync(templatePath);

      for (const route of ['admin', 'politica-de-precos']) {
        const routeDirectory = resolve(output, route);
        mkdirSync(routeDirectory, { recursive: true });
        renameSync(resolve(output, `${route}.html`), resolve(routeDirectory, 'index.html'));
      }
    },
  };
}

function serveCleanRoutesInDevelopment(): Plugin {
  return {
    name: 'serve-clean-routes-in-development',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        const cleanEntryPoints: Record<string, string> = {
          '/admin': '/admin.html',
          '/admin/': '/admin.html',
          '/politica-de-precos': '/politica-de-precos.html',
          '/politica-de-precos/': '/politica-de-precos.html',
        };
        const entryPoint = cleanEntryPoints[url.pathname]
          ?? (/^\/produto-[^/]+\/?$/.test(url.pathname) ? '/product.html' : undefined);
        if (entryPoint) request.url = `${entryPoint}${url.search}`;
        next();
      });
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [serveCleanRoutesInDevelopment(), react(), copyStaticFiles(), generateProductPages()],
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
