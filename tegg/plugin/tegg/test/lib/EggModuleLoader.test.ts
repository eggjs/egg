import assert from 'node:assert/strict';
import { mock } from 'node:test';
// import { scheduler } from 'node:timers/promises';

import { GlobalGraph } from '@eggjs/metadata';
import { mm } from '@eggjs/mock';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { describe, it, afterEach } from 'vitest';

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
        optional: true,
      },
      {
        name: 'samePathDifferentPackage',
        package: 'module-package',
        path: '/virtual/same-path',
        optional: true,
      },
    ];
    const app = {
      baseDir: '/virtual/app',
      loader: {
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
      },
    } as any;

    mock.method(LoaderFactory, 'loadApp', async () => []);
    mock.method(GlobalGraph, 'create', async () => {
      return {
        registerBuildHook() {},
      } as any;
    });

    await new EggModuleLoader(app).initGraph();

    assert.equal(moduleReferences[0].optional, false);
    assert.equal(moduleReferences[1].optional, false);
    assert.equal(moduleReferences[2].optional, true);
    assert.equal(moduleReferences[3].optional, true);
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
