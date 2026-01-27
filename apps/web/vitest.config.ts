import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'app/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/node_modules/**',
        '**/.next/**',
      ],
      thresholds: {
        // Initial thresholds - increase as coverage improves
        lines: 60,
        functions: 30,
        branches: 50,
        statements: 60,
      },
    },
    // Environment settings per test file pattern
    environmentMatchGlobs: [
      // Component tests need jsdom
      ['__tests__/components/**', 'jsdom'],
      // API route tests use node
      ['__tests__/api/**', 'node'],
      ['__tests__/lib/**', 'node'],
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
