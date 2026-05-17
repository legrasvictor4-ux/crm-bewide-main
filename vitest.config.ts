import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ["tests/e2e/**", "node_modules/**"],
    include: ["tests/**/*.{test,spec}.{ts,tsx,js,jsx}", "src/**/__tests__/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      reporter: ['text', 'lcov'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    retry: 0,
  },
});
