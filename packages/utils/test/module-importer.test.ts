import { strict as assert } from 'node:assert';

import type {} from '@eggjs/typings/global';
import { afterEach, describe, it } from 'vitest';

import { importModule } from '../src/import.ts';
import { getFilepath } from './helper.ts';

describe('test/module-importer.test.ts', () => {
  afterEach(() => {
    globalThis.__EGG_MODULE_IMPORTER__ = undefined;
  });

  it('returns the real module when no importer is registered', async () => {
    const result = await importModule(getFilepath('esm'));
    assert.ok(result);
    assert.equal(typeof result, 'object');
  });

  it('intercepts importModule with the registered async importer', async () => {
    const seen: string[] = [];
    const fakeModule = { default: { hello: 'importer' }, other: 'stuff' };
    globalThis.__EGG_MODULE_IMPORTER__ = async (p: string) => {
      seen.push(p);
      return fakeModule;
    };

    const result = await importModule(getFilepath('esm'));
    assert.deepEqual(result, fakeModule);
    assert.ok(seen.some((p) => /[\\/]fixtures[\\/]esm[\\/]index\.js$/.test(p)));
  });

  it('honors importDefaultOnly when the importer result has a default key', async () => {
    globalThis.__EGG_MODULE_IMPORTER__ = async () => ({ default: { greet: 'hi' }, other: 'x' });

    const result = await importModule(getFilepath('esm'), { importDefaultOnly: true });
    assert.deepEqual(result, { greet: 'hi' });
  });

  it('unwraps the __esModule double-default shape', async () => {
    globalThis.__EGG_MODULE_IMPORTER__ = async () => ({
      default: { __esModule: true, default: { fn: 'imported' } },
    });

    const result = await importModule(getFilepath('esm'));
    assert.equal(result.__esModule, true);
    assert.deepEqual(result.default, { fn: 'imported' });
  });

  it('takes precedence over the native dynamic import', async () => {
    globalThis.__EGG_MODULE_IMPORTER__ = async () => ({ fromImporter: true });

    const result = await importModule(getFilepath('esm'));
    assert.deepEqual(result, { fromImporter: true });
  });
});
