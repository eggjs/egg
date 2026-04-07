import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const workspacePath = (rel: string) => path.resolve(fileURLToPath(new URL('.', import.meta.url)), rel);

export default defineConfig({
  resolve: {
    // Use array form so more specific subpath aliases win over package root aliases.
    alias: [
      // In the tegg monorepo, many workspace packages point "main" to dist/ which doesn't exist in-source.
      // Alias to source entrypoints so Vitest/Vite can resolve them.
      // Important: subpath imports like "@eggjs/tegg-types/common" must resolve too.
      { find: /^@eggjs\/tegg-types\/(.*)$/, replacement: workspacePath('../types/src/$1') },
      { find: '@eggjs/tegg-types', replacement: workspacePath('../types/src/index.ts') },

      { find: '@eggjs/core-decorator', replacement: workspacePath('../core-decorator/src/index.ts') },
      { find: '@eggjs/tegg-common-util', replacement: workspacePath('../common-util/src/index.ts') },
    ],
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Register TS loader (ts-node) before tests so Egg can load .ts via Module._extensions.
    setupFiles: ['test/setup.ts'],
    // Custom runner for tegg context injection via enterWith + held beginModuleScope.
    runner: './src/runner.ts',
  },
});
