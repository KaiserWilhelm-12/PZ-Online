import { defineConfig, mergeConfig } from 'vitest/config';
import { baseTestConfig } from './packages/config/vitest/base';

export default mergeConfig(
  baseTestConfig,
  defineConfig({
    test: {
      include: ['packages/**/src/**/*.test.ts', 'apps/**/src/**/*.test.ts'],
    },
  }),
);
