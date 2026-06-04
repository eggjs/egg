import { defineProject, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineProject({
  test: {
    pool: 'threads',
    isolate: false,
  },
});

export default config;
