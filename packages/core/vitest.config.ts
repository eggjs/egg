import { defineProject, type UserProjectConfigExport } from 'vitest/config';

const config: UserProjectConfigExport = {
  test: {
    testTimeout: 10000,
    include: ['test/**/*.test.ts'],
    exclude: ['test/fixtures/**', 'test/benchmark/**', '**/node_modules/**', '**/dist/**'],
  },
};

const exportedConfig: UserProjectConfigExport = defineProject(config);
export default exportedConfig;
