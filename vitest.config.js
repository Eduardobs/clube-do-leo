import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        // jsdom disables localStorage/sessionStorage for the default
        // "about:blank" opaque origin; give it a real origin so
        // CartManager/AdminManager's storage-backed persistence works.
        url: 'http://localhost/',
      },
    },
    execArgv: ['--no-experimental-webstorage'],
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      reportsDirectory: './tests/coverage',
    },
  },
});
