import assert from 'node:assert/strict';
import path from 'node:path';

import { ManifestStore, ManifestLoaderFS, RealLoaderFS } from '@eggjs/core';
import type { LoaderFSGlobOptions } from '@eggjs/core';
import { mm, type MockApplication } from '@eggjs/mock';
import { TEGG_MANIFEST_KEY } from '@eggjs/tegg-loader';
import type { TeggManifestExtension } from '@eggjs/tegg-loader';
import { describe, it, beforeAll, afterEach, afterAll } from 'vitest';

import EggTypeService from './fixtures/apps/egg-app/modules/multi-module-service/EggTypeService.ts';
import { getAppBaseDir } from './utils.ts';

/**
 * Bundle-mode app-boot integration test.
 *
 * Reproduces the production bundled startup path (see egg-bundler EntryGenerator):
 *   ManifestStore.fromBundle(data) -> setBundleStore -> start app
 * so the tegg loader runs through EggModuleLoader.buildAppGraph's `loadAppManifest`
 * (manifest-consume) branch instead of globby discovery.
 *
 * Step 1: a tegg app boots (`app.ready()`) in manifest-consume mode.
 * Step 2: core framework features work end to end in that mode — an HTTP request
 *         drives the full controller -> service -> cross-module repo DI chain.
 */
describe('plugin/tegg/test/BundledAppBoot.test.ts', () => {
  const baseDir = getAppBaseDir('egg-app');
  let manifestData: ReturnType<MockApplication['loader']['generateManifest']>;
  let app: MockApplication;

  // Records the cwd of every fallback (real-fs) glob the manifest VFS could not
  // serve from the manifest, so the test can prove WHERE disk discovery still happens.
  const fallbackGlobTargets: string[] = [];
  let bootFallbackGlobTargets: string[] = [];
  class CountingFallbackLoaderFS extends RealLoaderFS {
    glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[] {
      fallbackGlobTargets.push(String(options?.cwd));
      return super.glob(patterns, options);
    }
  }

  beforeAll(async () => {
    // Phase 1: a normal boot to collect manifest data (fileDiscovery, resolveCache,
    // and the tegg extension with decoratedFiles). Run as `local` so the auto
    // dumpManifest() is skipped and we don't write .egg/manifest.json into the fixture.
    mm.env('local');
    const collectApp = mm.app({ baseDir });
    await collectApp.ready();
    const resolvedBaseDir = collectApp.baseDir;
    manifestData = collectApp.loader.generateManifest();
    await collectApp.close();
    mm.restore();

    // Phase 2: boot in manifest-consume mode, exactly like the bundled worker entry
    // (egg-bundler EntryGenerator): fromBundle -> ManifestLoaderFS -> setBundleStore
    // -> start with the manifest-backed loaderFS injected.
    const store = ManifestStore.fromBundle(manifestData, resolvedBaseDir);
    const loaderFS = new ManifestLoaderFS(store, new CountingFallbackLoaderFS());
    ManifestStore.setBundleStore(store);
    // NOTE: @eggjs/mock does not expose a typed `loaderFS` option, so we rely on
    // its `{ ...options }` passthrough in single mode to forward it to the app
    // loader (same channel egg-bundler uses via startEgg). The cast is the only
    // way today.
    // TODO(egg-mock): add first-class `loaderFS` support to MockOptions so bundle-
    // mode app-boot tests don't need this passthrough cast. See [[bundle-startup-mock-loaderfs-todo]].
    app = mm.app({ baseDir, mode: 'single', loaderFS } as Parameters<typeof mm.app>[0]);
    await app.ready();
    bootFallbackGlobTargets = [...fallbackGlobTargets];
  });

  afterEach(async () => {
    return mm.restore();
  });

  afterAll(async () => {
    await app?.close();
    ManifestStore.setBundleStore(undefined);
  });

  it('phase-1 manifest should capture the tegg moduleDescriptors with decoratedFiles', () => {
    const tegg = manifestData.extensions?.[TEGG_MANIFEST_KEY] as TeggManifestExtension | undefined;
    assert.ok(tegg, 'tegg extension should be present in the generated manifest');
    assert.ok(tegg.moduleDescriptors?.length, 'should have moduleDescriptors');
    assert.ok(
      tegg.moduleDescriptors.some((d) => d.decoratedFiles.length > 0),
      'at least one module should carry decoratedFiles',
    );
  });

  it('should boot a tegg app in manifest-consume mode (loadAppManifest branch)', () => {
    // generatedAt is only set on a *loaded* manifest, proving we consumed a
    // prebuilt manifest rather than collecting a fresh one.
    assert.ok(app.loader.manifest.data.generatedAt, 'app should have booted from a prebuilt manifest');

    const consumed = app.loader.manifest.getExtension(TEGG_MANIFEST_KEY) as TeggManifestExtension | undefined;
    assert.ok(consumed?.moduleDescriptors?.length, 'tegg extension should be consumed from the bundle manifest');
  });

  it('should wire the manifest-backed LoaderFS and route tegg discovery through it (Theme F)', () => {
    // The injected manifest VFS is the loader's fs, exactly like a bundled app.
    assert.ok(
      app.loader.loaderFS instanceof ManifestLoaderFS,
      `expected ManifestLoaderFS, got ${app.loader.loaderFS?.constructor?.name}`,
    );

    // Core/framework discovery is fully served from the manifest — nothing outside
    // tegg module dirs ever falls back to a real-fs glob. Match the `modules` path
    // segment exactly rather than a substring, to avoid similarly named dirs.
    const isUnderModulesDir = (cwd: string): boolean => cwd.split(path.sep).includes('modules');
    const nonModuleGlobs = bootFallbackGlobTargets.filter((cwd) => !isUnderModulesDir(cwd));
    assert.deepEqual(
      nonModuleGlobs,
      [],
      `core discovery should be fully manifest-served, but globbed: ${JSON.stringify(nonModuleGlobs)}`,
    );

    // In consume mode EggModuleLoader.loadModule now reuses the manifest's
    // precomputed tegg `decoratedFiles` instead of re-globbing each module dir,
    // so tegg module discovery is fully manifest-served and NO fallback glob runs
    // under a module dir either. This is what lets the load-unit lifecycle hooks
    // (e.g. EggQualifierProtoHook) still see the real decorated classes via
    // `ctx.loader.load()` in a bundle, where the module source files do not exist
    // on disk for a glob to find.
    assert.deepEqual(
      bootFallbackGlobTargets.filter(isUnderModulesDir),
      [],
      `tegg module discovery should be fully manifest-served, but globbed module dirs: ${JSON.stringify(
        bootFallbackGlobTargets.filter(isUnderModulesDir),
      )}`,
    );
  });

  it('should resolve an auto-Egg-qualifier inject of an egg-compatible object (regression)', async () => {
    // EggTypeService.autoQualifierLogger is `@Inject({ name: 'logger' })` with NO
    // explicit @EggQualifier, so the Egg qualifier must come from
    // EggQualifierProtoHook at load time. `logger` exists as both an app and a
    // context egg object; without the auto qualifier the inject is ambiguous and
    // building this proto throws EggPrototypeNotFound. This only works in a bundle
    // because EggModuleLoader.loadModule now loads the module classes from the
    // manifest's precomputed decoratedFiles, so the hook can see the inject.
    const eggTypeService = await app.getEggObject(EggTypeService);
    assert.ok(
      eggTypeService.getAutoQualifierLogger(),
      'auto-Egg-qualifier egg-compatible object should resolve in bundle mode',
    );
  });

  it('should serve the full controller -> service -> cross-module repo DI chain over HTTP', async () => {
    app.mockCsrf();
    // POST drives controller -> AppService -> AppRepo (other module, PUBLIC) -> PersistenceService
    await app
      .httpRequest()
      .post('/apps')
      .send({ name: 'bundled', desc: 'via-manifest' })
      .expect(200)
      .expect((res) => {
        assert.equal(res.body.success, true);
        assert.ok(res.body.traceId, 'TraceService (context proto) should be injected');
      });

    // GET reads it back through the same DI chain (singleton PersistenceService keeps state).
    await app
      .httpRequest()
      .get('/apps?name=bundled')
      .expect(200)
      .expect((res) => {
        assert.ok(res.body.traceId);
        assert.deepStrictEqual(res.body.app, { name: 'bundled', desc: 'via-manifest' });
      });
  });
});
