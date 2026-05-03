import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { StartupManifest } from '@eggjs/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EntryGenerator } from '../src/lib/EntryGenerator.ts';
import type { ManifestLoader } from '../src/lib/ManifestLoader.ts';

function createFakeLoader(manifest: StartupManifest): ManifestLoader {
  return { load: async () => manifest } as unknown as ManifestLoader;
}

const FROZEN_INVALIDATION = {
  lockfileFingerprint: 'fake-lockfile',
  configFingerprint: 'fake-config',
  serverEnv: 'prod',
  serverScope: '',
  typescriptEnabled: true,
} as const;

function makeManifest(overrides: Partial<StartupManifest> = {}): StartupManifest {
  return {
    version: 1,
    generatedAt: '2026-01-01T00:00:00.000Z',
    invalidation: { ...FROZEN_INVALIDATION },
    extensions: {},
    resolveCache: {},
    fileDiscovery: {},
    ...overrides,
  };
}

function extractImports(workerSource: string): { index: number; specifier: string }[] {
  return [...workerSource.matchAll(/import \* as __m(\d+) from "([^"]+)";/g)].map((m) => ({
    index: Number(m[1]),
    specifier: m[2]!,
  }));
}

describe('EntryGenerator', () => {
  let tmpDir: string;
  const createdDirs: string[] = [];

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-entry-gen-'));
    createdDirs.push(tmpDir);
  });

  afterEach(async () => {
    while (createdDirs.length) {
      const dir = createdDirs.pop()!;
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('writes only worker.entry.ts under <baseDir>/.egg-bundle/entries by default', async () => {
    const gen = new EntryGenerator({
      baseDir: tmpDir,
      manifestLoader: createFakeLoader(makeManifest()),
    });

    const result = await gen.generate();

    expect(result.entryDir).toBe(path.join(tmpDir, '.egg-bundle', 'entries'));
    expect(result.workerEntry).toBe(path.join(result.entryDir, 'worker.entry.ts'));
    await expect(fs.stat(result.workerEntry)).resolves.toBeTruthy();
    await expect(fs.stat(path.join(result.entryDir, 'agent.entry.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('collects fileDiscovery + resolveCache + tegg decoratedFiles and sorts imports by relKey', async () => {
    const manifest = makeManifest({
      fileDiscovery: {
        'app/controller': ['home.ts'],
        'app/service': ['user.ts'],
      },
      resolveCache: {
        'app/extend/context.ts': 'app/extend/context.ts',
      },
      extensions: {
        tegg: {
          moduleDescriptors: [
            {
              unitPath: 'node_modules/@eggjs/fake-module',
              decoratedFiles: ['app/service/UserService.ts'],
            },
          ],
        },
      },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    const imports = extractImports(worker);
    expect(imports.map((i) => i.specifier)).toEqual([
      '../../app/controller/home.ts',
      '../../app/extend/context.ts',
      '../../app/service/user.ts',
      '../../node_modules/@eggjs/fake-module/app/service/UserService.ts',
    ]);
    // __mN indices are contiguous starting from 0 and match sorted order
    expect(imports.map((i) => i.index)).toEqual([0, 1, 2, 3]);
  });

  it('keeps absolute tegg decorated files only when they stay inside baseDir', async () => {
    const unitPath = path.join(tmpDir, 'modules/foo');
    const manifest = makeManifest({
      extensions: {
        tegg: {
          moduleDescriptors: [
            { unitPath, decoratedFiles: ['FooController.ts', '../outside.ts'] },
            { unitPath: path.dirname(tmpDir), decoratedFiles: [path.basename(tmpDir) + '/app/Service.ts'] },
            { unitPath: path.dirname(tmpDir), decoratedFiles: ['other-app/ignored.ts'] },
          ],
        },
      },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    expect(extractImports(worker).map((i) => i.specifier)).toEqual([
      '../../app/Service.ts',
      '../../modules/foo/FooController.ts',
      '../../modules/outside.ts',
    ]);
  });

  it('skips resolveCache entries whose value is null', async () => {
    const manifest = makeManifest({
      resolveCache: {
        'has-value': 'app/real.ts',
        'is-null-entry': null,
      },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    const imports = extractImports(worker);
    expect(imports.length).toBe(1);
    expect(imports[0]!.specifier).toBe('../../app/real.ts');
    expect(imports.some((i) => i.specifier.includes('is-null-entry'))).toBe(false);
  });

  it('deduplicates entries that appear in both fileDiscovery and resolveCache', async () => {
    const manifest = makeManifest({
      fileDiscovery: { 'app/controller': ['home.ts'] },
      resolveCache: { 'app/controller/home.ts': 'app/controller/home.ts' },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    expect(extractImports(worker).length).toBe(1);
  });

  it('emits the required runtime hooks: manifest setup, bundle module loader, and startEgg', async () => {
    const manifest = makeManifest({
      fileDiscovery: { 'app/controller': ['home.ts'] },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    expect(worker).toContain("import { ManifestStore } from '@eggjs/core'");
    expect(worker).toContain('import { startEgg } from "egg"');
    expect(worker).toContain("const __outputDir = path.dirname(path.resolve(process.argv[1] || '.'))");
    expect(worker).toContain('const __appBaseDir = path.resolve(__bundleManifest.baseDir || __outputDir)');
    expect(worker).toContain('ManifestStore.setBundleStore(ManifestStore.fromBundle(MANIFEST_DATA');
    expect(worker).toContain('__EGG_BUNDLE_MODULE_LOADER__');
    expect(worker).toContain("startEgg({ baseDir: __appBaseDir, framework: __framework, mode: 'single' })");
  });

  it('builds a BUNDLE_MAP keyed by relKey, app absolute, output absolute, and resolveCache request aliases', async () => {
    const manifest = makeManifest({
      fileDiscovery: { app: ['controller.ts'] },
      resolveCache: { 'app/controller': 'app/controller.ts' },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    expect(worker).toContain('__BUNDLE_MAP_REL');
    expect(worker).toContain('["app/controller.ts"]: __m0');
    expect(worker).toContain('__setBundleMapAlias(rel, mod)');
    expect(worker).toContain('__setBundleMapAlias(path.resolve(__appBaseDir, rel), mod)');
    expect(worker).toContain('__setBundleMapAlias(path.resolve(__outputDir, rel), mod)');
    expect(worker).toContain(
      'for (const [requestRel, resolvedRel] of Object.entries(MANIFEST_DATA.resolveCache ?? {}))',
    );
    expect(worker).toContain('__setBundleMapAlias(path.resolve(__appBaseDir, requestRel), mod)');
  });

  it('loads externalized package files via createRequire instead of static imports', async () => {
    const manifest = makeManifest({
      fileDiscovery: {
        app: ['controller.ts'],
        'node_modules/fake-external/dist/config': ['config.default.js'],
        'node_modules/fake-external/dist': ['register.cjs'],
      },
    });

    const gen = new EntryGenerator({
      baseDir: tmpDir,
      externals: new Set(['fake-external']),
      manifestLoader: createFakeLoader(manifest),
    });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    expect(extractImports(worker)).toEqual([{ index: 0, specifier: '../../app/controller.ts' }]);
    expect(worker).not.toContain('import * as __m1 from "../../node_modules/fake-external');
    expect(worker).toContain("import { createRequire as __createRequire } from 'node:module'");
    expect(worker).toContain(
      'const __EXTERNAL_SPECS: Array<[string, string]> = [["node_modules/fake-external/dist/config/config.default.js","fake-external/config/config.default"],["node_modules/fake-external/dist/register.cjs","fake-external/register.cjs"]];',
    );
    expect(worker).toContain('__BUNDLE_MAP_REL[key] = __rtReq(spec)');
  });

  it('inlines the full StartupManifest as MANIFEST_DATA so runtime never reads .egg/manifest.json', async () => {
    const manifest = makeManifest({
      fileDiscovery: { app: ['a.ts'] },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    expect(worker).toContain('const MANIFEST_DATA =');
    expect(worker).toContain('"generatedAt": "2026-01-01T00:00:00.000Z"');
    expect(worker).toContain('"lockfileFingerprint": "fake-lockfile"');
    expect(worker).toContain('"configFingerprint": "fake-config"');
  });

  it('still emits all runtime hooks and a valid file when the manifest is empty', async () => {
    const gen = new EntryGenerator({
      baseDir: tmpDir,
      manifestLoader: createFakeLoader(makeManifest()),
    });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    expect(extractImports(worker).length).toBe(0);
    expect(worker).toContain("startEgg({ baseDir: __appBaseDir, framework: __framework, mode: 'single' })");
    expect(worker).toContain('__EGG_BUNDLE_MODULE_LOADER__');
    expect(worker).toContain('ManifestStore.setBundleStore');
  });

  it('does not generate an agent entry in single mode', async () => {
    const gen = new EntryGenerator({
      baseDir: tmpDir,
      manifestLoader: createFakeLoader(makeManifest()),
    });
    const result = await gen.generate();

    await expect(fs.stat(path.join(result.entryDir, 'agent.entry.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('honors a custom outputDir option', async () => {
    const customOut = path.join(tmpDir, 'custom-out');
    const gen = new EntryGenerator({
      baseDir: tmpDir,
      outputDir: customOut,
      manifestLoader: createFakeLoader(makeManifest()),
    });

    const result = await gen.generate();
    expect(result.entryDir).toBe(customOut);
    expect(path.dirname(result.workerEntry)).toBe(customOut);
  });

  it('passes a custom framework specifier to startEgg', async () => {
    const gen = new EntryGenerator({
      baseDir: tmpDir,
      framework: '@my-org/framework',
      manifestLoader: createFakeLoader(makeManifest()),
    });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    expect(worker).toContain('import { startEgg } from "egg"');
    expect(worker).toContain('const __framework = __bundleManifest.framework || "@my-org/framework"');
    expect(worker).toContain("startEgg({ baseDir: __appBaseDir, framework: __framework, mode: 'single' })");
  });

  it('passes an absolute framework checkout through startEgg', async () => {
    const frameworkDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-framework-'));
    createdDirs.push(frameworkDir);
    await fs.writeFile(path.join(frameworkDir, 'package.json'), JSON.stringify({ name: 'custom-egg' }));

    const gen = new EntryGenerator({
      baseDir: tmpDir,
      framework: frameworkDir,
      manifestLoader: createFakeLoader(makeManifest()),
    });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    expect(worker).toContain('import { startEgg } from "egg"');
    expect(worker).toContain(`const __framework = __bundleManifest.framework || ${JSON.stringify(frameworkDir)}`);
  });

  it('produces byte-identical worker output across independent baseDir runs (T17 determinism baseline)', async () => {
    const manifest = makeManifest({
      extensions: {
        tegg: {
          moduleDescriptors: [{ unitPath: 'node_modules/@eggjs/fake', decoratedFiles: ['b.ts', 'a.ts'] }],
        },
      },
      resolveCache: { 'x.ts': 'x.ts', 'y.ts': 'y.ts', 'z.ts': null },
      fileDiscovery: { app: ['c.ts', 'a.ts', 'b.ts'] },
    });

    const first = await new EntryGenerator({
      baseDir: tmpDir,
      manifestLoader: createFakeLoader(manifest),
    }).generate();
    const firstWorker = await fs.readFile(first.workerEntry, 'utf8');

    const tmpDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-entry-gen-'));
    createdDirs.push(tmpDir2);
    const second = await new EntryGenerator({
      baseDir: tmpDir2,
      manifestLoader: createFakeLoader(manifest),
    }).generate();
    const secondWorker = await fs.readFile(second.workerEntry, 'utf8');

    expect(firstWorker).toBe(secondWorker);
  });

  it('matches the canonical file snapshot for a representative manifest', async () => {
    const manifest = makeManifest({
      fileDiscovery: {
        'app/controller': ['home.ts'],
        'app/service': ['user.ts'],
      },
      resolveCache: {
        'app/extend/context.ts': 'app/extend/context.ts',
        'app/middleware/timing.ts': null,
      },
      extensions: {
        tegg: {
          moduleDescriptors: [
            {
              unitPath: 'node_modules/@eggjs/fake-module',
              decoratedFiles: ['app/service/UserService.ts'],
            },
          ],
        },
      },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    await expect(worker).toMatchFileSnapshot('./__snapshots__/EntryGenerator.worker.canonical.snap');
  });
});
