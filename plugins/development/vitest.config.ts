import { defineProject, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineProject({
  test: {
    testTimeout: 20000,
    include: ['test/**/*.test.ts'],
    exclude: ['test/fixtures/**', 'test/bench/**', '**/node_modules/**', '**/dist/**'],
  },
});

export default config;
