import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ModuleScanner } from '../src/lib/ModuleScanner.ts';
import { getFixtures } from './utils.ts';

describe('plugin/config/test/ModuleScanner.test.ts', () => {
  it('should scan module plugins from every framework layer', () => {
    const baseDir = getFixtures('framework-chain/app');
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
