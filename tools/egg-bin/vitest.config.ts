import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ViteUserConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// These tests spawn child `egg-bin` processes (vitest-in-vitest), which are slow
// on Windows CI. Run fewer test files at once to cut child-process contention
// and give each case more headroom, mirroring the root config's Windows
// handling — otherwise cases routinely exceed the 60s timeout and flake.
const isWindowsCI = process.env.CI && process.platform === 'win32';

const config: ViteUserConfig = {
  root: __dirname,
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['**/test/fixtures/**', '**/node_modules/**', '**/dist/**'],
    testTimeout: isWindowsCI ? 120000 : 60000,
    hookTimeout: isWindowsCI ? 120000 : 60000,
    ...(isWindowsCI ? { maxWorkers: 2 } : {}),
    globals: true,
  },
};

export default config;
