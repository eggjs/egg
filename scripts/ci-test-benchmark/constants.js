import path from 'node:path';

export const DEFAULT_TOP_LIMIT = 20;
export const DEFAULT_OUTPUT_ROOT = path.join('benchmark', 'ci-test');
export const VITEST_JSON_FILENAME = 'vitest-results.json';
export const REPORT_JSON_FILENAME = 'report.json';
export const REPORT_MARKDOWN_FILENAME = 'report.md';
export const VITEST_JSON_PLACEHOLDER = '{vitestJson}';
export const DEFAULT_COMMAND = [
  'pnpm',
  'exec',
  'vitest',
  'run',
  '--bail',
  '1',
  '--retry',
  '2',
  '--testTimeout',
  '20000',
  '--hookTimeout',
  '20000',
];
