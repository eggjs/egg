import fs from 'node:fs/promises';
import path from 'node:path';
import { debuglog } from 'node:util';

import { importResolve, detectType, EggType, ImportResolveError } from '@eggjs/utils';
import { Args, Flags } from '@oclif/core';
// @ts-expect-error no types
import ciParallelVars from 'ci-parallel-vars';
import globby from 'globby';
import { getChangedFilesForRoots } from 'jest-changed-files';
import { startVitest } from 'vitest/node';
import type { InlineConfig as VitestConfig } from 'vitest/node';

import { BaseCommand, ForkError } from '../baseCommand.ts';

const debug = debuglog('egg/bin/commands/test');

export default class Test<T extends typeof Test> extends BaseCommand<T> {
  static override args = {
    file: Args.string({
      description: 'file(s) to test',
    }),
  };

  static override description = 'Run the test';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> test/index.test.ts',
    '<%= config.bin %> <%= command.id %> test/index.test.ts,test/user.test.ts,...',
    '<%= config.bin %> <%= command.id %> --json',
    '<%= config.bin %> <%= command.id %> --log-level debug',
  ];

  static override flags = {
    bail: Flags.boolean({
      description: 'abort ("bail") after first test failure',
      default: false,
      char: 'b',
    }),
    timeout: Flags.integer({
      char: 't',
      description: 'set test-case timeout in milliseconds',
      default: parseInt(process.env.TEST_TIMEOUT ?? '60000'),
    }),
    'no-timeout': Flags.boolean({
      description: 'disable timeout',
    }),
    grep: Flags.string({
      char: 'g',
      description: 'only run tests matching <pattern>',
    }),
    changed: Flags.boolean({
      description: 'only test with changed files and match test/**/*.test.(js|ts)',
      char: 'c',
    }),
    watch: Flags.boolean({
      description: 'run tests in watch mode',
      default: false,
      char: 'w',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = this;

    try {
      await fs.access(flags.base);
    } catch (err) {
      console.error('baseDir: %o not exists', flags.base);
      throw err;
    }

    // set NODE_ENV=test, let egg application load unittest logic
    // https://eggjs.org/basics/env#difference-from-node_env
    process.env.NODE_ENV = 'test';

    if (flags['no-timeout']) {
      flags.timeout = 0;
    }

    const ext = flags.typescript ? 'ts' : 'js';
    let pattern = this.args.file ? this.args.file.split(',') : [];

    // changed
    if (flags.changed) {
      pattern = await this.getChangedTestFiles(flags.base, ext);
      if (!pattern.length) {
        console.log('No changed test files');
        return;
      }
      debug('changed files: %o', pattern);
    }

    if (!pattern.length && process.env.TESTS) {
      pattern = process.env.TESTS.split(',');
    }

    // collect test files when nothing is changed
    if (!pattern.length) {
      pattern = [`test/**/*.test.${ext}`];
    }

    // expand glob and skip node_modules and fixtures
    let files = globby.sync(pattern, { cwd: flags.base });
    files.sort();

    if (files.length === 0) {
      console.log('No test files found with pattern %o', pattern);
      return;
    }

    // split up test files in parallel CI jobs
    if (ciParallelVars) {
      const { index: currentIndex, total: totalRuns } = ciParallelVars as {
        index: number;
        total: number;
      };
      const fileCount = files.length;
      const each = Math.floor(fileCount / totalRuns);
      const remainder = fileCount % totalRuns;
      const offset = Math.min(currentIndex, remainder) + currentIndex * each;
      const currentFileCount = each + (currentIndex < remainder ? 1 : 0);
      files = files.slice(offset, offset + currentFileCount);
      console.log(
        '# Split test files in parallel CI jobs: %d/%d, files: %d/%d',
        currentIndex + 1,
        totalRuns,
        files.length,
        fileCount,
      );
    }

    // convert to absolute paths relative to base
    // vitest include patterns require forward slashes, even on Windows
    files = files.map((f) => {
      const abs = path.isAbsolute(f) ? f : path.join(flags.base, f);
      return abs.replace(/\\/g, '/');
    });

    // expose timeout to test fixtures (e.g. for testing timeout behavior)
    process.env.EGG_BIN_TIMEOUT = String(flags.timeout);

    debug('run test with vitest, files: %o, flags: %o', files, flags);
    const config = await this.buildVitestConfig(files);

    if (flags['dry-run']) {
      console.log('vitest config: %o', config);
      return;
    }

    // Propagate NODE_OPTIONS from this.env to process.env so vitest fork
    // workers inherit them (e.g. ts-node/esm loader for TypeScript support).
    // Also disable Node.js native type stripping when TypeScript loader is active,
    // because native type stripping can't handle decorators and runs before
    // custom ESM loaders like ts-node/esm.
    if (this.env.NODE_OPTIONS) {
      let nodeOptions = this.env.NODE_OPTIONS;
      if (flags.typescript && !nodeOptions.includes('--no-experimental-strip-types')) {
        nodeOptions = `--no-experimental-strip-types ${nodeOptions}`;
      }
      process.env.NODE_OPTIONS = nodeOptions;
    }

    // pass configFile:false as vite override to prevent vitest from walking up
    // the directory tree and picking up a parent vitest.config.ts
    const vitest = await startVitest('test', [], config, { configFile: false } as Record<string, unknown>);
    if (!vitest) {
      throw new ForkError('vitest failed to start', 1);
    }

    if (flags.watch) {
      // In watch mode, vitest keeps running until user terminates
      return;
    }

    const failed = vitest.state.getCountOfFailedTests() ?? 0;
    await vitest.close();
    if (failed > 0) {
      throw new ForkError('tests failed', 1);
    }
  }

  protected async buildVitestConfig(files: string[]): Promise<VitestConfig> {
    const { flags } = this;
    const ext = flags.typescript ? 'ts' : 'js';
    const setupFiles: string[] = [];

    // auto add setup file as first setup file
    const setupFile = path.join(flags.base, `test/.setup.${ext}`);
    try {
      await fs.access(setupFile);
      setupFiles.push(setupFile.replace(/\\/g, '/'));
    } catch {
      // ignore
    }

    // add user-defined requires/imports
    const requires = await this.formatRequires();
    setupFiles.push(...requires);

    // auto add @eggjs/mock/setup_vitest for egg applications
    const eggType = await detectType(flags.base);
    debug('eggType: %s', eggType);
    if (eggType === EggType.application) {
      try {
        const mockSetup = importResolve('@eggjs/mock/setup_vitest', {
          paths: [flags.base],
        });
        setupFiles.push(mockSetup);
        debug('auto add @eggjs/mock/setup_vitest: %o', mockSetup);
      } catch (err) {
        if (!(err instanceof ImportResolveError)) throw err;
        debug('skip @eggjs/mock/setup_vitest: @eggjs/mock not installed');
      }
    }

    // auto detect @eggjs/tegg-vitest/runner
    // Try resolving from the project first, then from egg-bin's own dependencies.
    // This ensures tegg context injection works even when the project doesn't
    // explicitly depend on @eggjs/tegg-vitest (e.g. cnpmcore).
    let runner: string | undefined;
    for (const resolveFrom of [flags.base, import.meta.dirname]) {
      try {
        runner = importResolve('@eggjs/tegg-vitest/runner', {
          paths: [resolveFrom],
        });
        debug('auto use @eggjs/tegg-vitest/runner from %s: %o', resolveFrom, runner);
        break;
      } catch (err) {
        if (!(err instanceof ImportResolveError)) throw err;
      }
    }
    if (!runner) {
      debug('skip @eggjs/tegg-vitest/runner: not resolvable');
    }

    return {
      root: flags.base,
      include: files,
      exclude: ['**/test/fixtures/**', '**/test/node_modules/**', '**/node_modules/**'],
      testTimeout: flags.timeout,
      testNamePattern: flags.grep,
      bail: flags.bail ? 1 : 0,
      setupFiles,
      runner,
      reporters: [process.env.TEST_REPORTER ?? 'default'],
      pool: 'forks',
      fileParallelism: process.env.EGG_FILE_PARALLELISM !== 'false',
      // vitest 4 moved poolOptions to top-level
      execArgv: [...this.globalExecArgv],
      watch: flags.watch,
      // inject vitest globals (describe, it, expect, beforeAll, etc.) so plain JS test files work without imports
      globals: true,
      // Inline all non-vitest node_modules so dynamic import() calls within
      // dependencies go through vitest's module system. Without this, packages like
      // @eggjs/tegg-loader use native import() which creates separate module instances,
      // breaking class identity checks (e.g. tegg's getEggObject(MyClass) won't find
      // the prototype). @vitest/* packages are excluded to avoid breaking the V8
      // coverage inspector session.
      server: {
        deps: {
          inline: [/^(?!.*@vitest)/],
        },
      },
    };
  }

  protected async getChangedTestFiles(dir: string, ext: string): Promise<string[]> {
    const res = await getChangedFilesForRoots([path.join(dir, 'test')], {});
    const changedFiles = res.changedFiles;
    const files: string[] = [];
    for (let cf of changedFiles) {
      // only find test/**/*.test.(js|ts)
      if (cf.endsWith(`.test.${ext}`)) {
        // Patterns MUST use forward slashes (not backslashes)
        // This should be converted on Windows
        if (process.platform === 'win32') {
          cf = cf.replace(/\\/g, '/');
        }
        files.push(cf);
      }
    }
    return files;
  }
}
