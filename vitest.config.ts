import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    execArgv: ['--no-experimental-webstorage'],
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/entries/**'],
      reportsDirectory: './tests/coverage',
    },
  },
});
