import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

import coffee from 'coffee';
import { afterEach, describe, it } from 'vitest';

import { importModule, importResolve, setBundleModuleLoader } from '../src/import.ts';
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

  it('keeps non-default bundle hits when importDefaultOnly is enabled', async () => {
    const fakeModule = { named: 'bundle' };
    setBundleModuleLoader(() => fakeModule);

    const result = await importModule(getFilepath('esm'), { importDefaultOnly: true });
    assert.deepEqual(result, fakeModule);
  });

  it('keeps null bundle hits when importDefaultOnly is enabled', async () => {
    setBundleModuleLoader(() => null);

    const result = await importModule(getFilepath('esm'), { importDefaultOnly: true });
    assert.equal(result, null);
  });

  it('unwraps __esModule double-default shape', async () => {
    setBundleModuleLoader(() => ({
      default: { __esModule: true, default: { fn: 'bundled' } },
    }));

    const result = await importModule(getFilepath('esm'));
    assert.equal(result.__esModule, true);
    assert.deepEqual(result.default, { fn: 'bundled' });
  });

  it('falls through to native dynamic import when loader returns undefined', async () => {
    await coffee
      .spawn(process.execPath, ['--experimental-strip-types', getFilepath('bundle-native-fallback/run.mjs')])
      .expect('stdout', /bar/)
      .expect('code', 0)
      .end();
  });

  it('does not create the native dynamic import helper at module load time', async () => {
    const importUrl = new URL('../src/import.ts', import.meta.url).href;

    await coffee
      .spawn(process.execPath, [
        '--experimental-strip-types',
        '--disallow-code-generation-from-strings',
        '--input-type=module',
        '--eval',
        `await import(${JSON.stringify(importUrl)});`,
      ])
      .expect('code', 0)
      .end();
  });

  it('reports hardened runtime failures when bundled fallback needs code generation', async () => {
    const importUrl = new URL('../src/import.ts', import.meta.url).href;
    const esmFilepath = getFilepath('esm');

    await coffee
      .spawn(process.execPath, [
        '--experimental-strip-types',
        '--disallow-code-generation-from-strings',
        '--input-type=module',
        '--eval',
        [
          `const { importModule, setBundleModuleLoader } = await import(${JSON.stringify(importUrl)});`,
          'setBundleModuleLoader(() => undefined);',
          `await importModule(${JSON.stringify(esmFilepath)});`,
        ].join('\n'),
      ])
      .expect('stderr', /Native dynamic import fallback for bundled module loader misses requires code generation/)
      .expect('code', 1)
      .end();
  });

  it('hides dynamic import fallback from bundled expression transforms', async () => {
    const source = await fs.readFile(new URL('../src/import.ts', import.meta.url), 'utf8');

    assert.match(source, /new Function\('specifier', 'return import\(specifier\);'\)/);
    assert.match(
      source,
      /\/\* v8 ignore if[^\n]*\*\/\r?\n\s+if \(_bundleModuleLoader\) \{\r?\n\s+obj = await getNativeDynamicImport\(\)\(fileUrl\);/,
    );
  });

  it('serves virtual specifiers from the loader without requiring them on disk', async () => {
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

  it('importResolve returns the path as canonical key for bundle-only modules', () => {
    const seen: string[] = [];
    setBundleModuleLoader((p) => {
      seen.push(p);
      return p === 'virtual/not-on-disk' ? { virtual: true } : undefined;
    });

    // The module is inlined into the bundle and has no source on disk, but the
    // loader recognizes it, so importResolve hands it back unchanged.
    assert.equal(importResolve('virtual/not-on-disk'), 'virtual/not-on-disk');
    assert.ok(seen.includes('virtual/not-on-disk'));
  });

  it('importResolve normalizes Windows-style paths before the bundle lookup', () => {
    setBundleModuleLoader((p) => (p === 'virtual/win/mod' ? { windows: true } : undefined));

    const filepath = 'virtual/win/mod'.split(path.posix.sep).join(path.win32.sep);
    assert.equal(importResolve(filepath), filepath);
  });

  it('importResolve does not consult the loader once on-disk resolution succeeds', () => {
    let called = false;
    setBundleModuleLoader(() => {
      called = true;
      return { hit: true };
    });

    const resolved = importResolve(getFilepath('esm'));
    assert.match(resolved, /[\\/]fixtures[\\/]esm[\\/]index\.js$/);
    assert.equal(called, false);
  });

  it('importResolve still throws for missing modules when no loader is registered', () => {
    assert.throws(() => importResolve('virtual/not-on-disk'));
  });
});
