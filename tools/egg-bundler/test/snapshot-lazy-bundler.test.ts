import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SNAPSHOT_PRELUDE_MARKER } from '../src/lib/prelude.ts';

const mocks = vi.hoisted(() => ({
  manifestLoad: vi.fn(async () => undefined),
  externalsResolve: vi.fn(async () => ({}) as Record<string, string>),
  entryGenerate: vi.fn(async () => ({
    entries: [] as Array<{ name: 'worker' | 'app_worker' | 'agent_worker'; filepath: string }>,
    entryDir: '',
  })),
}));

const MANIFEST = {
  version: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  invalidation: {
    lockfileFingerprint: '',
    configFingerprint: '',
    serverEnv: 'prod',
    serverScope: '',
    typescriptEnabled: true,
  },
  extensions: {},
  resolveCache: {},
  fileDiscovery: {},
};

vi.mock('../src/lib/ManifestLoader.ts', () => ({
  ManifestLoader: vi.fn().mockImplementation(function () {
    return {
      load: mocks.manifestLoad,
      get manifest() {
        return MANIFEST;
      },
      get store() {
        return {};
      },
      getAllDiscoveredFiles: () => [],
      getTeggDecoratedFiles: () => [],
    };
  }),
}));

vi.mock('../src/lib/ExternalsResolver.ts', () => ({
  ExternalsResolver: vi.fn().mockImplementation(function () {
    return { resolve: mocks.externalsResolve };
  }),
}));

vi.mock('../src/lib/EntryGenerator.ts', () => ({
  EntryGenerator: vi.fn().mockImplementation(function () {
    return { generate: mocks.entryGenerate };
  }),
}));

import { bundle } from '../src/index.ts';

// Synthetic single-file output shaped like @utoo/pack's: bundle IIFE plus an
// externalRequire helper the lazy hook must land in.
const SYNTHETIC_WORKER = [
  '"use strict";',
  'function externalRequire(id, thunk, esm = false) {',
  '  return thunk();',
  '}',
  '((__UTOOPACK__)=>{ /* modules */ })([]);',
  '',
].join('\n');

describe('Bundler snapshot lazy-external wiring', () => {
  let tmpApp: string;
  let tmpOutput: string;

  beforeEach(async () => {
    mocks.manifestLoad.mockClear();
    mocks.externalsResolve.mockClear();
    mocks.externalsResolve.mockResolvedValue({});
    mocks.entryGenerate.mockClear();

    tmpApp = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-snaplazy-app-'));
    tmpOutput = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-snaplazy-out-'));
    const entryDir = path.join(tmpApp, '.egg-bundle', 'entries');
    mocks.entryGenerate.mockResolvedValue({
      entries: [{ name: 'worker', filepath: path.join(entryDir, 'worker.entry.ts') }],
      entryDir,
    });
  });

  afterEach(async () => {
    await fs.rm(tmpApp, { recursive: true, force: true });
    await fs.rm(tmpOutput, { recursive: true, force: true });
  });

  async function writePkg(extra?: Record<string, unknown>) {
    await fs.writeFile(path.join(tmpApp, 'package.json'), JSON.stringify({ name: 'snaplazy-app', ...extra }));
  }

  function buildFuncWriting(content: string) {
    return async () => {
      await fs.writeFile(path.join(tmpOutput, 'worker.js'), content);
    };
  }

  it('injects the lazy hook into externalRequire and keeps the prelude marker', async () => {
    await writePkg();
    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      snapshot: true,
      pack: { buildFunc: buildFuncWriting(SYNTHETIC_WORKER) },
    });

    const worker = await fs.readFile(path.join(tmpOutput, 'worker.js'), 'utf8');
    expect(worker).toContain(SNAPSHOT_PRELUDE_MARKER);
    expect(worker).toContain(
      'if (globalThis.__makeLazyExt && !globalThis.__RUNTIME_REQUIRE && (globalThis.__LAZY_EXT.has(id) || !globalThis.__isBuiltin(id))) return globalThis.__makeLazyExt(id, thunk);',
    );
    // prelude (with __LAZY_EXT) precedes the bundle IIFE — fail closed if either marker is absent
    const lazyExtIndex = worker.indexOf('globalThis.__LAZY_EXT = new Set(');
    const bundleIndex = worker.indexOf('__UTOOPACK__');
    expect(lazyExtIndex).toBeGreaterThanOrEqual(0);
    expect(bundleIndex).toBeGreaterThanOrEqual(0);
    expect(lazyExtIndex).toBeLessThan(bundleIndex);
  });

  it('does not throw on a re-run over already-patched output (idempotent)', async () => {
    await writePkg();
    // Output that already carries the prelude marker + an injected dispatch, as a
    // prior snapshot run would leave it: injectedCount is 0 but it is NOT unpatched.
    const alreadyPatched = [
      '"use strict";',
      '// marker: @eggjs/egg-bundler:snapshot-prelude',
      'function externalRequire(id, thunk, esm = false) {',
      '  if (globalThis.__makeLazyExt && !globalThis.__RUNTIME_REQUIRE && (globalThis.__LAZY_EXT.has(id) || !globalThis.__isBuiltin(id))) return globalThis.__makeLazyExt(id, thunk);',
      '  return thunk();',
      '}',
      '((__UTOOPACK__)=>{})([]);',
      '',
    ].join('\n');
    await expect(
      bundle({
        baseDir: tmpApp,
        outputDir: tmpOutput,
        snapshot: true,
        pack: { buildFunc: buildFuncWriting(alreadyPatched) },
      }),
    ).resolves.toBeDefined();
  });

  it('keeps the default network-stack ids external in the bundle manifest', async () => {
    await writePkg();
    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      snapshot: true,
      pack: { buildFunc: buildFuncWriting(SYNTHETIC_WORKER) },
    });

    const manifest = JSON.parse(await fs.readFile(path.join(tmpOutput, 'bundle-manifest.json'), 'utf8'));
    for (const id of ['http', 'https', 'http2', 'node:http', 'node:tls', 'node:dns']) {
      expect(manifest.externals).toContain(id);
    }
  });

  it('merges app egg.snapshot.lazyModules into __LAZY_EXT and externals', async () => {
    await writePkg({ egg: { snapshot: { lazyModules: ['leoric', '@elastic/elasticsearch'] } } });
    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      snapshot: true,
      pack: { buildFunc: buildFuncWriting(SYNTHETIC_WORKER) },
    });

    const worker = await fs.readFile(path.join(tmpOutput, 'worker.js'), 'utf8');
    expect(worker).toContain('"leoric"');
    expect(worker).toContain('"@elastic/elasticsearch"');

    const manifest = JSON.parse(await fs.readFile(path.join(tmpOutput, 'bundle-manifest.json'), 'utf8'));
    expect(manifest.externals).toContain('leoric');
    expect(manifest.externals).toContain('@elastic/elasticsearch');
  });

  it('bundles resolvable Leoric and installs its runtime-require source transform in snapshot mode', async () => {
    await writePkg();
    const leoricDir = path.join(tmpApp, 'node_modules', 'leoric');
    await fs.mkdir(leoricDir, { recursive: true });
    await fs.writeFile(path.join(leoricDir, 'package.json'), JSON.stringify({ name: 'leoric', main: 'index.js' }));
    await fs.writeFile(path.join(leoricDir, 'index.js'), 'module.exports = class Realm {};\n');
    mocks.externalsResolve.mockResolvedValue({ leoric: 'leoric', other: 'other' });

    let packConfig: Record<string, any> | undefined;
    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      snapshot: true,
      pack: {
        buildFunc: async (wrapped) => {
          packConfig = (wrapped as { config: Record<string, any> }).config;
          await fs.writeFile(path.join(tmpOutput, 'worker.js'), SYNTHETIC_WORKER);
        },
      },
    });

    expect(packConfig?.externals.leoric).toBeUndefined();
    for (const id of ['mysql', 'mysql2', 'sqlite3', 'pg', 'pg-types', 'sql.js']) {
      expect(packConfig?.externals[id]).toBeUndefined();
    }
    const rule = packConfig?.module.rules['*.js'];
    expect(rule.condition.path).toBeInstanceOf(RegExp);
    expect(rule.loaders[0].loader).toMatch(/compat[\\/]leoric[\\/]runtime-require-loader\.cjs$/);

    const manifest = JSON.parse(await fs.readFile(path.join(tmpOutput, 'bundle-manifest.json'), 'utf8'));
    expect(manifest.externals).not.toContain('leoric');
    expect(manifest.externals).not.toEqual(
      expect.arrayContaining(['mysql', 'mysql2', 'sqlite3', 'pg', 'pg-types', 'sql.js']),
    );
  });

  it('rejects legacy explicit Leoric external configuration in snapshot mode', async () => {
    await writePkg({ egg: { snapshot: { lazyModules: ['leoric'] } } });
    const leoricDir = path.join(tmpApp, 'node_modules', 'leoric');
    await fs.mkdir(leoricDir, { recursive: true });
    await fs.writeFile(path.join(leoricDir, 'package.json'), JSON.stringify({ name: 'leoric', main: 'index.js' }));
    await fs.writeFile(path.join(leoricDir, 'index.js'), 'module.exports = class Realm {};\n');

    await expect(
      bundle({
        baseDir: tmpApp,
        outputDir: tmpOutput,
        snapshot: true,
        pack: { buildFunc: buildFuncWriting(SYNTHETIC_WORKER) },
      }),
    ).rejects.toThrow(/remove it from egg\.snapshot\.lazyModules/);

    await writePkg();
    await expect(
      bundle({
        baseDir: tmpApp,
        outputDir: tmpOutput,
        snapshot: true,
        externals: { force: ['leoric'] },
        pack: { buildFunc: buildFuncWriting(SYNTHETIC_WORKER) },
      }),
    ).rejects.toThrow(/remove it from externals\.force/);
  });

  it('does not lazy-externalize or inject when snapshot mode is off', async () => {
    await writePkg();
    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      pack: { singleFile: true, buildFunc: buildFuncWriting(SYNTHETIC_WORKER) },
    });

    const worker = await fs.readFile(path.join(tmpOutput, 'worker.js'), 'utf8');
    expect(worker).toBe(SYNTHETIC_WORKER);
    const manifest = JSON.parse(await fs.readFile(path.join(tmpOutput, 'bundle-manifest.json'), 'utf8'));
    expect(manifest.externals).not.toContain('http');
  });

  it('fails loud when externalRequire is emitted but its signature does not match', async () => {
    await writePkg();
    // A helper present (so sawExternalRequire is true) but with a one-param shape the
    // injection regex (which needs id + thunk) cannot match -> must throw, not produce
    // a silently-broken snapshot.
    const unpatchable = '"use strict";\nfunction externalRequire(id) { return id; }\n((__UTOOPACK__)=>{})([]);\n';
    await expect(
      bundle({
        baseDir: tmpApp,
        outputDir: tmpOutput,
        snapshot: true,
        pack: { buildFunc: buildFuncWriting(unpatchable) },
      }),
    ).rejects.toThrow(/lazy hook could not be injected/);
  });
});
