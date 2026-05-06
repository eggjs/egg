import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { StartupManifest } from '@eggjs/core';
import { execaNode } from 'execa';
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

function escapeRegExp(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toPosixPath(filepath: string): string {
  return filepath.split(path.sep).join('/');
}

function normalizeAppBaseDir(source: string, baseDir: string): string {
  return Array.from(new Set([baseDir, toPosixPath(baseDir)])).reduce(
    (result, current) => result.replace(new RegExp(escapeRegExp(current), 'g'), '<appBaseDir>'),
    source,
  );
}

async function writePackage(dir: string, source: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ type: 'module', exports: './index.js' }));
  await fs.writeFile(path.join(dir, 'index.js'), source);
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
    expect(worker).toContain('ManifestStore.setBundleStore(ManifestStore.fromBundle(MANIFEST_DATA');
    expect(worker).toContain('__EGG_BUNDLE_MODULE_LOADER__');
    expect(worker).toContain('__setBundleMap(__framework, __frameworkModule)');
    expect(worker).toContain('__patchFrameworkPaths(__frameworkModule.Application)');
    expect(worker).not.toContain('__frameworkImport');
    expect(worker).toContain("startEgg({ baseDir: __outputDir, framework: __framework, mode: 'single' })");
  });

  it('builds a BUNDLE_MAP keyed by relKey, output absolute, original app absolute, and resolveCache aliases', async () => {
    const manifest = makeManifest({
      fileDiscovery: { app: ['controller.ts'] },
      resolveCache: { 'app/controller': 'app/controller.ts' },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    expect(worker).toContain('__BUNDLE_MAP_REL');
    expect(worker).toContain('["app/controller.ts"]: __m0');
    expect(worker).toContain('__APP_ABSOLUTE_ALIASES');
    expect(worker).toContain(JSON.stringify(toPosixPath(path.join(tmpDir, 'app/controller.ts'))));
    expect(worker).toContain('__APP_RESOLVE_CACHE_ALIASES');
    expect(worker).toContain(JSON.stringify(toPosixPath(path.join(tmpDir, 'app/controller'))));
    expect(worker).toContain('__setBundleMap(path.resolve(__outputDir, rel), mod)');
    expect(worker).toContain('for (const [requestRel, targetRel] of Object.entries(MANIFEST_DATA.resolveCache))');
    expect(worker).toContain('__setBundleAliases(requestRel, mod)');
  });

  it('keeps original node_modules symlink absolute aliases alongside resolved package paths', async () => {
    const realPackageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-real-package-'));
    createdDirs.push(realPackageDir);
    await fs.writeFile(path.join(realPackageDir, 'package.json'), JSON.stringify({ name: 'fake-plugin' }));
    await fs.writeFile(path.join(realPackageDir, 'app.ts'), 'export const plugin = true;\n');

    const linkDir = path.join(tmpDir, 'node_modules/fake-plugin');
    await fs.mkdir(path.dirname(linkDir), { recursive: true });
    await fs.symlink(realPackageDir, linkDir, process.platform === 'win32' ? 'junction' : 'dir');

    const manifest = makeManifest({
      fileDiscovery: { 'node_modules/fake-plugin': ['app.ts'] },
      resolveCache: { 'node_modules/fake-plugin/app.ts': 'node_modules/fake-plugin/app.ts' },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    expect(worker).toContain(JSON.stringify(toPosixPath(path.join(realPackageDir, 'app.ts'))));
    expect(worker).toContain(JSON.stringify(toPosixPath(path.join(tmpDir, 'node_modules/fake-plugin/app.ts'))));
  });

  it('executes the generated worker with explicit framework resolved through the bundle loader', async () => {
    const resultFile = path.join(tmpDir, 'runtime-result.json');
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({ type: 'module' }));
    await fs.mkdir(path.join(tmpDir, 'app'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, 'app/controller.ts'),
      "export const controllerMarker = 'bundled-controller';\n",
    );
    await writePackage(
      path.join(tmpDir, 'node_modules/@eggjs/core'),
      `
export const ManifestStore = {
  fromBundle(manifest, baseDir) {
    return { manifest, baseDir };
  },
  setBundleStore(store) {
    globalThis.__manifestStore = store;
  },
};
`,
    );
    await writePackage(
      path.join(tmpDir, 'node_modules/@runtime/framework'),
      `
import fs from 'node:fs/promises';

export const frameworkMarker = 'bundled-framework';

export async function startEgg(options) {
  const loader = globalThis.__EGG_BUNDLE_MODULE_LOADER__;
  const resolvedFramework = loader?.(options.framework);
  const resolvedController = loader?.('app/controller.ts');
  await fs.writeFile(process.env.EGG_RUNTIME_RESULT, JSON.stringify({
    options,
    manifestBaseDir: globalThis.__manifestStore?.baseDir,
    frameworkResolved: resolvedFramework?.frameworkMarker,
    frameworkStartEggMatches: resolvedFramework?.startEgg === startEgg,
    controllerResolved: resolvedController?.controllerMarker,
  }, null, 2));
  return {
    config: { cluster: { listen: { port: 0 } } },
    listen(_port, callback) {
      callback();
    },
  };
}
`,
    );

    const manifest = makeManifest({
      fileDiscovery: { app: ['controller.ts'] },
    });
    const outputDir = path.join(tmpDir, 'dist');
    const gen = new EntryGenerator({
      baseDir: tmpDir,
      outputDir,
      framework: '@runtime/framework',
      manifestLoader: createFakeLoader(manifest),
    });
    const result = await gen.generate();

    await execaNode(result.workerEntry, [], {
      cwd: tmpDir,
      env: {
        ...process.env,
        EGG_RUNTIME_RESULT: resultFile,
      },
      nodeOptions: ['--experimental-strip-types'],
      timeout: 5_000,
    });

    const runtimeResult = JSON.parse(await fs.readFile(resultFile, 'utf8')) as {
      options: { baseDir: string; framework: string; mode: string };
      manifestBaseDir: string;
      frameworkResolved: string;
      frameworkStartEggMatches: boolean;
      controllerResolved: string;
    };
    expect(runtimeResult.options).toEqual({
      baseDir: outputDir,
      framework: '@runtime/framework',
      mode: 'single',
    });
    expect(runtimeResult.manifestBaseDir).toBe(outputDir);
    expect(runtimeResult.frameworkResolved).toBe('bundled-framework');
    expect(runtimeResult.frameworkStartEggMatches).toBe(true);
    expect(runtimeResult.controllerResolved).toBe('bundled-controller');
  });

  it('virtualizes framework eggPaths under node_modules before startEgg runs', async () => {
    const resultFile = path.join(tmpDir, 'framework-paths.json');
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({ type: 'module' }));
    await writePackage(
      path.join(tmpDir, 'node_modules/@eggjs/core'),
      `
export const ManifestStore = {
  fromBundle(manifest, baseDir) {
    return { manifest, baseDir };
  },
  setBundleStore() {},
};
`,
    );
    const frameworkDir = path.join(tmpDir, 'node_modules/@runtime/framework');
    await fs.mkdir(frameworkDir, { recursive: true });
    await fs.writeFile(
      path.join(frameworkDir, 'package.json'),
      JSON.stringify({ type: 'module', exports: { './subpath': './subpath.js' } }),
    );
    await fs.writeFile(
      path.join(frameworkDir, 'subpath.js'),
      `
import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = () => path.dirname(path.resolve(process.argv[1]));

export class Application {
  customEggPaths() {
    return [outputDir(), path.join(outputDir(), 'preserved-framework')];
  }
}

export class Agent extends Application {}

export async function startEgg(options) {
  await fs.writeFile(process.env.EGG_RUNTIME_RESULT, JSON.stringify({
    appPaths: new Application().customEggPaths(),
    agentPaths: new Agent().customEggPaths(),
    appDescriptor: Object.getOwnPropertyDescriptor(Application.prototype, 'customEggPaths'),
    agentDescriptor: Object.getOwnPropertyDescriptor(Agent.prototype, 'customEggPaths'),
  }, null, 2));
  return {
    config: { cluster: { listen: { port: 0 } } },
    listen(_port, callback) {
      callback();
    },
  };
}
`,
    );

    const outputDir = path.join(tmpDir, 'dist');
    const gen = new EntryGenerator({
      baseDir: tmpDir,
      outputDir,
      framework: '@runtime/framework/subpath',
      manifestLoader: createFakeLoader(
        makeManifest({
          extensions: {
            eggLoader: {
              eggPaths: ['node_modules/@runtime/root-framework', 'node_modules/@runtime/framework', 'node_modules/egg'],
            },
          },
        }),
      ),
    });
    const result = await gen.generate();

    await execaNode(result.workerEntry, [], {
      cwd: tmpDir,
      env: {
        ...process.env,
        EGG_RUNTIME_RESULT: resultFile,
      },
      nodeOptions: ['--experimental-strip-types'],
      timeout: 5_000,
    });

    const runtimeResult = JSON.parse(await fs.readFile(resultFile, 'utf8')) as {
      appPaths: string[];
      agentPaths: string[];
      appDescriptor: PropertyDescriptor;
      agentDescriptor: PropertyDescriptor;
    };
    const expected = [
      path.join(outputDir, 'node_modules/@runtime/root-framework'),
      path.join(outputDir, 'node_modules/@runtime/framework'),
      path.join(outputDir, 'node_modules/egg'),
      path.join(outputDir, 'preserved-framework'),
    ];
    expect(runtimeResult.appPaths).toEqual(expected);
    expect(runtimeResult.agentPaths).toEqual(expected);
    expect(runtimeResult.appDescriptor).toMatchObject({ configurable: true, enumerable: false, writable: true });
    expect(runtimeResult.agentDescriptor).toMatchObject({ configurable: true, enumerable: false, writable: true });
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
    expect(worker).toContain("startEgg({ baseDir: __outputDir, framework: __framework, mode: 'single' })");
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

  it('honors a custom framework specifier', async () => {
    const gen = new EntryGenerator({
      baseDir: tmpDir,
      framework: '@my-org/framework',
      manifestLoader: createFakeLoader(makeManifest()),
    });
    const result = await gen.generate();
    const worker = await fs.readFile(result.workerEntry, 'utf8');

    expect(worker).toContain('import { startEgg } from "@my-org/framework"');
    expect(worker).toContain('import * as __frameworkModule from "@my-org/framework"');
    expect(worker).toContain('const __framework = "@my-org/framework"');
    expect(worker).not.toContain('import { startEgg } from "egg"');
  });

  it.each([
    ['absolute path', () => path.join(tmpDir, 'node_modules/custom-egg')],
    ['relative path', () => './custom-egg'],
    ['parent relative path', () => '../custom-egg'],
    ['file URL', () => 'file:///tmp/custom-egg'],
    ['Windows absolute path', () => 'C:\\custom-egg'],
    ['backslash path', () => 'custom\\egg'],
  ])('rejects %s framework values because bundled runtime resolves by specifier', (_label, frameworkFactory) => {
    expect(
      () =>
        new EntryGenerator({
          baseDir: tmpDir,
          framework: frameworkFactory(),
          manifestLoader: createFakeLoader(makeManifest()),
        }),
    ).toThrow('framework must be a package specifier for bundled runtime');
  });

  it('keeps the module graph deterministic apart from original app absolute aliases', async () => {
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

    expect(normalizeAppBaseDir(firstWorker, tmpDir)).toBe(normalizeAppBaseDir(secondWorker, tmpDir2));
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

    const stableWorker = normalizeAppBaseDir(worker, tmpDir);
    await expect(stableWorker).toMatchFileSnapshot('./__snapshots__/EntryGenerator.worker.canonical.snap');
  });
});
