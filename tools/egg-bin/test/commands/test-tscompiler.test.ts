import { describe, expect, it, vi } from 'vitest';

import Test from '../../src/commands/test.ts';
import { getFixtures } from '../helper.ts';

/**
 * Cover the legacy (non-oxc) `--tscompiler` branch in `BaseCommand#afterInit`.
 *
 * The default compiler is now `@oxc-node/core/register`, so the ts-node / swc /
 * esbuild CJS-register path only runs when a compiler is explicitly requested.
 * `--dry-run` exercises that init path in-process (so it is covered) without
 * actually booting a vitest run.
 */
describe('test/commands/test-tscompiler.test.ts', () => {
  const baseDir = getFixtures('example-ts-test');

  it('resolves an explicit non-oxc tscompiler via its CJS register entry', async () => {
    const envSnapshot = { ...process.env };
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });
    try {
      await Test.run(['--base', baseDir, '--typescript', '--tscompiler', '@swc-node/register', '--dry-run']);
    } finally {
      spy.mockRestore();
      // Test.run mutates a few NODE_ENV / EGG_* process.env keys; restore them so
      // the shared (isolate:false) worker stays clean for sibling tests.
      for (const key of Object.keys(process.env)) {
        if (!(key in envSnapshot)) delete process.env[key];
      }
      Object.assign(process.env, envSnapshot);
    }
    // --dry-run prints the resolved vitest config and returns before running.
    expect(logs.join('\n')).toContain('vitest config');
  });
});
