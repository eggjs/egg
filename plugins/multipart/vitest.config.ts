import { defineConfig } from 'vitest/config';
import type { ViteUserConfigExport } from 'vitest/config';

const config: ViteUserConfigExport = defineConfig({
  test: {
    hookTimeout: 20000,
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
  },
});

export default config;
