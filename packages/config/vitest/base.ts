import { defineConfig } from 'vitest/config';

export const baseTestConfig = defineConfig({
  test: {
    environment: 'node',
    testTimeout: 15_000,
    hookTimeout: 15_000,
    restoreMocks: true,
    clearMocks: true,
  },
});
