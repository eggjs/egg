import path from 'node:path';
import fs from 'node:fs/promises';

import { Flags } from '@oclif/core';
import { importResolve } from '@eggjs/utils';

import Test from './test.ts';
import { type ForkNodeOptions } from '../baseCommand.ts';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export default class Cov<T extends typeof Cov> extends Test<T> {
  static override description = 'Run the test with coverage';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> test/index.test.ts',
    '<%= config.bin %> <%= command.id %> test/index.test.ts,test/user.test.ts,...',
  ];

  static override flags = {
    ...Test.flags,
    // will use on egg-mock https://github.com/eggjs/egg-mock/blob/84a64bd19d0569ec94664c898fb1b28367b95d60/index.js#L7
    prerequire: Flags.boolean({
      description: 'prerequire files for coverage instrument',
    }),
    exclude: Flags.string({
      description: 'coverage ignore, one or more files patterns`',
      multiple: true,
      char: 'x',
    }),
    c8: Flags.string({
      description: 'c8 instruments passthrough`',
      default: '--temp-directory node_modules/.c8_output -r text-summary -r json-summary -r json -r lcov -r cobertura',
    }),
  };

  protected get defaultExcludes() {
    return [
      'example/',
      'examples/',
      'mocks**/',
      'docs/',
      // https://github.com/JaKXz/test-exclude/blob/620a7be412d4fc2070d50f0f63e3228314066fc9/index.js#L73
      'test/**',
      'test{,-*}.js',
      '**/*.test.js',
      '**/__tests__/**',
      '**/node_modules/**',
      'typings',
      '**/*.d.ts',
    ];
  }

  protected override async forkNode(modulePath: string, forkArgs: string[], options: ForkNodeOptions = {}) {
    const { flags } = this;
    if (flags.prerequire) {
      this.env.EGG_BIN_PREREQUIRE = 'true';
    }

    // add c8 args
    // https://github.com/eggjs/egg/issues/3930
    const c8Args = flags.c8.split(' ').filter(a => a.trim());
    if (flags.typescript) {
      this.env.SPAWN_WRAP_SHIM_ROOT = path.join(flags.base, 'node_modules');
      c8Args.push('--extension');
      c8Args.push('.ts');
    }

    const excludes = new Set([
      ...(process.env.COV_EXCLUDES?.split(',') ?? []),
      ...this.defaultExcludes,
      ...Array.from(flags.exclude ?? []),
    ]);
    for (const exclude of excludes) {
      c8Args.push('-x');
      c8Args.push(exclude);
    }
    const c8File = importResolve('c8/bin/c8.js');
    const outputDir = path.join(flags.base, 'node_modules/.c8_output');
    await fs.rm(outputDir, { force: true, recursive: true });
    const coverageDir = path.join(flags.base, 'coverage');
    await fs.rm(coverageDir, { force: true, recursive: true });

    const execArgv = [...this.globalExecArgv, ...(options.execArgv || [])];
    this.globalExecArgv = [];

    // $ c8 node mocha
    await super.forkNode(c8File, [...c8Args, process.execPath, ...execArgv, modulePath, ...forkArgs]);
  }
}
