import { defineProject, type UserProjectConfigExport } from 'vitest/config';

const config: UserProjectConfigExport = defineProject({
  test: {
    include: ['test/**/*.test.ts'],
  },
});

export default config;
