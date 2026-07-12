import assert from 'node:assert/strict';
import { mock } from 'node:test';
// import { scheduler } from 'node:timers/promises';

import { EggLoadUnitType, GlobalGraph, LoadUnitFactory } from '@eggjs/metadata';
import { mm } from '@eggjs/mock';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { describe, it, afterEach } from 'vitest';

import TeggAppBoot from '../../src/app.ts';
import { EggModuleLoader } from '../../src/lib/EggModuleLoader.ts';
import { getAppBaseDir } from '../utils.ts';

describe('test/lib/EggModuleLoader.test.ts', () => {
  afterEach(() => {
    mock.reset();
    return mm.restore();
  });

  it('should promote enabled plugin module references by package with path fallback', async () => {
    const moduleReferences = [
      {
        name: 'teggConfig',
        package: '@eggjs/tegg-config',
        path: '/virtual/tegg-config-package-root',
        optional: true,
      },
      {
        name: 'legacyPlugin',
        path: '/legacy/plugin/path',
        optional: true,
      },
      {
        name: 'disabledPlugin',
        package: 'disabled-plugin',
        path: '/virtual/disabled-plugin',
        optional: false,
      },
      {
        name: 'samePathDifferentPackage',
        package: 'module-package',
        path: '/virtual/same-path',
        optional: true,
      },
      {
        name: 'regularAppModule',
        package: 'regular-app-module',
        path: '/virtual/regular-app-module',
        optional: false,
      },
      {
        name: 'disabledPathPlugin',
        path: '/disabled/path-plugin',
        optional: false,
      },
    ];
    const app = {
      baseDir: '/virtual/app',
      loader: {
        allPlugins: {
          teggConfig: {
            enable: true,
            package: '@eggjs/tegg-config',
            path: '/some/plugin/path/inside-package',
          },
          legacyPlugin: {
            enable: true,
            path: '/legacy/plugin/path',
          },
          disabledPlugin: {
            enable: false,
            package: 'disabled-plugin',
            path: '/virtual/disabled-plugin',
          },
          samePathDifferentPackage: {
            enable: true,
            package: 'plugin-package',
            path: '/virtual/same-path',
          },
          disabledPathPlugin: {
            enable: false,
            path: '/disabled/path-plugin',
          },
        },
        loaderFS: undefined,
        manifest: {
          getExtension: () => undefined,
          setExtension() {},
        },
      },
      logger: {
        warn() {},
      },
      moduleReferences,
      plugins: {
        teggConfig: {
          enable: true,
          package: '@eggjs/tegg-config',
          path: '/some/plugin/path/inside-package',
        },
        legacyPlugin: {
          enable: true,
          path: '/legacy/plugin/path',
        },
        samePathDifferentPackage: {
          enable: true,
          package: 'plugin-package',
          path: '/virtual/same-path',
        },
      },
    } as any;
    const originalReferences = [...moduleReferences];
    const originalNames = moduleReferences.map((reference) => reference.name);

    mock.method(LoaderFactory, 'loadApp', async () => []);
    mock.method(GlobalGraph, 'create', async () => {
      return {
        registerBuildHook() {},
      } as any;
    });

    await new EggModuleLoader(app).initGraph();

    assert.equal(app.moduleReferences, moduleReferences);
    assert.deepEqual(app.moduleReferences, originalReferences);
    assert.equal(app.moduleReferences.length, originalReferences.length);
    for (const [index, reference] of app.moduleReferences.entries()) {
      assert.equal(reference, originalReferences[index]);
    }
    assert.deepEqual(
      app.moduleReferences.map((reference: { name: string }) => reference.name),
      originalNames,
    );

    assert.equal(moduleReferences[0].optional, false);
    assert.equal(moduleReferences[1].optional, false);
    assert.equal(moduleReferences[2].optional, true);
    assert.equal(moduleReferences[3].optional, true);
    assert.equal(moduleReferences[4].optional, false);
    assert.equal(moduleReferences[5].optional, true);
  });

  it('should reconcile module plugin references before collecting metadata manifest', async () => {
    const moduleReferences = [
      {
        name: 'teggConfig',
        package: '@eggjs/tegg-config',
        path: '/virtual/tegg-config',
        optional: true,
      },
      {
        name: 'disabledPlugin',
        package: 'disabled-plugin',
        path: '/virtual/disabled-plugin',
        optional: false,
      },
    ];
    const extensions = new Map<string, unknown>();
    const app = {
      moduleReferences,
      loader: {
        allPlugins: {
          teggConfig: {
            enable: true,
            package: '@eggjs/tegg-config',
            path: '/virtual/tegg-config',
          },
          disabledPlugin: {
            enable: false,
            package: 'disabled-plugin',
            path: '/virtual/disabled-plugin',
          },
        },
        manifest: {
          setExtension(key: string, value: unknown) {
            extensions.set(key, value);
          },
        },
      },
      plugins: {
        teggConfig: {
          enable: true,
          package: '@eggjs/tegg-config',
          path: '/virtual/tegg-config',
        },
      },
    } as any;

    mock.method(LoaderFactory, 'loadApp', async () => []);

    await new TeggAppBoot(app).loadMetadata();

    assert.equal(moduleReferences[0].optional, false);
    assert.equal(moduleReferences[1].optional, true);
    assert.deepEqual(extensions.get('tegg'), {
      moduleReferences: [
        {
          name: 'teggConfig',
          package: '@eggjs/tegg-config',
          path: '/virtual/tegg-config',
          optional: false,
          loaderType: undefined,
        },
        {
          name: 'disabledPlugin',
          package: 'disabled-plugin',
          path: '/virtual/disabled-plugin',
          optional: true,
          loaderType: undefined,
        },
      ],
      moduleDescriptors: [],
    });
  });

  it('should pass manifest module name when creating bundled module load units', async () => {
    const app = {
      loader: {
        loaderFS: undefined,
        manifest: {
          getExtension: () => ({
            moduleDescriptors: [
              {
                name: 'bundledModule',
                unitPath: '/virtual/bundled-module',
                decoratedFiles: ['src/index.ts'],
              },
            ],
          }),
        },
      },
      moduleHandler: {
        loadUnits: [],
      },
    } as any;
    const moduleLoader = new EggModuleLoader(app);
    moduleLoader.globalGraph = {
      build() {},
      sort() {},
      moduleConfigList: [
        {
          name: 'bundledModule',
          path: '/virtual/bundled-module',
        },
      ],
    } as any;
    (moduleLoader as any).loadedFromManifest = true;

    const calls: unknown[][] = [];
    mock.method(LoadUnitFactory, 'createLoadUnit', async (...args: unknown[]) => {
      calls.push(args);
      return { name: 'bundledModule', unitPath: '/virtual/bundled-module' };
    });

    await (moduleLoader as any).loadModule();

    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], '/virtual/bundled-module');
    assert.equal(calls[0][1], EggLoadUnitType.MODULE);
    assert.equal(calls[0][3], 'bundledModule');
    assert.equal(app.moduleHandler.loadUnits.length, 1);
  });

  describe('has recursive dependency module', () => {
    it('should throw error', async () => {
      const app = mm.app({
        baseDir: getAppBaseDir('recursive-module-app'),
      });
      await assert.rejects(async () => {
        // await scheduler.wait(1000);
        await app.ready();
      }, /module has recursive deps/);
      await app.close();
    });
  });

  describe('module config in wrong order', () => {
    it('should load module success', async () => {
      const app = mm.app({
        baseDir: getAppBaseDir('wrong-order-app'),
      });
      await app.ready();
      await app.close();
    });
  });
});
