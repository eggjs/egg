import { strict as assert } from 'node:assert';
// oxlint-disable-next-line no-namespace
import * as EggCore from '../src/index.js';
import type { EggAppConfig } from '../src/index.js';

describe('test/index.test.ts', () => {
  it('should expose properties', () => {
    assert(EggCore.EggCore);
    assert(EggCore.EggLoader);
    assert(EggCore.BaseContextClass);
    assert(EggCore.utils);
    console.log(Object.keys(EggCore));
    assert.deepEqual(Object.keys(EggCore), [
      'BaseContextClass',
      'CaseStyle',
      'ClassLoader',
      'Context',
      'ContextLoader',
      'EGG_LOADER',
      'EXPORTS',
      'EggCore',
      'EggLoader',
      'FULLPATH',
      'FileLoader',
      'KoaApplication',
      'KoaContext',
      'KoaRequest',
      'KoaResponse',
      'Lifecycle',
      'Request',
      'Response',
      'Router',
      'Singleton',
      'Timing',
      'sequencify',
      'utils',
    ]);
  });

  it('should expose types', () => {
    const config = {
      coreMiddleware: [],
      middleware: [],
    } as EggAppConfig;
    assert(config.middleware);
    assert(config.coreMiddleware);
  });
});
