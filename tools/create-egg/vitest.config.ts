import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    pool: 'threads',
    isolate: false,
    testTimeout: 20000,
    exclude: ['**/node_modules/**', '**/dist/**', '**/templates/**/test/**'],
  },
});
