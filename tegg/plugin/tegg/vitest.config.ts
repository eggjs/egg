import { defineProject, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineProject({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/fixtures/**', '**/node_modules/**', '**/dist/**'],
    fileParallelism: false,
  },
});

export default config;
