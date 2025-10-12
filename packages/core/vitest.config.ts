import { defineProject, type UserProjectConfigExport } from 'vitest/config';

const config: UserProjectConfigExport = {
  test: {
    testTimeout: 10000,
    include: ['test/**/*.test.ts'],
    exclude: ['test/fixtures/**', 'test/benchmark/**', '**/node_modules/**', '**/dist/**'],
  },
};

export default defineProject(config);
