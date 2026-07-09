import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ModuleScanner } from '../src/lib/ModuleScanner.js';
import { getFixtures } from './utils.js';

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
      expect.stringContaining('Duplicate module name "sharedModule" found while scanning module references'),
    ]);
    expect(warnings[0]).toContain(path.join(baseDir, 'node_modules/chair-framework/node_modules/shared-module-chair'));
    expect(warnings[0]).toContain(path.join(baseDir, 'node_modules/base-framework/node_modules/shared-module-base'));
  });

  it('should keep the first app reference when one scan root has duplicate module names', () => {
    const baseDir = getFixtures('app-duplicate-name-first-wins/app');
    const warnings: string[] = [];
    const refs = new ModuleScanner(baseDir, {}, { warn: (message) => warnings.push(message) }).loadModuleReferences();

    expect(refs).toHaveLength(1);
    expect(refs[0].name).toBe('sharedModule');
    expect(['near-module', 'far-module']).toContain(refs[0].package);
    expect([path.join(baseDir, 'node_modules/near-module'), path.join(baseDir, 'node_modules/far-module')]).toContain(
      refs[0].path,
    );
    expect(warnings).toEqual([
      expect.stringContaining('Duplicate module name "sharedModule" found while scanning module references'),
    ]);
    expect(warnings[0]).toContain(`keep ${refs[0].path}`);
    expect(warnings[0]).toContain(
      `skip ${
        refs[0].package === 'near-module'
          ? path.join(baseDir, 'node_modules/far-module')
          : path.join(baseDir, 'node_modules/near-module')
      }`,
    );
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
});
