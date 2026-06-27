import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ViteUserConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// These tests spawn child `egg-bin` processes (vitest-in-vitest), which are slow
// on Windows CI. Cap the number of test files running at once to bound
// child-process contention and give each case more headroom (the root config
// handles Windows similarly) — otherwise cases routinely exceed the 60s timeout
// and flake. Booting children via @oxc-node/core/register instead of ts-node/esm
// removed most of the per-fork loader startup tax, so 4 workers now fit.
const isWindowsCI = process.env.CI && process.platform === 'win32';

const config: ViteUserConfig = {
  root: __dirname,
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['**/test/fixtures/**', '**/node_modules/**', '**/dist/**'],
    testTimeout: isWindowsCI ? 120000 : 60000,
    hookTimeout: isWindowsCI ? 120000 : 60000,
    ...(isWindowsCI ? { maxWorkers: 4 } : {}),
    globals: true,
  },
};

export default config;
