import { defineProject, type UserProjectConfigExport } from 'vitest/config';

const config: UserProjectConfigExport = defineProject({
  test: {
    testTimeout: 20000,
  },
});

export default config;
