import { defineProject, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineProject({
  test: {
    // Reuse a single worker thread across test files in this project (no
    // per-file isolation) to speed up the suite. Pairs with pool: 'threads';
    // the root vitest.config.ts cannot set these for glob-matched projects.
    pool: 'threads',
    isolate: false,
  },
});

export default config;
