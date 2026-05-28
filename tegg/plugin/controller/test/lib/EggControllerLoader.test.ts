import { RealLoaderFS, type LoaderFSGlobOptions } from '@eggjs/loader-fs';
import { ControllerMetadataUtil, HTTPController } from '@eggjs/tegg';
import { afterEach, describe, it, expect } from 'vitest';

import { EggControllerLoader } from '../../src/lib/EggControllerLoader.ts';
import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/lib/EggModuleLoader.test.ts', () => {
  afterEach(() => {
    (globalThis as any).__EGG_BUNDLE_MODULE_LOADER__ = undefined;
  });

  it('should work', async () => {
    const controllerDir = getFixtures('apps/controller-app/app/controller');
    const loader = new EggControllerLoader(controllerDir);
    const classes = await loader.load();

    expect(classes.length).toBe(7);
    const AppController = classes[0];
    const metadata = ControllerMetadataUtil.getControllerMetadata(AppController);
    expect(metadata).toBeDefined();
  });

  it('should use loaderFS for controller discovery', async () => {
    const controllerDir = getFixtures('apps/controller-app/app/controller');
    const loaderFS = new RecordingLoaderFS();
    const loader = new EggControllerLoader(controllerDir, { loaderFS });

    const classes = await loader.load();

    expect(classes.length).toBe(7);
    expect(loaderFS.globCalls).toEqual([{ cwd: controllerDir }]);
  });

  it('should use manifest-backed controller file discovery when available', async () => {
    const controllerDir = getFixtures('apps/controller-app/app/controller');
    const loaderFS = new RecordingLoaderFS();
    const manifest = {
      globFiles() {
        return ['AppController.ts'];
      },
    };
    const loader = new EggControllerLoader(controllerDir, { loaderFS, manifest });

    const classes = await loader.load();

    expect(classes.map((clazz) => clazz.name)).toEqual(['AppController']);
    expect(loaderFS.globCalls).toEqual([]);
  });

  it('should fall back to loaderFS when manifest has no globFiles method', async () => {
    const controllerDir = getFixtures('apps/controller-app/app/controller');
    const loaderFS = new RecordingLoaderFS();
    const loader = new EggControllerLoader(controllerDir, { loaderFS, manifest: {} });

    const classes = await loader.load();

    expect(classes.length).toBe(7);
    expect(loaderFS.globCalls).toEqual([{ cwd: controllerDir }]);
  });

  it('should load bundled controllers from manifest file discovery', async () => {
    class BundledController {}
    HTTPController({ path: '/bundled' })(BundledController);

    const controllerDir = '/bundle/app/controller';
    const controllerFile = `${controllerDir}/BundledController.ts`;
    (globalThis as any).__EGG_BUNDLE_MODULE_LOADER__ = (filepath: string) => {
      expect(filepath).toBe(controllerFile);
      return { BundledController };
    };
    const manifest = {
      globFiles(directory: string) {
        expect(directory).toBe(controllerDir);
        return ['BundledController.ts'];
      },
    };
    const loader = new EggControllerLoader(controllerDir, { loaderFS: new RecordingLoaderFS(), manifest });

    const classes = await loader.load();

    expect(classes.map((clazz) => clazz.name)).toEqual(['BundledController']);
    expect(ControllerMetadataUtil.getControllerMetadata(classes[0])).toBeDefined();
  });
});

class RecordingLoaderFS extends RealLoaderFS {
  readonly globCalls: Array<{ cwd: string | undefined }> = [];

  glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[] {
    this.globCalls.push({ cwd: options?.cwd ? String(options.cwd) : undefined });
    return super.glob(patterns, options);
  }
}
