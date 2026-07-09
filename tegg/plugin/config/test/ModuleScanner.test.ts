import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ModuleScanner } from '../src/lib/ModuleScanner.ts';
import { getFixtures } from './utils.ts';

describe('plugin/config/test/ModuleScanner.test.ts', () => {
  it('should scan module plugins from every framework layer', () => {
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
});
