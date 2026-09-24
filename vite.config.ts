import { cpSync, mkdirSync } from 'node:fs';
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
      cpSync(resolve(import.meta.dirname, 'assets/products'), resolve(output, 'assets/products'), { recursive: true });
      cpSync(resolve(import.meta.dirname, 'data/products.json'), resolve(output, 'data/products.json'));
      cpSync(resolve(import.meta.dirname, 'CNAME'), resolve(output, 'CNAME'));
      cpSync(resolve(import.meta.dirname, '.nojekyll'), resolve(output, '.nojekyll'));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), copyStaticFiles()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        storefront: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        pricingPolicy: resolve(import.meta.dirname, 'politica-de-precos.html'),
      },
    },
  },
});
