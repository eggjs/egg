import fs from 'node:fs';
import path from 'node:path';
import { mock } from 'node:test';

import type { Application } from 'egg';
import { afterEach, describe, expect, it } from 'vitest';

import App from '../src/app.ts';
import { getFixtures } from './utils.ts';

describe('plugin/config/test/PluginModuleDiscovery.test.ts', () => {
  afterEach(() => mock.reset());

  it('should discover plugin modules even when app module.json short-circuits dependency scanning', () => {
    const baseDir = getFixtures('plugin-module-json/app');
    const pluginRoot = getFixtures('plugin-module-json/app/node_modules/aop-like-plugin');
    const fakeApp = {
      baseDir,
      config: { tegg: { readModuleOptions: {} } },
      coreLogger: { warn() {} },
      loader: {
        allPlugins: {
          teggAop: { enable: true, package: 'aop-like-plugin', path: pluginRoot },
        },
        getTypeFiles: () => [],
        lookupDirs: new Set([baseDir]),
        manifest: { getExtension: () => undefined },
        outDir: undefined,
      },
    } as unknown as Application;

    new App(fakeApp).configWillLoad();

    expect(fakeApp.moduleReferences.map((ref) => ref.name)).toEqual(['appModule', 'teggAop']);
    expect(fakeApp.moduleReferences[1]).toEqual({
      name: 'teggAop',
      package: 'aop-like-plugin',
      path: pluginRoot,
      optional: true,
    });
  });

  it('should canonicalize plugin module paths', () => {
    const baseDir = getFixtures('plugin-module-json/app');
    const pluginRoot = getFixtures('plugin-module-json/app/node_modules/aop-like-plugin');
    const realPluginRoot = path.join(baseDir, 'real-aop-like-plugin');
    const originalRealpath = fs.realpathSync.bind(fs);
    mock.method(fs, 'realpathSync', (target: fs.PathLike) => {
      if (target === pluginRoot) return realPluginRoot;
      return originalRealpath(target);
    });
    const fakeApp = {
      baseDir,
      config: { tegg: { readModuleOptions: {} } },
      coreLogger: { warn() {} },
      loader: {
        allPlugins: {
          teggAop: { enable: true, package: 'aop-like-plugin', path: pluginRoot },
        },
        getTypeFiles: () => [],
        lookupDirs: new Set([baseDir]),
        manifest: { getExtension: () => undefined },
        outDir: undefined,
      },
    } as unknown as Application;

    new App(fakeApp).configWillLoad();

    expect(fakeApp.moduleReferences.find((ref) => ref.name === 'teggAop')?.path).toBe(realPluginRoot);
  });
});
