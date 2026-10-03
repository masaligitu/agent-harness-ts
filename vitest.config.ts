import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    include: ['tests/**/*.test.ts', 'packages/evals/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './packages/core/src'),
      '@tools': path.resolve(__dirname, './packages/tools/src'),
      '@adapters': path.resolve(__dirname, './packages/adapters/src'),
      '@evals': path.resolve(__dirname, './packages/evals/src'),
    },
  },
});
