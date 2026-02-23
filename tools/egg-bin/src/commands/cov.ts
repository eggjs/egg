import path from 'node:path';

import { Flags } from '@oclif/core';
import type { InlineConfig as VitestConfig } from 'vitest/node';

import Test from './test.ts';

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
    exclude: Flags.string({
      description: 'coverage ignore, one or more files patterns',
      multiple: true,
      char: 'x',
    }),
  };

  protected get defaultCoverageExcludes(): string[] {
    return [
      'example/',
      'examples/',
      '**/mocks*/**',
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

  /**
   * Convert a relative exclude pattern to an absolute path pattern.
   * This prevents vitest's picomatch (with contains:true) from matching
   * files in parent directories that happen to share path segments.
   * e.g. 'test/**' should only exclude the project's own test/ dir,
   * not files whose absolute path contains 'test/' from parent dirs.
   */
  protected toAbsoluteExclude(pat: string, base: string): string {
    // Already absolute or starts with ** (position-agnostic) - keep as-is
    if (path.isAbsolute(pat) || pat.startsWith('**')) {
      return pat.replace(/\\/g, '/');
    }
    return path.join(base, pat).replace(/\\/g, '/');
  }

  protected override async buildVitestConfig(files: string[]): Promise<VitestConfig> {
    const { flags } = this;
    const baseConfig = await super.buildVitestConfig(files);
    const base = flags.base.replace(/\\/g, '/');

    const coverageExcludes = new Set([
      ...(process.env.COV_EXCLUDES?.split(',') ?? []).map((p) => this.toAbsoluteExclude(p, base)),
      ...this.defaultCoverageExcludes.map((p) => this.toAbsoluteExclude(p, base)),
      ...Array.from(flags.exclude ?? []).map((p) => this.toAbsoluteExclude(p, base)),
    ]);

    return {
      ...baseConfig,
      coverage: {
        enabled: true,
        provider: 'v8' as const,
        reporter: ['text-summary', 'json-summary', 'json', 'lcov', 'cobertura'],
        exclude: Array.from(coverageExcludes),
        reportsDirectory: path.join(flags.base, 'coverage'),
      },
    };
  }
}
