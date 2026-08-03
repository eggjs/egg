import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { StartupManifest } from '@eggjs/core';
import { execaNode } from 'execa';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EntryGenerator, type GeneratedEntries, type GeneratedEntry } from '../src/lib/EntryGenerator.ts';
import type { ManifestLoader } from '../src/lib/ManifestLoader.ts';

function createFakeLoader(manifest: StartupManifest): ManifestLoader {
  return { load: async () => manifest } as unknown as ManifestLoader;
}

function getEntry(result: GeneratedEntries, name: GeneratedEntry['name'] = 'worker'): string {
  const entry = result.entries.find((candidate) => candidate.name === name);
  if (!entry) throw new Error(`generated entry ${name} not found`);
  return entry.filepath;
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
    expect(result.entries).toEqual([{ name: 'worker', filepath: path.join(result.entryDir, 'worker.entry.ts') }]);
    await expect(fs.stat(getEntry(result))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(result.entryDir, 'app_worker.entry.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(result.entryDir, 'agent_worker.entry.ts'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('writes two self-contained role entries for the cluster target', async () => {
    const gen = new EntryGenerator({
      baseDir: tmpDir,
      manifestLoader: createFakeLoader(makeManifest({ fileDiscovery: { app: ['router.ts'] } })),
      target: 'cluster',
    });

    const result = await gen.generate();

    expect(result.entries).toEqual([
      { name: 'app_worker', filepath: path.join(result.entryDir, 'app_worker.entry.ts') },
      { name: 'agent_worker', filepath: path.join(result.entryDir, 'agent_worker.entry.ts') },
    ]);
    const appWorker = await fs.readFile(getEntry(result, 'app_worker'), 'utf8');
    const agentWorker = await fs.readFile(getEntry(result, 'agent_worker'), 'utf8');

    expect(appWorker).toContain('new (__frameworkModule as any).Application');
    expect(appWorker).toContain('startAppWorker as __startWorkerProtocol');
    expect(appWorker).not.toContain('startAgentWorker as __startWorkerProtocol');
    expect(agentWorker).toContain('new (__frameworkModule as any).Agent');
    expect(agentWorker).toContain('startAgentWorker as __startWorkerProtocol');
    expect(agentWorker).not.toContain('startAppWorker as __startWorkerProtocol');

    for (const worker of [appWorker, agentWorker]) {
      expect(worker).toContain('import * as __m0 from "../../app/router.ts"');
      expect(worker).toContain('ManifestStore.setBundleStore');
      expect(worker).toContain('if (v8.startupSnapshot.isBuildingSnapshot())');
      expect(worker).toContain('const __snapshotBuildCwd = path.resolve(process.cwd())');
      expect(worker).toContain('if (!__assertSnapshotBuildCwd()) return');
      expect(worker).not.toContain('EGG_BUNDLE_SNAPSHOT');
      expect(worker).not.toContain('EGG_PROCESS_TYPE');
      expect(worker).not.toContain('EGG_SNAPSHOT_ROLE');
    }
    await expect(fs.stat(path.join(result.entryDir, 'runtime.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(result.entryDir, 'worker.entry.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
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
    const worker = await fs.readFile(getEntry(result), 'utf8');

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
    const worker = await fs.readFile(getEntry(result), 'utf8');

    expect(extractImports(worker).map((i) => i.specifier)).toEqual([
      '../../app/Service.ts',
      '../../modules/foo/FooController.ts',
      '../../modules/outside.ts',
    ]);
  });

  it('includes app/port controller decorated files from tegg manifest descriptors', async () => {
    const manifest = makeManifest({
      extensions: {
        tegg: {
          moduleReferences: [
            {
              name: 'appPort',
              path: 'app/port',
            },
          ],
          moduleDescriptors: [
            {
              unitPath: 'app/port',
              decoratedFiles: ['controller/HomeController.ts', 'manager/UserRoleManager.ts'],
            },
          ],
        },
      },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(getEntry(result), 'utf8');

    expect(extractImports(worker).map((i) => i.specifier)).toEqual([
      '../../app/port/controller/HomeController.ts',
      '../../app/port/manager/UserRoleManager.ts',
    ]);
    expect(worker).toContain('"moduleReferences"');
    expect(worker).toContain('"path": "app/port"');
  });

  it('emits a runtime block that resolves relative tegg manifest paths to absolute output-dir paths', async () => {
    // Mirror a bundle artifact whose tegg module paths are stored relative to
    // baseDir (as normalized by ManifestLoader). The generated worker must
    // re-absolutize both moduleReferences[].path and moduleDescriptors[].unitPath
    // against __outputDir so LoaderFactory.loadApp matches them by exact equality
    // and the precomputed controller/repository decorated files flow into it.
    const manifest = makeManifest({
      extensions: {
        tegg: {
          moduleReferences: [
            {
              name: 'appBiz',
              path: 'app/biz',
            },
          ],
          moduleDescriptors: [
            {
              name: 'appBiz',
              unitPath: 'app/biz',
              decoratedFiles: ['controller/HomeController.ts', 'repository/UserRepository.ts'],
            },
          ],
        },
      },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(getEntry(result), 'utf8');

    // Controller + repository decorated files are collected as imports.
    expect(extractImports(worker).map((i) => i.specifier)).toEqual([
      '../../app/biz/controller/HomeController.ts',
      '../../app/biz/repository/UserRepository.ts',
    ]);

    // Manifest keeps the matching relative keys so both sides resolve equally.
    expect(worker).toContain('"path": "app/biz"');
    expect(worker).toContain('"unitPath": "app/biz"');

    // The absolutization block is emitted with the isAbsolute/resolve contract
    // that maps both moduleReferences and moduleDescriptors onto __outputDir.
    expect(worker).toContain('path.isAbsolute(p) ? p : path.resolve(__outputDir, p)');
    expect(worker).toContain('if (__ref) __ref.path = __toAbs(__ref.path);');
    expect(worker).toContain('if (__desc) __desc.unitPath = __toAbs(__desc.unitPath);');
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
    const worker = await fs.readFile(getEntry(result), 'utf8');

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
    const worker = await fs.readFile(getEntry(result), 'utf8');

    expect(extractImports(worker).length).toBe(1);
  });

  it('emits the required runtime hooks: manifest setup, bundle module loader, and startEgg', async () => {
    const manifest = makeManifest({
      fileDiscovery: { 'app/controller': ['home.ts'] },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(getEntry(result), 'utf8');

    expect(worker).toContain("import { ManifestLoaderFS, ManifestStore } from '@eggjs/core'");
    expect(worker).toContain('import { startEgg } from "egg"');
    expect(worker).toContain('const __bundleManifestStore = ManifestStore.fromBundle(MANIFEST_DATA');
    expect(worker).toContain('const __loaderFS = new ManifestLoaderFS(__bundleManifestStore)');
    expect(worker).toContain('ManifestStore.setBundleStore(__bundleManifestStore)');
    expect(worker).toContain('__EGG_BUNDLE_MODULE_LOADER__');
    expect(worker).toContain('__setBundleMap(__framework, __frameworkModule)');
    expect(worker).not.toContain('__frameworkImport');
    expect(worker).toContain(
      "const __startOptions = { baseDir: __outputDir, framework: __framework, mode: 'single' as const, loaderFS: __loaderFS }",
    );
    expect(worker).toContain('startEgg(__startOptions)');
    // 3-mode snapshot dispatch (normal / snapshot-build / restore-main)
    expect(worker).toContain("import v8 from 'node:v8'");
    expect(worker).toContain('if (v8.startupSnapshot.isBuildingSnapshot())');
    expect(worker).not.toContain('EGG_BUNDLE_SNAPSHOT');
    expect(worker).toContain('startEgg({ ...__startOptions, snapshot: true })');
    expect(worker).toContain('app.triggerSnapshotWillSerialize()');
    expect(worker).toContain('v8.startupSnapshot.setDeserializeMainFunction(() =>');
    expect(worker).toContain('const __snapshotBuildCwd = path.resolve(process.cwd())');
    expect(worker).toContain('snapshot working directory mismatch');
    expect(worker).toContain('if (!__assertSnapshotBuildCwd()) return');
    // restore main must defer (ESM loader not ready) and route imports via require()
    expect(worker).toContain('setImmediate(() =>');
    expect(worker).toContain("process.getBuiltinModule('node:module')");
    expect(worker).toContain("(0, eval)('require')('node:module')");
    expect(worker).toContain('globalThis.__RUNTIME_REQUIRE =');
    expect(worker).toContain('globalThis.__EGG_MODULE_IMPORTER__ = async (fp: string) => __req(fp)');
    // re-install the web globals (fetch/Headers/.../Blob/File) the prelude stubbed
    expect(worker).toContain('globalThis.__installWebGlobalsLazy?.()');
    expect(worker).toContain('__runtimeRequire.resolve =');
    expect(worker).toContain('app.triggerSnapshotDidDeserialize()');
    // daemon readiness over IPC for `egg-scripts start --snapshot-blob`
    expect(worker).toContain("process.send({ action: 'egg-ready'");
  });

  it('builds a BUNDLE_MAP keyed by relKey, output absolute, original app absolute, and resolveCache aliases', async () => {
    const manifest = makeManifest({
      fileDiscovery: { app: ['controller.ts'] },
      resolveCache: { 'app/controller': 'app/controller.ts' },
    });

    const gen = new EntryGenerator({ baseDir: tmpDir, manifestLoader: createFakeLoader(manifest) });
    const result = await gen.generate();
    const worker = await fs.readFile(getEntry(result), 'utf8');

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
    const worker = await fs.readFile(getEntry(result), 'utf8');

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
export class ManifestLoaderFS {
  constructor(store) {
    this.store = store;
  }
}
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
    loaderFSBaseDir: options.loaderFS?.store?.baseDir,
    loaderFSUsesManifestStore: options.loaderFS?.store === globalThis.__manifestStore,
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

    await execaNode(getEntry(result), [], {
      cwd: tmpDir,
      env: {
        ...process.env,
        EGG_RUNTIME_RESULT: resultFile,
      },
      nodeOptions: ['--experimental-strip-types'],
      timeout: 5_000,
    });

    const runtimeResult = JSON.parse(await fs.readFile(resultFile, 'utf8')) as {
      options: { baseDir: string; framework: string; mode: string; loaderFS: unknown };
      manifestBaseDir: string;
      frameworkResolved: string;
      frameworkStartEggMatches: boolean;
      controllerResolved: string;
      loaderFSBaseDir: string;
      loaderFSUsesManifestStore: boolean;
    };
    expect(runtimeResult.options).toEqual({
      baseDir: outputDir,
      framework: '@runtime/framework',
      mode: 'single',
      loaderFS: {
        store: {
          manifest,
          baseDir: outputDir,
        },
      },
    });
    expect(runtimeResult.manifestBaseDir).toBe(outputDir);
    expect(runtimeResult.frameworkResolved).toBe('bundled-framework');
    expect(runtimeResult.frameworkStartEggMatches).toBe(true);
    expect(runtimeResult.controllerResolved).toBe('bundled-controller');
    expect(runtimeResult.loaderFSBaseDir).toBe(outputDir);
    expect(runtimeResult.loaderFSUsesManifestStore).toBe(true);
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
    const worker = await fs.readFile(getEntry(result), 'utf8');

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
    const worker = await fs.readFile(getEntry(result), 'utf8');

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
    const worker = await fs.readFile(getEntry(result), 'utf8');

    expect(extractImports(worker).length).toBe(0);
    expect(worker).toContain(
      "const __startOptions = { baseDir: __outputDir, framework: __framework, mode: 'single' as const, loaderFS: __loaderFS }",
    );
    expect(worker).toContain('startEgg(__startOptions)');
    expect(worker).toContain('__EGG_BUNDLE_MODULE_LOADER__');
    expect(worker).toContain('ManifestStore.setBundleStore');
  });

  it('does not generate cluster entries in single mode', async () => {
    const gen = new EntryGenerator({
      baseDir: tmpDir,
      manifestLoader: createFakeLoader(makeManifest()),
    });
    const result = await gen.generate();

    await expect(fs.stat(path.join(result.entryDir, 'app_worker.entry.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(result.entryDir, 'agent_worker.entry.ts'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
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
    expect(path.dirname(getEntry(result))).toBe(customOut);
  });

  it('honors a custom framework specifier', async () => {
    const gen = new EntryGenerator({
      baseDir: tmpDir,
      framework: '@my-org/framework',
      manifestLoader: createFakeLoader(makeManifest()),
    });
    const result = await gen.generate();
    const worker = await fs.readFile(getEntry(result), 'utf8');

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
    const firstWorker = await fs.readFile(getEntry(first), 'utf8');

    const tmpDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-entry-gen-'));
    createdDirs.push(tmpDir2);
    const second = await new EntryGenerator({
      baseDir: tmpDir2,
      manifestLoader: createFakeLoader(manifest),
    }).generate();
    const secondWorker = await fs.readFile(getEntry(second), 'utf8');

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
    const worker = await fs.readFile(getEntry(result), 'utf8');

    const stableWorker = normalizeAppBaseDir(worker, tmpDir);
    await expect(stableWorker).toMatchFileSnapshot('./__snapshots__/EntryGenerator.worker.canonical.snap');
  });
});
