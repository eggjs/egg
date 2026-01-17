import { defineProject } from 'vite-plus';

export default defineProject({
  test: {
    testTimeout: 20000,
    exclude: ['**/node_modules/**', '**/dist/**', '**/templates/**/test/**'],
  },
});
