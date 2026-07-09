import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ModuleScanner } from '../src/lib/ModuleScanner.ts';
import { getFixtures } from './utils.ts';

describe('plugin/config/test/ModuleScanner.test.ts', () => {
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
      expect.stringContaining('Duplicate module name "sharedModule" found while scanning framework modules'),
    ]);
    expect(warnings[0]).toContain(path.join(baseDir, 'node_modules/chair-framework/node_modules/shared-module-chair'));
    expect(warnings[0]).toContain(path.join(baseDir, 'node_modules/base-framework/node_modules/shared-module-base'));
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
});
