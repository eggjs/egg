import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ViteUserConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: ViteUserConfig = {
  root: __dirname,
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['**/test/fixtures/**', '**/node_modules/**', '**/dist/**'],
    testTimeout: 60000,
    globals: true,
    maxWorkers: Number(process.env.VITEST_MAX_WORKERS) || 2,
  },
};

export default config;
