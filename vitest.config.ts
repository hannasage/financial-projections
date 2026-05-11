import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import viteApp from './vite.config';

export default mergeConfig(
  viteApp,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }),
);
