import path from 'node:path';

import type { Application } from 'egg';
import { afterEach, describe, expect, it } from 'vitest';

import App from '../src/app.ts';
import { getFixtures } from './utils.ts';

// `app/module-a` is a real tegg module fixture (package.json -> eggModule.name: moduleA).
const baseDir = getFixtures('apps/app-with-modules');
const moduleDir = getFixtures('apps/app-with-modules/app/module-a');

// Build a minimal fake Application that feeds module references straight from a
// tegg manifest extension, mirroring how a bundled worker entry primes the loader
// without running the globby module scan.
function createFakeApp(
  moduleReferences: { name?: string; package?: string; path: string; optional?: boolean }[],
): Application {
  return {
    baseDir,
    config: { tegg: { readModuleOptions: {} } },
    loader: {
      getTypeFiles: () => [],
      outDir: undefined,
      manifest: {
        // Ignore the key: always return the seeded tegg extension.
        getExtension: () => ({ moduleReferences }),
      },
    },
  } as unknown as Application;
}

describe('plugin/config/test/ManifestModuleReference.test.ts', () => {
  afterEach(() => {
    // App's constructor mutates the shared ModuleConfigUtil config names.
    // beforeClose() normally restores it, but these tests never call it.
    return new App(createFakeApp([{ name: 'moduleA', path: moduleDir }])).beforeClose();
  });

  it('resolves a manifest-relative reference path against baseDir (not baseDir/config)', () => {
    // A bundled manifest stores the module path relative to baseDir. The previous
    // `ModuleConfigUtil.resolveModuleDir` would join it under `baseDir/config`,
    // which does not exist; resolving against baseDir directly is what makes the
    // bundled `unitPath` <-> moduleReference contract line up.
    const app = createFakeApp([{ name: 'moduleA', path: 'app/module-a' }]);

    new App(app).configWillLoad();

    expect(app.moduleConfigs).toEqual({
      moduleA: {
        config: {},
        name: 'moduleA',
        reference: {
          optional: undefined,
          name: 'moduleA',
          package: undefined,
          path: moduleDir,
          loaderType: undefined,
        },
      },
    });
    expect(app.moduleConfigs.moduleA.reference.path).toBe(path.resolve(baseDir, 'app/module-a'));
  });

  it('keeps an absolute reference path unchanged (non-bundle behavior)', () => {
    // Non-bundle module references (from ModuleScanner / config/module.json) are
    // already absolute and must be passed through untouched.
    const app = createFakeApp([{ name: 'moduleA', path: moduleDir }]);

    new App(app).configWillLoad();

    expect(app.moduleConfigs.moduleA.reference.path).toBe(moduleDir);
  });
});
