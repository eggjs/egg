import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';

import type {} from '@eggjs/typings/global';
import coffee from 'coffee';
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

  it('loads a real ESM module through a synchronous require-based importer', async () => {
    // The importer return value is awaited, so a synchronous `require()` (which
    // returns the module synchronously) is a valid importer. require() can load
    // ESM on Node >= 22, which is what the snapshot entry relies on.
    const require = createRequire(import.meta.url);
    let calls = 0;
    globalThis.__EGG_MODULE_IMPORTER__ = ((filepath: string) => {
      calls++;
      return require(filepath);
    }) as typeof globalThis.__EGG_MODULE_IMPORTER__;

    const result = await importModule(getFilepath('esm'));
    assert.equal(calls, 1);
    assert.equal(result.one, 1);
    assert.deepEqual(result.default, { foo: 'bar' });
  });

  it('uses a require-based importer when no dynamic import callback exists', async () => {
    // Reproduces the V8 snapshot-restore environment in a child process: native
    // import() has no host callback, so importModule() must route ESM loading
    // through the require-based __EGG_MODULE_IMPORTER__. See the fixture.
    await coffee
      .spawn(process.execPath, ['--experimental-strip-types', getFilepath('module-importer-require-esm/run.mjs')])
      .expect('stdout', /IMPORTER_REQUIRE_ESM_OK/)
      .expect('code', 0)
      .end();
  });
});
