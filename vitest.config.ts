import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` poza React Server rzuca przy imporcie — w testach podstawiamy pusty moduł.
      'server-only': fileURLToPath(new URL('./src/test/server-only.ts', import.meta.url)),
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'], testTimeout: 30_000, hookTimeout: 30_000 },
});
