import { defineProject, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineProject({
  test: {
    testTimeout: 20000,
    // mm.cluster boots a real master/agent/worker tree in beforeAll, which
    // can exceed 20s on slow Windows CI runners (same budget as schedule)
    hookTimeout: 60000,
    include: ['test/**/*.test.ts'],
    exclude: ['test/fixtures/**', 'test/bench/**', '**/node_modules/**', '**/dist/**'],
  },
});

export default config;
