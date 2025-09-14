import { ForkOptions } from 'node:child_process';
import coffee from 'coffee';

export default {
  fork(modulePath: string, args: string[], options: ForkOptions = {}) {
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
      ...options.env,
    };
    // console.error('fork env: %o', options.env);
    return coffee.fork(modulePath, args, options);
  },
};
