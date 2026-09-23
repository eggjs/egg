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
      'typings/**',
      '**/*.d.ts',
    ];
  }

  /**
   * Vitest matches coverage excludes against paths relative to the project root.
   * Convert absolute patterns, expand directory patterns, and normalize separators.
   */
  protected toRelativeExclude(pat: string, base: string): string {
    // Handle negated patterns (e.g. '!src/**')
    const isNegated = pat.startsWith('!');
    const rawPattern = isNegated ? pat.slice(1) : pat;

    const relativePattern = path.isAbsolute(rawPattern) ? path.relative(base, rawPattern) : rawPattern;
    let normalized = relativePattern.replace(/\\/g, '/');
    if (/[\\/]$/.test(rawPattern)) {
      normalized = `${normalized.replace(/\/$/, '')}/**`;
    }
    return isNegated ? `!${normalized}` : normalized;
  }

  protected override async buildVitestConfig(files: string[]): Promise<VitestConfig> {
    const { flags } = this;
    const baseConfig = await super.buildVitestConfig(files);
    const base = flags.base.replace(/\\/g, '/');

    const coverageExcludes = new Set([
      ...(process.env.COV_EXCLUDES?.split(',') ?? []).map((p) => this.toRelativeExclude(p, base)),
      ...this.defaultCoverageExcludes.map((p) => this.toRelativeExclude(p, base)),
      ...Array.from(flags.exclude ?? []).map((p) => this.toRelativeExclude(p, base)),
    ]);

    return {
      ...baseConfig,
      coverage: {
        enabled: true,
        provider: 'v8' as const,
        reporter: ['text-summary', 'json-summary', 'json', 'lcov', 'cobertura'],
        exclude: Array.from(coverageExcludes),
        reportsDirectory: path.join(base, 'coverage'),
      },
    };
  }
}
