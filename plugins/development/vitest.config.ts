import { defineProject, type UserWorkspaceConfig } from '@voidzero-dev/vite-plus';

const config: UserWorkspaceConfig = defineProject({
  test: {
    testTimeout: 20000,
    hookTimeout: 20000,
    include: ['test/**/*.test.ts'],
    exclude: ['test/fixtures/**', 'test/bench/**', '**/node_modules/**', '**/dist/**'],
  },
});

export default config;
