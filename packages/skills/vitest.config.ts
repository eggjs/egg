import { defineProject, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineProject({
  test: {
    include: ['eval/**/*.{test,eval}.ts'],
    testTimeout: 300_000,
    // 用 child_process.fork 代替 worker_threads, cc 会用到 tty
    pool: 'forks',
  },
});

export default config;
