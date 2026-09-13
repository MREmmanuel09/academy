import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/app/**/layout.tsx', 'src/app/**/page.tsx'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@academy/ui': fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)),
      '@academy/i18n': fileURLToPath(new URL('../../packages/i18n/src/index.ts', import.meta.url)),
      '@academy/content': fileURLToPath(
        new URL('../../packages/content/src/index.ts', import.meta.url),
      ),
    },
  },
});
