import { defineProject, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineProject({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/fixtures/**', 'test/benchmark/**', '**/node_modules/**', '**/dist/**'],
  },
});

export default config;
