import { defineProject, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineProject({
  test: {
    // app.ready() loads 5 plugins and can take >10s under heavy parallel load
    hookTimeout: 30000,
  },
});

export default config;
