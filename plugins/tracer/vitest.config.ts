import { defineProject, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineProject({
  test: {
    // Reuse a single worker thread across this project's test files instead of
    // spawning a fresh worker per file. The root vitest.config.ts cannot set
    // these for glob-matched projects, so each project opts in explicitly.
    pool: 'threads',
    isolate: false,
  },
});

export default config;
