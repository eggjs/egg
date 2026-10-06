import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ViteUserConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// These tests spawn child `egg-bin` processes (vitest-in-vitest), which are slow
// on Windows CI. Cap the number of test files running at once to bound
// child-process contention and give each case more headroom (the root config
// handles Windows similarly) — otherwise cases routinely exceed the timeout and
// flake. The cap stays at 2: these forks are CPU-bound (each spawns its own
// vitest), so raising it to 4 oversaturated the 4-vCPU runner — per-case times
// ballooned and `should success with some files` timed out at 120s. oxc lowered
// the per-fork loader startup tax but not this CPU contention.
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
