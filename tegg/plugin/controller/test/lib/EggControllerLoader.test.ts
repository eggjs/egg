import { Prototype } from '@eggjs/core-decorator';
import { ControllerMetadataUtil } from '@eggjs/tegg';
import { LoaderUtil } from '@eggjs/tegg-loader';
import { afterEach, describe, it, expect } from 'vitest';

import { EggControllerLoader } from '../../src/lib/EggControllerLoader.ts';
import { getFixtures } from '../utils.ts';

const bundleGlobal = globalThis as typeof globalThis & {
  __EGG_BUNDLE_MODULE_LOADER__?: (filepath: string) => unknown;
};

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
});
