import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';
import { LoaderFactory, TEGG_MANIFEST_KEY } from '@eggjs/tegg-loader';
import type { TeggManifestExtension } from '@eggjs/tegg-loader';
import { describe, it, afterEach, afterAll, beforeAll, vi } from 'vitest';

import TeggAppBoot from '../src/app.ts';
import { getAppBaseDir } from './utils.ts';

describe('plugin/tegg/test/ManifestCollection.test.ts', () => {
  let app: MockApplication;

  afterEach(async () => {
    vi.restoreAllMocks();
    return mm.restore();
  });

  it('should pass app loaderFS when collecting metadata only manifest', async () => {
    const loaderFS = {};
    const moduleReferences = [
      {
        name: 'mock-module',
        path: '/mock/modules/mock-module',
        optional: false,
        loaderType: undefined,
      },
    ];
    const manifestData: Record<string, unknown> = {};
    const app = {
      moduleReferences,
      loader: {
        loaderFS,
        manifest: {
          setExtension(key: string, value: unknown) {
            manifestData[key] = value;
          },
        },
      },
    };
    const loadApp = vi.spyOn(LoaderFactory, 'loadApp').mockResolvedValue([]);

    await new TeggAppBoot(app as any).loadMetadata();

    assert.equal(loadApp.mock.calls.length, 1);
    assert.deepEqual(loadApp.mock.calls[0], [moduleReferences, undefined, { loaderFS }]);
    assert.deepEqual((manifestData[TEGG_MANIFEST_KEY] as TeggManifestExtension).moduleReferences, moduleReferences);
  });

  describe('manifest collection on app startup', () => {
    beforeAll(async () => {
      app = mm.app({
        baseDir: getAppBaseDir('egg-app'),
      });
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should collect tegg manifest extension after ready', () => {
      const teggExt = app.loader.manifest.getExtension(TEGG_MANIFEST_KEY) as TeggManifestExtension | undefined;
      assert.ok(teggExt, 'tegg manifest extension should be set');
    });

    it('should have moduleReferences matching app.moduleReferences', () => {
      const teggExt = app.loader.manifest.getExtension(TEGG_MANIFEST_KEY) as TeggManifestExtension;
      assert.ok(teggExt.moduleReferences);
      assert.ok(teggExt.moduleReferences.length > 0);

      for (const ref of teggExt.moduleReferences) {
        assert.ok(ref.name, 'moduleReference should have name');
        assert.ok(ref.path, 'moduleReference should have path');
      }

      // All module reference names should match
      const appRefNames = app.moduleReferences
        .map((r: any) => r.name)
        .sort((a: string, b: string) => a.localeCompare(b));
      const manifestRefNames = teggExt.moduleReferences
        .map((r) => r.name)
        .sort((a: string, b: string) => a.localeCompare(b));
      assert.deepStrictEqual(manifestRefNames, appRefNames);
    });

    it('should have moduleDescriptors with decoratedFiles', () => {
      const teggExt = app.loader.manifest.getExtension(TEGG_MANIFEST_KEY) as TeggManifestExtension;
      assert.ok(teggExt.moduleDescriptors);
      assert.ok(teggExt.moduleDescriptors.length > 0);

      for (const desc of teggExt.moduleDescriptors) {
        assert.ok(desc.name, 'descriptor should have name');
        assert.ok(desc.unitPath, 'descriptor should have unitPath');
        assert.ok(Array.isArray(desc.decoratedFiles), 'descriptor should have decoratedFiles array');
      }
    });

    it('should have non-empty decoratedFiles for modules with prototypes', () => {
      const teggExt = app.loader.manifest.getExtension(TEGG_MANIFEST_KEY) as TeggManifestExtension;
      // At least one module should have decorated files
      const hasFiles = teggExt.moduleDescriptors.some((d) => d.decoratedFiles.length > 0);
      assert.ok(hasFiles, 'at least one module should have decorated files');
    });
  });
});
