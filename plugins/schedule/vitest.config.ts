import { defineProject, type UserProjectConfigExport } from 'vitest/config';

const config: UserProjectConfigExport = defineProject({
  test: {
    testTimeout: 20000,
    hookTimeout: 20000,
    include: ['test/**/*.test.ts'],
  },
});

export default config;
