import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { UserConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: UserConfig = {
  root: __dirname,
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['**/test/fixtures/**', '**/node_modules/**', '**/dist/**'],
    testTimeout: 60000,
    globals: true,
  },
};

export default config;
