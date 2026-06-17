import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/api/**/*.{test,spec}.ts'],
    alias: {
      '@api': path.resolve(__dirname, './src'),
    },
    setupFiles: [], // Optional: add any global setup here
  },
});
