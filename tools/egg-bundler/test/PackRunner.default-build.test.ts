import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PackRunner } from '../src/lib/PackRunner.ts';

// PackRunner's DEFAULT_BUILD_FUNC uses `createRequire(import.meta.url).require('@utoo/pack/cjs/commands/build.js')`,
// which bypasses vitest's ESM module interception. Poison the CJS require cache
// instead so the real `@utoo/pack` code never runs.
const requireFromPackRunner = createRequire(new URL('../src/lib/PackRunner.ts', import.meta.url));
const buildModulePath = requireFromPackRunner.resolve('@utoo/pack/cjs/commands/build.js');

describe('PackRunner.DEFAULT_BUILD_FUNC', () => {
  const originalCacheEntry = requireFromPackRunner.cache[buildModulePath];
  const mockBuild = vi.fn(async () => undefined);

  beforeEach(() => {
    mockBuild.mockClear();
    requireFromPackRunner.cache[buildModulePath] = {
      id: buildModulePath,
      filename: buildModulePath,
      loaded: true,
      exports: { build: mockBuild },
    } as unknown as NodeJS.Require['cache'][string];
  });

  afterEach(() => {
    if (originalCacheEntry) {
      requireFromPackRunner.cache[buildModulePath] = originalCacheEntry;
    } else {
      delete requireFromPackRunner.cache[buildModulePath];
    }
  });

  it('passes wrapped { config } to @utoo/pack build with projectPath and rootPath', async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pack-runner-default-'));
    try {
      const runner = new PackRunner({
        entries: [{ name: 'worker', filepath: '/tmp/entry.ts' }],
        outputDir,
        externals: { egg: 'egg' },
        projectPath: '/tmp/proj',
        rootPath: '/tmp/root',
      });

      await runner.run();

      expect(mockBuild).toHaveBeenCalledTimes(1);
      const call = mockBuild.mock.calls[0] as unknown as [
        { config: { entry: unknown[]; target: string } },
        string,
        string,
      ];
      const [firstArg, projectArg, rootArg] = call;
      expect(firstArg).toHaveProperty('config');
      expect(firstArg.config.entry).toHaveLength(1);
      expect(firstArg.config.target).toBe('node 22');
      expect(projectArg).toBe('/tmp/proj');
      expect(rootArg).toBe('/tmp/root');
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });
});
