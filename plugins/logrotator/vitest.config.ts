import { defineProject, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineProject({
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});

export default config;
