import { Prototype } from '@eggjs/core-decorator';
import { ControllerMetadataUtil } from '@eggjs/tegg';
import { LoaderUtil } from '@eggjs/tegg-loader';
import { afterEach, describe, it, expect } from 'vitest';

import { EggControllerLoader } from '../../src/lib/EggControllerLoader.ts';
import { getFixtures } from '../utils.ts';

const bundleGlobal = globalThis as typeof globalThis & {
  __EGG_BUNDLE_MODULE_LOADER__?: (filepath: string) => unknown;
};

class ThrowingLoaderFS {
  private readonly error: NodeJS.ErrnoException;

  constructor(error: NodeJS.ErrnoException) {
    this.error = error;
  }

  glob(): string[] {
    throw this.error;
  }

  async loadFile(): Promise<unknown> {
    return {};
  }
}

describe('plugin/controller/test/lib/EggModuleLoader.test.ts', () => {
  afterEach(() => {
    bundleGlobal.__EGG_BUNDLE_MODULE_LOADER__ = undefined;
    LoaderUtil.setConfig({});
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

  it('should load precomputed bundled controller files without disk discovery', async () => {
    class BundledController {}
    Prototype()(BundledController);

    bundleGlobal.__EGG_BUNDLE_MODULE_LOADER__ = (filepath: string) => {
      if (filepath === '/bundle/app/controller/home.ts') {
        return { BundledController };
      }
    };

    const loader = new EggControllerLoader('/bundle/app/controller', ['home.ts']);
    const classes = await loader.load();

    expect(classes.map((clazz) => clazz.name)).toEqual(['BundledController']);
  });

  it('should treat missing controller directory as empty', async () => {
    const error = Object.assign(new Error('missing'), { code: 'ENOENT' });
    LoaderUtil.setConfig({ loaderFS: new ThrowingLoaderFS(error) as any });
    const loader = new EggControllerLoader('/missing/app/controller');

    const classes = await loader.load();

    expect(classes).toEqual([]);
  });

  it('should rethrow non-missing controller discovery errors', async () => {
    const error = Object.assign(new Error('denied'), { code: 'EACCES' });
    LoaderUtil.setConfig({ loaderFS: new ThrowingLoaderFS(error) as any });
    const loader = new EggControllerLoader('/denied/app/controller');

    await expect(loader.load()).rejects.toThrow('denied');
  });
});
