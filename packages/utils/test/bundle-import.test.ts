import { strict as assert } from 'node:assert';
import path from 'node:path';

import { afterEach, describe, it } from 'vitest';

import { importModule, setBundleModuleLoader } from '../src/import.ts';
import { getFilepath } from './helper.ts';

describe('test/bundle-import.test.ts', () => {
  afterEach(() => {
    setBundleModuleLoader(undefined);
  });

  it('returns the real module when no bundle loader is registered', async () => {
    const result = await importModule(getFilepath('esm'));
    assert.ok(result);
    assert.equal(typeof result, 'object');
  });

  it('intercepts importModule with the registered loader', async () => {
    const seen: string[] = [];
    const fakeModule = { default: { hello: 'bundle' }, other: 'stuff' };
    setBundleModuleLoader((p) => {
      seen.push(p);
      if (p.endsWith('/fixtures/esm')) return fakeModule;
    });

    const result = await importModule(getFilepath('esm'));
    assert.deepEqual(result, fakeModule);
    assert.ok(seen.some((p) => p.endsWith('/fixtures/esm')));
  });

  it('honors importDefaultOnly when the bundle hit has a default key', async () => {
    setBundleModuleLoader(() => ({ default: { greet: 'hi' }, other: 'x' }));

    const result = await importModule(getFilepath('esm'), { importDefaultOnly: true });
    assert.deepEqual(result, { greet: 'hi' });
  });

  it('unwraps __esModule double-default shape', async () => {
    setBundleModuleLoader(() => ({
      default: { __esModule: true, default: { fn: 'bundled' } },
    }));

    const result = await importModule(getFilepath('esm'));
    assert.equal(result.__esModule, true);
    assert.deepEqual(result.default, { fn: 'bundled' });
  });

  it('falls through to normal import when loader returns undefined', async () => {
    setBundleModuleLoader(() => undefined);

    const result = await importModule(getFilepath('esm'));
    assert.ok(result);
    assert.equal(result.default.foo, 'bar');
  });

  it('short-circuits importResolve so bundled paths need not exist on disk', async () => {
    const fakeModule = { virtual: true };
    setBundleModuleLoader((p) => (p === 'virtual/not-on-disk' ? fakeModule : undefined));

    const result = await importModule('virtual/not-on-disk');
    assert.deepEqual(result, fakeModule);
  });

  it('normalizes Windows-style bundle paths before loader lookup', async () => {
    const fakeModule = { windows: true };
    const filepath = getFilepath('esm').split(path.posix.sep).join(path.win32.sep);

    setBundleModuleLoader((p) => (p.endsWith('/fixtures/esm') ? fakeModule : undefined));

    const result = await importModule(filepath);
    assert.deepEqual(result, fakeModule);
  });
});
