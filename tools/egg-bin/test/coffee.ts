import type { ForkOptions } from 'node:child_process';

import coffee from 'coffee';

const coffeeFork = {
  fork(modulePath: string, args: string[], options: ForkOptions = {}): ReturnType<typeof coffee.fork> {
    options.execArgv = [
      // '--require', 'ts-node/register/transpile-only',
      '--import',
      'ts-node/register/transpile-only',
      '--no-warnings',
      '--loader',
      'ts-node/esm',
      ...(options.execArgv ?? []),
    ];
    options.env = {
      NODE_DEBUG: process.env.NODE_DEBUG,
      PATH: process.env.PATH,
      // Signal to egg-bin's test command that this is running against a
      // self-test fixture — skip auto-detecting mock/tegg-runner via flat-
      // hoisted monorepo dependencies, which would otherwise add ~7s per fork.
      EGG_BIN_SELF_TEST_FIXTURE: '1',
      ...options.env,
    };
    // console.error('fork env: %o', options.env);
    return coffee.fork(modulePath, args, options);
  },
} as const;

export default coffeeFork;
