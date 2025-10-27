import { defineProject, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineProject({
  test: {
    testTimeout: 20000,
    hookTimeout: 20000,
    include: ['test/**/*.test.ts'],
  },
});

export default config;
