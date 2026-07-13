import fs from 'node:fs';
import path from 'node:path';
import { mock } from 'node:test';

import { afterEach, describe, expect, it } from 'vitest';

import { ModuleScanner } from '../src/lib/ModuleScanner.js';
import { getFixtures } from './utils.js';

describe('plugin/config/test/ModuleScanner.test.ts', () => {
  afterEach(() => mock.reset());

  it('should scan module plugins from every framework layer and keep nearest duplicate names', () => {
    const baseDir = getFixtures('framework-chain/app');
    const warnings: string[] = [];
    const refs = new ModuleScanner(baseDir, {}).loadModuleReferences();

    expect(refs).toEqual([
      {
        name: 'chairModule',
        package: 'chair-module',
        path: path.join(baseDir, 'node_modules/chair-framework/node_modules/chair-module'),
        optional: true,
      },
      {
        name: 'sharedModule',
        package: 'shared-module-chair',
        path: path.join(baseDir, 'node_modules/chair-framework/node_modules/shared-module-chair'),
        optional: true,
      },
      {
        name: 'baseModule',
        package: 'base-module',
        path: path.join(baseDir, 'node_modules/base-framework/node_modules/base-module'),
        optional: true,
      },
    ]);

    const refsWithLogger = new ModuleScanner(
      baseDir,
      {},
      { warn: (message) => warnings.push(message) },
    ).loadModuleReferences();
    expect(refsWithLogger).toEqual(refs);
    expect(warnings).toEqual([
      expect.stringContaining('Duplicate module name "sharedModule" found while scanning module references'),
    ]);
    expect(warnings[0]).toContain(path.join(baseDir, 'node_modules/chair-framework/node_modules/shared-module-chair'));
    expect(warnings[0]).toContain(path.join(baseDir, 'node_modules/base-framework/node_modules/shared-module-base'));
  });

  it('should reject duplicate module names within one scan root', () => {
    const baseDir = getFixtures('app-duplicate-name-first-wins/app');
    const warnings: string[] = [];
    expect(() =>
      new ModuleScanner(baseDir, {}, { warn: (message) => warnings.push(message) }).loadModuleReferences(),
    ).toThrow(`Duplicate module name "sharedModule" found: existing at`);
    expect(warnings).toEqual([]);
  });

  it('should keep the app reference when a framework scans the same module path', () => {
    const baseDir = getFixtures('framework-same-path/app');
    const warnings: string[] = [];
    const refs = new ModuleScanner(baseDir, {}, { warn: (message) => warnings.push(message) }).loadModuleReferences();

    expect(refs).toEqual([
      {
        name: 'chairModule',
        package: 'chair-module',
        path: path.join(baseDir, 'node_modules/chair-framework/node_modules/chair-module'),
      },
    ]);
    expect(warnings).toEqual([]);
  });

  it('should keep the app module over a different framework path and warn', () => {
    const baseDir = getFixtures('app-framework-conflict/app');
    const warnings: string[] = [];
    const refs = new ModuleScanner(baseDir, {}, { warn: (message) => warnings.push(message) }).loadModuleReferences();

    expect(refs).toEqual([
      {
        name: 'sharedModule',
        package: 'app-shared',
        path: path.join(baseDir, 'modules/app-shared'),
      },
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(`keep ${path.join(baseDir, 'modules/app-shared')}`);
    expect(warnings[0]).toContain(`skip ${path.join(baseDir, 'chair-framework/modules/framework-shared')}`);
  });

  it('should silently merge app and framework paths resolving to the same realpath through the public entry', () => {
    const baseDir = getFixtures('app-framework-conflict/app');
    const appModulePath = path.join(baseDir, 'modules/app-shared');
    const frameworkModulePath = path.join(baseDir, 'chair-framework/modules/framework-shared');
    const warnings: string[] = [];
    const originalRealpath = fs.realpathSync.bind(fs);
    mock.method(fs, 'realpathSync', (target: fs.PathLike) => {
      if (target === frameworkModulePath) return appModulePath;
      return originalRealpath(target);
    });

    const refs = new ModuleScanner(baseDir, {}, { warn: (message) => warnings.push(message) }).loadModuleReferences();

    expect(refs).toEqual([{ name: 'sharedModule', package: 'app-shared', path: appModulePath }]);
    expect(warnings).toEqual([]);
  });

  it('should silently merge layered symlink paths resolving to the same realpath', () => {
    const warnings: string[] = [];
    const scanner = new ModuleScanner(
      getFixtures('framework-chain/app'),
      {},
      {
        warn: (message) => warnings.push(message),
      },
    );
    const originalRealpath = fs.realpathSync.bind(fs);
    mock.method(fs, 'realpathSync', (target: fs.PathLike) => {
      if (target === '/symlink/near' || target === '/symlink/far') return '/real/shared-module';
      return originalRealpath(target);
    });

    const refs = (scanner as any).deduplicateLayeredModuleReferences([
      [{ name: 'sharedModule', path: '/symlink/near' }],
      [{ name: 'sharedModule', path: '/symlink/far', optional: true }],
    ]);

    expect(refs).toEqual([{ name: 'sharedModule', path: '/symlink/near' }]);
    expect(warnings).toEqual([]);
  });

  it('should resolve framework module.json package references from the framework directory', () => {
    const baseDir = getFixtures('framework-module-json/app');
    const refs = new ModuleScanner(baseDir, { cwd: baseDir }).loadModuleReferences();

    expect(refs).toEqual([
      {
        name: 'frameworkConfigModule',
        package: 'framework-config-module',
        path: path.join(baseDir, 'node_modules/chair-framework/node_modules/framework-config-module'),
        optional: true,
      },
    ]);
  });

  it('should apply auto outDir exclusion only to the app scan', () => {
    const baseDir = getFixtures('framework-dist-scan/app');
    const refs = new ModuleScanner(baseDir, {}, undefined, {
      extraFilePattern: ['!**/dist'],
    }).loadModuleReferences();

    expect(refs).toEqual([
      {
        name: 'frameworkDistModule',
        package: 'framework-dist-module',
        path: path.join(baseDir, 'node_modules/chair-framework/dist/modules/framework-dist-module'),
        optional: true,
      },
    ]);
  });

  it('should stop scanning when framework chain has a cycle', () => {
    const baseDir = getFixtures('framework-cycle/app');
    const refs = new ModuleScanner(baseDir, {}).loadModuleReferences();

    expect(refs).toEqual([
      {
        name: 'chairModule',
        package: 'chair-module',
        path: path.join(baseDir, 'node_modules/chair-framework/node_modules/chair-module'),
        optional: true,
      },
      {
        name: 'baseModule',
        package: 'base-module',
        path: path.join(baseDir, 'node_modules/base-framework/node_modules/base-module'),
        optional: true,
      },
    ]);
  });

  it('should stop a framework cycle reached through different symlink aliases', () => {
    const scanner = new ModuleScanner(getFixtures('framework-cycle/app'), {});
    (scanner as any).resolveFrameworkDir = () => '/alias/framework-a';
    (scanner as any).resolveParentFrameworkDir = (frameworkDir: string) =>
      frameworkDir === '/alias/framework-a' ? '/alias/framework-b' : '/alias/framework-a-again';
    const originalRealpath = fs.realpathSync.bind(fs);
    mock.method(fs, 'realpathSync', (target: fs.PathLike) => {
      if (target === '/alias/framework-a' || target === '/alias/framework-a-again') return '/real/framework-a';
      if (target === '/alias/framework-b') return '/real/framework-b';
      return originalRealpath(target);
    });

    expect((scanner as any).resolveFrameworkDirs()).toEqual(['/alias/framework-a', '/alias/framework-b']);
  });
});
